import { MetadataRoute } from 'next'
import { comparisonTools } from '@/data/comparisons'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://linear.gratis'

  // Static pages
  const staticPages = [
    '',
    '/login',
    '/features',
    '/comparison',
    '/forms',
    '/profile',
    '/views',
  ]

  // Comparison pages
  const comparisonPages = Object.keys(comparisonTools).map(tool => `/comparison/${tool}`)

  // Use case pages
  const useCases = ['saas', 'agencies', 'startups', 'ecommerce', 'consultancies', 'nonprofits']
  const useCasePages = useCases.map(useCase => `/use-cases/${useCase}`)

  // Template pages
  const templates = [
    'bug-reports',
    'feature-requests',
    'customer-feedback',
    'support-tickets',
    'improvement-suggestions',
    'user-interviews'
  ]
  const templatePages = templates.map(template => `/templates/${template}`)

  // Integration guide pages
  const integrations = [
    'slack',
    'notion',
    'github',
    'zapier',
    'discord',
    'teams',
    'webhooks',
    'api'
  ]
  const integrationPages = integrations.map(integration => `/integrations/${integration}`)

  // Workflow guide pages
  const workflows = [
    'customer-feedback-workflow',
    'bug-tracking-workflow',
    'feature-request-workflow',
    'support-ticket-workflow',
    'public-roadmap-workflow'
  ]
  const workflowPages = workflows.map(workflow => `/guides/${workflow}`)

  // Combine all pages
  const allPages = [
    ...staticPages,
    ...comparisonPages,
    ...useCasePages,
    ...templatePages,
    ...integrationPages,
    ...workflowPages,
  ]

  return allPages.map(page => ({
    url: `${baseUrl}${page}`,
    lastModified: new Date(),
    changeFrequency: page === '' ? 'weekly' : 'monthly',
    priority: getPriority(page),
  }))
}

function getPriority(page: string): number {
  // Homepage
  if (page === '') return 1.0

  // Main features
  if (['/features', '/comparison', '/login'].includes(page)) return 0.9

  // Comparison pages (high SEO value)
  if (page.startsWith('/comparison/')) return 0.8

  // Use case pages (high SEO value)
  if (page.startsWith('/use-cases/')) return 0.8

  // Template pages
  if (page.startsWith('/templates/')) return 0.7

  // Integration guides
  if (page.startsWith('/integrations/')) return 0.7

  // Workflow guides
  if (page.startsWith('/guides/')) return 0.6

  // Other pages
  return 0.5
}