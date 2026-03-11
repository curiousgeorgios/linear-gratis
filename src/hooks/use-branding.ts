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

  // Inject Google Fonts <link> for non-system fonts
  const systemFonts = ['arial', 'helvetica', 'times new roman', 'times', 'courier new', 'courier', 'georgia', 'verdana', 'tahoma', 'trebuchet ms', 'system-ui', 'sans-serif', 'serif', 'monospace'];
  const googleFonts = fontsToLoad.filter(f => !systemFonts.includes(f.toLowerCase().replace(/['"]/g, '')));
  if (googleFonts.length > 0) {
    const linkId = 'branding-google-fonts';
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    const families = googleFonts.map(f => f.replace(/['"]/g, '').replace(/ /g, '+')).join('&family=');
    const href = `https://fonts.googleapis.com/css2?family=${families}:wght@300;400;500;600;700&display=swap`;
    if (link) {
      link.href = href;
    } else {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
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
