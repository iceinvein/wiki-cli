import { appendFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

export async function appendLog(filePath: string, entry: Record<string, unknown>): Promise<void> {
  const timestamped = { ...entry, timestamp: new Date().toISOString() }
  await appendFile(filePath, JSON.stringify(timestamped) + '\n')
}

export async function readLog(filePath: string): Promise<Record<string, unknown>[]> {
  if (!existsSync(filePath)) return []
  const content = await Bun.file(filePath).text()
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}
