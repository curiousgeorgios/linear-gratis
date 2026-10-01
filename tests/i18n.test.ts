import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, test } from 'node:test'
import { directionOf, intlLocaleOf, resolveLocale } from '../src/lib/i18n/config'
import { ar } from '../src/lib/i18n/messages/ar'
import { createTranslator, normaliseMessage, translate } from '../src/lib/i18n/translate'
import { parseAuthMethods } from '../src/lib/auth-methods'

const SRC = path.resolve(process.cwd(), 'src')

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? walk(path.join(dir, entry.name)) : Promise.resolve([path.join(dir, entry.name)]),
    ),
  )
  return nested.flat()
}

describe('locale resolution', () => {
  test('explicit cookie wins, then deployment default, then Accept-Language', () => {
    assert.equal(resolveLocale({ cookie: 'ar', configuredDefault: 'en', acceptLanguage: 'en-US' }), 'ar')
    assert.equal(resolveLocale({ cookie: 'xx', configuredDefault: 'ar', acceptLanguage: 'en-US' }), 'ar')
    assert.equal(resolveLocale({ acceptLanguage: 'fr-FR,ar-EG;q=0.8,en;q=0.5' }), 'ar')
    assert.equal(resolveLocale({ acceptLanguage: 'de-DE,fr;q=0.8' }), 'en')
    assert.equal(resolveLocale({}), 'en')
  })

  test('Arabic is right-to-left and formats with Latin digits', () => {
    assert.equal(directionOf('ar'), 'rtl')
    assert.equal(directionOf('en'), 'ltr')
    assert.equal(intlLocaleOf('ar'), 'ar-u-nu-latn')
    assert.match(new Date(Date.UTC(2026, 0, 5)).toLocaleDateString(intlLocaleOf('ar'), { day: 'numeric', timeZone: 'UTC' }), /^5$/)
  })
})

describe('translate', () => {
  test('falls back to the English source and interpolates variables', () => {
    assert.equal(translate('en', 'Hello {name}', { name: 'Sam' }), 'Hello Sam')
    assert.equal(translate('ar', 'A string nobody translated {n}', { n: 3 }), 'A string nobody translated 3')
    assert.equal(translate('ar', 'Sign in'), ar['Sign in'])
    assert.equal(translate('ar', 'Open {identifier}: {title}', { identifier: 'ENG-1', title: 'x' }), 'فتح ENG-1: x')
  })

  test('JSX-style whitespace is normalised but a trailing space survives', () => {
    assert.equal(normaliseMessage('  Sign\n   in  '), 'Sign in')
    assert.equal(translate('ar', 'Powered by '), `${ar['Powered by']} `)
    assert.equal(createTranslator('ar')('Sign   in'), ar['Sign in'])
  })

  test('unknown placeholders are left untouched', () => {
    assert.equal(translate('en', 'Hi {who}', {}), 'Hi {who}')
  })
})

describe('Arabic catalogue', () => {
  const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort()

  test('every entry is non-empty and keeps the placeholders of its source string', () => {
    for (const [source, translated] of Object.entries(ar)) {
      assert.ok(translated.trim().length > 0, `empty translation for "${source}"`)
      assert.deepEqual(placeholders(translated), placeholders(source), `placeholder mismatch for "${source}"`)
    }
  })

  test('keys are already normalised so lookups can match', () => {
    for (const source of Object.keys(ar)) {
      assert.equal(source, normaliseMessage(source), `key has stray whitespace: ${JSON.stringify(source)}`)
    }
  })

  test('back/forward arrows are mirrored for right-to-left reading', () => {
    assert.ok(ar['← Back to Linear integration'].startsWith('→'))
    assert.ok(ar['→ Go to Linear integration'].startsWith('←'))
  })
})

describe('RTL layout contract', () => {
  // Physical left/right utilities do not mirror in right-to-left layouts.
  // `left-1/2` (centring with a translate) and `left-[50%]` are intentionally
  // direction-neutral and therefore allowed.
  const PHYSICAL = /(?<![\w/-])-?(?:ml|mr|pl|pr)-[\w[.]|(?<![\w/-])text-(?:left|right)\b|(?<![\w/-])(?:border-[lr]|rounded-[lr]|rounded-(?:tl|tr|bl|br))(?=[\s"'`-])|(?<![\w/-])-?(?:left|right)-(?!1\/2\b|\[50%\])[\w[]/

  test('components use logical (start/end) utilities instead of left/right', async () => {
    const files = (await walk(SRC)).filter((file) => file.endsWith('.tsx'))
    const offenders: string[] = []
    for (const file of files) {
      const lines = (await readFile(file, 'utf8')).split('\n')
      lines.forEach((line, index) => {
        const match = PHYSICAL.exec(line)
        if (match) offenders.push(`${path.relative(SRC, file)}:${index + 1} ${match[0]}`)
      })
    }
    assert.deepEqual(offenders, [])
  })

  test('the root layout sets lang and dir from the resolved locale', async () => {
    const layout = await readFile(path.join(SRC, 'app/layout.tsx'), 'utf8')
    assert.match(layout, /<html lang={locale} dir={directionOf\(locale\)}/)
    assert.match(layout, /<I18nProvider locale={locale}>/)
  })
})

describe('auth methods', () => {
  test('defaults keep the hosted behaviour and unknown values are ignored', () => {
    assert.deepEqual(parseAuthMethods(undefined), ['magic_link', 'github'])
    assert.deepEqual(parseAuthMethods(''), ['magic_link', 'github'])
    assert.deepEqual(parseAuthMethods('password'), ['password'])
    assert.deepEqual(parseAuthMethods('Password, github,password,bogus'), ['password', 'github'])
  })
})

describe('React bindings', () => {
  test('useT and useI18n follow the provider locale, with English as the default', async () => {
    const { createElement } = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { I18nProvider, useI18n, useT } = await import('../src/lib/i18n/client')

    function Probe() {
      const t = useT()
      const { dir, locale, intlLocale } = useI18n()
      return createElement('p', null, `${t('Sign in')}|${dir}|${locale}|${intlLocale}`)
    }

    assert.equal(renderToStaticMarkup(createElement(Probe)), '<p>Sign in|ltr|en|en-US</p>')
    assert.equal(
      renderToStaticMarkup(createElement(I18nProvider, { locale: 'ar', children: createElement(Probe) })),
      `<p>${ar['Sign in']}|rtl|ar|ar-u-nu-latn</p>`,
    )
  })
})
