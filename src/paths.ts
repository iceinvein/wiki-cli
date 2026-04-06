import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdir } from 'node:fs/promises'

export function wikiHome(): string {
  return process.env.WIKI_HOME ?? join(homedir(), '.wiki')
}

export function wikiPagesDir(): string {
  return join(wikiHome(), 'pages')
}

export function wikiLogsDir(): string {
  return join(wikiHome(), 'logs')
}

export function schemaPath(): string {
  return join(wikiHome(), 'schema.md')
}

export function indexPath(): string {
  return join(wikiHome(), 'index.md')
}

export async function ensureWikiDirs(): Promise<void> {
  await mkdir(wikiPagesDir(), { recursive: true })
  await mkdir(wikiLogsDir(), { recursive: true })
}

export function detectProjectName(): string | null {
  try {
    const result = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel'])
    if (result.exitCode !== 0) return null
    const repoPath = result.stdout.toString().trim()
    return repoPath.split('/').pop() ?? null
  } catch {
    return null
  }
}
