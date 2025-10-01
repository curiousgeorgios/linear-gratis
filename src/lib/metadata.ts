import { Metadata } from 'next'

export interface SeoData {
  title: string
  description: string
  keywords?: string[]
  canonical?: string
  openGraph?: {
    title?: string
    description?: string
    type?: 'website' | 'article'
    images?: string[]
  }
  twitter?: {
    title?: string
    description?: string
  }
}

export function generateMetadata(seoData: SeoData): Metadata {
  const baseUrl = 'https://linear.gratis'

  return {
    title: seoData.title,
    description: seoData.description,
    keywords: seoData.keywords,
    alternates: seoData.canonical ? {
      canonical: `${baseUrl}${seoData.canonical}`
    } : undefined,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: seoData.openGraph?.title || seoData.title,
      description: seoData.openGraph?.description || seoData.description,
      type: seoData.openGraph?.type || 'website',
      url: seoData.canonical ? `${baseUrl}${seoData.canonical}` : baseUrl,
      siteName: 'linear.gratis',
      images: seoData.openGraph?.images || [`${baseUrl}/og-image.png`],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoData.twitter?.title || seoData.title,
      description: seoData.twitter?.description || seoData.description,
      images: seoData.openGraph?.images || [`${baseUrl}/og-image.png`],
      creator: '@curiousgeorgios',
    },
  }
}

// Comparison page metadata
export function generateComparisonMetadata(toolName: string): SeoData {
  const title = `${toolName} vs Linear: Complete comparison 2025 | linear.gratis`
  const description = `Compare ${toolName} and Linear for issue tracking and customer feedback. Features, pricing, pros & cons. Free Linear alternative at linear.gratis.`
  const ogImageUrl = `/api/og?type=comparison&title=${encodeURIComponent(`${toolName} vs linear.gratis`)}&subtitle=${encodeURIComponent(`Compare features, pricing, and capabilities`)}&category=${encodeURIComponent('Tool Comparison')}`

  return {
    title,
    description,
    keywords: [
      `${toolName} vs Linear`,
      `${toolName} alternative`,
      `Linear alternative`,
      `issue tracking comparison`,
      `customer feedback tools`,
      'linear.gratis',
      'free Linear',
    ],
    canonical: `/comparison/${toolName.toLowerCase()}`,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [ogImageUrl],
    },
  }
}

// Use case page metadata
export function generateUseCaseMetadata(industry: string): SeoData {
  const title = `Linear for ${industry}: Complete setup guide 2025 | linear.gratis`
  const description = `How to use Linear for ${industry} teams. Templates, workflows, and best practices. Get started with free Linear forms at linear.gratis.`
  const ogImageUrl = `/api/og?type=use-case&title=${encodeURIComponent(`Linear for ${industry}`)}&subtitle=${encodeURIComponent(`Templates, workflows, and best practices`)}&category=${encodeURIComponent('Use Case Guide')}`

  return {
    title,
    description,
    keywords: [
      `Linear for ${industry}`,
      `${industry} project management`,
      `${industry} issue tracking`,
      `Linear workflows ${industry}`,
      'linear.gratis',
      'Linear templates',
    ],
    canonical: `/use-cases/${industry.toLowerCase()}`,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [ogImageUrl],
    },
  }
}

// Integration guide metadata
export function generateIntegrationMetadata(toolName: string): SeoData {
  const title = `Linear + ${toolName} integration: Complete guide 2025 | linear.gratis`
  const description = `Connect Linear with ${toolName}. Step-by-step integration guide, automation ideas, and best practices. Start with linear.gratis.`
  const ogImageUrl = `/api/og?type=integration&title=${encodeURIComponent(`Linear + ${toolName}`)}&subtitle=${encodeURIComponent(`Complete integration guide and setup`)}&category=${encodeURIComponent('Integration Guide')}`

  return {
    title,
    description,
    keywords: [
      `Linear ${toolName} integration`,
      `${toolName} Linear`,
      'Linear integrations',
      'Linear automation',
      'linear.gratis',
      `connect Linear ${toolName}`,
    ],
    canonical: `/integrations/${toolName.toLowerCase()}`,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [ogImageUrl],
    },
  }
}

// Template page metadata
export function generateTemplateMetadata(templateType: string): SeoData {
  const title = `${templateType} template for Linear: Free forms | linear.gratis`
  const description = `Free ${templateType} template for Linear. Pre-built forms and workflows. Get started instantly with linear.gratis.`
  const ogImageUrl = `/api/og?type=template&title=${encodeURIComponent(`${templateType} Template`)}&subtitle=${encodeURIComponent(`Ready-to-use Linear form template`)}&category=${encodeURIComponent('Form Template')}`

  return {
    title,
    description,
    keywords: [
      `${templateType} template`,
      `Linear ${templateType}`,
      'Linear templates',
      'Linear forms',
      'linear.gratis',
      'free Linear templates',
    ],
    canonical: `/templates/${templateType.toLowerCase().replace(/\s+/g, '-')}`,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [ogImageUrl],
    },
  }
}