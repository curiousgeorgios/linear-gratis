import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EstimateIcon, PriorityIcon } from '../src/components/priority-icon'
import { StateIcon, StatusCategoryIcon } from '../src/components/state-icon'
import { Badge, badgeVariants } from '../src/components/ui/badge'
import { Button, buttonVariants } from '../src/components/ui/button'
import { StructuredDataScript } from '../src/lib/structured-data'

describe('Linear-style icon rendering', () => {
  test('priority icons expose canonical accessible labels for every value', () => {
    const cases = [
      [0, 'No priority'],
      [1, 'Urgent'],
      [2, 'High'],
      [3, 'Medium'],
      [4, 'Low'],
      [99, 'No priority'],
    ] as const

    for (const [priority, label] of cases) {
      const markup = renderToStaticMarkup(createElement(PriorityIcon, { priority }))
      assert.match(markup, /role="img"/)
      assert.match(markup, new RegExp(`aria-label="${label}"`))
      assert.match(markup, /viewBox="0 0 16 16"/)
    }

    const custom = renderToStaticMarkup(createElement(PriorityIcon, {
      priority: 1,
      priorityLabel: 'Custom urgent priority',
      className: 'size-5',
    }))
    assert.match(custom, /aria-label="Custom urgent priority"/)
    assert.match(custom, /class="size-5"/)
  })

  test('state icon branches retain their distinct Linear glyph semantics', () => {
    const duplicate = renderToStaticMarkup(createElement(StateIcon, { type: 'duplicate', color: '#123456' }))
    const duplicateByName = renderToStaticMarkup(createElement(StateIcon, { type: 'canceled', name: ' Duplicate ', color: '#123456' }))
    const completed = renderToStaticMarkup(createElement(StateIcon, { type: 'completed', color: '#22c55e' }))
    const started = renderToStaticMarkup(createElement(StateIcon, { type: 'started', color: '#f59e0b' }))
    const backlog = renderToStaticMarkup(createElement(StateIcon, { type: 'backlog', color: '#5e6ad2' }))
    const canceled = renderToStaticMarkup(createElement(StateIcon, { type: 'cancelled', color: '#ef4444' }))
    const unstarted = renderToStaticMarkup(createElement(StateIcon, { type: 'unstarted', color: '' }))

    assert.equal(duplicateByName, duplicate)
    assert.match(completed, /stroke="white"/)
    assert.match(started, /class="progress"/)
    assert.match(started, /stroke-dasharray="12\.189379495928398 24\.378758991856795"/)
    assert.match(backlog, /stroke-dasharray="1\.4 1\.74"/)
    assert.match(canceled, /M5\.3 5\.3l3\.4 3\.4/)
    assert.match(unstarted, /stroke="#9ca3af"/)
  })

  test('category and estimate glyphs remain renderable and sized', () => {
    const estimate = renderToStaticMarkup(createElement(EstimateIcon, { className: 'size-4' }))
    const status = renderToStaticMarkup(createElement(StatusCategoryIcon, { size: 18 }))

    assert.match(estimate, /aria-label="Estimate"/)
    assert.match(estimate, /class="size-4"/)
    assert.match(status, /width="18"/)
    assert.match(status, /height="18"/)
  })
})

describe('shared UI primitives', () => {
  test('button variants preserve focus, disabled, and size contracts', () => {
    const variantClasses = buttonVariants({ variant: 'destructive', size: 'icon' })
    const markup = renderToStaticMarkup(createElement(Button, {
      variant: 'outline',
      size: 'sm',
      disabled: true,
      children: 'Save',
    }))

    assert.match(variantClasses, /focus-visible:ring/)
    assert.match(variantClasses, /size-9/)
    assert.match(markup, /data-slot="button"/)
    assert.match(markup, /disabled=""/)
    assert.match(markup, /h-8/)
    assert.match(markup, />Save<\/button>/)
  })

  test('badges merge semantic colour tokens with explicit caller styles', () => {
    const markup = renderToStaticMarkup(createElement(Badge, {
      variant: 'blue',
      style: { color: 'rgb(1, 2, 3)' },
      children: 'Feature',
    }))

    assert.match(badgeVariants({ variant: 'blue' }), /border-transparent/)
    assert.match(markup, /background-color:var\(--badge-blue-bg\)/)
    assert.match(markup, /color:rgb\(1, 2, 3\)/)
    assert.match(markup, />Feature<\/div>/)
  })

  test('structured-data scripts render a stable JSON array payload', () => {
    const markup = renderToStaticMarkup(createElement(StructuredDataScript, {
      data: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'linear.gratis',
      },
    }))

    assert.match(markup, /type="application\/ld\+json"/)
    assert.match(markup, /"@type": "WebSite"/)
    assert.match(markup, /^<script/)
  })
})
