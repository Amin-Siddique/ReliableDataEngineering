# Tech Article Writing Skill

Use this skill when writing tech articles for the blog at `src/data/blog/`.

## Article Structure

### Frontmatter (YAML)

```yaml
---
title: "Catchy headline — with a hook or bold claim"
description: "One-sentence summary explaining *why* this matters. Written for humans scanning a feed."
pubDatetime: YYYY-MM-DD
tags:
  - primary-topic
  - secondary-topic
  - category
ogImage: "/images/blog/your-image-name.webp"
---
```

### Document Flow

1. **H1 Headline** — Restates the title, often with added context or sublist ("Blender too. And GIMP.")
2. **Italic deck** — 1-2 sentence summary restating what it does and why it matters
3. **Horizontal rule** (`---`)
4. **Metadata line** — Category | Tags | Month Year, then `*~X min read*`
5. **Horizontal rule** (`---`)
6. **Sections** — 8-12 H2 sections, each self-contained

### Section Types (Mix These)

| Type              | Purpose                    | Example Header                            |
| ----------------- | -------------------------- | ----------------------------------------- |
| Problem statement | Set up the pain point      | "The problem nobody bothered to solve"    |
| How it works      | Technical explanation      | "How it works: seven phases, one command" |
| Concrete examples | Show real usage            | "What agents actually get back"           |
| Feature deep-dive | Detailed capability        | "The 13 applications they tested"         |
| Bigger picture    | Industry implications      | "The uncomfortable thesis"                |
| Limitations       | Honest assessment          | "Where it falls short"                    |
| Try it            | Installation/links         | "Try it"                                  |

## Writing Style

**Tone:**

- Direct and opinionated, not neutral or hedging
- Explains technical concepts without jargon overload
- Uses "you" to address the reader
- Occasional rhetorical questions
- Bold claims backed by specifics

**Sentence structure:**

- Short punchy sentences mixed with longer explanatory ones
- Fragments are okay for emphasis: "No screenshots. No pixel-hunting. Just structured commands."
- Lead with the point, then explain

**Code blocks:**

- Bash/shell examples for installation and usage
- JSON for API responses and config
- Real-looking examples, not `foo`/`bar`

**Tables:**

- Use liberally for feature lists, comparisons, categories
- Keep columns to 2-3, rarely 4
- Headers should be concise

**What to include:**

- Specific numbers (stars, test counts, categories)
- Named technologies and projects
- Before/after comparisons
- Real workflow examples
- Honest limitations section
- Links to GitHub, docs, community

**What to avoid:**

- Marketing fluff ("revolutionary", "game-changing")
- Excessive superlatives
- Vague claims without evidence
- Emojis
- Apologetic hedging ("it might be useful for some people")

## Recommended Resources Section

Before the disclaimer, add a relevant book recommendation with affiliate link. Keep it natural and match the book to the article topic.

```markdown
---

*[Contextual sentence about going deeper on topic]. [Book Title](AFFILIATE_LINK) [brief reason why it's relevant to this article].*
```

**Available affiliate links (pick the most relevant):**

| Book | Link | Best for articles about |
| ---- | ---- | ----------------------- |
| Designing Data-Intensive Applications | `https://amzn.to/4lPlcr4` | Distributed systems, databases, storage, replication, encoding |
| Fundamentals of Data Engineering | `https://amzn.to/4sruUCi` | Data pipelines, ETL, data lifecycle, career advice |
| The Data Warehouse Toolkit | `https://amzn.to/4rNlq3m` | Dimensional modeling, warehouses, analytics, BI |
| Spark: The Definitive Guide | `https://amzn.to/41mM3RP` | Spark, big data, distributed processing |

**Example:**

```markdown
---

*Want to understand how storage engines and encoding formats actually work? [Designing Data-Intensive Applications](https://amzn.to/4lPlcr4) covers the fundamentals that make formats like this possible.*
```

## Required Disclaimer

End every article with an italicized disclaimer:

```markdown
*Disclaimer: This article is based on [SOURCE]'s public documentation as of [DATE]. The author has no affiliation with [PROJECT/ORG]. [SPECIFIC CAVEATS about numbers, benchmarks, claims]. Star counts are snapshots that change daily.*
```

## Example Opening

```markdown
# Tool-Name does X. Also Y. And Z.

*One sentence explaining the core value prop and who benefits.*

---

*Category | Topic1 | Topic2 | Month Year*
*~X min read*

---

## The problem/context section

[2-3 paragraphs establishing why this matters, what gap exists, or what changed]

[Tool-Name](https://github.com/org/repo) from [Organization] takes a different approach. [One sentence explaining the key insight.]

\`\`\`bash
# Concrete example of usage
tool-name do-something --flag value
\`\`\`

[Brief explanation of what that example shows]
```

## Image Guidelines

**REQUIRED: Always include an ogImage in frontmatter.**

For OG/social images (`ogImage` in frontmatter):

- Use local WebP images stored in `public/images/blog/`
- Format: `"/images/blog/your-image-name.webp"`
- Always wrap path in quotes in YAML
- Images should be max 1200px wide, WebP format, under 200KB
- If adding a new image, convert to WebP: `cwebp -q 80 input.png -o public/images/blog/output.webp`

For inline images:

- Use sparingly — tables and code blocks convey more information
- Store in `public/images/blog/` as WebP
- If used, provide alt text describing what's shown
- Prefer diagrams over screenshots (diagrams age better)

## Checklist Before Publishing

- [ ] Title is specific and makes a claim (not "Introduction to X")
- [ ] Description works as a standalone tweet
- [ ] 3-5 relevant tags
- [ ] **ogImage included** (local WebP in `/images/blog/`, max 1200px wide)
- [ ] ~10-15 min read (2500-4000 words)
- [ ] At least one code example
- [ ] At least one table
- [ ] Limitations section is honest
- [ ] Links to source repo/docs
- [ ] **Affiliate book recommendation** (pick most relevant from table above)
- [ ] Disclaimer at the end
- [ ] No broken links
- [ ] Date is accurate
