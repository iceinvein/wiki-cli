import { test, expect } from 'bun:test'
import { parseIndex, matchPages, type IndexEntry } from '../src/index-parser'
import { join } from 'node:path'

const fixturePath = join(import.meta.dir, 'fixtures/sample-index.md')

test('parseIndex extracts all entries', async () => {
  const content = await Bun.file(fixturePath).text()
  const entries = parseIndex(content)
  expect(entries).toHaveLength(4)
  expect(entries[0]).toEqual({
    name: 'electron-ipc-patterns',
    tags: ['electron', 'ipc', 'desktop'],
    summary: 'Main↔Renderer communication via contextBridge, typed channels, permission flow',
  })
})

test('parseIndex handles empty content', () => {
  expect(parseIndex('')).toEqual([])
  expect(parseIndex('# My Wiki\n\nNo entries here.')).toEqual([])
})

test('matchPages returns entries matching keywords', async () => {
  const content = await Bun.file(fixturePath).text()
  const entries = parseIndex(content)
  const matches = matchPages(entries, 'how does IPC work in electron')
  expect(matches.length).toBeGreaterThan(0)
  expect(matches[0].name).toBe('electron-ipc-patterns')
})

test('matchPages boosts entries matching project name', async () => {
  const content = await Bun.file(fixturePath).text()
  const entries = parseIndex(content)
  const boosted = matchPages(entries, 'database performance', 'sqlite')
  expect(boosted[0].name).toBe('sqlite-wal-mode')
})

test('matchPages respects maxResults', async () => {
  const content = await Bun.file(fixturePath).text()
  const entries = parseIndex(content)
  const matches = matchPages(entries, 'patterns', undefined, 2)
  expect(matches.length).toBeLessThanOrEqual(2)
})
