import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { comparisonTools } from '../src/data/comparisons'
import { integrations } from '../src/data/integrations'
import { templates } from '../src/data/templates'
import { useCases } from '../src/data/use-cases'
import {
  generateComparisonMetadata,
  generateIntegrationMetadata,
  generateMetadata,
  generateTemplateMetadata,
  generateUseCaseMetadata,
} from '../src/lib/metadata'
import {
  generateBreadcrumbSchema,
  generateComparisonArticleSchema,
  generateFAQSchema,
  generateOrganizationSchema,
  generateProductComparisonSchema,
  generateSoftwareApplicationSchema,
  generateWebsiteSchema,
} from '../src/lib/structured-data'

function assertCatalogKeysMatchSlugs<T extends { slug: string }>(catalog: Record<string, T>) {
  for (const [key, entry] of Object.entries(catalog)) {
    assert.equal(entry.slug, key)
    assert.match(entry.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  }
  assert.equal(new Set(Object.values(catalog).map((entry) => entry.slug)).size, Object.keys(catalog).length)
}

describe('static content catalogs', () => {
  test('keys, slugs, and required collections stay internally consistent', () => {
    assertCatalogKeysMatchSlugs(comparisonTools)
    assertCatalogKeysMatchSlugs(integrations)
    assertCatalogKeysMatchSlugs(templates)
    assertCatalogKeysMatchSlugs(useCases)

    for (const tool of Object.values(comparisonTools)) {
      assert.doesNotThrow(() => new URL(tool.website))
      assert.ok(tool.pros.length > 0)
      assert.ok(tool.cons.length > 0)
      assert.ok(tool.bestFor.length > 0)
    }

    for (const integration of Object.values(integrations)) {
      assert.ok(integration.setupSteps.length > 0)
      assert.ok(integration.troubleshooting.length > 0)
      assert.ok(integration.useCases.length > 0)
    }
  })

  test('template fields and previews cannot silently drift apart', () => {
    for (const template of Object.values(templates)) {
      const fieldNames = new Set(template.fields.map((field) => field.name))
      assert.equal(fieldNames.size, template.fields.length)

      for (const field of template.fields) {
        assert.match(field.name, /^[a-z][a-z0-9_]*$/)
        if (field.type === 'select') assert.ok((field.options?.length ?? 0) > 0)
      }

      for (const sampleKey of Object.keys(template.preview.sampleData)) {
        assert.equal(fieldNames.has(sampleKey), true, `${template.slug} preview has unknown field ${sampleKey}`)
      }
    }
  })

  test('use-case workflows always contain actionable steps', () => {
    for (const useCase of Object.values(useCases)) {
      assert.ok(useCase.challenges.length > 0)
      assert.ok(useCase.solutions.length > 0)
      assert.ok(useCase.commonWorkflows.length > 0)
      for (const workflow of useCase.commonWorkflows) assert.ok(workflow.steps.length >= 3)
    }
  })
})

describe('metadata', () => {
  test('catalog metadata canonicals exactly match their generated routes', () => {
    for (const tool of Object.values(comparisonTools)) {
      assert.equal(generateComparisonMetadata(tool.name, tool.slug).canonical, `/comparison/${tool.slug}`)
    }
    for (const integration of Object.values(integrations)) {
      assert.equal(generateIntegrationMetadata(integration.name, integration.slug).canonical, `/integrations/${integration.slug}`)
    }
    for (const template of Object.values(templates)) {
      assert.equal(generateTemplateMetadata(template.name, template.slug).canonical, `/templates/${template.slug}`)
    }
    for (const useCase of Object.values(useCases)) {
      assert.equal(generateUseCaseMetadata(useCase.name, useCase.slug).canonical, `/use-cases/${useCase.slug}`)
    }
  })

  test('fallback slug generation emits URL-safe canonical paths', () => {
    assert.equal(generateComparisonMetadata('Product Board').canonical, '/comparison/product-board')
    assert.equal(generateUseCaseMetadata('Digital Agencies').canonical, '/use-cases/digital-agencies')
    assert.equal(generateIntegrationMetadata('Microsoft Teams').canonical, '/integrations/microsoft-teams')
    assert.equal(generateTemplateMetadata('Customer Feedback').canonical, '/templates/customer-feedback')
  })

  test('Next metadata uses absolute canonicals and stable social defaults', () => {
    const result = generateMetadata({
      title: 'A title',
      description: 'A description',
      canonical: '/features',
    })

    assert.equal(result.alternates?.canonical, 'https://linear.gratis/features')
    assert.equal(result.openGraph?.url, 'https://linear.gratis/features')
    assert.deepEqual(result.openGraph?.images, ['https://linear.gratis/og-image.png'])
    assert.equal((result.twitter as { card?: string } | undefined)?.card, 'summary_large_image')
  })
})

describe('structured data', () => {
  test('base schemas are JSON-serialisable schema.org objects', () => {
    for (const schema of [
      generateOrganizationSchema(),
      generateWebsiteSchema(),
      generateSoftwareApplicationSchema(),
    ]) {
      assert.equal(schema['@context'], 'https://schema.org')
      assert.ok(typeof schema['@type'] === 'string')
      assert.doesNotThrow(() => JSON.stringify(schema))
    }
  })

  test('comparison schemas retain the selected tool identity', () => {
    const tool = comparisonTools.steelsync
    const schemas = [
      generateComparisonArticleSchema(tool),
      generateProductComparisonSchema(tool),
      generateFAQSchema(tool),
    ]

    assert.equal(schemas[0].headline, 'SteelSync vs linear.gratis: Complete comparison 2025')
    assert.equal(schemas[1].name, 'SteelSync')
    assert.equal(schemas[2]['@type'], 'FAQPage')
    for (const schema of schemas) assert.doesNotThrow(() => JSON.stringify(schema))
  })

  test('breadcrumbs are positional, cumulative, and rooted at the homepage', () => {
    const schema = generateBreadcrumbSchema('/use-cases/digital-agencies')
    const items = schema.itemListElement as Array<Record<string, unknown>>

    assert.deepEqual(items.map((item) => item.position), [1, 2, 3])
    assert.deepEqual(items.map((item) => item.name), ['Home', 'Use Cases', 'Digital Agencies'])
    assert.deepEqual(items.map((item) => item.item), [
      'https://linear.gratis',
      'https://linear.gratis/use-cases',
      'https://linear.gratis/use-cases/digital-agencies',
    ])
  })
})
