import { Metadata } from 'next'
import Link from 'next/link'
import { templates } from '@/data/templates'
import { generateMetadata as createMetadata } from '@/lib/metadata'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Settings, Zap, Users, Target, FileText } from 'lucide-react'
import { getT } from '@/lib/i18n/server'

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

export default async function TemplatesPage() {
  const tr = await getT()

  const categories = Array.from(new Set(Object.values(templates).map(t => t.category)))

  const getCategoryVariant = (category: string): "blue" | "green" | "purple" | "orange" | "gray" => {
    switch (category) {
      case 'Support': return 'blue'
      case 'Product': return 'green'
      case 'Feedback': return 'purple'
      case 'Research': return 'orange'
      default: return 'gray'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold">
              {tr("linear.gratis")}
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/use-cases" className="text-sm text-muted-foreground hover:text-foreground">
                {tr("Use cases")}
              </Link>
              <Link href="/comparison" className="text-sm text-muted-foreground hover:text-foreground">
                {tr("Comparisons")}
              </Link>
              <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground">
                {tr("Features")}
              </Link>
              <Button asChild size="sm">
                <Link href="/login">{tr("Get started free")}</Link>
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
              {tr("Form templates")}
            </Badge>
            <h1 className="text-4xl font-bold mb-4">
              {tr("Ready-to-use Linear form templates")}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {tr("Professional form templates designed for Linear integration. Copy, customise, and start collecting structured feedback in minutes. Completely free forever.")}
            </p>
          </div>
        </div>

        {/* Template categories */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold mb-8 text-center">{tr("Browse by category")}</h2>
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
                    <Badge variant={getCategoryVariant(category)}>
                      {templatesInCategory.length} {tr("template")}{templatesInCategory.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* All templates */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold mb-8">{tr("All templates")}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(templates).map((template) => (
              <Link key={template.slug} href={`/templates/${template.slug}`}>
                <Card className="border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={getCategoryVariant(template.category)}>
                        {template.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.fields.length} {tr("fields")}
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
                        <h4 className="text-sm font-medium mb-2">{tr("Key features:")}</h4>
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
                        <h4 className="text-sm font-medium mb-2">{tr("Best for:")}</h4>
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
                          <span>📝 {template.fields.filter(f => f.type === 'textarea').length} {tr("text areas")}</span>
                          <span>📋 {template.fields.filter(f => f.type === 'select').length} {tr("dropdowns")}</span>
                          <span>✅ {template.fields.filter(f => f.required).length} {tr("required")}</span>
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
              <CardTitle>{tr("What makes our templates special")}</CardTitle>
              <CardDescription>
                {tr("Professional templates designed specifically for Linear integration")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[var(--badge-green-bg)] rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">{tr("Linear-optimised")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {tr("Designed for perfect Linear integration with priority mapping and labels")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[var(--badge-green-bg)] rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">{tr("Battle-tested")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {tr("Templates used by real teams with proven results")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[var(--badge-green-bg)] rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">{tr("Fully customisable")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {tr("Add, remove, or modify fields to match your specific needs")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[var(--badge-green-bg)] rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">{tr("Setup guidance")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {tr("Complete setup instructions and Linear configuration tips")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[var(--badge-green-bg)] rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">{tr("Always free")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {tr("No hidden costs, usage limits, or premium versions")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[var(--badge-green-bg)] rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">{tr("Live preview")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {tr("See exactly how each template works before using it")}
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
                {tr("Ready to start collecting feedback?")}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                {tr("Choose a template that fits your needs, customise it for your team, and start collecting structured feedback in Linear. Setup takes 2 minutes.")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="h-12 px-8">
                  <Link href="/login">
                    {tr("Start with a template")}
                    <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8">
                  <Link href="/use-cases">
                    {tr("See use cases")}
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