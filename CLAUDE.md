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

## Interview Prep section (`/interview-prep`)

Content is **not** authored in this repo. It comes from
[data-eng-problems](https://github.com/Amin-Siddique/data-eng-problems) and is synced on every build:

1. A push to `main` in data-eng-problems runs its CI (every SQL/Python solution executed, links and
   Mermaid diagrams validated). Only if green, CI uploads `content-bundle.tar.gz` to the rolling
   `content-latest` release and calls this site's Netlify build hook.
2. `npm run build` / `npm run dev` run `scripts/sync-interview-content.mjs` first (npm `prebuild`/`predev`).
   It downloads the bundle, rewrites repo links to `/interview-prep/...` routes, converts Mermaid fences
   to client-rendered blocks, and writes:
   - `src/data/interview/` → `interview` content collection (`src/content.config.ts`)
   - `public/interview-prep/app/` → the interactive app (SQL/Python in the browser, flashcards)
   - `public/interview-prep/assets/` → diagrams
   All three are gitignored. Never edit them by hand.
3. Pages: `src/pages/interview-prep/index.astro` (landing) and `[...slug].astro` (every page).

Local development against a local checkout:

```bash
INTERVIEW_CONTENT_DIR=../data-eng-problems npm run dev
```

If the bundle can't be downloaded the build fails on purpose (Netlify keeps the previous deploy live).
Set `INTERVIEW_CONTENT_OPTIONAL=1` to build without the section.

**Private source repo:** data-eng-problems is private, so the build needs a read-only token in
`INTERVIEW_CONTENT_TOKEN` (fine-grained PAT scoped to that repo, Contents: read-only), set in Netlify (and Cloudflare
Pages) environment variables. The script then downloads the release asset through the GitHub API.

**One-time setup:** in Netlify → Site configuration → Build & deploy → Build hooks, create a hook, then add its URL
as the `NETLIFY_BUILD_HOOK` secret in the data-eng-problems GitHub repo (Settings → Secrets → Actions).
