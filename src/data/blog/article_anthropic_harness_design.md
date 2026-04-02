---
title: "The Engineer Who Made Claude Build a DAW in 4 Hours — And What He Learned About Harness Design"
description: "A solo agent costs $9 and ships broken software. A three-agent harness costs $200 and builds a retro game maker from one sentence. Here's how the engineering actually works."
pubDatetime: 2026-04-02
tags:
  - ai-agents
  - multi-agent
  - anthropic
  - agentic-coding
  - claude
  - harness-design
ogImage: "/images/blog/anthropic-harness-design.png"
---

# The Engineer Who Made Claude Build a DAW in 4 Hours — And What He Learned About Harness Design

*Anthropic's Labs team just published a deep look at multi-agent architecture for long-running autonomous coding. A solo agent costs $9 and ships broken software. A three-agent harness costs $200 and builds a retro game maker from one sentence. Here's how the engineering actually works.*

---

*Anthropic Engineering | Multi-Agent | Generator-Evaluator | Agentic Coding | April 2026*
*~12 min read*

---

## The gap between writing code and building software

There's a meaningful difference between an AI that writes code and an AI that builds software. Writing code is a task. Building software involves planning, design taste, quality judgment, iteration, and the ability to sustain coherent work across hours. One of those things language models can do well right now. The other one requires engineering the environment around the model as carefully as you engineer the model itself.

On March 24, 2026, Prithvi Rajasekaran from Anthropic's [Labs team](https://www.anthropic.com/news/introducing-anthropic-labs) published a detailed account of exactly how that environment gets built. The post covers two experiments: getting Claude to produce genuinely distinctive frontend designs, and getting it to build complete full-stack applications without human intervention over multi-hour sessions. Both experiments converge on the same architectural insight — one borrowed, notably, from Generative Adversarial Networks.

| Metric | Value |
| ------ | ----- |
| Cost differential: full harness vs solo agent | 20x ($200 vs $9) |
| Full harness run building a retro game maker | 6 hours |
| Agent roles | 3 (Planner, Builder, Evaluator) |

The post is unusually candid — it shows failure modes, cost breakdowns, evaluator logs with specific bugs caught, and an honest assessment of where the output still fell short. For AI engineers and developers building production agentic systems, there's more substance here than in most conference talks on the subject.

---

## Why single-agent coding falls apart over time

The failure modes of naive long-running agents aren't mysterious, but Rajasekaran names them precisely enough to be useful.

The first is context window degradation. As the context window fills during a long coding session, model coherence degrades. Rajasekaran also names a subtler variant — "context anxiety" — where models begin wrapping up work prematurely as they approach what they believe is their context limit, even when they haven't actually hit it. Claude Sonnet 4.5 exhibited this strongly enough that it became a design constraint: compaction alone (summarising earlier conversation in-place) wasn't sufficient, because the agent still had a sense of how much it had been working and would cut corners accordingly. Context resets — clearing the window entirely and handing off structured state to a fresh agent — were the solution.

The second failure mode is self-evaluation. When asked to grade their own work, agents reliably overrate it. For tasks with verifiable outcomes, this still manifests as poor judgment — an agent might note a legitimate issue, then talk itself into deciding it isn't a big deal. For subjective tasks like visual design, where there is no binary correctness check, the problem is worse: the agent has no anchor to push back against its own optimism.

> "Agents tend to respond by confidently praising the work — even when, to a human observer, the quality is obviously mediocre." — Prithvi Rajasekaran, Anthropic Labs

Both failure modes have a common structure: the agent doing the work and the agent judging the work are the same agent, with the same biases, working within the same context. The fix — separating generator from evaluator — is architecturally obvious once you name it this way. Getting it to actually work took considerably more engineering.

---

## Frontend design: Making subjective quality gradable

Rajasekaran started with frontend design because the self-evaluation failure was most visible there. Without intervention, Claude gravitates toward safe, predictable layouts — technically functional, visually generic. He describes these as exhibiting "telltale signs of AI generation like purple gradients over white cards." The layouts work. They just don't look like anything a designer with taste actually produced.

The core insight was that while aesthetics can't be fully reduced to a score, they can be improved with grading criteria that encode specific design principles. "Is this design beautiful?" is unanswerable consistently. "Does this follow these four criteria for good design?" is something a model can grade, and grade differently from how it evaluates its own work.

### The four grading criteria

The criteria Rajasekaran developed and gave to both generator and evaluator are worth reproducing in full, because they're doing architectural work:

1. **Design quality.** Does the design feel like a coherent whole rather than a collection of parts? Colors, typography, layout, imagery, and other details should combine to create a distinct mood and identity.
2. **Originality.** Is there evidence of custom decisions, or is this template layouts, library defaults, and AI-generated patterns? Unmodified stock components or obvious AI generation patterns fail here explicitly.
3. **Craft.** Technical execution: typography hierarchy, spacing consistency, color harmony, contrast ratios. A competence check rather than a creativity check.
4. **Functionality.** Usability independent of aesthetics. Can users understand what the interface does, find primary actions, and complete tasks without guessing?

The weighting matters as much as the criteria. Rajasekaran emphasised design quality and originality over craft and functionality — because Claude already scored well on craft and functionality by default. Penalising "AI slop" patterns explicitly and weighting originality heavily pushed the model toward aesthetic risk-taking it would otherwise avoid.

> A specific observation from the post worth noting: "The wording of the criteria steered the generator in ways I didn't fully anticipate. Including phrases like 'the best designs are museum quality' pushed designs toward a particular visual convergence." The exact language of evaluation criteria shapes the character of what gets generated, not just whether it passes or fails. This has direct implications for anyone writing evaluator prompts — the evaluator's vocabulary becomes the generator's aesthetic direction.

### The feedback loop in practice

The loop ran on the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview). A generator agent produced an HTML/CSS/JS frontend from a prompt. The evaluator used the Playwright MCP to interact with the live page directly — navigating, screenshotting, and studying the implementation — before scoring each criterion and writing a detailed critique. That critique flowed back as input for the next iteration. Five to fifteen iterations per generation, with full runs stretching to four hours given the evaluator's active browser interaction per cycle.

The Dutch art museum example is the clearest demonstration of what this loop can produce. By iteration nine, the harness had produced a polished dark-themed museum landing page — good, but within expectations. Then, on iteration ten, the generator scrapped the approach entirely and rebuilt the site as a spatial CSS 3D experience: a room with a checkered perspective floor, artwork hung on the walls in free-form positions, doorway-based navigation between gallery rooms instead of scroll. A creative leap that, by Rajasekaran's account, he hadn't seen from single-pass generation.

---

## Full-stack coding: The three-agent architecture

With the generator-evaluator pattern validated on design, Rajasekaran applied it to full-stack application development. The architecture expanded to three agents, each addressing a specific gap he'd observed in previous work.

### The three agents

**1. PLANNER:** Takes a 1–4 sentence user prompt. Expands it into a full product spec — ambitious in scope, high-level on technical design. Deliberately avoids granular implementation details to prevent specification errors from cascading. Also reads the frontend design skill to establish a visual design language as part of the spec. Instructed to weave in AI features where appropriate.

**2. BUILDER:** Implements the app in sprints, picking up one feature at a time from the spec. Stack: React, Vite, FastAPI, SQLite/PostgreSQL. Before each sprint, negotiates a **sprint contract** with the evaluator — agreeing on what "done" looks like before writing code. Self-evaluates at sprint end before handoff. Uses git for version control. On Opus 4.6, runs as one continuous session using SDK compaction instead of context resets.

**3. EVALUATOR (QA):** Uses Playwright MCP to walk through the running application as a user would — testing UI features, API endpoints, and database states. Grades each sprint against the sprint contract and design criteria. Each criterion has a hard threshold: fail any one and the sprint fails, with specific, actionable feedback. Communication via files shared between agents.

### The sprint contract: Bridging spec to testable behaviour

The sprint contract is one of the genuinely novel elements of this architecture, and worth dwelling on. The product spec was intentionally high-level — user stories without implementation detail. That gap between "users can create game levels" and "the level editor correctly wires entity definitions to the game runtime" is where previous harnesses had failed silently.

Before each sprint, the builder proposed what it would build and how success would be verified. The evaluator reviewed that proposal to confirm the builder was building the right thing. The two iterated until they agreed. Only then did the builder write code. Communication was file-based — one agent writes a file, the other reads and responds, either in that file or a new one the first agent then reads. Sprint 3 alone generated 27 specific, testable criteria for the level editor.

This is essentially a machine-generated acceptance test definition, produced collaboratively between the agent doing the work and the agent judging it, before either has touched the implementation. The evaluator's specific findings from the retro game maker run illustrate how granular this got in practice:

| Sprint contract criterion | Evaluator finding |
| ------------------------- | ----------------- |
| Rectangle fill tool allows click-drag to fill a rectangular area with selected tile | **FAIL** — Tool only places tiles at drag start/end points instead of filling the region. `fillRectangle` function exists but isn't triggered properly on mouseUp. |
| User can select and delete placed entity spawn points | **FAIL** — Delete key handler at `LevelEditor.tsx:892` requires both `selection` and `selectedEntityId` to be set, but clicking an entity only sets `selectedEntityId`. Condition should be `selection \|\| (selectedEntityId && activeLayer === 'entity')`. |
| User can reorder animation frames via API | **FAIL** — `PUT /frames/reorder` route defined after `/{frame_id}` routes. FastAPI matches 'reorder' as a frame_id integer and returns 422: "unable to parse string as an integer." |

These are not vague impressions. They're specific file paths, specific conditions, specific error codes. Getting the evaluator to this level took iteration: in early runs, the evaluator would identify legitimate issues, then talk itself into approving the work anyway. The tuning process was to read evaluator logs, find cases where its judgment diverged from Rajasekaran's, and update the QA prompt to address those gaps — the same loop used for the design evaluator, applied to correctness instead of taste.

---

## The numbers: Solo vs harness

The prompt used for the first full-stack experiment was a single sentence: *"Create a 2D retro game maker with features including a level editor, sprite editor, entity behaviors, and a playable test mode."*

| Harness Type | Duration | Cost | Outcome |
| ------------ | -------- | ---- | ------- |
| Solo agent | 20 min | $9 | Visually functional. Core game runtime broken — entities appeared but input didn't work. Wiring between entity definitions and game runtime was missing with no surface indication. |
| Full harness (3-agent) | 6 hr | $200 | Planner expanded to 16-feature spec across 10 sprints. Sprite animation system, behavior templates, sound, AI-assisted level designer, game export. Core game worked — entities moved and responded to input. |

Twenty times more expensive, six times slower, and qualitatively in a different category. The central feature of the application — being able to actually play the game you built — simply didn't work in the solo run. In the harness run, it did.

### The DAW run: Updated harness with Opus 4.6

After iterating to simplify the harness, Rajasekaran removed the sprint construct entirely (Opus 4.6 could sustain coherent work without it) and ran the harness on a second prompt: *"Build a fully featured DAW in the browser using the Web Audio API."*

| Agent & Phase | Duration | Cost |
| ------------- | -------- | ---- |
| Planner | 4.7 min | $0.46 |
| Build – Round 1 | 2 hr 7 min | $71.08 |
| QA – Round 1 | 8.8 min | $3.24 |
| Build – Round 2 | 1 hr 2 min | $36.89 |
| QA – Round 2 | 6.8 min | $3.09 |
| Build – Round 3 | 10.9 min | $5.88 |
| QA – Round 3 | 9.6 min | $4.06 |
| **Total** | **3 hr 50 min** | **$124.70** |

The result: a working browser-based DAW with a functional arrangement view, mixer, and transport — and a built-in Claude agent that could compose a simple song end-to-end through natural language prompts. The QA agent's first-round feedback caught specific gaps: clips couldn't be dragged on the timeline, instrument panels were display-only without interactivity, effects were numeric sliders rather than graphical visualisations. The generator fixed these in subsequent rounds. Not all of them were resolved — audio recording remained stubbed out by the end — but the builder's outputs under harness scrutiny were substantially more complete than they would have been without it.

> "This is a strong app with excellent design fidelity, solid AI agent, and good backend. The main failure point is Feature Completeness — several core DAW features are display-only without interactive depth: clips can't be dragged/moved on the timeline, there are no instrument UI panels, and no visual effect editors. These aren't edge cases — they're the core interactions that make a DAW usable, and the spec explicitly calls for them." — QA agent, Round 1 feedback

---

## The durable engineering lessons

Rajasekaran closes with a principle worth extracting: "Every component in a harness encodes an assumption about what the model can't do on its own, and those assumptions are worth stress testing — both because they may be incorrect, and because they can quickly go stale as models improve." This is a cleaner framing of harness design than most of the discourse around agentic coding, which tends to accumulate complexity without auditing it.

### The four principles

**01. Separate the generator from the evaluator.** A model evaluating its own outputs is inclined to approve them. Tuning a standalone evaluator to be skeptical is far more tractable than making a generator critical of its own work. The separation doesn't require different models — it requires different prompts, different context, and deliberate adversarial framing.

**02. Make subjective quality gradable through explicit criteria.** "Is this good?" is unanswerable. "Does this satisfy these four named criteria?" is gradable. The criteria themselves do architectural work — they encode design philosophy, penalise specific failure modes, and through their exact wording, shape the aesthetic direction of the generator. Writing good evaluation criteria is design work, not just engineering.

**03. Context resets for long tasks; compaction if the model can handle it.** On Sonnet 4.5, context anxiety was severe enough that compaction alone wasn't sufficient — fresh agents with structured handoffs were required. On Opus 4.6, the model could sustain coherent multi-hour sessions with compaction. This is a model-specific calibration, not a universal rule. Check your assumptions when a new model ships.

**04. Audit your harness complexity against current model capabilities.** The sprint construct that was essential on Sonnet 4.5 was overhead on Opus 4.6. Every harness component encodes an assumption about a model limitation. As models improve, those assumptions expire. Re-examine the harness with each new model release and strip what's no longer load-bearing. Complexity that once added value becomes drag.

---

## What this means for AI engineers building today

The practical implications are worth naming for engineers working on production agentic systems right now, not at Anthropic's scale but at smaller ones.

The generator-evaluator pattern is available to anyone using the Claude Agent SDK. You don't need to work at a frontier lab to implement this architecture — you need a generator prompt, an evaluator prompt with explicitly weighted criteria, a mechanism to pass feedback between them (files work, as the post shows), and patience to calibrate the evaluator through iterative log-reading. The Playwright MCP that gave the evaluator browser interaction capabilities is a public tool.

The hardest part, by Rajasekaran's account, was the evaluator calibration: "Out of the box, Claude is a poor QA agent. In early runs, I watched it identify legitimate issues, then talk itself into deciding they weren't a big deal." The fix was iterative prompt tuning against specific log examples where the evaluator's judgment diverged from a human reviewer's. This is the unglamorous part of harness engineering — not architectural design but systematic prompt debugging. The sprint contract's 27 criteria for a single feature gives you a sense of the granularity required for the evaluator to catch real bugs rather than superficial ones.

The cost figures are also worth taking seriously. $200 for a six-hour run that produces a working retro game maker is not a casual experiment cost. The DAW at $124 is cheaper but still meaningful. These are not economics that work for high-volume automation yet. They are economics that work for high-value, low-frequency tasks where the alternative is weeks of developer time — which is a meaningful but constrained set of use cases at current prices.

The broader point from the post holds regardless of cost: the space of interesting harness combinations doesn't shrink as models improve. It moves. The sprint construct that was essential at one capability level becomes unnecessary at the next, freeing up design space for a different kind of scaffold that pushes the model further than it could go without any structure at all. The AI engineer's job isn't to automate themselves out of a role — it's to stay at the frontier of what the current model needs to go further than it goes alone.

---

## Source

- [Anthropic Engineering — Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) by Prithvi Rajasekaran, March 24, 2026
- [Earlier harness work](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [Claude Agent SDK docs](https://platform.claude.com/docs/en/agent-sdk/overview)

---

If you want to go deeper on the patterns behind building reliable AI systems — agentic architectures, evaluation frameworks, and the engineering practices that make production AI work — this is a strong foundation:

[Designing Data-Intensive Applications by Martin Kleppmann](https://amzn.to/4lPlcr4) — the foundational text on building reliable systems at scale, with principles that transfer directly to agentic AI infrastructure.

---

*Disclaimer: This is an independent editorial analysis of Anthropic's engineering blog post published March 24, 2026, written by Prithvi Rajasekaran of Anthropic Labs. All technical claims, cost figures, and architectural decisions are sourced directly from that post. The author of this article has no affiliation with Anthropic beyond being a user of Claude. This article does not represent Anthropic's official positions. This article contains affiliate links — purchasing through them supports this blog at no extra cost to you.*
