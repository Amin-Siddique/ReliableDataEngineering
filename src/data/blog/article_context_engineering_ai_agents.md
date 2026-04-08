---
title: "The AI Doesn't Need to Read Your Codebase. It Needs a Map."
description: "Context Hub, Code Review Graph, and the emerging discipline of giving AI agents less to make them smarter."
pubDatetime: 2026-03-24
tags:
  - ai-agents
  - context-engineering
  - developer-tools
  - llm
ogImage: "/images/blog/context-engineering.webp"
---

# The AI Doesn't Need to Read Your Codebase. It Needs a Map.

*Context Hub, Code Review Graph, and the emerging discipline of giving AI agents less to make them smarter.*

---

*AI Tools | Context Engineering | Developer Productivity | March 2026*
*~15 min read*

---

## The Most Expensive Mistake in AI-Assisted Development

Every AI coding tool makes the same mistake on day one.

It reads everything.

Claude Code opens your project, scans the directory tree, reads a dozen files, and starts working. Cursor indexes your entire repository into a vector store. GitHub Copilot ingests every open tab. The assumption is obvious and wrong: more context = better output.

Here's what actually happens. Your 3,000-file FastAPI project becomes 138,000 tokens of context. The model receives a firehose of imports, utility functions, test fixtures, and configuration files. Somewhere in that flood is the one function signature and the three callers it actually needs to see to do its job. The model has to find the needle. It usually doesn't.

The result: hallucinated APIs. Incorrect function signatures. Suggestions that reference modules from the wrong package. Code reviews that miss the blast radius of a change because the model was too busy reading unrelated files to notice that `login()` is called by 14 other functions.

And you're paying for every token of that noise.

Two open-source projects released in early 2026 approach this problem from completely different angles — and together, they reveal a pattern that's about to reshape how we build AI developer tools.

---

## Project 1: Code Review Graph — The Blast Radius Engine

[code-review-graph](https://github.com/tirth-patel/code-review-graph) by Tirth Patel starts with a deceptively simple question: when a file changes, what else could break?

Instead of feeding Claude your entire codebase, it builds a structural graph of your repository using Tree-sitter — the same incremental parser that powers syntax highlighting in every modern editor. Every function, class, import, and call site becomes a node. Every relationship (this function calls that one, this class inherits from that one, this test covers that function) becomes an edge.

When you change a file, the graph computes the blast radius: every caller, every dependent, every test that could be affected. Claude reads only those files. Everything else is excluded.

The numbers are striking:

| Repository | Files | Without Graph | With Graph | Reduction |
| ---------- | ----- | ------------- | ---------- | --------- |
| httpx | 125 | 12,507 tokens | 458 tokens | 27x |
| FastAPI | 2,915 | 5,495 tokens | 871 tokens | 6.3x |
| Next.js | 27,732 | 21,614 tokens | 4,457 tokens | 4.9x |

The Next.js monorepo case is the jaw-dropper. 27,732 files. 739,000 tokens if you read everything. The graph narrows it to ~15 files and 15,000 tokens. A 49x reduction. And review quality goes up — from 7.0 to 9.0 on their benchmark — because the model isn't drowning in noise.

---

## Why It Works

The graph doesn't just reduce tokens. It gives the AI something it fundamentally lacks: an understanding of code topology.

An LLM reading files has no concept of "this function is called by 14 other functions, and if I change its signature, all 14 will break." It sees text. It doesn't see the invisible web of dependencies that experienced developers carry in their heads.

The blast-radius analysis makes that web explicit. When Claude receives a review context from Code Review Graph, it doesn't just see the changed file — it sees a structural summary:

```
login() changed → called by auth_middleware(), test_login(), test_auth_flow()
  → auth_middleware() used by 8 route handlers
  → 2 tests have no coverage for the new parameter
```

That's not context in the "here's more text to read" sense. That's intelligence — pre-computed analysis that tells the model what matters.

---

## The Incremental Trick

The graph rebuilds in under 2 seconds on a 2,900-file project. It uses SHA-256 hashes to detect which files actually changed, re-parses only those, and updates their edges. A git commit hook fires automatically. The developer does nothing.

This is important because it means the graph is always current. It's not a stale index that was built yesterday and doesn't know about this morning's refactor. Every time the AI is invoked, it gets a live, accurate map of the codebase.

---

## Project 2: Context Hub — The Living Documentation Layer

[Context Hub](https://github.com/aisuite/chub) by Andrew Ng's team attacks a different failure mode: the AI knows things that are wrong.

Every developer who has used an AI coding agent has experienced this: you ask it to call the OpenAI API, and it generates code using a function signature from 18 months ago. The model's training data is frozen at some cutoff date. The API has moved on. The code compiles, looks right, and fails at runtime.

Context Hub is a CLI tool (`chub`) that gives coding agents access to curated, versioned, up-to-date documentation. But the interesting part isn't the documentation itself — it's the feedback loop.

```bash
chub search openai                # Find available docs
chub get openai/chat --lang py    # Fetch current Python docs
```

The agent reads the docs, writes code that actually works, and moves on. Standard stuff. But here's where it gets interesting:

```bash
# Agent discovers the docs are missing something
chub annotate stripe/api "Needs raw body for webhook verification"

# Next session, that annotation appears automatically
# The agent learns from its own mistakes
```

Annotations are local. They persist across sessions. The next time any agent (or the same agent in a new conversation) fetches those docs, the annotation appears alongside the content. The agent that struggled with Stripe webhooks on Monday teaches the agent that encounters Stripe webhooks on Friday.

Feedback flows the other direction too — `chub feedback stripe/api down` sends a signal to the documentation maintainers that something isn't working. The docs improve for everyone.

---

## The Paradigm Shift

The traditional approach to giving AI agents documentation is RAG: chunk the docs, embed them, stuff the nearest chunks into the prompt. Context Hub does something fundamentally different. It lets the agent pull exactly what it needs, when it needs it, in the right language variant, at the right level of detail.

This is the difference between "here are 50 chunks that are semantically similar to your query" and "here is the exact API reference for the function you're about to call, with annotations from the last time an agent tried this and discovered a gotcha."

RAG gives you proximity. Context Hub gives you precision.

---

## The Pattern: Structured Context Engineering

These two projects don't know about each other. They solve different problems (code review vs. API documentation) in different languages (Python vs. Node.js) for different audiences. But they share an architectural conviction:

**The quality of AI output is determined less by the model and more by the structure of its input.**

This is the emerging discipline of context engineering — and it goes far beyond prompt engineering. Prompt engineering is about crafting better instructions. Context engineering is about what data reaches the model in the first place.

Three principles are crystallizing:

---

## Principle 1: Compute Before You Prompt

Both projects do significant computation before the LLM is invoked.

Code Review Graph parses the entire codebase into a Tree-sitter AST, builds a dependency graph in SQLite, and runs blast-radius analysis — all before Claude sees a single token. The LLM receives pre-digested intelligence, not raw files.

Context Hub maintains a curated, indexed documentation registry with version awareness and annotation history — all before the agent makes its first API call.

The pattern: invest CPU cycles upfront to save token costs and improve quality downstream. Parsing, indexing, graph traversal, and structural analysis are all things computers do well and LLMs do poorly. Do them first.

---

## Principle 2: Subtract, Don't Add

The instinct when AI output is bad is to add more context. More examples. More documentation. More files in the prompt. Both projects do the opposite — they aggressively subtract.

Code Review Graph's entire value proposition is exclusion. Out of 27,732 files, it says "read these 15, ignore the rest." The 27,717 excluded files aren't missing context — they're eliminated noise.

Context Hub's incremental fetch (`--file` to grab specific references, not the full doc) serves the same purpose. Don't send the entire Stripe API reference when the agent only needs the webhooks section.

The pattern: context quality scales inversely with context quantity. The model with 500 precisely selected tokens outperforms the model with 50,000 vaguely relevant tokens.

---

## Principle 3: Make It Structural, Not Textual

Neither project sends raw text to the model as its primary context mechanism.

Code Review Graph sends a structural summary: node types, edge relationships, blast radius, test coverage gaps. This is graph data — topology and relationships — not prose.

Context Hub sends curated, schema-validated documentation with YAML frontmatter, language variants, and structured annotations. Not a webpage scraped into markdown.

The pattern: LLMs are good at processing structured information with clear semantics. They're bad at extracting signal from unstructured walls of text. The preprocessing step should produce structure, not just shorter text.

---

## Where We've Seen This Before

This pattern isn't new. We just didn't have a name for it.

When we built a SQL migration pipeline at our organization, we hit the same wall: 200K-character SQL files that exceeded context windows, cost a fortune in tokens, and produced garbage output. Our solution was TOON (Token-Oriented Object Notation) — a compact AST serialization that compresses SQL structure by 90–95% while preserving the information the LLM actually needs: column counts, join types, nesting depth, and anti-patterns.

```
# 24,680 characters of SQL becomes 40 lines of TOON:
STATS cols:47 tbls:8 subs:3 joins:5 ctes:2 chars:24680
INSERT catalog.schema.target_table (47 cols)
  WITH:
    base_data:
      SEL |12|
        from: catalog.schema.source_table @src
        JOIN(LEFT) ref_table ON: src.kim = r.kim
        where: AND(3)
  body:
    SEL |47| from: enriched @e
ISSUES |1|
  [H] DEEP_NESTING: subquery nested 5 levels at SUB @latest_record
```

Same pattern. Parse the input into an AST (sqlglot for SQL, Tree-sitter for code, markdown parser for docs). Extract the structure. Compress it. Give the model a map instead of the territory.

The results were consistent across all three approaches:

| Approach | Domain | Token Reduction | Quality Impact |
| -------- | ------ | --------------- | -------------- |
| Code Review Graph | Code review | 6.8x average | +22% review quality |
| Context Hub | API docs | Variable (incremental fetch) | Eliminates stale-API hallucinations |
| TOON | SQL migration | 10–20x | -64% retry rate |

Different domains. Same principle. Same results.

---

## The Uncomfortable Implication

Here's what these projects imply about the current state of AI developer tools:

**Most AI coding tools are leaving 80% of their potential quality on the floor by being lazy about context.**

The default approach — "read everything, let the model figure it out" — is the equivalent of handing a new developer the entire company codebase on day one and saying "write a PR." No onboarding. No architecture diagram. No "here's where the important stuff is."

A good tech lead doesn't do that. They say: "Here's the module you'll be working in. Here are the three files that matter. This function is called by these 14 callers, so don't change its signature without updating them. And here's the API doc for the service you'll be integrating with — the authentication section changed last week, watch out for that."

That's what Code Review Graph and Context Hub do. One provides the dependency map. The other provides the up-to-date documentation. Together, they give the AI agent the same onboarding a competent tech lead would give a human developer.

The model doesn't get smarter. It gets better-informed.

---

## What Comes Next

The convergence is obvious: these need to merge into a unified context layer.

Imagine an AI coding agent that:

1. **Understands code topology (Code Review Graph)** — knows which files are affected by a change, which functions call which, which tests cover what
2. **Has current documentation (Context Hub)** — pulls the right API docs, with annotations from past sessions, exactly when needed
3. **Sees structural summaries (TOON-style compression)** — gets a compact representation of large files instead of raw text
4. **Learns incrementally** — annotations and corrections from one session improve the next, without retraining the model

Each of these exists today, in separate tools, for separate domains. The first tool that unifies them into a single context layer will have a significant advantage — not because it uses a better model, but because it feeds whatever model it uses better inputs.

The model wars (GPT vs. Claude vs. Gemini vs. open-source) get all the attention. But the real competitive moat in AI developer tools might turn out to be something much less glamorous:

**Who preprocesses the context best.**

---

## Try Them

### Code Review Graph

```bash
pip install code-review-graph
code-review-graph install
# Then in Claude Code: "Build the code review graph for this project"
```

GitHub | MIT License | Python 3.10+ | 12 languages supported

### Context Hub

```bash
npm install -g @aisuite/chub
chub search openai
chub get openai/chat --lang py
```

GitHub | MIT License | Node.js 18+ | Designed for any coding agent

Both are open source. Both are free. Both will probably save you more tokens in a week than any model upgrade.

---

*Want to understand how storage engines and encoding formats actually work? [Designing Data-Intensive Applications](https://amzn.to/4lPlcr4) covers the fundamentals that make context-efficient architectures possible.*

---

*Disclaimer: This article discusses open-source projects based on their public documentation and README files as of March 2026. The author is not affiliated with either project. Benchmark numbers are sourced from the projects' own published results and have not been independently verified. The TOON system referenced in this article is an internal tool, not a published open-source project. Performance and token savings will vary based on codebase size, language, and use case. AI-generated code should always be reviewed by qualified engineers before deployment.*
