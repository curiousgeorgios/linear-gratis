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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navigation } from "@/components/navigation";
import { supabase, CustomerRequestForm } from "@/lib/supabase";
import { decryptTokenClient } from "@/lib/client-encryption";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Eye, Copy, Link2 } from "lucide-react";

type Project = {
  id: string;
  name: string;
  description?: string;
};

export default function FormsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [forms, setForms] = useState<CustomerRequestForm[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [linearToken, setLinearToken] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showPrefillOptions, setShowPrefillOptions] = useState<string | null>(
    null,
  );

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const loadUserData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load user profile and forms in parallel
      const [profileResult, formsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("linear_api_token")
          .eq("id", user.id)
          .single(),
        supabase
          .from("customer_request_forms")
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
          await fetchProjects(decryptedToken);
        } catch (error) {
          console.error("Error decrypting token:", error);
        }
      }

      // Handle forms
      if (formsResult.error) {
        console.error("Error loading forms:", formsResult.error);
      } else {
        setForms(formsResult.data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish loading

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

  const handleNameChange = (value: string) => {
    setFormName(value);
    if (!formSlug || formSlug === generateSlug(formName)) {
      setFormSlug(generateSlug(value));
    }
  };

  const createForm = async () => {
    if (!user || !linearToken) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const selectedProjectData = projects.find(
        (p) => p.id === selectedProject,
      );
      if (!selectedProjectData) {
        setMessage({ type: "error", text: "Please select a project" });
        return;
      }

      const { error } = await supabase.from("customer_request_forms").insert({
        user_id: user.id,
        name: formName,
        slug: formSlug,
        project_id: selectedProject,
        project_name: selectedProjectData.name,
        form_title: formTitle,
        description: formDescription || null,
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
            text: "Failed to create form. Please try again.",
          });
        }
        console.error("Error creating form:", error);
      } else {
        setMessage({ type: "success", text: "Form created successfully!" });
        resetForm();
        await loadUserData();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to create form. Please try again.",
      });
      console.error("Error creating form:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteForm = async (formId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this form? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("customer_request_forms")
        .delete()
        .eq("id", formId);

      if (error) {
        console.error("Error deleting form:", error);
        alert("Failed to delete form");
      } else {
        await loadUserData();
      }
    } catch (error) {
      console.error("Error deleting form:", error);
      alert("Failed to delete form");
    }
  };

  const copyFormLink = (
    slug: string,
    prefillData?: { [key: string]: string },
  ) => {
    let url = `${window.location.origin}/form/${slug}`;

    if (prefillData) {
      const params = new URLSearchParams();
      Object.entries(prefillData).forEach(([key, value]) => {
        if (value.trim()) {
          params.set(key, value);
        }
      });
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    navigator.clipboard.writeText(url);
    setMessage({
      type: "success",
      text: prefillData
        ? "Prefilled form link copied to clipboard!"
        : "Form link copied to clipboard!",
    });
    setTimeout(() => setMessage(null), 3000);
    setShowPrefillOptions(null);
  };

  const generatePrefillLink = (slug: string, formRef: HTMLFormElement) => {
    const formData = new FormData(formRef);
    const prefillData: { [key: string]: string } = {};

    const nameValue = formData.get(`name-${slug}`) as string;
    const emailValue = formData.get(`email-${slug}`) as string;
    const refValue = formData.get(`ref-${slug}`) as string;
    const titleValue = formData.get(`title-${slug}`) as string;
    const bodyValue = formData.get(`body-${slug}`) as string;
    const attachmentValue = formData.get(`attachment-${slug}`) as string;

    if (nameValue) prefillData.name = nameValue;
    if (emailValue) prefillData.email = emailValue;
    if (refValue) prefillData.ref = refValue;
    if (titleValue) prefillData.title = titleValue;
    if (bodyValue) prefillData.body = bodyValue;
    if (attachmentValue) prefillData.attachment = attachmentValue;

    copyFormLink(slug, prefillData);
  };

  const resetForm = () => {
    setFormName("");
    setFormSlug("");
    setSelectedProject("");
    setFormTitle("");
    setFormDescription("");
    setShowCreateForm(false);
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

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
                You need to save your Linear API token before creating forms.
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
            <h1 className="text-3xl font-bold mb-4">
              Shareable customer forms
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Create branded forms for specific Linear projects that your
              customers can use to submit feedback directly. Perfect for support
              tickets, feature requests, or bug reports.
            </p>
          </div>

          {/* How it works */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mb-2">
                  1
                </div>
                <CardTitle className="text-lg">Create a form</CardTitle>
                <CardDescription>
                  Choose a Linear project and customise the form title and
                  description
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
                  Send the unique form URL to your customers via email, chat, or
                  website
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mb-2">
                  3
                </div>
                <CardTitle className="text-lg">
                  Issues appear in Linear
                </CardTitle>
                <CardDescription>
                  Customer submissions automatically create issues in your
                  chosen Linear project
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="text-center">
            <Button
              onClick={() => setShowCreateForm(true)}
              disabled={projects.length === 0}
              size="lg"
              className="h-12 px-8 font-semibold"
            >
              {forms.length === 0
                ? "Create your first form"
                : "Create new form"}
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

        {projects.length === 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-center text-gray-600">
                No projects found. Make sure your Linear API token is valid and
                you have access to projects.
              </p>
            </CardContent>
          </Card>
        )}

        {showCreateForm && (
          <Card className="mb-8 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">
                Create a new customer form
              </CardTitle>
              <CardDescription className="text-base">
                Set up a custom form that your customers can use to submit
                requests directly to your Linear project
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
                    <Label htmlFor="form-name">Form name *</Label>
                    <Input
                      id="form-name"
                      placeholder="e.g., Support requests, Feature requests"
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Internal name for your reference
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="form-slug">URL slug *</Label>
                    <Input
                      id="form-slug"
                      placeholder="support-requests"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Form will be available at:{" "}
                      <code className="bg-muted px-1 py-0.5 rounded">
                        /form/{formSlug || "[slug]"}
                      </code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Linear Integration */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  Linear integration
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="project">Target Linear project *</Label>
                  <Select
                    value={selectedProject}
                    onValueChange={setSelectedProject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose where customer submissions will go" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    All submissions from this form will create issues in the
                    selected project
                  </p>
                </div>
              </div>

              {/* Step 3: Customer Experience */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  Customer experience
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="form-title">Form title *</Label>
                    <Input
                      id="form-title"
                      placeholder="e.g., Submit a support request, Report a bug, Request a feature"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      This is what your customers will see at the top of the
                      form
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="form-description">
                      Instructions (optional)
                    </Label>
                    <Textarea
                      id="form-description"
                      placeholder="e.g., Please provide as much detail as possible to help us resolve your issue quickly..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional instructions to help your customers provide
                      better information
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={createForm}
                  disabled={
                    submitting ||
                    !formName ||
                    !formSlug ||
                    !selectedProject ||
                    !formTitle
                  }
                  className="h-11 px-6 font-semibold"
                >
                  {submitting ? "Creating form..." : "Create form"}
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
            <p className="text-gray-600">Loading forms...</p>
          </div>
        ) : forms.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">
                  No forms created yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first customer request form to start collecting
                  submissions.
                </p>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  disabled={projects.length === 0}
                >
                  Create your first form
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your forms</h2>
              <span className="text-sm text-muted-foreground">
                {forms.length} form{forms.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid gap-4">
              {forms.map((form) => (
                <Card
                  key={form.id}
                  className="border-border/50 bg-card/80 backdrop-blur-sm"
                >
                  <CardContent>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{form.name}</h3>
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                            {form.project_name}
                          </span>
                        </div>
                        <p className="text-base text-foreground mb-2">
                          {form.form_title}
                        </p>
                        {form.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {form.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Created{" "}
                            {new Date(form.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <code className="bg-muted px-1 py-0.5 rounded text-xs">
                              /form/{form.slug}
                            </code>
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyFormLink(form.slug)}
                          className="flex items-center gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copy link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setShowPrefillOptions(
                              showPrefillOptions === form.id ? null : form.id,
                            )
                          }
                          className="flex items-center gap-2"
                        >
                          <Link2 className="h-4 w-4" />
                          Prefill
                        </Button>
                        <Link href={`/form/${form.slug}`} target="_blank">
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
                          onClick={() => deleteForm(form.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                  {showPrefillOptions === form.id && (
                    <div className="border-t border-border/50 p-6 bg-muted/30">
                      <h4 className="font-semibold mb-4">
                        Create prefilled link
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Fill out any fields below to create a shareable link
                        with prefilled data. Your customers will see these
                        values when they open the form.
                      </p>
                      <form
                        id={`prefill-form-${form.slug}`}
                        onSubmit={(e) => {
                          e.preventDefault();
                          generatePrefillLink(form.slug, e.currentTarget);
                        }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`name-${form.slug}`}>
                              Customer name
                            </Label>
                            <Input
                              id={`name-${form.slug}`}
                              name={`name-${form.slug}`}
                              placeholder="John Doe"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`email-${form.slug}`}>
                              Email address
                            </Label>
                            <Input
                              id={`email-${form.slug}`}
                              name={`email-${form.slug}`}
                              type="email"
                              placeholder="john@example.com"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`ref-${form.slug}`}>
                            Reference ID
                          </Label>
                          <Input
                            id={`ref-${form.slug}`}
                            name={`ref-${form.slug}`}
                            placeholder="TICKET-123"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`title-${form.slug}`}>
                            Issue title
                          </Label>
                          <Input
                            id={`title-${form.slug}`}
                            name={`title-${form.slug}`}
                            placeholder="Brief description of the issue"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`body-${form.slug}`}>
                            Issue description
                          </Label>
                          <Textarea
                            id={`body-${form.slug}`}
                            name={`body-${form.slug}`}
                            placeholder="Detailed description of the issue..."
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`attachment-${form.slug}`}>
                            Attachment URL
                          </Label>
                          <Input
                            id={`attachment-${form.slug}`}
                            name={`attachment-${form.slug}`}
                            type="url"
                            placeholder="https://example.com/screenshot.png"
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button
                            type="submit"
                            className="flex items-center gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Copy prefilled link
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPrefillOptions(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
