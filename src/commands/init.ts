import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { ensureWikiDirs, schemaPath, indexPath, wikiHome } from '../paths'
import { DEFAULT_SCHEMA } from '../schema'

export async function initCommand(_args: string[]): Promise<void> {
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
  console.log('\nWiki initialized. Run "wiki ingest <file>" to add knowledge.')
}
