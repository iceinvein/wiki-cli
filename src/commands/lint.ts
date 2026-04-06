import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readdir } from 'node:fs/promises'
import { schemaPath, indexPath, wikiPagesDir } from '../paths'
import { lintPrompt } from '../prompts'
import { runAgent } from '../agent'

export async function lintCommand(args: string[]): Promise<void> {
  const fix = args.includes('--fix')

  if (!existsSync(schemaPath())) {
    console.error('Wiki not initialized. Run "wiki init" first.')
    process.exit(1)
  }

  const schema = await Bun.file(schemaPath()).text()
  const index = await Bun.file(indexPath()).text()

  const pages = await loadAllPages()
  const pageCount = Object.keys(pages).length

  if (pageCount === 0) {
    console.log('Wiki is empty. Nothing to lint.')
    return
  }

  console.log(`Linting ${pageCount} pages...`)

  const prompt = lintPrompt({ schema, index, pages })
  const userMessage = fix
    ? 'Run a health check on the wiki and fix any issues you find.'
    : 'Run a health check on the wiki and report issues. Do not modify any files.'

  const tools = fix ? ['Read', 'Write', 'Glob'] : ['Read', 'Glob']

  const result = await runAgent({
    systemPrompt: prompt,
    userMessage,
    tools,
    maxTurns: fix ? 30 : 10,
  })

  console.log(result.text)
  console.log(`\nLint complete. Cost: $${result.costUsd.toFixed(4)}`)
}

async function loadAllPages(): Promise<Record<string, string>> {
  const pagesDir = wikiPagesDir()
  if (!existsSync(pagesDir)) return {}

  const files = await readdir(pagesDir)
  const pages: Record<string, string> = {}
  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const name = file.replace('.md', '')
    pages[name] = await Bun.file(join(pagesDir, file)).text()
  }
  return pages
}
