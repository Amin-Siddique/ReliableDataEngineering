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

1. Italic deck (the layout already renders the title as H1, the date and the read time, so don't repeat them)
2. 8-12 H2 sections mixing problem/solution/examples/limitations
3. "Try it" section with install commands and links
4. Affiliate book recommendation (see below)
5. Italicized disclaimer

**Affiliate links (add relevant one before disclaimer):**

| Book | Link | Use for |
| ---- | ---- | ------- |
| Designing Data-Intensive Applications | `https://amzn.to/4lPlcr4` | Databases, distributed systems, storage |
| Fundamentals of Data Engineering | `https://amzn.to/4sruUCi` | Pipelines, ETL, data lifecycle |
| The Data Warehouse Toolkit | `https://amzn.to/4rNlq3m` | Warehouses, dimensional modeling |
| Spark: The Definitive Guide | `https://amzn.to/41mM3RP` | Spark, big data processing |

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
