import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { templates } from '@/data/templates'
import { generateMetadata as createMetadata, generateTemplateMetadata } from '@/lib/metadata'
import {
  generateBreadcrumbSchema,
  StructuredDataScript
} from '@/lib/structured-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Check, ArrowRight, Github, Settings, Zap, Users, Target } from 'lucide-react'

interface TemplatePageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  return Object.keys(templates).map((slug) => ({
    slug: slug,
  }))
}

export async function generateMetadata({ params }: TemplatePageProps): Promise<Metadata> {
  const resolvedParams = await params
  const template = templates[resolvedParams.slug]

  if (!template) {
    return {
      title: 'Template not found | linear.gratis'
    }
  }

  const seoData = generateTemplateMetadata(template.name)
  return createMetadata(seoData)
}

export default async function TemplatePage({ params }: TemplatePageProps) {
  const resolvedParams = await params
  const template = templates[resolvedParams.slug]

  if (!template) {
    notFound()
  }

  // Generate structured data
  const structuredData = [
    generateBreadcrumbSchema(`/templates/${template.slug}`)
  ]

  const getCategoryVariant = (category: string): "blue" | "green" | "purple" | "orange" | "gray" => {
    switch (category) {
      case 'Support': return 'blue'
      case 'Product': return 'green'
      case 'Feedback': return 'purple'
      case 'Research': return 'orange'
      default: return 'gray'
    }
  }

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'textarea': return '📝'
      case 'select': return '📋'
      case 'email': return '📧'
      case 'url': return '🔗'
      case 'number': return '🔢'
      default: return '📄'
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
                <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground">
                  All templates
                </Link>
                <Link href="/use-cases" className="text-sm text-muted-foreground hover:text-foreground">
                  Use cases
                </Link>
                <Link href="/comparison" className="text-sm text-muted-foreground hover:text-foreground">
                  Comparisons
                </Link>
                <Button asChild size="sm">
                  <Link href="/login">Use this template</Link>
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
                <Badge variant={getCategoryVariant(template.category)}>
                  {template.category}
                </Badge>
                <Badge variant="outline">
                  Template
                </Badge>
              </div>
              <h1 className="text-4xl font-bold mb-4">
                {template.title}
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {template.description}
              </p>
            </div>

            {/* Overview */}
            <Card className="border-border/50 mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Template overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {template.overview}
                </p>
                <div className="flex flex-wrap gap-2">
                  {template.useCases.slice(0, 3).map((useCase, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {useCase}
                    </Badge>
                  ))}
                  {template.useCases.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.useCases.length - 3} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Template preview and form structure */}
          <div className="max-w-7xl mx-auto mb-12">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Form Preview */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Live preview</h2>
                <Card className="border-border/50 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>your-form-url.com/{template.slug}</span>
                    </div>
                    <CardTitle className="text-lg">
                      {template.name} Form
                    </CardTitle>
                    <CardDescription>
                      {template.overview}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                    {template.fields.map((field, index) => (
                      <div key={index}>
                        <label className="text-sm font-medium flex items-center gap-1">
                          {field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <Textarea
                            placeholder={field.placeholder}
                            value={template.preview.sampleData[field.name] || ''}
                            className="mt-1"
                            readOnly
                          />
                        ) : field.type === 'select' ? (
                          <div className="mt-1 p-2 border border-border rounded-md text-sm bg-muted">
                            {template.preview.sampleData[field.name] || field.placeholder}
                          </div>
                        ) : (
                          <Input
                            placeholder={field.placeholder}
                            value={template.preview.sampleData[field.name] || ''}
                            className="mt-1"
                            readOnly
                          />
                        )}
                        {field.description && (
                          <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                        )}
                      </div>
                    ))}
                    <Button className="w-full" disabled>
                      Submit {template.name}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Form Structure */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Form structure</h2>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Fields included ({template.fields.length})
                    </CardTitle>
                    <CardDescription>
                      All fields in this template with their types and settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {template.fields.map((field, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border border-border/30 rounded-lg">
                          <div className="text-lg">{getFieldIcon(field.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">
                                {field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </h4>
                              {field.required && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">{field.type}</Badge>
                            </div>
                            {field.description && (
                              <p className="text-xs text-muted-foreground">{field.description}</p>
                            )}
                            {field.options && (
                              <div className="mt-2">
                                <p className="text-xs font-medium mb-1">Options:</p>
                                <div className="flex flex-wrap gap-1">
                                  {field.options.slice(0, 3).map((option, optIndex) => (
                                    <span key={optIndex} className="text-xs bg-muted px-1 py-0.5 rounded">
                                      {option}
                                    </span>
                                  ))}
                                  {field.options.length > 3 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{field.options.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Benefits and Best For */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-border/50 bg-gradient-to-br from-green-50/50 to-blue-50/50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200/50 dark:border-green-800/50">
                <CardHeader>
                  <CardTitle className="text-green-800 dark:text-green-400 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Benefits
                  </CardTitle>
                  <CardDescription>
                    What you get with this template
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {template.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200/50 dark:border-blue-800/50">
                <CardHeader>
                  <CardTitle className="text-blue-800 dark:text-blue-400 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Best for
                  </CardTitle>
                  <CardDescription>
                    Teams that get the most value from this template
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {template.bestFor.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Linear Setup */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Linear integration setup
                </CardTitle>
                <CardDescription>
                  Recommended Linear configuration for this template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Recommended labels</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.linearSetup.recommendedLabels.map((label, index) => (
                        <Badge key={index} variant="outline" className="text-sm">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Priority mapping</h4>
                    <div className="space-y-2 text-sm">
                      {Object.entries(template.linearSetup.priorityMapping).map(([key, value], index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-muted-foreground">{key}</span>
                          <Badge variant="outline" className="text-xs">Priority {value}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {template.integrationTips.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border/30">
                    <h4 className="font-medium mb-3">Integration tips</h4>
                    <ul className="space-y-2">
                      {template.integrationTips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CTA section */}
          <div className="max-w-4xl mx-auto text-center">
            <Card className="border-border/50 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">
                  Ready to use this template?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Start collecting structured {template.category.toLowerCase()} with this proven template.
                  Completely free, ready in 2 minutes.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="h-12 px-8">
                    <Link href="/login">
                      Use this template
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

          {/* Related templates */}
          <div className="max-w-4xl mx-auto mt-16">
            <h3 className="text-xl font-semibold mb-6">Related templates</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.values(templates)
                .filter(t => t.slug !== template.slug && t.category === template.category)
                .slice(0, 3)
                .map((relatedTemplate) => (
                  <Link key={relatedTemplate.slug} href={`/templates/${relatedTemplate.slug}`}>
                    <Card className="border-border/50 hover:border-primary/20 transition-colors cursor-pointer h-full">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getCategoryVariant(relatedTemplate.category)}>
                            {relatedTemplate.category}
                          </Badge>
                        </div>
                        <h4 className="font-medium mb-1">{relatedTemplate.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {relatedTemplate.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}