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
ogImage: "https://images.unsplash.com/photo-XXXXX?w=1200&h=630&fit=crop"
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

- Use Unsplash URLs with parameters: `?w=1200&h=630&fit=crop`
- Choose images that match the article topic:

| Topic | Search terms |
| ----- | ------------ |
| Terminal/CLI tools | "terminal", "command line", "code dark" |
| AI/ML | "artificial intelligence", "neural network", "robot" |
| Data engineering | "data center", "server", "database" |
| DevOps/Infrastructure | "server room", "network", "cloud computing" |
| Code/Programming | "code", "programming", "software development" |
| Graphs/Networks | "network", "connections", "nodes" |

- Format: `"https://images.unsplash.com/photo-XXXXX?w=1200&h=630&fit=crop"`
- Always wrap URL in quotes in YAML

For inline images:

- Use sparingly — tables and code blocks convey more information
- If used, provide alt text describing what's shown
- Prefer diagrams over screenshots (diagrams age better)

## Checklist Before Publishing

- [ ] Title is specific and makes a claim (not "Introduction to X")
- [ ] Description works as a standalone tweet
- [ ] 3-5 relevant tags
- [ ] **ogImage included** (Unsplash URL, 1200x630)
- [ ] ~10-15 min read (2500-4000 words)
- [ ] At least one code example
- [ ] At least one table
- [ ] Limitations section is honest
- [ ] Links to source repo/docs
- [ ] Disclaimer at the end
- [ ] No broken links
- [ ] Date is accurate
