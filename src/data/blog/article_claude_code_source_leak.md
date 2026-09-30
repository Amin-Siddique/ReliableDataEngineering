---
title: "Claude Code Source Leak: 512K Lines Exposed via Missing .npmignore Entry"
description: "Complete incident analysis of the March 31, 2026 Claude Code npm source leak, the coincidental axios supply chain attack, and what it means for developers and Anthropic's security posture."
draft: true
pubDatetime: 2026-04-04
tags:
  - security
  - ai-tools
  - supply-chain
  - npm
  - incident-analysis
ogImage: "/images/blog/claude-code-leak.webp"
---

# The Claude Code Source Leak: What Actually Happened, What It Exposes, and What You Should Do

*512,000 lines of code. One missing line in .npmignore. A simultaneous malware attack on a shared dependency. A critical vulnerability discovered within 48 hours. Here's the complete, honest picture.*

---

*Security | AI Engineering | April 2026*

*~13 min read*

---

> **If you updated Claude Code via npm on March 31, 2026:** Between 00:21 and 03:29 UTC, a coincidental supply chain attack on axios pushed malicious versions containing a Remote Access Trojan. Check your lockfiles immediately:
>
> ```bash
> grep -r "1.14.1\|0.30.4\|plain-crypto-js" package-lock.json
> grep -r "1.14.1\|0.30.4\|plain-crypto-js" yarn.lock
> ```
>
> If any matches are found, treat the machine as fully compromised, rotate all secrets, and reinstall the OS. Going forward, use the native installer: `curl -fsSL https://claude.ai/install.sh | bash`

On March 31, 2026 — April Fools' Eve — Anthropic accidentally published the complete internal source code of Claude Code to the public npm registry. Not through a hack. Not through a disgruntled employee. Through a single missing line in a configuration file.

The root cause, confirmed by Anthropic, is almost comically mundane: the Bun runtime that Claude Code uses for its build process generates JavaScript source map files by default. Source maps are debugging artifacts — they map minified production code back to the original readable source. Somebody needed to add `*.map` to the `.npmignore` file. Nobody did. That source map file, `cli.js.map`, contained a reference to a full zip archive of unobfuscated TypeScript source hosted on Anthropic's own Cloudflare R2 storage. That bucket was publicly accessible. Version 2.1.88 of `@anthropic-ai/claude-code` shipped on March 30, 2026, and by mid-morning on March 31, security researcher Chaofan Shou had found the map file, posted it on X, and 16 million people were reading the thread.

Within hours, the codebase — 512,000 lines of TypeScript across 1,906 files — had been mirrored to GitHub, forked over 41,500 times, and become the fastest repository in GitHub history to reach 50,000 stars. Anthropic pulled the package from npm around 08:00 UTC and issued DMCA takedown notices on mirrors. It made no difference. The code is permanently in the public domain in any practical sense, regardless of what the law says about it.

## How the Day Unfolded

| Time | Event |
|------|-------|
| Mar 30 late | Claude Code v2.1.88 pushed to npm. Contains `cli.js.map` — a 59.8 MB source map referencing the full unobfuscated source zip on Anthropic's R2 bucket. The bucket is public. Nobody notices yet. |
| 00:21 UTC | **Axios supply chain attack begins (UNRELATED):** Malicious npm packages axios v1.14.1 and v0.30.4 published, containing a Remote Access Trojan. Attributed later by Google to North Korea-nexus group UNC1069. Coincidental timing with the leak — unrelated cause, devastating combination. |
| 03:29 UTC | **Axios attack window closes:** Malicious axios versions removed from registry. Any developer who ran `npm install` in the 3-hour window may have pulled the RAT. |
| ~06:00 UTC | **Chaofan Shou posts the discovery on X:** "Claude Code source code has been leaked via a map file in their npm registry!" The post gets 10 million+ views. GitHub mirrors appear. 50,000 stars in under 2 hours. |
| ~08:00 UTC | **Anthropic pulls the npm package; issues statement:** "Release packaging issue caused by human error, not a security breach. No sensitive customer data or credentials involved." Also initially uses the npm `deprecated` flag instead of actually unpublishing — drawing further criticism. |
| Same day | **DMCA notices filed; mirrors multiply anyway:** 41,500+ forks. Decentralised mirrors on Gitlawb. A Python clean-room rewrite appears — legally DMCA-proof. Torrents circulate. |
| Apr 2 | **Adversa AI publishes critical permission bypass vulnerability:** A 50-subcommand pipeline exploit, discovered by reading the leaked source, bypasses Claude Code's deny rules entirely. Attackers can run arbitrary commands without per-command permission prompts. Anthropic patches. |
| Apr 2 | **Trojanised "leaked Claude Code" repos appear on GitHub:** Zscaler ThreatLabz discovers malicious repos impersonating the leak, delivering Vidar infostealer and GhostSocks proxy malware. One repo reaches 793 forks and 564 stars before removal. |

## What Was Actually Exposed

The leaked codebase is the `src/` directory of Claude Code — the "agentic harness" that wraps the underlying Claude model and gives it the ability to use tools, manage files, run terminal commands, and orchestrate multi-agent workflows. It is emphatically not the Claude model itself.

| What Was Exposed | What Was NOT Exposed |
|------------------|---------------------|
| 512,000 lines of TypeScript source — the harness, tooling, orchestration, permission model, UI | Claude model weights — the actual AI, what it "knows," how it reasons |
| 44 hidden feature flags, including several for unshipped features | Training data or fine-tuning datasets |
| Internal codename references: **Capybara** (also called Mythos), Anthropic's next model family | Customer data, user prompts, session logs |
| System prompts for internal agent modes including "Undercover Mode" and KAIROS | API keys, production credentials, infrastructure secrets |
| Internal performance metrics: Capybara v8 showing a 29–30% false claims rate vs 16.7% for v4 | User account information or billing data |
| Anti-distillation mechanisms: fake tool definitions injected to poison competitor training | Security certificates or authentication infrastructure |
| Internal engineering notes, bug reports, comments about technical debt | Anthropic's internal communications or strategy documents |

Anthropic's statement is accurate on the narrow technical point: no customer data was exposed, and this was not a breach of production systems. But the "not a security breach" framing understates the real damage, which is strategic and competitive rather than directly harmful to users.

## The Most Significant Revelations

Community analysis — primarily on Hacker News and X — spent the 48 hours after the leak thoroughly dissecting the codebase.

### KAIROS: Autonomous daemon mode

**KAIROS** — named after the Ancient Greek concept of "the right moment" — appears over 150 times in the source. It represents an autonomous daemon mode: Claude Code operating as an always-on background agent even when the user is idle. The feature includes an `autoDream` process that performs memory consolidation while the user is inactive, merging observations, removing contradictions, and converting vague insights into persistent facts before the user returns. This is a significant capability that was not publicly announced and is now on every competitor's product roadmap.

### ANTI_DISTILLATION_CC and fake tools

The codebase contains a feature flag called `ANTI_DISTILLATION_CC`. When enabled, Claude Code injects `anti_distillation: ['fake_tools']` into its API requests — sending fabricated tool definitions to poison training data if competitors attempt to scrape Claude Code's outputs to train their own models. Whether this is clever intellectual property defence or something more ethically murky depends on your perspective.

### Undercover Mode

The leaked system prompt for "Undercover Mode" explicitly instructs Claude Code: *"You are operating UNDERCOVER in a PUBLIC/OPEN-SOURCE repository. Your commit messages, PR titles, and PR bodies MUST NOT contain ANY Anthropic-internal information. Do not blow your cover."*

The practical purpose is defensible: Anthropic employees use Claude Code to contribute to open-source repositories and don't want commit metadata to leak internal project details. The ethical concern: AI-generated code is entering open-source projects without disclosure to the projects' maintainers or communities.

> **The irony nobody missed:** Anthropic built Undercover Mode specifically to prevent internal secrets from leaking through code contributions. They then leaked the entire source code through a file they forgot to exclude from the npm package.

### Internal performance metrics on Capybara

The source contains internal comments referencing Anthropic's next major model family — codename Capybara (also referenced as Mythos in a separate, earlier leak). The metrics are unflattering: Capybara v8 shows a 29–30% false claims rate, an apparent regression from the 16.7% rate seen in v4. Competitors now have a performance benchmark for Anthropic's next model family before it ships.

### Three-layer memory architecture

The engineering details of how Claude Code manages context over long sessions are genuinely impressive. The source reveals a system using `MEMORY.md` as a lightweight index of pointers — not storing data directly but storing locations. Actual project knowledge sits in topic files fetched on demand. Raw transcripts are never fully re-read but are grep-searched for specific identifiers. A "Strict Write Discipline" requires the agent to update its memory index only after a confirmed file write, preventing context pollution from failed attempts.

## The Real Security Consequences

The most important security story from March 31 is not the source code leak. It is the simultaneous, completely unrelated supply chain attack on axios.

Axios is among the most widely used HTTP client libraries in the JavaScript ecosystem. On March 31, a North Korea-nexus threat actor (UNC1069, according to Google's threat intelligence) published malicious versions v1.14.1 and v0.30.4 containing a cross-platform Remote Access Trojan (RAT) and a dependency called `plain-crypto-js`. The attack window was 3 hours and 8 minutes. Claude Code uses axios. Anyone who updated Claude Code via npm during that specific window may have pulled both the source map exposure and the RAT simultaneously — though there is no technical connection between the two incidents.

> "While the Claude Code leak does present real risk, it is not the same as model weights, training data or customer data being compromised. What was exposed is something more like an operational blueprint of how the current version of Claude Code is designed to work."
>
> — Melissa Bischoping, Senior Director of Security Research, Tanium, via SecurityWeek

The concrete security risk that emerged within 48 hours came from security firm Adversa AI, which used the leaked source to find a genuine critical vulnerability: Claude Code's permission enforcement logic skips deny-rule evaluation for command pipelines exceeding 50 subcommands. A malicious `CLAUDE.md` file in a repository could craft a legitimate-looking 51-command build process that bypasses all permission checks, potentially exfiltrating SSH keys, AWS credentials, GitHub tokens, and environment secrets. Anthropic patched this promptly.

> **Do not do this:** Do not download, fork, build, or run any GitHub repository claiming to be the "leaked Claude Code" or a clean-room rewrite offering "unlocked features." Zscaler ThreatLabz confirmed at least one such repo was delivering Vidar v18.7 (an infostealer) and GhostSocks (a network proxy trojan). The repo had 793 forks and 564 stars before removal.

## The Honest Assessment: What This Actually Means

### For Anthropic

This is bad, but not existential. The leak won't sink Anthropic, but it gives every competitor a free engineering education on how to build a production-grade AI coding agent. Claude Code is reportedly generating $2.5 billion in annualised revenue, with enterprise customers accounting for 80% of that. Enterprise customers don't choose Claude Code because of what's in the TypeScript source — they choose it because of the underlying model quality and Anthropic's support relationship. The architecture is now public; the intelligence that makes it useful is not.

The more lasting damage is reputational and coming at a genuinely bad time. This was the second major accidental exposure in a single week — the "Mythos" model spec leak via a CMS misconfiguration happened just five days earlier. Two separate information security failures in five days at a company that markets itself as the safety-first AI lab, while reportedly preparing for an IPO — that's a story that sticks.

The specific trigger — a known bug in the Bun runtime that generates source maps even in production mode (GitHub issue oven-sh/bun#28001, still open as of the leak) — is particularly uncomfortable given that Anthropic acquired Bun at the end of 2025. The toolchain that leaked the source was their own acquisition.

### For developers using Claude Code

Your data was not exposed. Your credentials were not taken. The model you've been using is exactly the same model it was before March 31. The security risk from the source leak itself is indirect — it makes it easier for attackers to craft targeted prompt injection attacks against Claude Code, and it surfaced the 50-subcommand permission bypass that's now been patched. If you've kept Claude Code updated past v2.1.88 and installed via the native installer, you are in the same security posture as before.

If you updated via npm on March 31 in the specific 3-hour window when the axios attack was active, that is a separate and more serious issue.

### For Anthropic's competitors

They got a free engineering education on one of the most capable AI coding agents in production. The three-layer memory architecture, the context entropy management, the sprint contract pattern from the harness work, the KAIROS background agent design — all of that is now public. The code can be studied. The strategic roadmap can be reacted to. The model benchmarks can be used to calibrate their own.

What competitors cannot replicate is the underlying model. The architecture is the scaffolding; Claude itself is what lives inside it.

### For the open-source community

The "Undercover Mode" revelation warrants a genuine conversation rather than reactive outrage. AI-generated code is entering open-source projects at scale, across many tools and many companies, and much of it does so without explicit attribution. Whether that's acceptable — from a transparency, copyright, and community consent perspective — is a question worth having.

## Practical Actions, Right Now

1. **Check for the axios RAT if you updated between 00:21–03:29 UTC on March 31.** Run the grep commands from the top of this article. If found, treat the machine as compromised.

2. **Migrate from npm-based Claude Code installation to the native installer.** `curl -fsSL https://claude.ai/install.sh | bash` uses a standalone binary that doesn't sit in the npm dependency chain.

3. **Update Claude Code past v2.1.88 immediately.** This patches the 50-subcommand permission bypass vulnerability.

4. **Do not run code from unofficial GitHub repositories claiming to be the leaked source.** Vidar and GhostSocks are already out there in fake "leaked source" repos.

5. **Review your CLAUDE.md files for injection risks.** The leaked source makes the hook and permission logic transparent, which means malicious repositories can now be crafted more precisely.

6. **If you're maintaining an npm package yourself: add `*.map` to your `.npmignore`.** Source maps pointing to private archives should never ship to production registries.

## The Bottom Line

The Claude Code source leak is the kind of incident that reveals a company's operational security posture more clearly than any audit could. A missing line in `.npmignore`. A known bug in their own acquired runtime, unfiled as critical. A public cloud storage bucket that should have been private. A second major exposure just five days after a CMS misconfiguration. Each individual failure is understandable in isolation. Together, for a company that raises billions on a "safety-first" brand and is preparing to go public, they tell a story.

At the same time, the technical damage is bounded. No user data was exposed. The model is intact. The harness code is sophisticated but replicable — the moat was never the TypeScript, it was the model it was wrapping. The most acute near-term risk is the secondary threat landscape: the Vidar-laced fake repositories, the prompt injection attack surface, and whatever else security researchers find by reading 512,000 lines of now-public code.

The practical lesson for every developer team is the same one Anthropic learned: your build toolchain makes decisions about what ships in your production package. Verify them. Source maps are debugging artifacts for your developers, not your users. A single misconfigured field in `.npmignore` or `package.json` can expose everything. Add that audit to your release checklist before someone else's researcher adds it for you.

---

*Primary sources: Axios, The Register, VentureBeat, SecurityWeek, Zscaler ThreatLabz, The Hacker News, Alex Kim's technical analysis, Anthropic official statement.*

---

## Related articles

- [Claude Code Puts an AI Agent in Your Terminal](/posts/article_claude_code) -- how the tool works from a user perspective
- [Vibe Coding Is Great. Vibe Reviewing Is Terrifying.](/posts/article_vibe_coding_vibe_reviewing) -- the security implications of AI-generated code

---

If you're building systems where security incidents and supply chain risks matter, [Designing Data-Intensive Applications](https://amzn.to/4lPlcr4) provides essential foundations for understanding how production systems fail and how to design for resilience.

---

*The views expressed in this article are my own and do not reflect those of my employer, Mercedes-Benz. I am not affiliated with any of the companies or products mentioned. This article is based on publicly reported information and independent analysis.*
