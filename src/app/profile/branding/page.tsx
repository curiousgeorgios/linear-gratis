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
import { Navigation } from "@/components/navigation";
import { supabase, BrandingSettings } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Palette, Upload, Trash2, Save, RefreshCw } from "lucide-react";
import { useT } from '@/lib/i18n/client'

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
  const t = useT()

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
    logo_height: 40,
  });

  const loadBranding = useCallback(async () => {
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
          setBranding((prev) => ({ ...prev, ...data.branding }));
        }
      }
    } catch (error) {
      console.error("Error loading branding:", error);
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

    loadBranding();
  }, [user, authLoading, router, loadBranding]);

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
        setMessage({ type: "success", text: t("Branding settings saved successfully!") });
      } else {
        setMessage({ type: "error", text: t("Failed to save branding settings") });
      }
    } catch (error) {
      console.error("Error saving branding:", error);
      setMessage({ type: "error", text: t("Failed to save branding settings") });
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
      setMessage({ type: "error", text: t("Failed to upload file") });
    } finally {
      setUploading(false);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm(t("Are you sure you want to reset all branding to defaults?"))) {
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
        logo_height: 40,
        // Clear assets and content
        logo_url: undefined,
        favicon_url: undefined,
        brand_name: undefined,
        tagline: undefined,
        footer_text: undefined,
        custom_css: undefined,
      });
      setMessage({ type: "success", text: t("Reset to defaults. Remember to save!") });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-8">
            <p className="text-gray-600">{t("Loading branding settings...")}</p>
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
              <h1 className="text-3xl font-bold mb-2">{t("Custom branding")}</h1>
              <p className="text-muted-foreground">
                {t("Customise the appearance of your public forms and views with your own branding")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleResetToDefaults}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {t("Reset to defaults")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? t("Saving...") : t("Save changes")}
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
                {t("Brand identity")}
              </CardTitle>
              <CardDescription>
                {t("Your brand name and tagline that will appear on your public pages")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-name">{t("Brand name")}</Label>
                  <Input
                    id="brand-name"
                    placeholder={t("e.g., Acme Inc")}
                    value={branding.brand_name || ""}
                    onChange={(e) =>
                      setBranding({ ...branding, brand_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">{t("Tagline")}</Label>
                  <Input
                    id="tagline"
                    placeholder={t("e.g., Building the future")}
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
                {t("Logo and favicon")}
              </CardTitle>
              <CardDescription>
                {t("Upload your brand logo and favicon (PNG, JPG, or WebP, max 2MB)")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>{t("Logo")}</Label>
                  {branding.logo_url && (
                    <div className="border border-border rounded-lg p-4 bg-muted/20">
                      {/* eslint-disable-next-line @next/next/no-img-element -- user-provided URL, domain not known at build time */}
                      <img
                        src={branding.logo_url}
                        alt={t("Logo preview")}
                        className="max-h-20 mx-auto"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
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
                  <div>
                    <Label htmlFor="logo-height" className="text-xs">{t("Max height (px)")}</Label>
                    <Input
                      id="logo-height"
                      type="number"
                      value={branding.logo_height || 40}
                      onChange={(e) =>
                        setBranding({ ...branding, logo_height: parseInt(e.target.value) })
                      }
                      className="h-8"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("Width scales automatically to preserve the logo's aspect ratio.")}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>{t("Favicon")}</Label>
                  {branding.favicon_url && (
                    <div className="border border-border rounded-lg p-4 bg-muted/20 h-[100px] flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element -- user-provided URL, domain not known at build time */}
                      <img
                        src={branding.favicon_url}
                        alt={t("Favicon preview")}
                        className="w-8 h-8"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
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
              <CardTitle>{t("Colour palette")}</CardTitle>
              <CardDescription>
                {t("Customise the colours used throughout your public pages")}
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
                      {t(label)}
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
                        dir="ltr"
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
              <CardTitle>{t("Typography")}</CardTitle>
              <CardDescription>
                {t("Choose fonts for your public pages")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="font-family">{t("Body font family")}</Label>
                <Input
                  id="font-family"
                  placeholder={t("e.g., Inter, system-ui, sans-serif")}
                  value={branding.font_family || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, font_family: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("Use web-safe fonts or Google Fonts. Separate multiple fonts with commas.")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="heading-font-family">{t("Heading font family (optional)")}</Label>
                <Input
                  id="heading-font-family"
                  placeholder={t("Leave empty to use body font")}
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
              <CardTitle>{t("Footer customisation")}</CardTitle>
              <CardDescription>
                {t("Customise the footer text that appears on your public pages")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="footer-text">{t("Footer text")}</Label>
                <Textarea
                  id="footer-text"
                  placeholder={t("e.g., © 2025 Acme Inc. All rights reserved.")}
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
                  {t("Show \"Powered by linear.gratis\" in footer")}
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Custom CSS */}
          <Card>
            <CardHeader>
              <CardTitle>{t("Advanced: Custom CSS")}</CardTitle>
              <CardDescription>
                {t("Add custom CSS for advanced styling (use with caution)")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={t("/* Your custom CSS here */")}
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
              {t("Reset to defaults")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? t("Saving...") : t("Save changes")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
