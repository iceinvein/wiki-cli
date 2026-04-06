export const DEFAULT_SCHEMA = `# Wiki Schema

This file defines how you (Claude) should organize and maintain this wiki. It is injected into every operation.

## Page Rules

- **One concept per page.** If a page covers two distinct topics, split it.
- **Naming:** kebab-case, topic-focused. Good: \`electron-ipc-patterns.md\`. Bad: \`notes-april-6.md\`.
- **Split** when a page exceeds ~500 lines or covers multiple unrelated concepts.
- **Merge** when two pages overlap >70% in content.

## Page Structure

Every page must have this format:

\`\`\`markdown
---
title: Page Title
tags: [tag1, tag2]
sources: [source-type:identifier]
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

Content here. Be concise but complete. Use code blocks for code examples.
Explain the "why" not just the "what".

## Related
- [[other-page]] — brief explanation of the relationship
\`\`\`

## Source Types

- \`file:/path/to/file\` — ingested from a local file
- \`url:https://example.com\` — ingested from a URL
- \`session:uuid\` — captured from a Claude Code session
- \`stdin\` — piped in via stdin

## Tag Taxonomy

Tags are open — propose new tags as needed. Keep them lowercase, singular, and specific.
Avoid meta-tags like "important" or "misc".

## Index Format

index.md has one entry per page:

\`\`\`
- **page-name** [tag1, tag2] — one-line summary
\`\`\`

Always update index.md when creating, updating, or deleting pages.

## Cross-References

Use \`[[page-name]]\` syntax in the Related section. Every page should link to at least one other page when relationships exist. When creating or updating a page, check if other pages should link back.

## Quality Bar

**Wiki-worthy knowledge:**
- Architectural decisions and rationale
- Patterns, idioms, and best practices learned
- Gotchas, pitfalls, and non-obvious behaviors
- Domain concepts and mental models
- Reusable solutions to recurring problems

**NOT wiki-worthy:**
- Typo fixes, variable renames
- Routine CRUD operations
- Mechanical steps (install, run dev server)
- Pure file browsing with no conclusions
- Temporary debugging steps
`
