import assert from 'node:assert/strict'

export async function assertNoPageOverflow(page, label) {
  const bounds = await page.evaluate(() => {
    const footer = document.querySelector('footer')
    const bodyEnd = document.body.getBoundingClientRect().bottom + window.scrollY
    const footerEnd = footer ? footer.getBoundingClientRect().bottom + window.scrollY : bodyEnd
    return {
      pageEnd: document.documentElement.scrollHeight,
      contentEnd: Math.max(window.innerHeight, Math.min(bodyEnd, footerEnd)),
    }
  })
  assert.ok(bounds.pageEnd - bounds.contentEnd <= 2,
    `${label}: ${Math.round(bounds.pageEnd - bounds.contentEnd)}px of page scroll extends beyond the content/footer`)
}
