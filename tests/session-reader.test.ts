import { test, expect, beforeEach, afterEach } from 'bun:test'
import {
  findLatestSession,
  readSessionTranscript,
  extractConversationText,
} from '../src/session-reader'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'wiki-session-'))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

test('readSessionTranscript parses JSONL into messages', async () => {
  const fixturePath = join(import.meta.dir, 'fixtures/sample-session.jsonl')
  const messages = await readSessionTranscript(fixturePath)
  expect(messages.length).toBeGreaterThan(0)
  const userMessages = messages.filter((m) => m.type === 'user')
  expect(userMessages.length).toBe(2)
})

test('extractConversationText produces readable text', async () => {
  const fixturePath = join(import.meta.dir, 'fixtures/sample-session.jsonl')
  const messages = await readSessionTranscript(fixturePath)
  const text = extractConversationText(messages)
  expect(text).toContain('How does IPC work')
  expect(text).toContain('permission flow')
})

test('findLatestSession finds most recent jsonl', async () => {
  const projectDir = join(tmpDir, '-project-a')
  await mkdir(projectDir, { recursive: true })
  await writeFile(join(projectDir, 'old-session.jsonl'), '{"type":"result","session_id":"old"}\n')
  await Bun.sleep(50)
  await writeFile(join(projectDir, 'new-session.jsonl'), '{"type":"result","session_id":"new"}\n')

  const result = await findLatestSession(tmpDir)
  expect(result).not.toBeNull()
  expect(result!.endsWith('new-session.jsonl')).toBe(true)
})

test('findLatestSession returns null for empty dir', async () => {
  const result = await findLatestSession(tmpDir)
  expect(result).toBeNull()
})
