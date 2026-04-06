import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { readdir } from 'node:fs/promises'
import { schemaPath, indexPath, wikiHome, wikiPagesDir } from '../paths'
import { parseIndex, matchPages, loadPages } from '../index-parser'
import { triagePrompt, capturePrompt } from '../prompts'
import { runAgent } from '../agent'
import { appendLog, readLog } from '../log'
import {
  findLatestSession,
  readSessionTranscript,
  extractConversationText,
  countSubstantiveMessages,
} from '../session-reader'

export async function captureCommand(args: string[]): Promise<void> {
  const isAuto = args.includes('--auto')
  const sessionIdArg = args.find((a) => !a.startsWith('--'))

  if (!existsSync(schemaPath())) {
    console.error('Wiki not initialized. Run "wiki init" first.')
    process.exit(1)
  }

  // Find the session file
  let sessionPath: string | null
  if (sessionIdArg) {
    sessionPath = await findSessionById(sessionIdArg)
  } else {
    sessionPath = await findLatestSession()
  }

  if (!sessionPath) {
    if (isAuto) return
    console.error('No Claude Code session found.')
    process.exit(1)
  }

  // Check if already captured
  const capturesLog = join(wikiHome(), 'logs', 'captures.jsonl')
  const captured = await readLog(capturesLog)
  const sessionFile = sessionPath.split('/').pop()!
  if (captured.some((c) => c.sessionFile === sessionFile)) {
    if (isAuto) return
    console.log('This session has already been captured.')
    return
  }

  // Read and check session
  const messages = await readSessionTranscript(sessionPath)
  const substantiveCount = countSubstantiveMessages(messages)

  if (substantiveCount < 5) {
    if (isAuto) return
    console.log(`Session too short (${substantiveCount} messages). Skipping.`)
    await appendLog(capturesLog, { sessionFile, worthy: false, reason: 'too_short' })
    return
  }

  const transcript = extractConversationText(messages)

  // Phase 1: Triage
  if (!isAuto) console.log('Triaging session...')

  const schema = await Bun.file(schemaPath()).text()
  const index = await Bun.file(indexPath()).text()

  const triageResult = await runAgent({
    systemPrompt: triagePrompt({ schema, index }),
    userMessage: `Session transcript:\n\n${transcript}`,
    tools: [],
    maxTurns: 1,
  })

  let triage: { worthy: boolean; topics: string[]; summary: string }
  try {
    triage = JSON.parse(triageResult.text)
  } catch {
    if (isAuto) return
    console.log('Triage returned invalid response. Skipping.')
    await appendLog(capturesLog, { sessionFile, worthy: false, reason: 'invalid_triage' })
    return
  }

  if (!triage.worthy) {
    if (!isAuto) console.log('Session not wiki-worthy. Skipping.')
    await appendLog(capturesLog, { sessionFile, worthy: false, topics: triage.topics })
    return
  }

  // Phase 2: Extract
  if (!isAuto) console.log(`Extracting knowledge: ${triage.summary}`)

  const entries = parseIndex(index)
  const relevant = matchPages(entries, triage.topics.join(' '))
  const pages = await loadPages(wikiPagesDir(), relevant.map((e) => e.name))

  const result = await runAgent({
    systemPrompt: capturePrompt({ schema, index, pages }, triage.summary),
    userMessage: `Session transcript:\n\n${transcript}`,
    tools: ['Read', 'Write', 'Glob'],
  })

  await appendLog(capturesLog, {
    sessionFile,
    worthy: true,
    topics: triage.topics,
    summary: triage.summary,
    costUsd: triageResult.costUsd + result.costUsd,
  })

  if (!isAuto) {
    console.log(result.text)
    console.log(`\nCapture complete. Cost: $${(triageResult.costUsd + result.costUsd).toFixed(4)}`)
  }
}

async function findSessionById(sessionId: string): Promise<string | null> {
  const projectsDir = join(homedir(), '.claude', 'projects')
  if (!existsSync(projectsDir)) return null

  const projectDirs = await readdir(projectsDir)
  for (const projectDir of projectDirs) {
    const candidatePath = join(projectsDir, projectDir, `${sessionId}.jsonl`)
    if (existsSync(candidatePath)) return candidatePath
  }

  const directPath = join(projectsDir, `${sessionId}.jsonl`)
  if (existsSync(directPath)) return directPath

  return null
}
