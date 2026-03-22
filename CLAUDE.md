# ReliableDataEngineering2

A tech blog focused on AI tools, developer productivity, and emerging software patterns.

## Project Structure

```
src/
├── data/
│   └── blog/           # Blog articles in Markdown with YAML frontmatter
├── assets/             # Images and static assets
└── ...
```

## Writing Articles

Blog articles go in `src/data/blog/` as Markdown files with YAML frontmatter.

See `.claude/skills/tech-article.md` for the full style guide covering:

- Article structure (frontmatter, sections, flow)
- Writing tone (direct, opinionated, specific)
- Required elements (code blocks, tables, disclaimer)
- Image guidelines

### Quick Reference

**Frontmatter template:**

```yaml
---
title: "Bold claim or hook — with specifics"
description: "One sentence for social sharing"
pubDatetime: YYYY-MM-DD
tags:
  - tag1
  - tag2
---
```

**Article flow:**

1. H1 headline (expand on title)
2. Italic deck + metadata + read time
3. 8-12 H2 sections mixing problem/solution/examples/limitations
4. "Try it" section with install commands and links
5. Italicized disclaimer

**Style notes:**

- No emojis
- No marketing fluff
- Include specific numbers
- Honest limitations section
- End with disclaimer

## Commands

```bash
# Development
npm run dev

# Build
npm run build
```

## Conventions

- File naming: `article_slug.md` (snake_case with `article_` prefix)
- Tags: lowercase, hyphenated (e.g., `ai-agents`, `developer-tools`)
- Dates: ISO format `YYYY-MM-DD`
