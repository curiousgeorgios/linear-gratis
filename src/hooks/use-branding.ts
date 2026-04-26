import { useState, useEffect } from 'react';
import { BrandingSettings } from '@/lib/supabase';

type BrandingContext =
  | { type: 'view'; slug: string }
  | { type: 'roadmap'; slug: string }
  | { type: 'form'; slug: string }

export function useBrandingSettings(
  userId: string | null,
  context: BrandingContext | null = null,
) {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contextType = context?.type;
  const contextSlug = context?.slug;

  useEffect(() => {
    if (!userId || !contextType || !contextSlug) {
      setBranding(null);
      setLoading(false);
      return;
    }

    const loadBranding = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          type: contextType,
          slug: contextSlug,
        });
        const response = await fetch(`/api/branding/${userId}?${params.toString()}`);

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
  }, [userId, contextType, contextSlug]);

  return { branding, loading, error };
}

const SYSTEM_FONTS = new Set([
  'arial', 'helvetica', 'times new roman', 'times', 'courier new', 'courier',
  'georgia', 'verdana', 'tahoma', 'trebuchet ms', 'system-ui', 'sans-serif',
  'serif', 'monospace',
]);

const GOOGLE_FONT_WEIGHTS = 'wght@300;400;500;600;700';

function injectGoogleFontsLink(fontsToLoad: string[]) {
  const googleFonts = Array.from(
    new Set(
      fontsToLoad
        .map(f => f.replace(/['"]/g, '').trim())
        .filter(f => f && !SYSTEM_FONTS.has(f.toLowerCase())),
    ),
  );

  const linkId = 'branding-google-fonts';
  const existing = document.getElementById(linkId) as HTMLLinkElement | null;

  if (googleFonts.length === 0) {
    existing?.remove();
    return;
  }

  const familyParams = googleFonts
    .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:${GOOGLE_FONT_WEIGHTS}`)
    .join('&');
  const href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;

  if (existing) {
    if (existing.href !== href) existing.href = href;
    return;
  }

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

// Helper function to apply branding colours to CSS variables.
// `pageTitle` becomes the document title prefix (e.g. "My Roadmap - Acme").
export function applyBrandingToPage(
  branding: BrandingSettings | null,
  pageTitle?: string,
) {
  if (!branding) return;

  // Update document.title from brand name + current page title. Either or
  // both can be absent; composes with " - " when both are present.
  if (typeof document !== 'undefined') {
    const parts = [pageTitle, branding.brand_name].filter(
      (s): s is string => Boolean(s && s.trim()),
    );
    if (parts.length > 0) {
      document.title = parts.join(' - ');
    }
  }

  const root = document.documentElement;

  // Apply colours to the CSS variables that Tailwind actually uses
  // These override the defaults in globals.css
  if (branding.primary_color) {
    root.style.setProperty('--primary', branding.primary_color);
    root.style.setProperty('--ring', branding.primary_color);
    root.style.setProperty('--sidebar-primary', branding.primary_color);
    root.style.setProperty('--sidebar-ring', branding.primary_color);
  }

  if (branding.secondary_color) {
    root.style.setProperty('--muted-foreground', branding.secondary_color);
  }

  if (branding.accent_color) {
    root.style.setProperty('--accent', branding.accent_color);
  }

  if (branding.background_color) {
    root.style.setProperty('--background', branding.background_color);
    root.style.setProperty('--card', branding.background_color);
    root.style.setProperty('--popover', branding.background_color);
  }

  if (branding.text_color) {
    root.style.setProperty('--foreground', branding.text_color);
    root.style.setProperty('--card-foreground', branding.text_color);
    root.style.setProperty('--popover-foreground', branding.text_color);
  }

  if (branding.border_color) {
    root.style.setProperty('--border', branding.border_color);
    root.style.setProperty('--input', branding.border_color);
  }

  // Load Google Fonts and apply font families
  const fontsToLoad: string[] = [];
  if (branding.font_family) {
    fontsToLoad.push(branding.font_family.split(',')[0].trim());
    root.style.setProperty('--font-sans', branding.font_family);
    document.body.style.fontFamily = branding.font_family;
  }

  if (branding.heading_font_family) {
    fontsToLoad.push(branding.heading_font_family.split(',')[0].trim());
    const headingStyle = document.getElementById('branding-heading-font');
    if (headingStyle) {
      headingStyle.textContent = `h1, h2, h3, h4, h5, h6 { font-family: ${branding.heading_font_family} !important; }`;
    } else {
      const style = document.createElement('style');
      style.id = 'branding-heading-font';
      style.textContent = `h1, h2, h3, h4, h5, h6 { font-family: ${branding.heading_font_family} !important; }`;
      document.head.appendChild(style);
    }
  }

  injectGoogleFontsLink(fontsToLoad);

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
// Returns the actual Tailwind CSS variables for use in style props
export function getBrandingStyles(branding: BrandingSettings | null): React.CSSProperties {
  if (!branding) return {};

  const styles: Record<string, string> = {};

  if (branding.primary_color) {
    styles['--primary'] = branding.primary_color;
    styles['--ring'] = branding.primary_color;
  }

  if (branding.secondary_color) {
    styles['--muted-foreground'] = branding.secondary_color;
  }

  if (branding.accent_color) {
    styles['--accent'] = branding.accent_color;
  }

  if (branding.background_color) {
    styles['--background'] = branding.background_color;
    styles['--card'] = branding.background_color;
    styles['--popover'] = branding.background_color;
  }

  if (branding.text_color) {
    styles['--foreground'] = branding.text_color;
    styles['--card-foreground'] = branding.text_color;
    styles['--popover-foreground'] = branding.text_color;
  }

  if (branding.border_color) {
    styles['--border'] = branding.border_color;
    styles['--input'] = branding.border_color;
  }

  return styles as React.CSSProperties;
}
