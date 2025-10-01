import { Metadata } from 'next'
import Link from 'next/link'
import { templates } from '@/data/templates'
import { generateMetadata as createMetadata } from '@/lib/metadata'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Settings, Zap, Users, Target, FileText } from 'lucide-react'

export const metadata: Metadata = createMetadata({
  title: 'Linear form templates: Bug reports, feedback & more | linear.gratis',
  description: 'Free Linear form templates for bug reports, feature requests, customer feedback, and support tickets. Ready-to-use templates with Linear integration.',
  keywords: [
    'Linear templates',
    'Linear form templates',
    'bug report template',
    'feature request template',
    'customer feedback template',
    'support ticket template',
    'linear.gratis',
  ],
  canonical: '/templates',
})

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Support: Settings,
  Product: Zap,
  Feedback: Users,
  Research: Target,
}

const categoryDescriptions: Record<string, string> = {
  Support: 'Customer support and technical assistance',
  Product: 'Product development and feature management',
  Feedback: 'Customer feedback and experience collection',
  Research: 'User research and insight gathering',
}

export default function TemplatesPage() {
  const categories = Array.from(new Set(Object.values(templates).map(t => t.category)))

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Support': return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
      case 'Product': return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400'
      case 'Feedback': return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400'
      case 'Research': return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400'
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
              <Link href="/comparison" className="text-sm text-muted-foreground hover:text-foreground">
                Comparisons
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
              Form templates
            </Badge>
            <h1 className="text-4xl font-bold mb-4">
              Ready-to-use Linear form templates
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Professional form templates designed for Linear integration. Copy, customise, and start
              collecting structured feedback in minutes. Completely free forever.
            </p>
          </div>
        </div>

        {/* Template categories */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold mb-8 text-center">Browse by category</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {categories.map((category) => {
              const IconComponent = categoryIcons[category] || FileText
              const templatesInCategory = Object.values(templates).filter(t => t.category === category)

              return (
                <Card key={category} className="border-border/50 hover:border-primary/20 transition-colors">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{category}</CardTitle>
                    <CardDescription className="text-sm">
                      {categoryDescriptions[category]}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Badge className={getCategoryColor(category)} variant="secondary">
                      {templatesInCategory.length} template{templatesInCategory.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* All templates */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold mb-8">All templates</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(templates).map((template) => (
              <Link key={template.slug} href={`/templates/${template.slug}`}>
                <Card className="border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.fields.length} fields
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Key features:</h4>
                        <ul className="space-y-1">
                          {template.benefits.slice(0, 2).map((benefit, index) => (
                            <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                              <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Best for:</h4>
                        <div className="flex flex-wrap gap-1">
                          {template.bestFor.slice(0, 2).map((item, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {item.split(' ')[0]}
                            </Badge>
                          ))}
                          {template.bestFor.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.bestFor.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/30">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>📝 {template.fields.filter(f => f.type === 'textarea').length} text areas</span>
                          <span>📋 {template.fields.filter(f => f.type === 'select').length} dropdowns</span>
                          <span>✅ {template.fields.filter(f => f.required).length} required</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Features section */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
            <CardHeader>
              <CardTitle>What makes our templates special</CardTitle>
              <CardDescription>
                Professional templates designed specifically for Linear integration
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
                      <h4 className="font-medium mb-1">Linear-optimised</h4>
                      <p className="text-sm text-muted-foreground">
                        Designed for perfect Linear integration with priority mapping and labels
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Battle-tested</h4>
                      <p className="text-sm text-muted-foreground">
                        Templates used by real teams with proven results
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Fully customisable</h4>
                      <p className="text-sm text-muted-foreground">
                        Add, remove, or modify fields to match your specific needs
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
                      <h4 className="font-medium mb-1">Setup guidance</h4>
                      <p className="text-sm text-muted-foreground">
                        Complete setup instructions and Linear configuration tips
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Always free</h4>
                      <p className="text-sm text-muted-foreground">
                        No hidden costs, usage limits, or premium versions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Live preview</h4>
                      <p className="text-sm text-muted-foreground">
                        See exactly how each template works before using it
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
                Ready to start collecting feedback?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Choose a template that fits your needs, customise it for your team,
                and start collecting structured feedback in Linear. Setup takes 2 minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="h-12 px-8">
                  <Link href="/login">
                    Start with a template
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8">
                  <Link href="/use-cases">
                    See use cases
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