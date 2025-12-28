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
import { supabase, Roadmap } from "@/lib/supabase";
import { decryptTokenClient } from "@/lib/client-encryption";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Eye, Copy, Globe, Lock, Plus, Map } from "lucide-react";

type Project = {
  id: string;
  name: string;
  description?: string;
};

export default function RoadmapsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateRoadmap, setShowCreateRoadmap] = useState(false);
  const [linearToken, setLinearToken] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state
  const [roadmapName, setRoadmapName] = useState("");
  const [roadmapSlug, setRoadmapSlug] = useState("");
  const [roadmapTitle, setRoadmapTitle] = useState("");
  const [roadmapDescription, setRoadmapDescription] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [layoutType, setLayoutType] = useState<"kanban" | "timeline">("kanban");
  const [allowVoting, setAllowVoting] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");

  const loadUserData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();

      // Load user profile and roadmaps in parallel
      const [profileResult, roadmapsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("linear_api_token")
          .eq("id", user.id)
          .single(),
        fetch("/api/roadmaps", {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }),
      ]);

      // Handle profile
      if (profileResult.data?.linear_api_token) {
        try {
          const decryptedToken = await decryptTokenClient(
            profileResult.data.linear_api_token,
          );
          setLinearToken(decryptedToken);
          await fetchProjects(decryptedToken);
        } catch (error) {
          console.error("Error decrypting token:", error);
        }
      }

      // Handle roadmaps
      if (roadmapsResult.ok) {
        const data = await roadmapsResult.json() as { roadmaps?: Roadmap[] };
        setRoadmaps(data.roadmaps || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }
    loadUserData();
  }, [user, authLoading, router, loadUserData]);

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

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (name: string) => {
    setRoadmapName(name);
    if (!roadmapSlug || roadmapSlug === generateSlug(roadmapName)) {
      setRoadmapSlug(generateSlug(name));
    }
    if (!roadmapTitle) {
      setRoadmapTitle(name);
    }
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleCreateRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roadmapName.trim() || !roadmapSlug.trim() || !roadmapTitle.trim()) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    if (selectedProjects.length === 0) {
      setMessage({ type: "error", text: "Please select at least one project" });
      return;
    }

    if (passwordProtected && !password.trim()) {
      setMessage({ type: "error", text: "Please enter a password" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch("/api/roadmaps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: roadmapName.trim(),
          slug: roadmapSlug.trim(),
          title: roadmapTitle.trim(),
          description: roadmapDescription.trim() || null,
          project_ids: selectedProjects,
          layout_type: layoutType,
          allow_voting: allowVoting,
          allow_comments: allowComments,
          password_protected: passwordProtected,
          password: password || null,
        }),
      });

      const result = await response.json() as { success?: boolean; roadmap?: Roadmap; error?: string };

      if (result.success && result.roadmap) {
        setRoadmaps((prev) => [result.roadmap!, ...prev]);
        setShowCreateRoadmap(false);
        resetForm();
        setMessage({ type: "success", text: "Roadmap created successfully!" });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to create roadmap" });
      }
    } catch (error) {
      console.error("Error creating roadmap:", error);
      setMessage({ type: "error", text: "Failed to create roadmap" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoadmap = async (roadmapId: string) => {
    if (!confirm("Are you sure you want to delete this roadmap? All votes and comments will also be deleted.")) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`/api/roadmaps/${roadmapId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        setRoadmaps((prev) => prev.filter((r) => r.id !== roadmapId));
        setMessage({ type: "success", text: "Roadmap deleted successfully" });
      } else {
        setMessage({ type: "error", text: "Failed to delete roadmap" });
      }
    } catch (error) {
      console.error("Error deleting roadmap:", error);
      setMessage({ type: "error", text: "Failed to delete roadmap" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: "success", text: "Copied to clipboard!" });
    setTimeout(() => setMessage(null), 2000);
  };

  const resetForm = () => {
    setRoadmapName("");
    setRoadmapSlug("");
    setRoadmapTitle("");
    setRoadmapDescription("");
    setSelectedProjects([]);
    setLayoutType("kanban");
    setAllowVoting(true);
    setAllowComments(true);
    setPasswordProtected(false);
    setPassword("");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Product roadmaps</h1>
              <p className="text-muted-foreground mt-1">
                Create and manage public roadmaps with voting and comments
              </p>
            </div>
            <Button
              onClick={() => setShowCreateRoadmap(true)}
              disabled={!linearToken}
            >
              <Plus className="h-4 w-4 mr-2" />
              New roadmap
            </Button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* No Linear token warning */}
          {!linearToken && (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-amber-800">
                  To create roadmaps, please{" "}
                  <Link href="/profile" className="underline font-medium">
                    add your Linear API token
                  </Link>{" "}
                  first.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Create roadmap form */}
          {showCreateRoadmap && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Create new roadmap</CardTitle>
                <CardDescription>
                  Set up a public product roadmap from your Linear projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRoadmap} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Roadmap name</Label>
                      <Input
                        id="name"
                        value={roadmapName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="My product roadmap"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">URL slug</Label>
                      <Input
                        id="slug"
                        value={roadmapSlug}
                        onChange={(e) => setRoadmapSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        placeholder="my-roadmap"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        {typeof window !== "undefined" ? window.location.origin : ""}/roadmap/{roadmapSlug || "..."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Display title</Label>
                    <Input
                      id="title"
                      value={roadmapTitle}
                      onChange={(e) => setRoadmapTitle(e.target.value)}
                      placeholder="Product roadmap"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={roadmapDescription}
                      onChange={(e) => setRoadmapDescription(e.target.value)}
                      placeholder="See what we're working on..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Projects to include</Label>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {projects.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No projects found</p>
                      ) : (
                        projects.map((project) => (
                          <div key={project.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedProjects.includes(project.id)}
                              onChange={() => toggleProjectSelection(project.id)}
                            />
                            <label
                              className="text-sm cursor-pointer flex-1"
                              onClick={() => toggleProjectSelection(project.id)}
                            >
                              {project.name}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Default layout</Label>
                      <Select value={layoutType} onValueChange={(v) => setLayoutType(v as "kanban" | "timeline")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kanban">Kanban (Planned → In progress → Shipped)</SelectItem>
                          <SelectItem value="timeline">Timeline (months/quarters)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={allowVoting}
                        onChange={() => setAllowVoting(!allowVoting)}
                      />
                      <label className="text-sm cursor-pointer" onClick={() => setAllowVoting(!allowVoting)}>
                        Allow visitors to upvote items
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={allowComments}
                        onChange={() => setAllowComments(!allowComments)}
                      />
                      <label className="text-sm cursor-pointer" onClick={() => setAllowComments(!allowComments)}>
                        Allow visitors to comment on items
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={passwordProtected}
                        onChange={() => setPasswordProtected(!passwordProtected)}
                      />
                      <label className="text-sm cursor-pointer" onClick={() => setPasswordProtected(!passwordProtected)}>
                        Password protect this roadmap
                      </label>
                    </div>
                  </div>

                  {passwordProtected && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required={passwordProtected}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Creating..." : "Create roadmap"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateRoadmap(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Roadmaps list */}
          <div className="space-y-4">
            {roadmaps.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Map className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No roadmaps yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first public product roadmap
                  </p>
                  {linearToken && (
                    <Button onClick={() => setShowCreateRoadmap(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create roadmap
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              roadmaps.map((roadmap) => (
                <Card key={roadmap.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{roadmap.name}</h3>
                          {roadmap.password_protected ? (
                            <Lock className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Globe className="h-4 w-4 text-green-500" />
                          )}
                          {!roadmap.is_active && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {typeof window !== "undefined" ? window.location.origin : ""}/roadmap/{roadmap.slug}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{roadmap.project_ids?.length || 0} project{(roadmap.project_ids?.length || 0) !== 1 ? "s" : ""}</span>
                          <span>•</span>
                          <span>{roadmap.layout_type} view</span>
                          {roadmap.allow_voting && (
                            <>
                              <span>•</span>
                              <span>Voting enabled</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`${window.location.origin}/roadmap/${roadmap.slug}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Link href={`/roadmap/${roadmap.slug}`} target="_blank">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteRoadmap(roadmap.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
