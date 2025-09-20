import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // For development, we'll use a simple HTML generation approach
    // In production, you'd want to use @vercel/og or puppeteer

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>linear.gratis - OG Image</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');

        :root {
            --background: #fafafa;
            --foreground: #171717;
            --primary: #5e6ad2;
            --primary-foreground: #ffffff;
            --muted-foreground: #71717a;
            --border: #e4e4e7;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            width: 1200px;
            height: 630px;
            font-family: 'Geist', sans-serif;
            background: linear-gradient(135deg,
                hsl(262.1 90% 50% / 0.03) 0%,
                hsl(240 4.8% 95.9% / 0.01) 50%,
                hsl(262.1 90% 50% / 0.02) 100%);
            background-color: var(--background);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
            color: var(--foreground);
        }

        .container {
            text-align: center;
            z-index: 2;
            max-width: 900px;
            padding: 0 40px;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            background: hsla(262.1 90% 50% / 0.1);
            color: var(--primary);
            border: 1px solid hsla(262.1 90% 50% / 0.2);
            border-radius: 32px;
            padding: 12px 24px;
            font-size: 20px;
            font-weight: 500;
            margin-bottom: 40px;
        }

        .github-icon {
            width: 20px;
            height: 20px;
            margin-right: 12px;
            fill: currentColor;
        }

        .title {
            font-size: 72px;
            font-weight: 700;
            line-height: 1.1;
            margin-bottom: 40px;
            background: linear-gradient(to right, var(--foreground), var(--foreground), var(--muted-foreground));
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .title-highlight {
            color: var(--primary);
            background: none;
            -webkit-text-fill-color: var(--primary);
        }

        .subtitle {
            font-size: 20px;
            color: var(--muted-foreground);
            line-height: 1.6;
            margin-bottom: 32px;
            max-width: 700px;
            margin-left: auto;
            margin-right: auto;
        }

        .cta-buttons {
            display: flex;
            gap: 16px;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
        }

        .btn-primary {
            background: var(--primary);
            color: var(--primary-foreground);
            border: none;
            border-radius: 12px;
            padding: 20px 32px;
            font-size: 22px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
        }

        .btn-secondary {
            background: transparent;
            color: var(--foreground);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px 32px;
            font-size: 22px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
        }

        .icon {
            width: 24px;
            height: 24px;
        }

        .stats {
            display: flex;
            justify-content: center;
            gap: 64px;
            margin-top: 48px;
            font-size: 18px;
            color: var(--muted-foreground);
        }

        .stat-item {
            display: flex;
            align-items: center;
            gap: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="badge">
            <svg class="github-icon" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            Free & Open Source
        </div>

        <h1 class="title">
            Stop losing customer feedback in<br>
            <span class="title-highlight">Slack and email</span>
        </h1>

        <div class="cta-buttons">
            <div class="btn-primary">
                Start collecting feedback
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </div>
            <div class="btn-secondary">
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
                Star on GitHub
            </div>
        </div>

        <div class="stats">
            <div class="stat-item">
                💬 Free Forever
            </div>
            <div class="stat-item">
                ⚡ No Limits
            </div>
            <div class="stat-item">
                🔧 Self-Hostable
            </div>
        </div>
    </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating OG image:', error);
    return NextResponse.json({ error: 'Failed to generate OG image' }, { status: 500 });
  }
}