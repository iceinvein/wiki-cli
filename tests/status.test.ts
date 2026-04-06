import { test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { computeWikiStats } from '../src/commands/status'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'wiki-status-'))
  await mkdir(join(tmpDir, 'pages'), { recursive: true })
  await mkdir(join(tmpDir, 'logs'), { recursive: true })
  await writeFile(join(tmpDir, 'index.md'), '')
  await writeFile(join(tmpDir, 'schema.md'), '# Schema')
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

test('computeWikiStats reports zero pages for empty wiki', async () => {
  process.env.WIKI_HOME = tmpDir
  const stats = await computeWikiStats()
  expect(stats.pageCount).toBe(0)
  expect(stats.totalSizeBytes).toBe(0)
  expect(stats.tags).toEqual({})
  delete process.env.WIKI_HOME
})

test('computeWikiStats counts pages and tags', async () => {
  process.env.WIKI_HOME = tmpDir
  await writeFile(
    join(tmpDir, 'pages', 'test-page.md'),
    '---\ntitle: Test\ntags: [foo, bar]\n---\nContent'
  )
  await writeFile(
    join(tmpDir, 'index.md'),
    '- **test-page** [foo, bar] — Test page summary'
  )

  const stats = await computeWikiStats()
  expect(stats.pageCount).toBe(1)
  expect(stats.totalSizeBytes).toBeGreaterThan(0)
  expect(stats.tags).toEqual({ foo: 1, bar: 1 })
  delete process.env.WIKI_HOME
})
