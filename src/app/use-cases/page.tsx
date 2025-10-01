import { Metadata } from 'next'
import Link from 'next/link'
import { useCases } from '@/data/use-cases'
import { generateMetadata as createMetadata } from '@/lib/metadata'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Users, Building, Zap, Heart, Target, Briefcase } from 'lucide-react'

export const metadata: Metadata = createMetadata({
  title: 'Linear use cases: SaaS, agencies, startups & more | linear.gratis',
  description: 'Discover how different industries use Linear for customer feedback and project management. Templates, workflows, and best practices for every team.',
  keywords: [
    'Linear use cases',
    'Linear for SaaS',
    'Linear for agencies',
    'Linear for startups',
    'Linear workflows',
    'customer feedback use cases',
    'linear.gratis',
  ],
  canonical: '/use-cases',
})

const industryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  saas: Zap,
  agencies: Briefcase,
  startups: Target,
  ecommerce: Users,
  consultancies: Building,
  nonprofits: Heart,
}

export default function UseCasesPage() {
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
              <Link href="/comparison" className="text-sm text-muted-foreground hover:text-foreground">
                Comparisons
              </Link>
              <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground">
                Templates
              </Link>
              <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground">
                Features
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
              Use cases
            </Badge>
            <h1 className="text-4xl font-bold mb-4">
              Linear for every industry
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover how different teams use linear.gratis to collect customer feedback,
              manage projects, and build better products. Free templates and workflows included.
            </p>
          </div>
        </div>

        {/* Use cases grid */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(useCases).map((useCase) => {
              const IconComponent = industryIcons[useCase.slug] || Users

              return (
                <Link key={useCase.slug} href={`/use-cases/${useCase.slug}`}>
                  <Card className="border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{useCase.name}</CardTitle>
                      </div>
                      <CardDescription className="line-clamp-3">
                        {useCase.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Key benefits:</h4>
                          <ul className="space-y-1">
                            {useCase.benefits.slice(0, 2).map((benefit, index) => (
                              <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                                <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Templates included:</h4>
                          <div className="flex flex-wrap gap-1">
                            {useCase.formTemplates.slice(0, 2).map((template, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {template.name}
                              </Badge>
                            ))}
                            {useCase.formTemplates.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{useCase.formTemplates.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        {useCase.successStory && (
                          <div className="pt-3 border-t border-border/30">
                            <p className="text-xs italic text-muted-foreground">
                              &ldquo;{useCase.successStory.quote.slice(0, 80)}...&rdquo;
                            </p>
                            <p className="text-xs font-medium mt-1">
                              — {useCase.successStory.company}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Common features section */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
            <CardHeader>
              <CardTitle>What all industries get with linear.gratis</CardTitle>
              <CardDescription>
                Core features that work for every team and use case
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Custom feedback forms</h4>
                      <p className="text-sm text-muted-foreground">
                        Create unlimited forms tailored to your specific needs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Public Linear views</h4>
                      <p className="text-sm text-muted-foreground">
                        Share progress transparently with customers and stakeholders
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Direct Linear integration</h4>
                      <p className="text-sm text-muted-foreground">
                        Feedback automatically creates Linear issues with full context
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Always free</h4>
                      <p className="text-sm text-muted-foreground">
                        No hidden costs, usage limits, or premium features
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Open source</h4>
                      <p className="text-sm text-muted-foreground">
                        Transparent code you can trust and contribute to
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Ready in 2 minutes</h4>
                      <p className="text-sm text-muted-foreground">
                        Simple setup with your Linear API token and you&apos;re ready
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
                Ready to get started?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Choose your industry to see specific templates and workflows,
                or start with the general setup. Completely free forever.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="h-12 px-8">
                  <Link href="/login">
                    Start free now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8">
                  <Link href="/templates">
                    Browse templates
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