"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { supabase, CustomDomain } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Copy,
  RefreshCw,
} from "lucide-react";

export default function CustomDomainsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<CustomDomain | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [newDomain, setNewDomain] = useState("");
  const [targetType, setTargetType] = useState<"form" | "view">("form");
  const [targetSlug, setTargetSlug] = useState("");

  // Available targets for dropdown
  const [availableViews, setAvailableViews] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [availableForms, setAvailableForms] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    loadDomains();
    loadAvailableTargets();
  }, [user, authLoading, router]);

  const loadDomains = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error("No access token");
      }

      const response = await fetch("/api/domains", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = (await response.json()) as { domains: CustomDomain[] };
        setDomains(data.domains || []);
      }
    } catch (error) {
      console.error("Error loading domains:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTargets = async () => {
    if (!user) return;

    setLoadingTargets(true);
    try {
      const [viewsResult, formsResult] = await Promise.all([
        supabase
          .from("public_views")
          .select("id, name, slug")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("name", { ascending: true }),
        supabase
          .from("customer_request_forms")
          .select("id, name, slug")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ]);

      if (viewsResult.data) {
        setAvailableViews(viewsResult.data);
      }
      if (formsResult.data) {
        setAvailableForms(formsResult.data);
      }
    } catch (error) {
      console.error("Error loading available targets:", error);
    } finally {
      setLoadingTargets(false);
    }
  };

  const handleTargetTypeChange = (value: "form" | "view") => {
    setTargetType(value);
    setTargetSlug("");
  };

  const handleAddDomain = async () => {
    if (!user || !newDomain || !targetSlug) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error("No access token");
      }

      const response = await fetch("/api/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          domain: newDomain,
          target_type: targetType,
          target_slug: targetSlug,
        }),
      });

      if (response.ok) {
        toast.success("Domain added successfully!");
        setNewDomain("");
        setTargetSlug("");
        setShowAddDomain(false);
        await loadDomains();
      } else {
        const error = await response.json() as { error?: string };
        toast.error(error.error || "Failed to add domain");
      }
    } catch (error) {
      console.error("Error adding domain:", error);
      toast.error("Failed to add domain");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    if (!user) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error("No access token");
      }

      const response = await fetch(`/api/domains/${domainId}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json() as {
        success?: boolean;
        message?: string;
        details?: {
          cnameVerified?: boolean;
          txtVerified?: boolean;
          errors?: string[];
        };
      };

      console.log('Verification result:', result);

      if (result.success) {
        toast.success(result.message || "Domain verified successfully!");
        await loadDomains();
      } else {
        // Show detailed error if available
        const errorText = result.message ||
          (result.details?.errors?.join('; ')) ||
          "Domain verification failed";
        toast.error(errorText);
        await loadDomains(); // Reload to see updated error
      }
    } catch (error) {
      console.error("Error verifying domain:", error);
      toast.error("Failed to verify domain");
    }
  };

  const handleDeleteDomain = (domain: CustomDomain) => {
    setDomainToDelete(domain);
    setDeleteModalOpen(true);
  };

  const confirmDeleteDomain = async () => {
    if (!domainToDelete) return;

    setDeleting(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error("No access token");
      }

      const response = await fetch(`/api/domains/${domainToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Domain deleted successfully!");
        setDeleteModalOpen(false);
        setDomainToDelete(null);
        await loadDomains();
      } else {
        toast.error("Failed to delete domain");
      }
    } catch (error) {
      console.error("Error deleting domain:", error);
      toast.error("Failed to delete domain");
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const getStatusBadges = (domain: CustomDomain) => {
    const badges: React.ReactNode[] = [];

    // Verification status badge
    switch (domain.verification_status) {
      case "verified":
        badges.push(
          <Badge key="verified" className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
        break;
      case "failed":
        badges.push(
          <Badge key="failed" className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
        break;
      default:
        badges.push(
          <Badge key="pending" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending verification
          </Badge>
        );
    }

    // SSL status badge (only show if verified or if SSL has a notable status)
    if (domain.ssl_status === "active") {
      badges.push(
        <Badge key="ssl-active" className="bg-blue-100 text-blue-800">
          <Shield className="h-3 w-3 mr-1" />
          SSL active
        </Badge>
      );
    } else if (domain.verification_status === "verified" && domain.ssl_status === "pending") {
      badges.push(
        <Badge key="ssl-pending" className="bg-orange-100 text-orange-800">
          <Clock className="h-3 w-3 mr-1" />
          SSL provisioning
        </Badge>
      );
    } else if (domain.ssl_status === "failed") {
      badges.push(
        <Badge key="ssl-failed" className="bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          SSL failed
        </Badge>
      );
    }

    return <div className="flex gap-2 flex-wrap">{badges}</div>;
  };

  const getPurposeLabel = (purpose?: string) => {
    switch (purpose) {
      case "routing":
        return "Required for routing";
      case "ownership":
        return "Ownership verification";
      case "ssl":
        return "SSL certificate";
      default:
        return null;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-8">
            <p className="text-gray-600">Loading custom domains...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Custom domains</h1>
              <p className="text-muted-foreground">
                Use your own domain for your public forms and views
              </p>
            </div>
            <Button
              onClick={() => setShowAddDomain(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add domain
            </Button>
          </div>
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mb-2">
                1
              </div>
              <CardTitle className="text-lg">Add your domain</CardTitle>
              <CardDescription>
                Enter your domain and select which form or view it should point to
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mb-2">
                2
              </div>
              <CardTitle className="text-lg">Configure DNS</CardTitle>
              <CardDescription>
                Add the provided DNS records to your domain registrar
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mb-2">
                3
              </div>
              <CardTitle className="text-lg">Verify and activate</CardTitle>
              <CardDescription>
                Verify your domain and start using it with your custom branding
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Add domain form */}
        {showAddDomain && (
          <Card className="mb-8 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Add a new custom domain</CardTitle>
              <CardDescription>
                Connect your domain to a specific form or view
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain name</Label>
                <Input
                  id="domain"
                  placeholder="e.g., support.yourdomain.com or feedback.example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full domain or subdomain you want to use
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target-type">Target type</Label>
                  <Select
                    value={targetType}
                    onValueChange={(value) =>
                      handleTargetTypeChange(value as "form" | "view")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="form">Form</SelectItem>
                      <SelectItem value="view">View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-slug">
                    Target {targetType === "form" ? "form" : "view"}
                  </Label>
                  <Select
                    value={targetSlug}
                    onValueChange={setTargetSlug}
                    disabled={loadingTargets}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingTargets
                            ? "Loading..."
                            : `Select a ${targetType}`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {targetType === "form" ? (
                        availableForms.length > 0 ? (
                          availableForms.map((form) => (
                            <SelectItem key={form.id} value={form.slug}>
                              {form.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No active forms available
                          </div>
                        )
                      ) : availableViews.length > 0 ? (
                        availableViews.map((view) => (
                          <SelectItem key={view.id} value={view.slug}>
                            {view.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No active views available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {((targetType === "form" && availableForms.length === 0) ||
                    (targetType === "view" && availableViews.length === 0)) &&
                    !loadingTargets && (
                      <p className="text-xs text-amber-600">
                        {targetType === "form"
                          ? "You don't have any active forms. Create a form first."
                          : "You don't have any active views. Create a view first."}
                      </p>
                    )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleAddDomain}
                  disabled={submitting || !newDomain || !targetSlug}
                >
                  {submitting ? "Adding..." : "Add domain"}
                </Button>
                <Button variant="outline" onClick={() => setShowAddDomain(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Domains list */}
        {domains.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No custom domains yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first custom domain to start using your own branding
                </p>
                <Button onClick={() => setShowAddDomain(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first domain
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => (
              <Card key={domain.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{domain.domain}</h3>
                          {getStatusBadges(domain)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            Points to: /{domain.target_type}/{domain.target_slug}
                          </span>
                          <span>
                            Added {new Date(domain.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {domain.error_message && (
                          <p className="text-sm text-red-600 mt-2">
                            {domain.error_message}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {/* Show verify button for pending domains */}
                        {domain.verification_status !== "verified" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyDomain(domain.id)}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Check status
                          </Button>
                        )}
                        {/* Show refresh button for verified domains with pending SSL */}
                        {domain.verification_status === "verified" && domain.ssl_status !== "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyDomain(domain.id)}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Check SSL
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDomain(domain)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* DNS Configuration */}
                    {domain.verification_status !== "verified" && domain.dns_records && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3">DNS configuration</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Add these DNS records to your domain registrar. DNS changes may take up to 48 hours to propagate.
                        </p>
                        <div className="space-y-3">
                          {domain.dns_records.map((record, index) => (
                            <div
                              key={index}
                              className="bg-muted/50 rounded-lg p-3 font-mono text-sm"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-xs font-semibold">
                                  {record.type}
                                </Badge>
                                {record.purpose && (
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {getPurposeLabel(record.purpose)}
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground text-xs min-w-[50px]">Name:</span>
                                  <code className="text-xs break-all flex-1">{record.name}</code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => copyToClipboard(record.name, "Record name")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground text-xs min-w-[50px]">Value:</span>
                                  <code className="text-xs break-all flex-1">{record.value}</code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => copyToClipboard(record.value, "Record value")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Help section */}
        <Card className="mt-8 bg-muted/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Need help?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>DNS propagation:</strong> After adding DNS records, it may take up to
              48 hours for changes to propagate globally.
            </p>
            <p>
              <strong>SSL certificates:</strong> Once verified, SSL certificates are
              automatically provisioned for your custom domain.
            </p>
            <p>
              <strong>Troubleshooting:</strong> If verification fails, double-check that your
              DNS records are correctly configured in your domain registrar.
            </p>
          </CardContent>
        </Card>
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDomainToDelete(null);
        }}
        onConfirm={confirmDeleteDomain}
        title="Delete domain"
        description={`Are you sure you want to delete "${domainToDelete?.domain}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
