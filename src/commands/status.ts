import { existsSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { schemaPath, indexPath, wikiHome, wikiPagesDir, wikiLogsDir } from '../paths'
import { parseIndex } from '../index-parser'
import { readLog } from '../log'

type WikiStats = {
  pageCount: number
  totalSizeBytes: number
  tags: Record<string, number>
  lastIngestDate: string | null
  lastCaptureDate: string | null
  stalePages: string[]
}

export async function statusCommand(_args: string[]): Promise<void> {
  const home = wikiHome()

  if (!existsSync(schemaPath())) {
    console.error('Wiki not initialized. Run "wiki init" first.')
    process.exit(1)
  }

  const stats = await computeWikiStats()

  console.log(`Wiki: ${home}`)
  console.log(`Pages: ${stats.pageCount}`)
  console.log(`Size: ${formatBytes(stats.totalSizeBytes)}`)
  console.log()

  if (Object.keys(stats.tags).length > 0) {
    console.log('Tags:')
    const sorted = Object.entries(stats.tags).sort((a, b) => b[1] - a[1])
    for (const [tag, count] of sorted) {
      console.log(`  ${tag}: ${count}`)
    }
    console.log()
  }

  if (stats.lastIngestDate) console.log(`Last ingest: ${stats.lastIngestDate}`)
  if (stats.lastCaptureDate) console.log(`Last capture: ${stats.lastCaptureDate}`)

  if (stats.stalePages.length > 0) {
    console.log(`\nWarnings:`)
    for (const page of stats.stalePages) {
      console.log(`  Stale (>90 days): ${page}`)
    }
  }
}

export async function computeWikiStats(): Promise<WikiStats> {
  const pagesDir = wikiPagesDir()
  const logsDir = wikiLogsDir()

  let pageCount = 0
  let totalSizeBytes = 0
  const tags: Record<string, number> = {}
  const stalePages: string[] = []
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000

  if (existsSync(pagesDir)) {
    const files = await readdir(pagesDir)
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      pageCount++
      const filePath = join(pagesDir, file)
      const fileStat = await stat(filePath)
      totalSizeBytes += fileStat.size

      if (fileStat.mtimeMs < ninetyDaysAgo) {
        stalePages.push(file.replace('.md', ''))
      }
    }
  }

  const indexContent = existsSync(indexPath())
    ? await Bun.file(indexPath()).text()
    : ''
  const entries = parseIndex(indexContent)
  for (const entry of entries) {
    for (const tag of entry.tags) {
      tags[tag] = (tags[tag] ?? 0) + 1
    }
  }

  const sourcesLog = await readLog(join(logsDir, 'sources.jsonl'))
  const capturesLog = await readLog(join(logsDir, 'captures.jsonl'))

  const lastIngestDate = sourcesLog.length > 0
    ? (sourcesLog[sourcesLog.length - 1].timestamp as string)
    : null
  const lastCaptureDate = capturesLog.filter((c) => c.worthy).length > 0
    ? (capturesLog.filter((c) => c.worthy).pop()!.timestamp as string)
    : null

  return {
    pageCount,
    totalSizeBytes,
    tags,
    lastIngestDate,
    lastCaptureDate,
    stalePages,
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}
