import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'

type SessionMessage = {
  type: string
  message?: { role?: string; content?: unknown }
  session_id?: string
  result?: string
  isSynthetic?: boolean
  parent_tool_use_id?: string | null
  [key: string]: unknown
}

export async function findLatestSession(baseDir?: string): Promise<string | null> {
  const dir = baseDir ?? join(homedir(), '.claude', 'projects')
  if (!existsSync(dir)) return null

  let latest: { path: string; mtime: number } | null = null

  const projectDirs = await readdir(dir)
  for (const projectDir of projectDirs) {
    const projectPath = join(dir, projectDir)
    const projectStat = await stat(projectPath).catch(() => null)
    if (!projectStat?.isDirectory()) {
      if (projectDir.endsWith('.jsonl')) {
        const s = await stat(join(dir, projectDir))
        if (!latest || s.mtimeMs > latest.mtime) {
          latest = { path: join(dir, projectDir), mtime: s.mtimeMs }
        }
      }
      continue
    }

    const files = await readdir(projectPath)
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue
      const filePath = join(projectPath, file)
      const fileStat = await stat(filePath)
      if (!latest || fileStat.mtimeMs > latest.mtime) {
        latest = { path: filePath, mtime: fileStat.mtimeMs }
      }
    }
  }

  return latest?.path ?? null
}

export async function readSessionTranscript(filePath: string): Promise<SessionMessage[]> {
  const content = await Bun.file(filePath).text()
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as SessionMessage
      } catch {
        return null
      }
    })
    .filter((msg): msg is SessionMessage => msg !== null)
}

export function extractConversationText(messages: SessionMessage[]): string {
  const lines: string[] = []
  for (const msg of messages) {
    if (msg.type === 'user' && msg.message?.content) {
      const text = extractText(msg.message.content)
      if (text) lines.push(`User: ${text}`)
    } else if (msg.type === 'assistant' && msg.message?.content) {
      const text = extractText(msg.message.content)
      if (text) lines.push(`Assistant: ${text}`)
    } else if (msg.type === 'result' && msg.result) {
      lines.push(`[Session result: ${msg.result}]`)
    }
  }
  return lines.join('\n\n')
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((block: { type?: string }) => block.type === 'text')
      .map((block: { text?: string }) => block.text ?? '')
      .join('\n')
  }
  return ''
}

export function countSubstantiveMessages(messages: SessionMessage[]): number {
  return messages.filter(
    (m) =>
      (m.type === 'user' || m.type === 'assistant') &&
      !m.isSynthetic &&
      !m.parent_tool_use_id
  ).length
}
