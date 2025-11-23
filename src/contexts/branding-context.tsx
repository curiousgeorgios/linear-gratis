"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BrandingSettings } from "@/lib/supabase";

interface BrandingContextType {
  branding: BrandingSettings | null;
  loading: boolean;
  loadBranding: (userId: string) => Promise<void>;
  applyBranding: () => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBranding = async (userId: string) => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/branding/${userId}`);

      if (response.ok) {
        const data = (await response.json()) as { branding: BrandingSettings | null };
        setBranding(data.branding);

        // Automatically apply branding when loaded
        if (data.branding) {
          applyBrandingStyles(data.branding);
        }
      }
    } catch (error) {
      console.error("Error loading branding:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyBrandingStyles = (settings: BrandingSettings) => {
    const root = document.documentElement;

    // Apply colour palette
    if (settings.primary_color) {
      root.style.setProperty("--brand-primary", settings.primary_color);
    }
    if (settings.secondary_color) {
      root.style.setProperty("--brand-secondary", settings.secondary_color);
    }
    if (settings.accent_color) {
      root.style.setProperty("--brand-accent", settings.accent_color);
    }
    if (settings.background_color) {
      root.style.setProperty("--brand-background", settings.background_color);
    }
    if (settings.text_color) {
      root.style.setProperty("--brand-text", settings.text_color);
    }
    if (settings.border_color) {
      root.style.setProperty("--brand-border", settings.border_color);
    }

    // Apply typography
    if (settings.font_family) {
      root.style.setProperty("--brand-font-family", settings.font_family);
    }
    if (settings.heading_font_family) {
      root.style.setProperty("--brand-heading-font", settings.heading_font_family);
    }

    // Apply custom CSS if provided
    if (settings.custom_css) {
      const styleId = "custom-branding-styles";
      let styleElement = document.getElementById(styleId);

      if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }

      styleElement.textContent = settings.custom_css;
    }

    // Apply favicon if provided
    if (settings.favicon_url) {
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      favicon.href = settings.favicon_url;
    }
  };

  const applyBranding = () => {
    if (branding) {
      applyBrandingStyles(branding);
    }
  };

  return (
    <BrandingContext.Provider value={{ branding, loading, loadBranding, applyBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}
