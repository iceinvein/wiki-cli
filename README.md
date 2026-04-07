# wiki-cli

A personal knowledge base that builds itself from your Claude Code sessions.

## Why

You learn things in every Claude Code session — architectural trade-offs, debugging patterns, why a library works a certain way, gotchas that cost you hours. That knowledge lives in your conversation history and slowly disappears. You can't search it, you can't share it across projects, and you end up re-discovering the same things months later.

wiki-cli fixes this. It watches your Claude Code sessions, extracts the non-trivial knowledge, and organizes it into a persistent, searchable markdown wiki. Over time, you build a second brain that grows just by doing your normal work — and Claude Code can query it too, so past lessons inform future sessions.

## How It Works

wiki-cli is a Bun CLI that uses Claude Code under the hood. Each command spawns a Claude Code session (via the [Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk)) with a specialized system prompt. The CLI handles orchestration — argument parsing, index search, logging — while Claude Code does the reasoning and file writes.

The killer feature is **auto-capture**: a `SessionEnd` hook runs after every Claude Code session, triages the transcript for wiki-worthy knowledge, and extracts it — all without you doing anything.

## Quick Start

```bash
bun install
bun link        # Makes `wiki` available globally

# Initialize the wiki and install the auto-capture hook
wiki init

# That's it. Knowledge is captured automatically after each Claude Code session.
# To manually add knowledge:
wiki ingest ./notes.md
wiki ingest https://example.com/article
cat notes.txt | wiki ingest -

# Ask the wiki a question
wiki query "how does IPC work in electron"

# Check wiki health
wiki status
wiki lint
wiki lint --fix
```

> Requires Claude Code to be installed and authenticated. wiki-cli spawns Claude Code sessions under the hood.

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create `~/.wiki/` and install the auto-capture `SessionEnd` hook. Pass `--no-hook` to skip hook installation. |
| `ingest <source>` | Feed a file, URL, or stdin (`-`) into the wiki. Claude Code decides which pages to create or update. |
| `query "<question>"` | Ask the wiki a question. Answers are synthesized from relevant pages with `[[page-name]]` citations. |
| `lint [--fix]` | Audit all pages for stale info, contradictions, orphans, broken cross-refs, and merge candidates. |
| `capture [session-id]` | Extract knowledge from a Claude Code session. Runs automatically via hook, or manually with an optional session ID. |
| `status` | Show page count, size, tag distribution, staleness warnings, and last ingest/capture dates. |

## Auto-Capture

`wiki init` writes a `SessionEnd` hook into `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionEnd": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "wiki capture --auto" }]
      }
    ]
  }
}
```

After every Claude Code session, capture runs a two-phase pipeline:

1. **Triage** — A single-turn, zero-tool Claude Code call reads the session transcript and decides if it contains wiki-worthy knowledge. Most sessions (typo fixes, routine CRUD, short conversations) are rejected here cheaply.
2. **Extract** — If worthy, a second call with file-write access distills the knowledge into new or updated wiki pages.

## Data Model

```
~/.wiki/
  schema.md       # Agent operating instructions: page format, naming rules, quality bar
  index.md        # One-line-per-page catalog: - **name** [tags] — summary
  pages/          # One markdown file per concept, with YAML frontmatter
  logs/
    sources.jsonl  # Ingest history
    captures.jsonl # Capture history (including skipped sessions)
```

Pages follow a structured format with frontmatter (`title`, `tags`, `sources`, `created`, `updated`), content, and a `## Related` section with `[[cross-references]]`.

The `schema.md` file is injected into every agent prompt — editing it changes how Claude Code curates your wiki.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WIKI_HOME` | `~/.wiki` | Override the wiki data directory. |

## Using with Claude Code

### Let It Run in the Background

After `wiki init`, you don't need to do anything. The auto-capture hook silently triages every session. You'll build up a knowledge base just by using Claude Code normally. Check on it occasionally with `wiki status`.

### Seed It with Existing Knowledge

The wiki gets more useful the more context it has. Front-load it with things you already know:

```bash
# Ingest your team's architecture doc
wiki ingest ./docs/architecture.md

# Ingest a blog post you keep referencing
wiki ingest https://example.com/react-server-components-explained

# Pipe in notes from anywhere
pbpaste | wiki ingest -
```

### Query from Inside Your Projects

`wiki query` is project-aware — it reads the current git repo name and boosts pages tagged with that project. So running `wiki query "how do we handle auth"` from inside your `acme-api` repo will prefer pages tagged `acme-api` over generic auth pages.

Use it as a faster alternative to searching old conversations:

```bash
wiki query "what was the decision on database migrations"
wiki query "how does the event bus work"
wiki query "why did we switch from REST to GraphQL"
```

### Add wiki query to Your Claude Code System Prompt

Give Claude Code access to your wiki by adding this to your project's `CLAUDE.md`:

```markdown
## Wiki

Run `wiki query "<question>"` via Bash to check the project wiki before making architectural decisions or when you need context on past choices.
```

Now Claude Code will consult your wiki during conversations — pulling in knowledge from previous sessions across all your projects.

### Customize the Schema

`~/.wiki/schema.md` controls what gets captured and how pages are structured. The defaults are sensible, but you can tune it:

- **Raise the quality bar** if you're getting too many low-value pages — tighten the "wiki-worthy" criteria
- **Add domain-specific tags** to the taxonomy if you work in a specialized field
- **Change page structure** to match how you think — add sections, change the frontmatter fields
- **Adjust split/merge thresholds** if your pages are too long or too granular

Changes take effect immediately since the schema is injected into every agent prompt.

### Periodic Maintenance

```bash
# See what's in the wiki
wiki status

# Find problems: orphan pages, broken cross-refs, stale content
wiki lint

# Fix them automatically
wiki lint --fix
```

Run `wiki lint` every few weeks to keep the wiki healthy. Pages untouched for 90+ days show up as stale in `wiki status`.

## Design Choices

- **No database.** Markdown files + JSONL logs. Human-readable, grep-able, version-controllable.
- **Schema as prompt.** `schema.md` is both documentation and the agent's instructions. One file governs all curation behavior.
- **Project-aware queries.** When you run `wiki query` from inside a git repo, pages tagged with that project's name are boosted in relevance.
- **Cheap triage.** The two-phase capture pipeline means most sessions cost a single short LLM call. Extraction only runs when there's something worth capturing.
