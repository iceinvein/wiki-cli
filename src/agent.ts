import { query, type Options } from '@anthropic-ai/claude-agent-sdk'
import { wikiHome } from './paths'

let cachedClaudePath: string | undefined

function resolveClaudePath(): string {
  if (cachedClaudePath) return cachedClaudePath
  const path = Bun.which('claude')
  if (!path) {
    throw new Error(
      "Claude Code CLI not found on PATH. Install it and ensure 'claude' is on PATH, or set CLAUDE_CLI_PATH."
    )
  }
  cachedClaudePath = path
  return path
}

type AgentCallOptions = {
  /** System prompt for the agent */
  systemPrompt: string
  /** User message to send */
  userMessage: string
  /** Tools the agent can use. Defaults to Read, Write, Glob */
  tools?: string[]
  /** Model to use. Defaults to claude-sonnet-4-6 */
  model?: string
  /** Max turns before stopping */
  maxTurns?: number
}

export type AgentResult = {
  text: string
  costUsd: number
}

/**
 * Run a single Agent SDK query with the wiki curator agent.
 * Returns the final text result.
 */
export async function runAgent(opts: AgentCallOptions): Promise<AgentResult> {
  const home = wikiHome()
  const tools = opts.tools ?? ['Read', 'Write', 'Glob']

  const options: Options = {
    cwd: home,
    model: opts.model ?? 'claude-sonnet-4-6',
    tools,
    allowedTools: tools,
    permissionMode: 'acceptEdits',
    persistSession: false,
    maxTurns: opts.maxTurns ?? 20,
    pathToClaudeCodeExecutable: process.env.CLAUDE_CLI_PATH ?? resolveClaudePath(),
    agent: 'wiki-curator',
    agents: {
      'wiki-curator': {
        description: 'Wiki curator agent that maintains a structured knowledge base',
        prompt: opts.systemPrompt,
        tools,
      },
    },
  }

  const q = query({ prompt: opts.userMessage, options })

  let resultText = ''
  let costUsd = 0

  for await (const message of q) {
    const msg = message as Record<string, unknown>
    if (msg.type === 'result') {
      const result = msg as { result?: string; total_cost_usd?: number }
      resultText = result.result ?? ''
      costUsd = result.total_cost_usd ?? 0
    }
  }

  return { text: resultText, costUsd }
}
