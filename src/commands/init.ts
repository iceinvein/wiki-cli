import { existsSync } from 'node:fs'
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { ensureWikiDirs, schemaPath, indexPath, wikiHome } from '../paths'
import { DEFAULT_SCHEMA } from '../schema'

export async function initCommand(args: string[]): Promise<void> {
  const home = wikiHome()

  if (existsSync(schemaPath())) {
    console.log(`Wiki already initialized at ${home}`)
    console.log('Run "wiki status" to see current state.')
    return
  }

  console.log(`Initializing wiki at ${home}...`)

  await ensureWikiDirs()
  await writeFile(schemaPath(), DEFAULT_SCHEMA)
  await writeFile(indexPath(), '')

  console.log(`  Created ${home}/pages/`)
  console.log(`  Created ${home}/logs/`)
  console.log(`  Created ${home}/schema.md`)
  console.log(`  Created ${home}/index.md`)

  if (!args.includes('--no-hook')) {
    await installHook()
  }

  console.log('\nWiki initialized. Run "wiki ingest <file>" to add knowledge.')
}

async function installHook(): Promise<void> {
  const settingsPath = join(homedir(), '.claude', 'settings.json')

  let settings: Record<string, unknown> = {}
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(await readFile(settingsPath, 'utf-8'))
    } catch {
      console.log('  Could not parse ~/.claude/settings.json, skipping hook setup.')
      return
    }
  } else {
    await mkdir(join(homedir(), '.claude'), { recursive: true })
  }

  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>
  const sessionEndHooks = (hooks.SessionEnd ?? []) as Record<string, unknown>[]

  const alreadyInstalled = sessionEndHooks.some(
    (h) => typeof h.command === 'string' && (h.command as string).includes('wiki capture')
  )

  if (alreadyInstalled) {
    console.log('  Auto-capture hook already installed.')
    return
  }

  sessionEndHooks.push({
    matcher: "",
    hooks: [
      {
        type: 'command',
        command: 'wiki capture --auto',
      },
    ],
  })

  hooks.SessionEnd = sessionEndHooks
  settings.hooks = hooks

  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n')
  console.log('  Installed auto-capture hook in ~/.claude/settings.json')
}
