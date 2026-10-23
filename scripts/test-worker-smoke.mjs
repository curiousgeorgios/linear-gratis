#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import net from 'node:net'
import http from 'node:http'
import ts from 'typescript'

const live = process.argv.includes('--live')
let child
let directory
let stub
let output = ''
async function availablePort() {
  const server = net.createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}
try {
  let baseUrl = 'https://linear.gratis'
  if (!live) {
    const parsed = ts.parseConfigFileTextToJson('wrangler.jsonc', readFileSync('wrangler.jsonc', 'utf8'))
    if (parsed.error) throw new Error('Cannot parse Wrangler configuration')
    const config = parsed.config
    stub = http.createServer((request, response) => {
      response.writeHead(401, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ message: 'No smoke-test session' }))
    })
    await new Promise((resolve) => stub.listen(0, '127.0.0.1', resolve))
    directory = mkdtempSync(join(tmpdir(), 'linear-worker-smoke-'))
    const configPath = join(directory, 'wrangler.json')
    // A separate config directory prevents loading local production credentials.
    writeFileSync(configPath, JSON.stringify({
      name: 'linear-gratis-smoke',
      main: resolve(config.main),
      compatibility_date: config.compatibility_date,
      compatibility_flags: config.compatibility_flags,
      assets: { ...config.assets, directory: resolve(config.assets.directory) },
      vars: {
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${stub.address().port}`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'smoke-test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'smoke-test-service-role-key',
        NEXT_PUBLIC_APP_DOMAIN: 'localhost',
        ENCRYPTION_KEY: 'smoke-test-encryption-key',
        ACCESS_COOKIE_SECRET: 'smoke-test-cookie-secret',
      },
    }))
    const port = await availablePort()
    baseUrl = `http://localhost:${port}`
    child = spawn('bunx', ['wrangler', 'dev', '--config', configPath, '--local', '--ip', '127.0.0.1', '--port', String(port)], {
      env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    })
    child.on('error', (error) => { output += error.message })
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (data) => { output = (output + data.toString()).slice(-8000) })
    }
  }
  for (const [route, status, content] of [
    ['/api/hello', 200, 'Hello World'],
    ['/', 200, '<html'],
    ['/login', 200, '<html'],
    ['/__worker_smoke_missing__', 404, '<html'],
  ]) {
    let response
    const deadline = Date.now() + 30000
    while (!response) {
      if (child && child.exitCode !== null) throw new Error(`Worker exited (${child.exitCode})\n${output}`)
      try {
        response = await fetch(new URL(route, baseUrl), { signal: AbortSignal.timeout(10000) })
      } catch (error) {
        if (Date.now() >= deadline) throw error
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
    }
    const body = await response.text()
    if (response.status !== status || !body.includes(content)) {
      throw new Error(`${route}: expected ${status} and ${content}, got ${response.status}: ${body.slice(0, 200)}\n${live ? '' : output}`)
    }
    console.log(`[worker-smoke] ${route}: ${response.status}`)
  }
} finally {
  if (child) {
    const terminate = (signal) => {
      try {
        if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal)
        else child.kill(signal)
      } catch (error) {
        if (error.code !== 'ESRCH') throw error
      }
    }
    // Wrangler can spawn workerd grandchildren that retain stdout and sockets.
    terminate('SIGTERM')
    if (child.exitCode === null) {
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ])
    }
    terminate('SIGKILL')
    child.stdout?.destroy()
    child.stderr?.destroy()
    child.unref()
  }
  if (stub) {
    stub.closeAllConnections()
    await new Promise((resolve) => stub.close(resolve))
  }
  if (directory) rmSync(directory, { recursive: true, force: true })
}
