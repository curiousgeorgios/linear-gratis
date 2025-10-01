import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useCases } from '@/data/use-cases'
import { generateMetadata as createMetadata, generateUseCaseMetadata } from '@/lib/metadata'
import {
  generateBreadcrumbSchema,
  StructuredDataScript
} from '@/lib/structured-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, ArrowRight, Star, Github, Heart, Users, Target, Workflow, Zap } from 'lucide-react'

interface UseCasePageProps {
  params: Promise<{
    industry: string
  }>
}

export async function generateStaticParams() {
  return Object.keys(useCases).map((industry) => ({
    industry: industry,
  }))
}

export async function generateMetadata({ params }: UseCasePageProps): Promise<Metadata> {
  const resolvedParams = await params
  const useCase = useCases[resolvedParams.industry]

  if (!useCase) {
    return {
      title: 'Use case not found | linear.gratis'
    }
  }

  const seoData = generateUseCaseMetadata(useCase.name)
  return createMetadata(seoData)
}

export default async function UseCasePage({ params }: UseCasePageProps) {
  const resolvedParams = await params
  const useCase = useCases[resolvedParams.industry]

  if (!useCase) {
    notFound()
  }

  // Generate structured data
  const structuredData = [
    generateBreadcrumbSchema(`/use-cases/${useCase.slug}`)
  ]

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
                <Link href="/use-cases" className="text-sm text-muted-foreground hover:text-foreground">
                  All use cases
                </Link>
                <Link href="/comparison" className="text-sm text-muted-foreground hover:text-foreground">
                  Comparisons
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
              <Badge variant="secondary" className="mb-4">
                {useCase.name} use case
              </Badge>
              <h1 className="text-4xl font-bold mb-4">
                {useCase.title}
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {useCase.description}
              </p>
            </div>

            {/* Overview */}
            <Card className="border-border/50 mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {useCase.overview}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Challenges & Solutions */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-border/50 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardHeader>
                  <CardTitle className="text-red-800 dark:text-red-400 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Common challenges
                  </CardTitle>
                  <CardDescription>
                    Issues {useCase.name.toLowerCase()} typically face
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {useCase.challenges.map((challenge, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                        {challenge}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border/50 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardHeader>
                  <CardTitle className="text-green-800 dark:text-green-400 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Linear solutions
                  </CardTitle>
                  <CardDescription>
                    How linear.gratis solves these problems
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {useCase.solutions.map((solution, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        {solution}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Benefits */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Benefits for {useCase.name}
                </CardTitle>
                <CardDescription>
                  What teams achieve with linear.gratis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {useCase.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workflows */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Common workflows</h2>
              <p className="text-muted-foreground">
                How {useCase.name.toLowerCase()} typically use linear.gratis
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {useCase.commonWorkflows.map((workflow, index) => (
                <Card key={index} className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Workflow className="h-5 w-5 text-primary" />
                      {workflow.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3">
                      {workflow.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                            {stepIndex + 1}
                          </div>
                          <span className="text-sm">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Form Templates */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Ready-to-use templates</h2>
              <p className="text-muted-foreground">
                Pre-built forms designed for {useCase.name.toLowerCase()}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {useCase.formTemplates.map((template, index) => (
                <Card key={index} className="border-border/50 hover:border-primary/20 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {template.fields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="text-xs text-muted-foreground border border-border/30 rounded px-2 py-1">
                          {field}
                        </div>
                      ))}
                    </div>
                    <Button size="sm" className="w-full" asChild>
                      <Link href="/login">Use this template</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Integrations */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Popular integrations for {useCase.name}</CardTitle>
                <CardDescription>
                  Tools that work well with linear.gratis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {useCase.integrations.map((integration, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {integration}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Success Story */}
          {useCase.successStory && (
            <div className="max-w-4xl mx-auto mb-12">
              <Card className="border-border/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200/50 dark:border-blue-800/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Success story
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <blockquote className="text-lg italic mb-4">
                    &ldquo;{useCase.successStory.quote}&rdquo;
                  </blockquote>
                  <div className="text-sm text-muted-foreground">
                    <div className="font-medium">{useCase.successStory.company}</div>
                    <div>{useCase.successStory.result}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* CTA section */}
          <div className="max-w-4xl mx-auto text-center">
            <Card className="border-border/50 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">
                  Ready to transform your {useCase.name.toLowerCase()} workflow?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Start collecting structured feedback and managing projects transparently.
                  Completely free, open source, and ready in 2 minutes.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="h-12 px-8">
                    <Link href="/login">
                      Start free now
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

          {/* Related use cases */}
          <div className="max-w-4xl mx-auto mt-16">
            <h3 className="text-xl font-semibold mb-6">Other use cases</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.values(useCases)
                .filter(uc => uc.slug !== useCase.slug)
                .slice(0, 3)
                .map((otherUseCase) => (
                  <Link key={otherUseCase.slug} href={`/use-cases/${otherUseCase.slug}`}>
                    <Card className="border-border/50 hover:border-primary/20 transition-colors cursor-pointer h-full">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-1">Linear for {otherUseCase.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {otherUseCase.description}
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