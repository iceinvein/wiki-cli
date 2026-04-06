import { test, expect, beforeEach, afterEach } from 'bun:test'
import { appendLog, readLog } from '../src/log'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'wiki-log-'))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

test('appendLog creates file and appends entry', async () => {
  const logPath = join(tmpDir, 'test.jsonl')
  await appendLog(logPath, { type: 'ingest', source: 'test.md', pages: ['page-a'] })
  await appendLog(logPath, { type: 'ingest', source: 'test2.md', pages: ['page-b'] })

  const entries = await readLog(logPath)
  expect(entries).toHaveLength(2)
  expect(entries[0].source).toBe('test.md')
  expect(entries[1].source).toBe('test2.md')
  expect(entries[0].timestamp).toBeDefined()
})

test('readLog returns empty array for missing file', async () => {
  const entries = await readLog(join(tmpDir, 'nonexistent.jsonl'))
  expect(entries).toEqual([])
})
