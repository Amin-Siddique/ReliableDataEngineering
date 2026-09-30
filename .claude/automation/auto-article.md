# Automated article: procedure

The site owner set up a scheduled task that runs this every 3 days and asked for it to publish without review. It writes one article from `topics.md`, checks it, and publishes it by pushing to `main` (Netlify deploys `main`).

Follow `.claude/skills/tech-article.md` for structure and formatting. The rules below override it where they differ.

## 1. Pick the topic

1. `git checkout main && git pull origin main`.
2. Open `.claude/automation/topics.md` and take the first unchecked item (`- [ ]`).
3. Check it is not already covered: search `src/data/blog/` titles, descriptions and tags for the same subject. If a published post already covers it, check the item off with `(skipped: covered by <slug>)` and take the next one.
4. If fewer than 5 unchecked topics remain, research current data engineering and AI news and append 10 new topics in the same style (generic data engineering with an AI angle, not duplicating any published post or existing topic).

## 2. Research

- Use web search and read primary sources: official docs, project repositories, papers, vendor engineering blogs. Aim for 5 or more sources.
- Every specific number, version, feature or benchmark in the article must come from a source read in this run, and the article links to it. If a claim has no source, leave it out.
- Note the "as of" month for anything that changes quickly.

## 3. Voice and content rules

- **Generic, not personal.** Write as a knowledgeable explainer addressing the reader ("you"). No first-person experience claims: no "at my company", "in my last project", "we migrated", "I benchmarked", and no invented anecdotes, teams, clients, employers or production numbers. Never mention the site owner's employer or job.
- **Useful.** Every section teaches something concrete: how it works, when to use it, when not to, what breaks, how to fix it. Include at least one runnable code or SQL example and at least one comparison table.
- **Clear writing.** Vary sentence length. Lead with the point. Skip filler openers ("In today's fast-paced world"), stacked rhetorical questions, "delve", "leverage", "game-changer", "it's worth noting", and heavy em-dash use. No emojis.
- **Honest limitations section** with real trade-offs.
- Length: 1,800 to 3,000 words, 8 to 12 H2 sections.

## 4. File

- Path: `src/data/blog/article_<snake_case_slug>.md`.
- Frontmatter: `title`, `description`, `pubDatetime` (today, `YYYY-MM-DD`), 3 to 5 lowercase hyphenated `tags` (reuse existing tags where they fit). Do not set `ogImage` (the site generates one) or `draft`.
- Body: italic deck first. No `# ` H1, no metadata line, no read time, no byline.
- Near the end, a short "Related articles" list linking 2 to 3 published posts (skip files containing `draft: true`).
- Before the disclaimer: one affiliate book recommendation from the table in `CLAUDE.md`, matched to the topic.
- End with the italic disclaimer, including: "This article was researched and drafted with AI assistance and checked against the sources linked above."

## 5. Verify, then publish

1. `npm ci --no-audit --no-fund` if `node_modules` is missing, then `npm run build`. It must finish with 0 errors. If it fails, fix the article and rebuild. Never push a failing build.
2. Re-read the article against section 3 and remove any first-person experience claim or unsourced number.
3. Check off the topic in `topics.md`: `- [x] <topic> -> article_<slug>`.
4. Commit only the new article and `topics.md`, message `Add article: <title>`.
5. `git push origin main`. On a network error, retry up to 4 times (2s, 4s, 8s, 16s). If rejected because `main` moved, `git pull --rebase origin main`, rebuild, push again.

If anything blocks publishing (no sources, build keeps failing, push refused), push nothing and report what happened.
