"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navigation } from "@/components/navigation";
import { supabase, PublicView } from "@/lib/supabase";
import { decryptTokenClient } from "@/lib/client-encryption";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Eye, Copy, Globe, Lock, Edit3 } from "lucide-react";
import bcrypt from "bcryptjs";

type Project = {
  id: string;
  name: string;
  description?: string;
};

type Team = {
  id: string;
  name: string;
  key: string;
  description?: string;
};

export default function PublicViewsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [views, setViews] = useState<PublicView[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateView, setShowCreateView] = useState(false);
  const [linearToken, setLinearToken] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state
  const [viewName, setViewName] = useState("");
  const [viewSlug, setViewSlug] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [viewTitle, setViewTitle] = useState("");
  const [viewDescription, setViewDescription] = useState("");
  const [sourceType, setSourceType] = useState<"project" | "team">("project");
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [editingView, setEditingView] = useState<PublicView | null>(null);
  const [showEditView, setShowEditView] = useState(false);
  const [allowIssueCreation, setAllowIssueCreation] = useState(false);

  const loadUserData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load user profile and views in parallel
      const [profileResult, viewsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("linear_api_token")
          .eq("id", user.id)
          .single(),
        supabase
          .from("public_views")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      // Handle profile
      if (profileResult.data?.linear_api_token) {
        try {
          const decryptedToken = await decryptTokenClient(
            profileResult.data.linear_api_token,
          );
          setLinearToken(decryptedToken);
          await Promise.all([
            fetchProjects(decryptedToken),
            fetchTeams(decryptedToken),
          ]);
        } catch (error) {
          console.error("Error decrypting token:", error);
        }
      }

      // Handle views
      if (viewsResult.error) {
        console.error("Error loading views:", viewsResult.error);
      } else {
        setViews(viewsResult.data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    loadUserData();
  }, [user, router, loadUserData]);

  const fetchProjects = async (token: string) => {
    try {
      const response = await fetch("/api/linear/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken: token }),
      });

      if (response.ok) {
        const data = (await response.json()) as { projects?: Project[] };
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const fetchTeams = async (token: string) => {
    try {
      const response = await fetch("/api/linear/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken: token }),
      });

      if (response.ok) {
        const data = (await response.json()) as { teams?: Team[] };
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (value: string) => {
    setViewName(value);
    if (!viewSlug || viewSlug === generateSlug(viewName)) {
      setViewSlug(generateSlug(value));
    }
  };

  const createView = async () => {
    if (!user || !linearToken) return;

    setSubmitting(true);
    setMessage(null);

    try {
      let sourceData: {
        project_id?: string;
        project_name?: string;
        team_id?: string;
        team_name?: string;
      } = {};

      if (sourceType === "project") {
        const selectedProjectData = projects.find(
          (p) => p.id === selectedProject,
        );
        if (!selectedProjectData) {
          setMessage({ type: "error", text: "Please select a project" });
          return;
        }
        sourceData = {
          project_id: selectedProject,
          project_name: selectedProjectData.name,
        };
      } else {
        const selectedTeamData = teams.find((t) => t.id === selectedTeam);
        if (!selectedTeamData) {
          setMessage({ type: "error", text: "Please select a team" });
          return;
        }
        sourceData = {
          team_id: selectedTeam,
          team_name: selectedTeamData.name,
        };
      }

      // Hash password if protection is enabled
      let passwordHash = null;
      if (passwordProtected) {
        if (!password.trim()) {
          setMessage({ type: "error", text: "Please enter a password" });
          return;
        }
        passwordHash = await bcrypt.hash(password, 12);
      }

      const { error } = await supabase.from("public_views").insert({
        user_id: user.id,
        name: viewName,
        slug: viewSlug,
        view_title: viewTitle,
        description: viewDescription || null,
        show_assignees: true,
        show_labels: true,
        show_priorities: true,
        show_descriptions: true,
        allowed_statuses: [],
        password_protected: passwordProtected,
        password_hash: passwordHash,
        is_active: true,
        allow_issue_creation: allowIssueCreation,
        ...sourceData,
      });

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          setMessage({
            type: "error",
            text: "This URL slug is already taken. Please choose a different one.",
          });
        } else {
          setMessage({
            type: "error",
            text: "Failed to create view. Please try again.",
          });
        }
        console.error("Error creating view:", error);
      } else {
        setMessage({
          type: "success",
          text: "Public view created successfully!",
        });
        resetForm();
        await loadUserData();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to create view. Please try again.",
      });
      console.error("Error creating view:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteView = async (viewId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this public view? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("public_views")
        .delete()
        .eq("id", viewId);

      if (error) {
        console.error("Error deleting view:", error);
        alert("Failed to delete view");
      } else {
        await loadUserData();
      }
    } catch (error) {
      console.error("Error deleting view:", error);
      alert("Failed to delete view");
    }
  };

  const copyViewLink = (slug: string) => {
    const url = `${window.location.origin}/view/${slug}`;
    navigator.clipboard.writeText(url);
    setMessage({ type: "success", text: "View link copied to clipboard!" });
    setTimeout(() => setMessage(null), 3000);
  };

  const resetForm = () => {
    setViewName("");
    setViewSlug("");
    setSelectedProject("");
    setSelectedTeam("");
    setViewTitle("");
    setViewDescription("");
    setSourceType("project");
    setPasswordProtected(false);
    setPassword("");
    setAllowIssueCreation(false);
    setShowCreateView(false);
    setEditingView(null);
    setShowEditView(false);
  };

  const startEditView = (view: PublicView) => {
    setEditingView(view);
    setViewName(view.name);
    setViewSlug(view.slug);
    setViewTitle(view.view_title);
    setViewDescription(view.description || "");
    setPasswordProtected(view.password_protected || false);
    setPassword("");
    setAllowIssueCreation(view.allow_issue_creation || false);
    setShowEditView(true);
    setShowCreateView(false);
  };

  const updateView = async () => {
    if (!user || !editingView) return;

    setSubmitting(true);
    setMessage(null);

    try {
      // Hash password if protection is enabled and password is provided
      let passwordHash: string | null = editingView.password_hash || null;
      if (passwordProtected && password.trim()) {
        passwordHash = await bcrypt.hash(password, 12);
      } else if (!passwordProtected) {
        passwordHash = null;
      }

      const { error } = await supabase
        .from("public_views")
        .update({
          name: viewName,
          view_title: viewTitle,
          description: viewDescription || null,
          password_protected: passwordProtected,
          password_hash: passwordHash,
          allow_issue_creation: allowIssueCreation,
        })
        .eq("id", editingView.id);

      if (error) {
        setMessage({
          type: "error",
          text: "Failed to update view. Please try again.",
        });
        console.error("Error updating view:", error);
      } else {
        setMessage({ type: "success", text: "View updated successfully!" });
        resetForm();
        await loadUserData();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to update view. Please try again.",
      });
      console.error("Error updating view:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  if (!linearToken) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Linear API token required</CardTitle>
              <CardDescription>
                You need to save your Linear API token before creating public
                views.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/profile">
                <Button>Go to profile settings</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Public read-only views</h1>
          </div>

          {/* How it works */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mb-2">
                  1
                </div>
                <CardTitle className="text-lg">Create a public view</CardTitle>
                <CardDescription>
                  Choose a Linear project or team and customise what information
                  to display
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mb-2">
                  2
                </div>
                <CardTitle className="text-lg">Share the link</CardTitle>
                <CardDescription>
                  Send the unique view URL to stakeholders via email, Slack, or
                  embed in your website
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mb-2">
                  3
                </div>
                <CardTitle className="text-lg">
                  Stakeholders see live updates
                </CardTitle>
                <CardDescription>
                  Viewers see a beautiful kanban board with real-time Linear
                  issue updates
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="text-center">
            <Button
              onClick={() => {
                setShowCreateView(true);
                setShowEditView(false);
                setEditingView(null);
              }}
              disabled={projects.length === 0 && teams.length === 0}
              size="lg"
              className="h-12 px-8 font-semibold"
            >
              {views.length === 0
                ? "Create your first public view"
                : "Create new view"}
            </Button>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {projects.length === 0 && teams.length === 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-center text-gray-600">
                No projects or teams found. Make sure your Linear API token is
                valid and you have access to projects and teams.
              </p>
            </CardContent>
          </Card>
        )}

        {showCreateView && (
          <Card className="mb-8 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">
                Create a new public view
              </CardTitle>
              <CardDescription className="text-base">
                Set up a shareable view that external stakeholders can access to
                see Linear project or team progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  Basic information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="view-name">View name *</Label>
                    <Input
                      id="view-name"
                      placeholder="e.g., Client project progress, roadmap"
                      value={viewName}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Internal name for your reference
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="view-slug">URL slug *</Label>
                    <Input
                      id="view-slug"
                      placeholder="client-project-progress"
                      value={viewSlug}
                      onChange={(e) => setViewSlug(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      View will be available at:{" "}
                      <code className="bg-muted px-1 py-0.5 rounded">
                        /view/{viewSlug || "[slug]"}
                      </code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Source Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  Choose data source
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Source type *</Label>
                    <Select
                      value={sourceType}
                      onValueChange={(value) =>
                        setSourceType(value as "project" | "team")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose data source type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {sourceType === "project" ? (
                    <div className="space-y-2">
                      <Label htmlFor="project">Linear project *</Label>
                      <Select
                        value={selectedProject}
                        onValueChange={setSelectedProject}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose which project to share" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="team">Linear team *</Label>
                      <Select
                        value={selectedTeam}
                        onValueChange={setSelectedTeam}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose which team to share" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name} ({team.key})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Public Experience */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  Public view settings
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="view-title">View title *</Label>
                    <Input
                      id="view-title"
                      placeholder="e.g., Project progress, roadmap, development status"
                      value={viewTitle}
                      onChange={(e) => setViewTitle(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      This is what viewers will see at the top of the public
                      view
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="view-description">
                      Description (optional)
                    </Label>
                    <Textarea
                      id="view-description"
                      placeholder="e.g., Live view of our project progress. Issues are updated in real-time..."
                      value={viewDescription}
                      onChange={(e) => setViewDescription(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional description to provide context to viewers
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4: Interaction Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                  Interaction settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Checkbox
                        checked={allowIssueCreation}
                        onChange={() => setAllowIssueCreation(!allowIssueCreation)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label
                        htmlFor="allow-issue-creation"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Allow viewers to create issues
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enable a &quot;Create issue&quot; button in the public board view
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5: Security Options */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    5
                  </div>
                  Security options
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Checkbox
                        checked={passwordProtected}
                        onChange={() => setPasswordProtected(!passwordProtected)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label
                        htmlFor="password-protected"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Password protect this view
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Require a password to access this public view
                      </p>
                    </div>
                  </div>

                  {passwordProtected && (
                    <div className="space-y-2 ml-7">
                      <Label htmlFor="view-password">Password *</Label>
                      <Input
                        id="view-password"
                        type="password"
                        placeholder="Enter a secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Share this password separately with authorised viewers
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={createView}
                  disabled={
                    submitting ||
                    !viewName ||
                    !viewSlug ||
                    (!selectedProject && !selectedTeam) ||
                    !viewTitle ||
                    (passwordProtected && !password.trim())
                  }
                  className="h-11 px-6 font-semibold"
                >
                  {submitting ? "Creating view..." : "Create public view"}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="h-11 px-6"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showEditView && editingView && (
          <Card className="mb-8 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">Edit public view</CardTitle>
              <CardDescription className="text-base">
                Update settings for &ldquo;{editingView.name}&rdquo;
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  Basic information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-view-name">View name *</Label>
                    <Input
                      id="edit-view-name"
                      placeholder="e.g., Client project progress, roadmap"
                      value={viewName}
                      onChange={(e) => setViewName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-view-slug">URL slug</Label>
                    <Input
                      id="edit-view-slug"
                      value={viewSlug}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL cannot be changed after creation
                    </p>
                  </div>
                </div>
              </div>

              {/* Public Experience */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  Public view settings
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-view-title">View title *</Label>
                    <Input
                      id="edit-view-title"
                      placeholder="e.g., Project progress, roadmap, development status"
                      value={viewTitle}
                      onChange={(e) => setViewTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-view-description">
                      Description (optional)
                    </Label>
                    <Textarea
                      id="edit-view-description"
                      placeholder="e.g., Live view of our project progress. Issues are updated in real-time..."
                      value={viewDescription}
                      onChange={(e) => setViewDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Interaction Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  Interaction settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Checkbox
                        checked={allowIssueCreation}
                        onChange={() => setAllowIssueCreation(!allowIssueCreation)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label
                        htmlFor="edit-allow-issue-creation"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Allow viewers to create issues
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enable a &quot;Create issue&quot; button in the public board view
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Options */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                  Security options
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Checkbox
                        checked={passwordProtected}
                        onChange={() => setPasswordProtected(!passwordProtected)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label
                        htmlFor="edit-password-protected"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Password protect this view
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Require a password to access this public view
                      </p>
                    </div>
                  </div>

                  {passwordProtected && (
                    <div className="space-y-2 ml-7">
                      <Label htmlFor="edit-view-password">
                        {editingView.password_protected
                          ? "New password (leave empty to keep current)"
                          : "Password *"}
                      </Label>
                      <Input
                        id="edit-view-password"
                        type="password"
                        placeholder={
                          editingView.password_protected
                            ? "Enter new password or leave empty"
                            : "Enter a secure password"
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {editingView.password_protected
                          ? "Leave empty to keep the current password unchanged"
                          : "Share this password separately with authorised viewers"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={updateView}
                  disabled={
                    submitting ||
                    !viewName ||
                    !viewTitle ||
                    (passwordProtected &&
                      !editingView.password_protected &&
                      !password.trim())
                  }
                  className="h-11 px-6 font-semibold"
                >
                  {submitting ? "Updating view..." : "Update view"}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="h-11 px-6"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading views...</p>
          </div>
        ) : views.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">
                  No public views created yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first public view to start sharing Linear progress
                  with stakeholders.
                </p>
                <Button
                  onClick={() => {
                    setShowCreateView(true);
                    setShowEditView(false);
                    setEditingView(null);
                  }}
                  disabled={projects.length === 0 && teams.length === 0}
                >
                  Create your first view
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your public views</h2>
              <span className="text-sm text-muted-foreground">
                {views.length} view{views.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid gap-4">
              {views.map((view) => (
                <Card
                  key={view.id}
                  className="border-border/50 bg-card/80 backdrop-blur-sm"
                >
                  <CardContent className="">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{view.name}</h3>
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                            {view.project_name || view.team_name}
                          </span>
                          {view.is_active && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              Live
                            </span>
                          )}
                          {view.password_protected && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Protected
                            </span>
                          )}
                        </div>
                        <p className="text-base text-foreground mb-2">
                          {view.view_title}
                        </p>
                        {view.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {view.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Created{" "}
                            {new Date(view.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <code className="bg-muted px-1 py-0.5 rounded text-xs">
                              /view/{view.slug}
                            </code>
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyViewLink(view.slug)}
                          className="flex items-center gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copy link
                        </Button>
                        <Link href={`/view/${view.slug}`} target="_blank">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditView(view)}
                          className="flex items-center gap-2"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteView(view.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
