import { existsSync } from 'node:fs'
import { join } from 'node:path'

export type IndexEntry = {
  name: string
  tags: string[]
  summary: string
}

const INDEX_LINE_RE = /^- \*\*(.+?)\*\* \[(.+?)\] — (.+)$/

export function parseIndex(content: string): IndexEntry[] {
  const entries: IndexEntry[] = []
  for (const line of content.split('\n')) {
    const match = line.match(INDEX_LINE_RE)
    if (!match) continue
    entries.push({
      name: match[1],
      tags: match[2].split(',').map((t) => t.trim()),
      summary: match[3],
    })
  }
  return entries
}

export function matchPages(
  entries: IndexEntry[],
  query: string,
  projectName?: string | null,
  maxResults = 15,
): IndexEntry[] {
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)

  const scored = entries.map((entry) => {
    let score = 0
    const haystack = `${entry.name} ${entry.tags.join(' ')} ${entry.summary}`.toLowerCase()

    for (const word of queryWords) {
      if (haystack.includes(word)) score += 1
      if (entry.tags.some((t) => t.toLowerCase() === word)) score += 2
      if (entry.name.toLowerCase().includes(word)) score += 2
    }

    if (projectName && entry.tags.some((t) => t.toLowerCase() === projectName.toLowerCase())) {
      score += 3
    }

    return { entry, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.entry)
}

export function formatIndexEntry(entry: IndexEntry): string {
  return `- **${entry.name}** [${entry.tags.join(', ')}] — ${entry.summary}`
}

/** Load page contents by name from the pages directory. */
export async function loadPages(
  pagesDir: string,
  names: string[],
): Promise<Record<string, string>> {
  const pages: Record<string, string> = {}
  for (const name of names) {
    const filePath = join(pagesDir, `${name}.md`)
    if (existsSync(filePath)) {
      pages[name] = await Bun.file(filePath).text()
    }
  }
  return pages
}
