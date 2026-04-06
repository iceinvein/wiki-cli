#!/usr/bin/env bun

import { initCommand } from '../src/commands/init'
import { ingestCommand } from '../src/commands/ingest'
import { queryCommand } from '../src/commands/query-cmd'
import { lintCommand } from '../src/commands/lint'

const [command, ...args] = process.argv.slice(2)

const COMMANDS: Record<string, (args: string[]) => Promise<void>> = {
  init: initCommand,
  ingest: ingestCommand,
  query: queryCommand,
  lint: lintCommand,
}

async function main() {
  if (!command || command === '--help') {
    console.log(`Usage: wiki <command> [args]

Commands:
  init                 Initialize ~/.wiki/ directory
  ingest <source>      Ingest a file, URL, or stdin into the wiki
  query "<question>"   Query the wiki
  lint [--fix]         Check wiki health, optionally fix issues
  capture [session-id] Capture knowledge from a Claude Code session
  status               Show wiki health summary`)
    process.exit(0)
  }

  const handler = COMMANDS[command]
  if (!handler) {
    console.error(`Unknown command: ${command}`)
    process.exit(1)
  }

  await handler(args)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
