import { test, expect, beforeEach, afterEach } from 'bun:test'
import { wikiHome, wikiPagesDir, wikiLogsDir, schemaPath, indexPath, ensureWikiDirs } from '../src/paths'
import { join } from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'wiki-test-'))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

test('wikiHome defaults to ~/.wiki', () => {
  delete process.env.WIKI_HOME
  const home = wikiHome()
  expect(home).toBe(join(process.env.HOME!, '.wiki'))
})

test('wikiHome respects WIKI_HOME env var', () => {
  process.env.WIKI_HOME = '/tmp/custom-wiki'
  const home = wikiHome()
  expect(home).toBe('/tmp/custom-wiki')
  delete process.env.WIKI_HOME
})

test('derived paths are correct', () => {
  process.env.WIKI_HOME = tmpDir
  expect(wikiPagesDir()).toBe(join(tmpDir, 'pages'))
  expect(wikiLogsDir()).toBe(join(tmpDir, 'logs'))
  expect(schemaPath()).toBe(join(tmpDir, 'schema.md'))
  expect(indexPath()).toBe(join(tmpDir, 'index.md'))
  delete process.env.WIKI_HOME
})

test('ensureWikiDirs creates pages and logs dirs', async () => {
  process.env.WIKI_HOME = tmpDir
  await ensureWikiDirs()
  const { existsSync } = await import('node:fs')
  expect(existsSync(join(tmpDir, 'pages'))).toBe(true)
  expect(existsSync(join(tmpDir, 'logs'))).toBe(true)
  delete process.env.WIKI_HOME
})
