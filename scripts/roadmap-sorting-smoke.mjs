import assert from 'node:assert/strict'
import { assertNoPageOverflow } from './page-overflow-smoke.mjs'

// Synthetic data keeps public-roadmap regression checks independent of Linear and Supabase.
export async function checkRoadmapSorting(page, baseUrl) {
  const columns = [
    { key: 'planned', label: 'Planned', state_types: ['unstarted'] },
    { key: 'in_progress', label: 'In progress', state_types: ['started'] },
    { key: 'shipped', label: 'Shipped', state_types: ['completed'] },
  ]
  const issues = columns.flatMap((column, columnIndex) => [3, 1, 2].map((age) => ({
    id: `${column.key}-${age}`,
    identifier: `SORT-${columnIndex * 3 + age}`,
    title: `${column.label} ${age}`,
    priority: 0,
    priorityLabel: 'No priority',
    labels: [],
    createdAt: `2026-01-0${age}T0${columnIndex}:00:00Z`,
    updatedAt: '2026-10-29T00:00:00Z',
    state: { id: column.key, name: column.label, color: '#5e6ad2', type: column.state_types[0] },
    project: { id: 'sort-project', name: 'Sorting test' },
  })))
  const data = {
    success: true,
    roadmap: {
      id: 'sorting-test', user_id: 'sorting-owner', name: 'Sorting test', slug: 'sorting-test',
      title: 'Sorting test', layout_type: 'kanban', timeline_granularity: 'month',
      kanban_columns: columns, show_item_descriptions: false, show_item_dates: true,
      show_vote_counts: true, show_comment_counts: false, allow_voting: false,
      allow_comments: false, require_email_for_comments: false, password_protected: false,
    },
    issues,
    voteCounts: Object.fromEntries(issues.map((issue) => [issue.id, issue.id.endsWith('-2') ? 10 : 0])),
    commentCounts: {},
    projects: [{ id: 'sort-project', name: 'Sorting test' }],
  }
  let responseData = data
  const intercept = (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname === '/api/roadmap/sorting-test') {
      void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(responseData) })
    } else if (pathname === '/api/branding/sorting-owner') {
      void request.respond({ status: 200, contentType: 'application/json', body: '{"branding":null}' })
    } else {
      void request.continue()
    }
  }
  const titles = () => page.$$eval('main article h3', (headings) => headings.map((heading) => heading.textContent.trim()))
  const choose = async (index) => {
    await page.click('[role="combobox"][aria-label="Sort roadmap issues"]')
    await page.waitForSelector('[role="option"]')
    await page.keyboard.press('Home', { delay: 50 })
    for (let step = 0; step < index; step++) await page.keyboard.press('ArrowDown', { delay: 50 })
    await page.keyboard.press('Enter', { delay: 50 })
    await page.waitForSelector('[role="option"]', { hidden: true })
  }
  const expectedBoard = (order) => columns.flatMap((column) => order.map((age) => `${column.label} ${age}`))

  await page.setRequestInterception(true)
  page.on('request', intercept)
  try {
    await page.goto(new URL('/roadmap/sorting-test', baseUrl).toString(), { waitUntil: 'networkidle0' })
    await page.waitForSelector('main article')
    assert.deepEqual(await titles(), expectedBoard([2, 3, 1]))
    await choose(1)
    assert.deepEqual(await titles(), expectedBoard([3, 2, 1]))
    await choose(2)
    assert.deepEqual(await titles(), expectedBoard([1, 2, 3]))
    await Promise.all([
      page.waitForResponse((response) => new URL(response.url()).pathname === '/api/roadmap/sorting-test'),
      page.click('button[aria-label="Refresh"]'),
    ])
    await page.waitForFunction(() => !document.querySelector('button[aria-label="Refresh"]').disabled)
    assert.deepEqual(await titles(), expectedBoard([1, 2, 3]))

    await page.click('button[title="Timeline view"]')
    assert.deepEqual(await titles(), [1, 2, 3].flatMap((age) => [`Planned ${age}`, `In progress ${age}`]))
    await choose(1)
    assert.deepEqual(await titles(), [3, 2, 1].flatMap((age) => [`In progress ${age}`, `Planned ${age}`]))
    await page.click('button[title="Kanban view"]')
    assert.deepEqual(await titles(), expectedBoard([3, 2, 1]))

    await page.setViewport({ width: 390, height: 844 })
    await choose(2)
    assert.deepEqual(await titles(), expectedBoard([1, 2, 3]))
    await page.setViewport({ width: 1280, height: 900 })
    responseData = {
      ...data,
      roadmap: { ...data.roadmap, allow_voting: true },
      issues: Array.from({ length: 120 }, (_, index) => {
        const issue = issues[index % issues.length]
        return { ...issue, id: `overflow-${index}`, identifier: `OVERFLOW-${index}`, title: `Overflow issue ${index}` }
      }),
      voteCounts: {},
    }
    await page.reload({ waitUntil: 'networkidle0' })
    await page.waitForSelector('button[aria-label="Upvote this item"]')
    await assertNoPageOverflow(page, 'long roadmap board desktop')
    const columnsScrollable = await page.$$eval('[aria-label="Roadmap board"] > div > div:last-child', (elements) =>
      elements.every((element) => element.scrollHeight > element.clientHeight))
    assert.equal(columnsScrollable, true, 'long roadmap columns must retain their own scrolling')
    await page.setViewport({ width: 390, height: 844 })
    await assertNoPageOverflow(page, 'long roadmap board mobile')
    await page.setViewport({ width: 1280, height: 900 })
    await page.click('button[title="Timeline view"]')
    await assertNoPageOverflow(page, 'long roadmap timeline')
    console.log('[smoke] long roadmap board/timeline stop at the footer; column scrolling remains available.')
    console.log('[smoke] roadmap sorting passed in all three columns, timeline, refresh and mobile keyboard selection.')
  } finally {
    page.off('request', intercept)
    await page.setRequestInterception(false)
  }
}
