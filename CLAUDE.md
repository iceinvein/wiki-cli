# CLAUDE.md

## What This Is

wiki-cli — a standalone Bun CLI that maintains a persistent, LLM-curated markdown wiki as a cross-project knowledge base. Uses Claude Code under the hood via the Agent SDK (`@anthropic-ai/claude-agent-sdk`), so each command spawns a Claude Code session with access to its full tool suite (Read, Write, Glob, etc.).

## Commands

```bash
bun install              # Install dependencies
bun test                 # Run all tests
bun test tests/foo.test.ts  # Run a single test file
bun run bin/wiki.ts      # Run CLI locally
```

## Environment

Requires `ANTHROPIC_API_KEY` set in environment (Bun auto-loads `.env`).
Override wiki data directory with `WIKI_HOME` (defaults to `~/.wiki/`).

## Architecture

Stateless CLI. Each command spawns a Claude Code session via `query()` with a wiki-curator agent definition. Wiki data lives at ~/.wiki/ (overridable via WIKI_HOME). No database — markdown files + JSONL logs.

## Key Files

- bin/wiki.ts — CLI entry point, argv routing
- src/agent.ts — Claude Code session wrapper via Agent SDK
- src/prompts.ts — System prompts per operation
- src/index-parser.ts — Parse and search index.md
- src/session-reader.ts — Read Claude Code session transcripts
- src/paths.ts — Wiki directory helpers, WIKI_HOME resolution
- src/schema.ts — Default wiki schema definition
- src/log.ts — JSONL log append/read
- src/commands/ — One file per CLI command

## Testing

Tests live in `tests/`. Uses `bun:test`. Path alias `@/*` maps to `src/*`.

## Gotchas

- Agent runs with `permissionMode: 'acceptEdits'` — it auto-approves file writes within WIKI_HOME
- Agent model defaults to `claude-sonnet-4-6`, configurable per-call in `runAgent()`
