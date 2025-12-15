"use client";

import { useState, useEffect } from "react";
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
import { Navigation } from "@/components/navigation";
import { supabase, BrandingSettings } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Palette, Upload, Trash2, Save, RefreshCw } from "lucide-react";

// These match the actual CSS theme defaults in globals.css (light theme)
// Used for display placeholders only - not saved to database when reset
const DEFAULT_COLORS = {
  primary_color: "#5e6ad2",
  secondary_color: "#6f7177",
  accent_color: "#f1f2f4",
  background_color: "#fcfcfc",
  text_color: "#0c0d0e",
  border_color: "#e6e6e8",
};

export default function BrandingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Branding state - start with minimal defaults, let CSS theme handle colours
  const [branding, setBranding] = useState<Partial<BrandingSettings>>({
    show_powered_by: true,
    logo_width: 120,
    logo_height: 40,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    loadBranding();
  }, [user, authLoading, router]);

  const loadBranding = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error("No access token");
      }

      const response = await fetch("/api/branding", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = (await response.json()) as { branding: BrandingSettings | null };
        if (data.branding) {
          setBranding({ ...branding, ...data.branding });
        }
      }
    } catch (error) {
      console.error("Error loading branding:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error("No access token");
      }

      const response = await fetch("/api/branding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(branding),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Branding settings saved successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save branding settings" });
      }
    } catch (error) {
      console.error("Error saving branding:", error);
      setMessage({ type: "error", text: "Failed to save branding settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "favicon"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error("No access token");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch("/api/branding/upload-logo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = (await response.json()) as { url: string };
        if (type === "logo") {
          setBranding({ ...branding, logo_url: data.url });
        } else {
          setBranding({ ...branding, favicon_url: data.url });
        }
        setMessage({ type: "success", text: `${type === "logo" ? "Logo" : "Favicon"} uploaded successfully!` });
      } else {
        const error = await response.json() as { error?: string };
        setMessage({ type: "error", text: error.error || "Failed to upload file" });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessage({ type: "error", text: "Failed to upload file" });
    } finally {
      setUploading(false);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm("Are you sure you want to reset all branding to defaults?")) {
      setBranding({
        // Clear all colours so pages use their natural CSS theme
        primary_color: undefined,
        secondary_color: undefined,
        accent_color: undefined,
        background_color: undefined,
        text_color: undefined,
        border_color: undefined,
        // Clear typography
        font_family: undefined,
        heading_font_family: undefined,
        // Reset display settings
        show_powered_by: true,
        logo_width: 120,
        logo_height: 40,
        // Clear assets and content
        logo_url: undefined,
        favicon_url: undefined,
        brand_name: undefined,
        tagline: undefined,
        footer_text: undefined,
        custom_css: undefined,
      });
      setMessage({ type: "success", text: "Reset to defaults. Remember to save!" });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-8">
            <p className="text-gray-600">Loading branding settings...</p>
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
              <h1 className="text-3xl font-bold mb-2">Custom branding</h1>
              <p className="text-muted-foreground">
                Customise the appearance of your public forms and views with your own branding
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleResetToDefaults}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reset to defaults
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save changes"}
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
        </div>

        <div className="space-y-6">
          {/* Brand identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Brand identity
              </CardTitle>
              <CardDescription>
                Your brand name and tagline that will appear on your public pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-name">Brand name</Label>
                  <Input
                    id="brand-name"
                    placeholder="e.g., Acme Inc"
                    value={branding.brand_name || ""}
                    onChange={(e) =>
                      setBranding({ ...branding, brand_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    placeholder="e.g., Building the future"
                    value={branding.tagline || ""}
                    onChange={(e) =>
                      setBranding({ ...branding, tagline: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Logo and favicon
              </CardTitle>
              <CardDescription>
                Upload your brand logo and favicon (PNG, JPG, SVG, or WebP, max 2MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Logo</Label>
                  {branding.logo_url && (
                    <div className="border border-border rounded-lg p-4 bg-muted/20">
                      <img
                        src={branding.logo_url}
                        alt="Logo preview"
                        className="max-h-20 mx-auto"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      onChange={(e) => handleLogoUpload(e, "logo")}
                      disabled={uploading}
                      className="flex-1"
                    />
                    {branding.logo_url && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setBranding({ ...branding, logo_url: undefined })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="logo-width" className="text-xs">Width (px)</Label>
                      <Input
                        id="logo-width"
                        type="number"
                        value={branding.logo_width || 120}
                        onChange={(e) =>
                          setBranding({ ...branding, logo_width: parseInt(e.target.value) })
                        }
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="logo-height" className="text-xs">Height (px)</Label>
                      <Input
                        id="logo-height"
                        type="number"
                        value={branding.logo_height || 40}
                        onChange={(e) =>
                          setBranding({ ...branding, logo_height: parseInt(e.target.value) })
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Favicon</Label>
                  {branding.favicon_url && (
                    <div className="border border-border rounded-lg p-4 bg-muted/20 h-[100px] flex items-center justify-center">
                      <img
                        src={branding.favicon_url}
                        alt="Favicon preview"
                        className="w-8 h-8"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      onChange={(e) => handleLogoUpload(e, "favicon")}
                      disabled={uploading}
                      className="flex-1"
                    />
                    {branding.favicon_url && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setBranding({ ...branding, favicon_url: undefined })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colours */}
          <Card>
            <CardHeader>
              <CardTitle>Colour palette</CardTitle>
              <CardDescription>
                Customise the colours used throughout your public pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: "primary_color", label: "Primary colour" },
                  { key: "secondary_color", label: "Secondary colour" },
                  { key: "accent_color", label: "Accent colour" },
                  { key: "background_color", label: "Background colour" },
                  { key: "text_color", label: "Text colour" },
                  { key: "border_color", label: "Border colour" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key} className="text-sm">
                      {label}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={key}
                        type="color"
                        value={branding[key as keyof BrandingSettings] as string || DEFAULT_COLORS[key as keyof typeof DEFAULT_COLORS]}
                        onChange={(e) =>
                          setBranding({ ...branding, [key]: e.target.value })
                        }
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        type="text"
                        value={branding[key as keyof BrandingSettings] as string || DEFAULT_COLORS[key as keyof typeof DEFAULT_COLORS]}
                        onChange={(e) =>
                          setBranding({ ...branding, [key]: e.target.value })
                        }
                        className="flex-1 font-mono text-sm h-10"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>
                Choose fonts for your public pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="font-family">Body font family</Label>
                <Input
                  id="font-family"
                  placeholder="e.g., Inter, system-ui, sans-serif"
                  value={branding.font_family || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, font_family: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Use web-safe fonts or Google Fonts. Separate multiple fonts with commas.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="heading-font-family">Heading font family (optional)</Label>
                <Input
                  id="heading-font-family"
                  placeholder="Leave empty to use body font"
                  value={branding.heading_font_family || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, heading_font_family: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card>
            <CardHeader>
              <CardTitle>Footer customisation</CardTitle>
              <CardDescription>
                Customise the footer text that appears on your public pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="footer-text">Footer text</Label>
                <Textarea
                  id="footer-text"
                  placeholder="e.g., © 2025 Acme Inc. All rights reserved."
                  value={branding.footer_text || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, footer_text: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={branding.show_powered_by ?? true}
                  onChange={() =>
                    setBranding({ ...branding, show_powered_by: !branding.show_powered_by })
                  }
                />
                <Label className="cursor-pointer">
                  Show &quot;Powered by linear.gratis&quot; in footer
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Custom CSS */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced: Custom CSS</CardTitle>
              <CardDescription>
                Add custom CSS for advanced styling (use with caution)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="/* Your custom CSS here */"
                value={branding.custom_css || ""}
                onChange={(e) =>
                  setBranding({ ...branding, custom_css: e.target.value })
                }
                rows={6}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleResetToDefaults}
            >
              Reset to defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
