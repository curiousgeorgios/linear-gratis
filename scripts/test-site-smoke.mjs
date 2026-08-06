#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import http from 'node:http'
import net from 'node:net'
import puppeteer from 'puppeteer'

const ROUTES = [
  '/',
  '/features',
  '/comparison',
  '/comparison/steelsync',
  '/use-cases',
  '/use-cases/saas',
  '/templates',
  '/templates/bug-reports',
  '/integrations',
  '/integrations/slack',
  '/login',
]

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Next.js exited before becoming ready (${child.exitCode})`)
    try {
      const response = await fetch(`${baseUrl}/features`)
      if (response.ok) return
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('Timed out waiting for the production server')
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ])
  if (child.exitCode === null) child.kill('SIGKILL')
}

function startSupabaseStub() {
  return new Promise((resolve, reject) => {
    const stub = http.createServer((request, response) => {
      response.setHeader('Access-Control-Allow-Origin', '*')
      response.setHeader('Access-Control-Allow-Headers', '*')
      response.setHeader('Content-Type', 'application/json')
      if (request.method === 'OPTIONS') {
        response.writeHead(204)
        response.end()
        return
      }
      if (request.url?.startsWith('/auth/v1/user')) {
        response.writeHead(401)
        response.end(JSON.stringify({ message: 'No smoke-test session' }))
        return
      }
      response.writeHead(200)
      response.end('[]')
    })
    stub.once('error', reject)
    stub.listen(0, '127.0.0.1', () => {
      const address = stub.address()
      const port = typeof address === 'object' && address ? address.port : 0
      resolve({ server: stub, url: `http://127.0.0.1:${port}` })
    })
  })
}

let server
let browser
let supabaseStub

try {
  let baseUrl = process.env.SMOKE_BASE_URL
  if (!baseUrl) {
    const stub = await startSupabaseStub()
    supabaseStub = stub.server
    const smokeEnv = {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: stub.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'smoke-test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'smoke-test-service-role-key',
    }

    if (process.env.SMOKE_SKIP_BUILD !== '1') {
      const build = spawnSync('bun', ['run', 'build'], {
        cwd: process.cwd(),
        env: smokeEnv,
        stdio: 'inherit',
      })
      if (build.error) throw build.error
      if (build.status !== 0) process.exit(build.status ?? 1)
    }

    const port = await availablePort()
    // Use localhost in the Host header so middleware follows the main-domain
    // path instead of treating the smoke server as a custom domain.
    baseUrl = `http://localhost:${port}`
    server = spawn('bunx', ['next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: process.cwd(),
      env: smokeEnv,
      stdio: ['ignore', 'inherit', 'inherit'],
    })
    await waitForServer(baseUrl, server)
  }

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  for (const route of ROUTES) {
    const errors = []
    const onConsole = (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`)
    }
    const onPageError = (error) => errors.push(`page: ${error.message}`)
    page.on('console', onConsole)
    page.on('pageerror', onPageError)

    const response = await page.goto(new URL(route, baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    if (!response || response.status() >= 400) {
      throw new Error(`${route} returned ${response?.status() ?? 'no response'}`)
    }

    await page.waitForSelector('h1, h2, [data-slot="card-title"]', { timeout: 5_000 })

    const pageState = await page.evaluate(() => ({
      title: document.title.trim(),
      heading: document.querySelector('h1, h2, [data-slot="card-title"]')?.textContent?.trim() ?? '',
      internalLinks: Array.from(document.querySelectorAll('a[href^="/"]'))
        .map((link) => link.getAttribute('href'))
        .filter(Boolean),
    }))
    if (!pageState.title) throw new Error(`${route} has no document title`)
    if (!pageState.heading) throw new Error(`${route} has no primary heading`)
    if (pageState.internalLinks.some((href) => /\s/.test(href))) {
      throw new Error(`${route} contains an internal link with whitespace`)
    }
    if (errors.length > 0) throw new Error(`${route} emitted browser errors:\n${errors.join('\n')}`)

    page.off('console', onConsole)
    page.off('pageerror', onPageError)
    console.log(`[smoke] ${route} — ${pageState.heading}`)
  }

  console.log(`[smoke] ${ROUTES.length} production pages passed.`)
} finally {
  if (browser) await browser.close()
  await stopServer(server)
  if (supabaseStub) await new Promise((resolve) => supabaseStub.close(resolve))
}
