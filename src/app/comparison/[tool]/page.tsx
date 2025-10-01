import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { comparisonTools } from '@/data/comparisons'
import { generateMetadata as createMetadata, generateComparisonMetadata } from '@/lib/metadata'
import {
  generateComparisonArticleSchema,
  generateProductComparisonSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
  StructuredDataScript
} from '@/lib/structured-data'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

interface ComparisonPageProps {
  params: Promise<{
    tool: string
  }>
}

export async function generateStaticParams() {
  return Object.keys(comparisonTools).map((tool) => ({
    tool: tool,
  }))
}

export async function generateMetadata({ params }: ComparisonPageProps): Promise<Metadata> {
  const resolvedParams = await params
  const tool = comparisonTools[resolvedParams.tool]

  if (!tool) {
    return {
      title: 'Tool not found | linear.gratis'
    }
  }

  const seoData = generateComparisonMetadata(tool.name)
  return createMetadata(seoData)
}

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const resolvedParams = await params
  const tool = comparisonTools[resolvedParams.tool]

  if (!tool) {
    notFound()
  }

  // Generate structured data
  const structuredData = [
    generateComparisonArticleSchema(tool),
    generateProductComparisonSchema(tool),
    generateFAQSchema(tool),
    generateBreadcrumbSchema(`/comparison/${tool.slug}`)
  ]

  /* const FeatureComparison = ({ toolValue, linearValue, label }: {
    toolValue: boolean | string | number,
    linearValue: boolean | string | number,
    label: string
  }) => (
    <tr className="border-b border-border/50">
      <td className="py-3 text-sm font-medium">{label}</td>
      <td className="py-3 text-center">
        {typeof toolValue === 'boolean' ? (
          toolValue ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />
        ) : (
          <span className="text-sm">{toolValue}</span>
        )}
      </td>
      <td className="py-3 text-center">
        {typeof linearValue === 'boolean' ? (
          linearValue ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />
        ) : (
          <span className="text-sm">{linearValue}</span>
        )}
      </td>
    </tr>
  ) */

  return (
    <>
      <StructuredDataScript data={structuredData} />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">
              {tool.name} vs linear.gratis
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Compare {tool.name} and linear.gratis for Linear customer feedback collection.
            </p>
            <Button asChild size="lg">
              <Link href="/login">
                Start free with linear.gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}