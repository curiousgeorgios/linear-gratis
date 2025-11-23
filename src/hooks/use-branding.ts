import { useState, useEffect } from 'react';
import { BrandingSettings } from '@/lib/supabase';

export function useBrandingSettings(userId: string | null) {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadBranding = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/branding/${userId}`);

        if (response.ok) {
          const data = (await response.json()) as { branding: BrandingSettings | null };
          setBranding(data.branding);
        } else {
          setError('Failed to load branding settings');
        }
      } catch (err) {
        console.error('Error loading branding:', err);
        setError('Failed to load branding settings');
      } finally {
        setLoading(false);
      }
    };

    loadBranding();
  }, [userId]);

  return { branding, loading, error };
}

// Helper function to apply branding colours to CSS variables
export function applyBrandingToPage(branding: BrandingSettings | null) {
  if (!branding) return;

  const root = document.documentElement;

  // Apply colours as CSS variables
  const colourMap: { [key: string]: string } = {
    '--brand-primary': branding.primary_color || '#5E6AD2',
    '--brand-secondary': branding.secondary_color || '#8B95A5',
    '--brand-accent': branding.accent_color || '#4C9AFF',
    '--brand-background': branding.background_color || '#FFFFFF',
    '--brand-text': branding.text_color || '#1F2937',
    '--brand-border': branding.border_color || '#E5E7EB',
  };

  Object.entries(colourMap).forEach(([variable, value]) => {
    root.style.setProperty(variable, value);
  });

  // Apply fonts
  if (branding.font_family) {
    root.style.setProperty('--brand-font-family', branding.font_family);
  }
  if (branding.heading_font_family) {
    root.style.setProperty('--brand-heading-font', branding.heading_font_family);
  }

  // Apply custom CSS
  if (branding.custom_css) {
    const styleId = 'custom-branding-css';
    let styleElement = document.getElementById(styleId);

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = branding.custom_css;
  }

  // Apply favicon
  if (branding.favicon_url) {
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = branding.favicon_url;
  }
}

// Helper to get inline styles from branding
export function getBrandingStyles(branding: BrandingSettings | null) {
  if (!branding) return {};

  return {
    '--brand-primary': branding.primary_color || '#5E6AD2',
    '--brand-secondary': branding.secondary_color || '#8B95A5',
    '--brand-accent': branding.accent_color || '#4C9AFF',
    '--brand-background': branding.background_color || '#FFFFFF',
    '--brand-text': branding.text_color || '#1F2937',
    '--brand-border': branding.border_color || '#E5E7EB',
    '--brand-font-family': branding.font_family || 'Inter, system-ui, sans-serif',
    '--brand-heading-font': branding.heading_font_family || branding.font_family || 'Inter, system-ui, sans-serif',
  } as React.CSSProperties;
}
