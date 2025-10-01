import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { integrations } from '@/data/integrations'
import { generateMetadata as createMetadata, generateIntegrationMetadata } from '@/lib/metadata'
import {
  generateBreadcrumbSchema,
  StructuredDataScript
} from '@/lib/structured-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X, ArrowRight, Star, Github, Clock, Zap, AlertTriangle, Code2, Lightbulb, HelpCircle } from 'lucide-react'

interface IntegrationPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  return Object.keys(integrations).map((slug) => ({
    slug: slug,
  }))
}

export async function generateMetadata({ params }: IntegrationPageProps): Promise<Metadata> {
  const resolvedParams = await params
  const integration = integrations[resolvedParams.slug]

  if (!integration) {
    return {
      title: 'Integration not found | linear.gratis'
    }
  }

  const seoData = generateIntegrationMetadata(integration.name)
  return createMetadata(seoData)
}

export default async function IntegrationPage({ params }: IntegrationPageProps) {
  const resolvedParams = await params
  const integration = integrations[resolvedParams.slug]

  if (!integration) {
    notFound()
  }

  // Generate structured data
  const structuredData = [
    generateBreadcrumbSchema(`/integrations/${integration.slug}`)
  ]

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400'
      case 'Advanced': return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Team Communication': return '💬'
      case 'Documentation': return '📝'
      case 'Development': return '⚡'
      case 'Automation': return '🔄'
      case 'Community': return '👥'
      case 'Enterprise Communication': return '🏢'
      case 'Developer Tools': return '🛠️'
      default: return '🔗'
    }
  }

  return (
    <>
      <StructuredDataScript data={structuredData} />
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-xl font-semibold">
                linear.gratis
              </Link>
              <div className="flex items-center gap-4">
                <Link href="/integrations" className="text-sm text-muted-foreground hover:text-foreground">
                  All integrations
                </Link>
                <Link href="/use-cases" className="text-sm text-muted-foreground hover:text-foreground">
                  Use cases
                </Link>
                <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground">
                  Templates
                </Link>
                <Button asChild size="sm">
                  <Link href="/login">Get started free</Link>
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-12">
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-2xl">{getCategoryIcon(integration.category)}</span>
                <Badge variant="secondary">
                  {integration.category}
                </Badge>
                <Badge className={getDifficultyColor(integration.difficulty)}>
                  {integration.difficulty}
                </Badge>
                {integration.officialSupport && (
                  <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                    ✓ Official
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold mb-4">
                {integration.title}
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {integration.description}
              </p>
            </div>

            {/* Quick stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card className="border-border/50 text-center">
                <CardContent className="p-4">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="font-medium">{integration.timeToSetup}</div>
                  <div className="text-xs text-muted-foreground">Setup time</div>
                </CardContent>
              </Card>

              <Card className="border-border/50 text-center">
                <CardContent className="p-4">
                  <Zap className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="font-medium">{integration.difficulty}</div>
                  <div className="text-xs text-muted-foreground">Difficulty</div>
                </CardContent>
              </Card>

              <Card className="border-border/50 text-center">
                <CardContent className="p-4">
                  <Star className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="font-medium">{integration.officialSupport ? 'Official' : 'Community'}</div>
                  <div className="text-xs text-muted-foreground">Support</div>
                </CardContent>
              </Card>
            </div>

            {/* Overview */}
            <Card className="border-border/50 mb-8">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {integration.overview}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Features & Benefits */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Features */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Bidirectional sync</span>
                      {integration.features.bidirectionalSync ?
                        <Check className="h-4 w-4 text-green-500" /> :
                        <X className="h-4 w-4 text-red-500" />
                      }
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Automation</span>
                      {integration.features.automation ?
                        <Check className="h-4 w-4 text-green-500" /> :
                        <X className="h-4 w-4 text-red-500" />
                      }
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Real-time notifications</span>
                      {integration.features.realTimeNotifications ?
                        <Check className="h-4 w-4 text-green-500" /> :
                        <X className="h-4 w-4 text-red-500" />
                      }
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Custom fields</span>
                      {integration.features.customFields ?
                        <Check className="h-4 w-4 text-green-500" /> :
                        <X className="h-4 w-4 text-red-500" />
                      }
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Bulk operations</span>
                      {integration.features.bulkOperations ?
                        <Check className="h-4 w-4 text-green-500" /> :
                        <X className="h-4 w-4 text-red-500" />
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Benefits & Limitations */}
              <div className="space-y-6">
                <Card className="border-border/50 bg-gradient-to-br from-green-50/50 to-blue-50/50 dark:from-green-950/20 dark:to-blue-950/20">
                  <CardHeader>
                    <CardTitle className="text-green-800 dark:text-green-400 text-lg">Benefits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {integration.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20">
                  <CardHeader>
                    <CardTitle className="text-orange-800 dark:text-orange-400 text-lg">Limitations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {integration.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          {limitation}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-primary" />
                  Setup guide
                </CardTitle>
                <CardDescription>
                  Step-by-step instructions to integrate {integration.name} with Linear
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {integration.setupSteps.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">{step.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                        {step.codeExample && (
                          <div className="bg-muted rounded-lg p-3 text-sm font-mono overflow-x-auto">
                            <pre>{step.codeExample}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Automation Ideas */}
          <div className="max-w-6xl mx-auto mb-12">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Automation ideas
                </CardTitle>
                <CardDescription>
                  Popular automation workflows you can set up
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {integration.automationIdeas.map((idea, index) => (
                    <div key={index} className="p-4 border border-border/30 rounded-lg">
                      <h4 className="font-medium mb-2 text-sm">
                        {idea.useCase}
                      </h4>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div>
                          <strong>Trigger:</strong> {idea.trigger}
                        </div>
                        <div>
                          <strong>Action:</strong> {idea.action}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Troubleshooting */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Troubleshooting
                </CardTitle>
                <CardDescription>
                  Common issues and their solutions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {integration.troubleshooting.map((item, index) => (
                    <div key={index} className="border-l-4 border-primary/20 pl-4">
                      <h4 className="font-medium mb-1 text-sm">{item.issue}</h4>
                      <p className="text-sm text-muted-foreground">{item.solution}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Use Cases */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Use cases</CardTitle>
                <CardDescription>
                  Perfect for teams working on
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {integration.useCases.map((useCase, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {useCase}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="max-w-4xl mx-auto text-center">
            <Card className="border-border/50 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">
                  Ready to integrate {integration.name}?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Start with linear.gratis and connect your {integration.name} workflow.
                  Free setup, no limits, ready in minutes.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="h-12 px-8">
                    <Link href="/login">
                      Start free setup
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-12 px-8">
                    <Link href="https://github.com/curiousgeorgios/linear-gratis" target="_blank">
                      <Github className="mr-2 h-4 w-4" />
                      View on GitHub
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Related integrations */}
          <div className="max-w-4xl mx-auto mt-16">
            <h3 className="text-xl font-semibold mb-6">Related integrations</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {integration.relatedIntegrations.slice(0, 3).map((relatedSlug) => {
                const related = integrations[relatedSlug]
                if (!related) return null

                return (
                  <Link key={relatedSlug} href={`/integrations/${relatedSlug}`}>
                    <Card className="border-border/50 hover:border-primary/20 transition-colors cursor-pointer h-full">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getCategoryIcon(related.category)}</span>
                          <Badge className={getDifficultyColor(related.difficulty)} variant="secondary">
                            {related.difficulty}
                          </Badge>
                        </div>
                        <h4 className="font-medium mb-1">Linear + {related.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {related.overview}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}