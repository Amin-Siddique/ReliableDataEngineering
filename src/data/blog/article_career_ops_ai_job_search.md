---
title: "He Stopped Applying to Jobs and Built a System That Did It For Him"
description: "Career-Ops: an open-source multi-agent system built on Claude Code that evaluated 740+ job offers, generated 354 tailored CVs, and landed its creator a Head of Applied AI role. Now on GitHub."
draft: true
pubDatetime: 2026-04-06
tags:
  - ai-agents
  - open-source
  - claude-code
  - career
  - automation
ogImage: "/images/blog/career-ops-ai-job-search.webp"
---

# He Stopped Applying to Jobs and Built a System That Did It For Him

*Santiago sold his company after 16 years, entered the AI job market, and by week two had stopped applying manually. What he built instead evaluated 740+ offers, wrote 100+ tailored CVs, and landed him a Head of Applied AI role. Now it's open source.*

---

*Open Source | Claude Code | April 2026*

*~13 min read*

---

> **Disclaimer:** This article is based on the creator's published case study at santifer.io, the open-source repository at github.com/santifer/career-ops, and his DEV Community post. Metrics (evaluations, PDFs, applications sent) are self-reported by the author. The open-source version currently lists 14 skill modes; the original personal system had 12 at time of writing the case study. The "Head of Applied AI" role outcome is stated in the repository's own README.

| Metric | Value |
|--------|-------|
| Job offers evaluated | 740+ |
| Tailored PDFs generated | 354 |
| URLs deduplicated | 680 |
| Skill modes (open source) | 14 |

Week one of his job search, Santiago Fernández de Valderrama did what everyone does: read job descriptions, mapped his skills, filled out forms. By week two, he had stopped. Not because he gave up — because he was building something.

Santiago had just exited the business he'd run for 16 years. He wanted AI roles — specifically Head of Applied AI, technical PM, solutions architect-type positions — and he quickly discovered that hunting for senior AI roles is a full-time job in itself. Every offer needed a tailored CV. Every application needed a cover story. Every platform asked the same questions in different formats. Multiply that across 10 offers a day and you've eaten your entire schedule before you've sent a single thoughtful email.

So he automated it. Not the decisions — those stay human. But everything before the decision: reading, scoring, tailoring, formatting, tracking, form-filling. That's the system he built on top of Claude Code, called **Career-Ops**, and it's now open source at [github.com/santifer/career-ops](https://github.com/santifer/career-ops).

> "I no longer apply to jobs. A multi-agent system evaluates them, generates my personalized resume, and prepares the application. I review and decide. The AI does the analytical work."
>
> — Santiago Fernández de Valderrama, santifer.io

## The problem nobody talks about

Job hunting is brutal for a specific reason that rarely gets named directly: it's not hard work, it's *repetitive* work. And repetitive work at high volume degrades quality. When you've read your 40th job description this week, your "tailored" cover letter starts sounding suspiciously like the last one. Your CV stays the same when it shouldn't. You forget which version you sent to whom.

Santiago identified six failure modes in the manual process:

1. Roughly 70% of offers are poor fits — you only discover that after wading through 800 words of JD
2. A static CV can't emphasize the proof points most relevant to each specific offer
3. Every platform asks the same questions in different formats, leading to 15 copy-paste cycles per application
4. Without a tracking system, you lose thread of where you applied and when
5. You get zero signal on whether the problem was fit, the CV, or just timing
6. The AI job market is global — referrals don't scale when you're applying to companies across six countries

## What Career-Ops actually is

It's not an auto-apply bot. That distinction matters, and Santiago is emphatic about it in the repository's own README: *"This is NOT a spray-and-pray tool. The whole point is to apply only where there's a real match — for your sake and for the recruiter reading your application."*

Career-Ops is a multi-agent system built on Claude Code. Every capability is a separate skill file — a mode — with its own context, rules, and tools. This architecture choice turns out to be crucial. The alternative approach, one massive system prompt, produced terrible results early in development. Modes with precise context outperform a 10,000-token monolith because each one loads only what it needs.

The open-source version ships with 14 modes:

| Mode | What it does |
|------|--------------|
| `auto-pipeline` | Full pipeline: URL in, evaluation report + PDF + tracker entry out. Zero manual steps. |
| `evaluate` | Single-offer deep evaluation across 6 blocks: summary, CV match, level, compensation, personalization, interview probability. |
| `scan` | Navigates job boards and company careers pages to discover offers that never appear on aggregators. |
| `pdf` | ATS-optimized PDF generation per offer — keywords injected, bullets reordered, archetype-adapted. |
| `batch` | Conductor + parallel workers. Evaluates 10+ offers simultaneously. Fault-tolerant and resumable. |
| `apply` | Interactive form-filling via Playwright. Reads the live page, retrieves cached evaluation, generates contextual responses. |
| `compare` | Multi-offer comparison and ranking across a shortlist. |
| `tracker` | Application status dashboard. Single source of truth with dedup and integrity checks. |
| `deep` | Deep company research before applying or before an interview. |
| `contact` | LinkedIn outreach helper. Generates personalized messages without spray-and-pray patterns. |
| `pipeline` | Batch URL processing from inbox file. |
| `training` | Evaluates courses and certifications against your North Star career direction. |

> **Cost to run:** The system runs on the Claude Max 20x plan at $200/month — which Santiago uses for everything: his portfolio chatbot, article writing, and Career-Ops combined. Not a separate per-evaluation API cost.

## The 10-dimension scoring engine

Every offer runs through an evaluation framework with 10 weighted dimensions and produces a numeric score from 1 to 5 and an A–F letter grade. Two dimensions — Role Match and Skills Alignment — function as gate-passes: if either fails hard, the final score drops regardless of how well everything else looks.

| Dimension | What It Measures | Weight |
|-----------|------------------|--------|
| Role Match | Alignment between JD requirements and CV proof points | Gate-pass |
| Skills Alignment | Tech stack overlap | Gate-pass |
| Seniority | Stretch level and negotiability | High |
| Compensation | Market rate vs target | High |
| Interview Likelihood | Callback probability | High |
| Geographic | Remote/hybrid/onsite feasibility | Medium |
| Company Stage | Startup/growth/enterprise fit | Medium |
| Product-Market Fit | Problem domain resonance | Medium |
| Growth Trajectory | Career ladder visibility | Medium |
| Timeline | Closing speed and hiring urgency | Low |

The distribution of scores across the full run tells its own story. Of 195 evaluated offers from the production case study:

- **21** scored 4.5+ (Grade A)
- **52** scored 4.0–4.4 (Grade B)
- **71** scored 3.0–3.9 (Grade C)
- **51** scored below 3.0 (Grade D–F)

74% of evaluated offers scored below 4.0. Without the system, Santiago would have spent days reading JDs that never fit. With it, the filter runs automatically and he only spends time on the top tier.

## The auto-pipeline: URL in, application ready out

The flagship mode is `auto-pipeline`. Paste a job offer URL or description, and it runs the complete sequence without touching you again until review time:

1. **Extract JD** — Playwright navigates to the URL, extracts structured content. Works on Greenhouse, Ashby, Lever, and direct company career pages.

2. **Evaluate 10 dimensions** — Claude reads JD + your CV + portfolio proof points and scores across all 10 weighted dimensions.

3. **Generate report** — Markdown with 6 blocks: executive summary, CV match per requirement, level analysis, compensation assessment, personalization strategy, and interview probability.

4. **Generate ATS-optimized PDF** — Pulls 15–20 keywords from the JD, injects them into the summary and role bullets, reorders experience by relevance, detects language (English/Spanish), detects region (Letter vs A4).

5. **Register in tracker** — TSV entry with company, role, score, grade, and URL. Auto-merges via Node.js script.

6. **Dedup check** — Checks scan-history.tsv (680 URLs) and applications.md. Normalized match on company+role prevents re-evaluation even when URLs change.

## How the CV tailoring actually works

This is the part most people assume is template swapping. It isn't. The system extracts 15–20 keywords from the job description and injects them into specific locations in the CV: the summary paragraph, the first bullet of each relevant role, and the skills section. Then it detects six archetypal role framings and shifts the CV's narrative accordingly.

| Archetype | Primary Proof Point |
|-----------|-------------------|
| AI Platform / LLMOps | Self-Healing Chatbot (71 evals, closed-loop) |
| Agentic Workflows | Multi-agent system (4 agents, 80h/mo automated) |
| Technical AI PM | Business OS (2,100 fields, 50 automations) |
| AI Solutions Architect | pSEO project (4,730 pages, 10.8x traffic) |
| AI FDE | Sold product running in production |
| AI Transformation Lead | 16-year exit, buyer kept all systems |

Same underlying CV. Six different arguments. Nothing fabricated — keywords are reformulated, not invented. Experience is reordered by relevance, not omitted.

> "A CV is an argument, not a document. A generic PDF convinces nobody. A CV that reorganizes proof points by relevance and adapts framing to the archetype — that converts."
>
> — Santiago Fernández de Valderrama, DEV Community

## Batch processing and the portal scanner

For high-volume periods, `batch` mode launches a conductor agent that spins up parallel worker processes — each an independent Claude Code instance with 200K context window. The conductor manages the queue, tracks progress, and merges results. Worker failures don't block the queue. A lock file prevents double execution.

The `scan` mode handles discovery. It navigates job boards like DailyRemote and the careers pages of 45+ pre-configured target companies — Anthropic, OpenAI, ElevenLabs, Stripe, Datadog, LangChain, and others. Many senior AI roles never surface on LinkedIn or Indeed. They're posted directly on Greenhouse, Ashby, or Lever instances hosted on the company's domain. The scanner finds them. The dedup layer — 680 URLs stored in `scan-history.tsv` — ensures nothing gets evaluated twice.

## Before and after

**Before:**
- Read full JD to discover it's a bad fit
- Generic CV sent to every company
- Manual form-filling, 15 copy-pastes
- Spreadsheet or nothing for tracking
- LinkedIn alerts only, no direct scanning
- One application at a time
- Re-applying to seen jobs by accident

**Career-Ops:**
- A–F score before you read the JD
- Tailored PDF per offer, archetype-adapted
- Playwright auto-fills forms from cached eval
- TSV + automated dedup, single source of truth
- Scanner hits 45+ company pages directly
- 122+ URLs in parallel via conductor+workers
- 680 URLs deduplicated, zero re-evaluations

## Getting it running

The open-source repo at [github.com/santifer/career-ops](https://github.com/santifer/career-ops) is designed to be forked and made yours. The setup is three commands and two config files:

```bash
# 1. Clone and install
git clone https://github.com/santifer/career-ops.git
cd career-ops
npm install
npx playwright install chromium  # Required for PDF generation + form-filling

# 2. Configure your profile
# Edit config/profile.yml with your name, email, target roles, narrative

# 3. Add your CV
# Create cv.md in the project root — this is the source of truth
# Optionally: create article-digest.md with portfolio proof points

# 4. Run Career-Ops via Claude Code
# Open Claude Code in the project directory, then:
/career-ops https://jobs.ashbyhq.com/your-target-company/role-id
```

Claude Code reads the `CLAUDE.md` file in the repository root, which acts as the system's orientation guide. The CLAUDE.md explicitly tells Claude which files to read for each mode, what the archetypes are, and crucially: that the system is designed to be customized mid-conversation.

> **Prerequisites:** You need Claude Code (available via Anthropic's CLI), Node.js, and npm. Playwright requires Chromium for PDF generation and form-filling. The system is not plug-and-play out of the box — it's designed to be configured for your career profile.

## The meta-point

There's an irony in how this system got used that Santiago leans into deliberately. The competencies it demonstrates — multi-agent architecture, automation design, LLMOps, human-in-the-loop system design — are exactly the competencies the target roles require. Every recruiter or hiring manager who saw his application was looking at evidence that he could build what he'd be hired to build.

That's not a trick. It's genuine. The system is the portfolio entry. The fact that it worked — that it evaluated 740+ offers and produced a job offer — is the proof point in the interview.

One lesson worth pulling out separately: the boring infrastructure had the highest ROI. Not the scoring algorithm or the PDF rendering. The dedup system. 680 URLs stored in a flat TSV file meant 680 evaluations that never had to run twice.

The system is open source, the documentation is solid, and the CLAUDE.md is designed to let Claude customize it for whoever forks it. If you're doing a job search in any technical domain right now, it's worth a few hours to set up. Not because it will apply for you — it won't — but because it will tell you, very quickly, which of the 50 roles you're considering are actually worth your time.

---

*Sources: GitHub repository (github.com/santifer/career-ops), Creator's case study (santifer.io/career-ops-system), DEV Community writeup (dev.to/santifer), Creator's portfolio (santifer.io/en).*

*All metrics are self-reported by the author and cross-referenced against his published case study and GitHub README.*

---

If you're building automation systems where multi-agent coordination and workflow design matter, [Designing Data-Intensive Applications](https://amzn.to/4lPlcr4) provides essential foundations for understanding how to design systems that can scale and maintain integrity.

---

*The views expressed in this article are my own and do not reflect those of my employer. I am not affiliated with any of the companies or products mentioned. This article is based on publicly reported information and independent analysis.*
