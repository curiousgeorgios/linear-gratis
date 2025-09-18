# Linear Integrations Worker App

A Next.js application that provides a web interface for creating Linear customer requests. This app allows users to submit customer feedback and requests directly to Linear projects through a user-friendly form interface.

## Features

- 🔐 Secure authentication with Supabase
- 📝 Customer request forms with validation
- 🔒 Encrypted Linear API token storage
- 🎨 Modern UI with Tailwind CSS and Radix UI
- 🚀 Deployed on Cloudflare Pages

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Linear API access

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd integrations-worker-app
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Encryption Key (required for security)
ENCRYPTION_KEY=your-base64-encryption-key-here
```

### Generating an Encryption Key

Generate a secure encryption key for protecting stored Linear API tokens:

```bash
openssl rand -base64 32
```

### Supabase Setup

1. Create a new Supabase project
2. Set up authentication (email/password recommended)
3. Create the required database schema by running the migrations in `supabase/migrations`

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment

This app is configured for deployment on Cloudflare Pages:

```bash
# Build for Cloudflare Pages
npm run pages:build

# Preview locally
npm run preview

# Deploy to Cloudflare Pages
npm run deploy
```

## Architecture

### Frontend
- **Next.js 15** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **React Hook Form** - Form handling with validation
- **Framer Motion** - Animation library

### Backend
- **Supabase** - Authentication and database
- **Linear SDK** - Official Linear API client
- **Crypto-JS** - Encryption for sensitive data

### Deployment
- **Cloudflare Pages** - Edge deployment platform
- **Wrangler** - Cloudflare deployment tooling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

If you discover a security vulnerability, please send an email to hello@curiousgeorge.dev. All security vulnerabilities will be promptly addressed.

### Security Best Practices

- Never commit `.env.local` or any files containing secrets
- Rotate your encryption key regularly
- Use environment-specific encryption keys
- Monitor your Linear API token usage
- Enable audit logging in your Supabase project
