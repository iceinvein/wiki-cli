import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { schemaPath, indexPath, wikiHome, wikiPagesDir } from '../paths'
import { parseIndex, matchPages, loadPages } from '../index-parser'
import { ingestPrompt } from '../prompts'
import { runAgent } from '../agent'
import { appendLog } from '../log'

export async function ingestCommand(args: string[]): Promise<void> {
  const source = args[0]
  if (!source) {
    console.error('Usage: wiki ingest <file|url|->')
    process.exit(1)
  }

  if (!existsSync(schemaPath())) {
    console.error('Wiki not initialized. Run "wiki init" first.')
    process.exit(1)
  }

  // Read source content
  let sourceContent: string
  let sourceLabel: string

  if (source === '-') {
    sourceContent = await readStdin()
    sourceLabel = 'stdin'
  } else if (source.startsWith('http://') || source.startsWith('https://')) {
    sourceContent = `Please fetch and ingest this URL: ${source}`
    sourceLabel = `url:${source}`
  } else {
    if (!existsSync(source)) {
      console.error(`File not found: ${source}`)
      process.exit(1)
    }
    sourceContent = await Bun.file(source).text()
    sourceLabel = `file:${source}`
  }

  // Load schema and index
  const schema = await Bun.file(schemaPath()).text()
  const index = await Bun.file(indexPath()).text()

  // Pre-select relevant pages for file sources
  let pages: Record<string, string> = {}
  if (!source.startsWith('http')) {
    const entries = parseIndex(index)
    const relevant = matchPages(entries, sourceContent.slice(0, 2000))
    pages = await loadPages(wikiPagesDir(), relevant.map((e) => e.name))
  }

  console.log(`Ingesting ${sourceLabel}...`)

  const prompt = ingestPrompt({ schema, index, pages }, sourceLabel)
  const userMessage = source.startsWith('http')
    ? sourceContent
    : `Source (${sourceLabel}):\n\n${sourceContent}`

  const result = await runAgent({
    systemPrompt: prompt,
    userMessage,
    tools: source.startsWith('http')
      ? ['Read', 'Write', 'Glob', 'WebFetch']
      : ['Read', 'Write', 'Glob'],
  })

  // Log the ingest
  const logsPath = join(wikiHome(), 'logs', 'sources.jsonl')
  await appendLog(logsPath, {
    type: 'ingest',
    source: sourceLabel,
    costUsd: result.costUsd,
  })

  console.log(result.text)
  console.log(`\nIngest complete. Cost: $${result.costUsd.toFixed(4)}`)
}

async function readStdin(): Promise<string> {
  const chunks: string[] = []
  const reader = Bun.stdin.stream().getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(decoder.decode(value))
  }
  return chunks.join('')
}
