# CLAUDE.md

## What This Is

wiki-cli — a standalone Bun CLI that maintains a persistent, LLM-curated markdown wiki as a cross-project knowledge base. Uses the Claude Agent SDK.

## Commands

```bash
bun install              # Install dependencies
bun test                 # Run all tests
bun run bin/wiki.ts      # Run CLI locally
```

## Architecture

Stateless CLI. Each command spawns a single Agent SDK query() call with an agent definition. Wiki data lives at ~/.wiki/ (overridable via WIKI_HOME). No database — markdown files + JSONL logs.

## Key Files

- bin/wiki.ts — CLI entry point, argv routing
- src/agent.ts — Agent SDK wrapper
- src/prompts.ts — System prompts per operation
- src/index-parser.ts — Parse and search index.md
- src/session-reader.ts — Read Claude Code session transcripts
- src/commands/ — One file per CLI command
