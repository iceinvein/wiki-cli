import { existsSync } from 'node:fs'
import { schemaPath, indexPath, wikiPagesDir, detectProjectName } from '../paths'
import { parseIndex, matchPages, loadPages } from '../index-parser'
import { queryPrompt } from '../prompts'
import { runAgent } from '../agent'

export async function queryCommand(args: string[]): Promise<void> {
  const question = args.join(' ')
  if (!question) {
    console.error('Usage: wiki query "<question>"')
    process.exit(1)
  }

  if (!existsSync(schemaPath())) {
    console.error('Wiki not initialized. Run "wiki init" first.')
    process.exit(1)
  }

  const schema = await Bun.file(schemaPath()).text()
  const index = await Bun.file(indexPath()).text()
  const entries = parseIndex(index)

  if (entries.length === 0) {
    console.log('Wiki is empty. Run "wiki ingest <source>" to add knowledge first.')
    return
  }

  const projectName = detectProjectName()
  const relevant = matchPages(entries, question, projectName)

  if (relevant.length === 0) {
    console.log('No relevant pages found for this question.')
    return
  }

  const pages = await loadPages(wikiPagesDir(), relevant.map((e) => e.name))

  const prompt = queryPrompt({ schema, index, pages })

  const result = await runAgent({
    systemPrompt: prompt,
    userMessage: question,
    tools: ['Read', 'Glob'],
    maxTurns: 5,
  })

  console.log(result.text)
}
