import { Metadata } from 'next'
import Link from 'next/link'
import { integrations } from '@/data/integrations'
import { generateMetadata as createMetadata } from '@/lib/metadata'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Clock, Star, Zap, Users, Code2, Globe } from 'lucide-react'

export const metadata: Metadata = createMetadata({
  title: 'Linear integrations: Slack, GitHub, Notion & more | linear.gratis',
  description: 'Complete guides for integrating Linear with popular tools. Slack, GitHub, Notion, Zapier, Discord, Teams, webhooks, and API documentation.',
  keywords: [
    'Linear integrations',
    'Linear Slack integration',
    'Linear GitHub integration',
    'Linear Notion integration',
    'Linear API',
    'Linear webhooks',
    'Linear Zapier',
    'linear.gratis',
  ],
  canonical: '/integrations',
})


export default function IntegrationsPage() {
  const categories = Array.from(new Set(Object.values(integrations).map(i => i.category)))

  const getDifficultyVariant = (difficulty: string): "green" | "yellow" | "red" | "gray" => {
    switch (difficulty) {
      case 'Easy': return 'green'
      case 'Medium': return 'yellow'
      case 'Advanced': return 'red'
      default: return 'gray'
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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold">
              linear.gratis
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/use-cases" className="text-sm text-muted-foreground hover:text-foreground">
                Use cases
              </Link>
              <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground">
                Templates
              </Link>
              <Link href="/comparison" className="text-sm text-muted-foreground hover:text-foreground">
                Comparisons
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
            <Badge variant="secondary" className="mb-4">
              Integration guides
            </Badge>
            <h1 className="text-4xl font-bold mb-4">
              Connect Linear with your favourite tools
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Complete setup guides for integrating Linear with popular apps and services.
              Enhance your workflow with powerful automations and seamless data sync.
            </p>
          </div>
        </div>

        {/* Featured integrations */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold mb-8 text-center">Popular integrations</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {['slack', 'github', 'notion', 'zapier'].map((slug) => {
              const integration = integrations[slug]
              if (!integration) return null

              return (
                <Link key={slug} href={`/integrations/${slug}`}>
                  <Card className="border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{getCategoryIcon(integration.category)}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={getDifficultyVariant(integration.difficulty)}>
                            {integration.difficulty}
                          </Badge>
                          {integration.officialSupport && (
                            <Badge variant="green" className="text-xs">
                              Official
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-lg">Linear + {integration.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {integration.overview}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {integration.timeToSetup}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {integration.features.automation ? 'Automation' : 'Manual'}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Key benefits:</h4>
                          <ul className="space-y-1">
                            {integration.benefits.slice(0, 2).map((benefit, index) => (
                              <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                                <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-2">
                          <div className="flex flex-wrap gap-1">
                            {integration.useCases.slice(0, 3).map((useCase, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {useCase.split(' ')[0]}
                              </Badge>
                            ))}
                            {integration.useCases.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{integration.useCases.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* All integrations by category */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold mb-8">All integrations</h2>

          {categories.map((category) => {
            const categoryIntegrations = Object.values(integrations).filter(i => i.category === category)

            return (
              <div key={category} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl">{getCategoryIcon(category)}</span>
                  <h3 className="text-xl font-semibold">{category}</h3>
                  <Badge variant="outline">{categoryIntegrations.length} integration{categoryIntegrations.length !== 1 ? 's' : ''}</Badge>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryIntegrations.map((integration) => (
                    <Link key={integration.slug} href={`/integrations/${integration.slug}`}>
                      <Card className="border-border/50 hover:border-primary/20 transition-colors cursor-pointer h-full">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{integration.name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant={getDifficultyVariant(integration.difficulty)} className="text-xs">
                                {integration.difficulty}
                              </Badge>
                              {integration.officialSupport && (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {integration.overview}
                          </p>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {integration.timeToSetup}
                            </div>
                            <div className="flex items-center gap-1">
                              {integration.features.automation && <Zap className="h-3 w-3 text-green-500" />}
                              {integration.features.bidirectionalSync && <Globe className="h-3 w-3 text-blue-500" />}
                              {integration.features.realTimeNotifications && <Star className="h-3 w-3 text-yellow-500" />}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Integration features overview */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
            <CardHeader>
              <CardTitle>What makes these integrations powerful</CardTitle>
              <CardDescription>
                Built for real teams with real workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center flex-shrink-0">
                      <Zap className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Real-time automation</h4>
                      <p className="text-sm text-muted-foreground">
                        Instant synchronisation and automated workflows
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-950 rounded flex items-center justify-center flex-shrink-0">
                      <Globe className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Bidirectional sync</h4>
                      <p className="text-sm text-muted-foreground">
                        Data flows both ways for complete synchronisation
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-100 dark:bg-purple-950 rounded flex items-center justify-center flex-shrink-0">
                      <Code2 className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Developer-friendly</h4>
                      <p className="text-sm text-muted-foreground">
                        APIs, webhooks, and custom integration options
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-orange-100 dark:bg-orange-950 rounded flex items-center justify-center flex-shrink-0">
                      <Star className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Enterprise ready</h4>
                      <p className="text-sm text-muted-foreground">
                        Security, compliance, and scale for large teams
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-100 dark:bg-red-950 rounded flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Team collaboration</h4>
                      <p className="text-sm text-muted-foreground">
                        Enhanced communication and workflow visibility
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-950 rounded flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Quick setup</h4>
                      <p className="text-sm text-muted-foreground">
                        Most integrations ready in under 20 minutes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA section */}
        <div className="max-w-4xl mx-auto text-center">
          <Card className="border-border/50 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">
                Ready to supercharge your Linear workflow?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Start with linear.gratis and connect your favourite tools. Most integrations
                work out of the box with your existing Linear setup.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="h-12 px-8">
                  <Link href="/login">
                    Start free setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8">
                  <Link href="/use-cases">
                    Browse use cases
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}