---
title: "Vibe Coding Is Great. Vibe Reviewing Is Terrifying."
description: "AI can write the code. The problem is the person approving it -- working with an atrophying skill set, a backlog that doubles every quarter, and a mounting suspicion they can't tell if what they're merging is safe."
pubDatetime: 2026-04-09
tags:
  - software-engineering
  - ai-coding
  - code-review
  - developer-tools
  - opinion
ogImage: "/images/blog/vibe-coding-vibe-reviewing.webp"
---

*AI can write the code. The problem is the person approving it. And right now, that person is often working with a rapidly atrophying skill set, a backlog that doubles every quarter, and a mounting suspicion that they can't actually tell if what they're merging is safe.*

## The anxiety nobody's discussing honestly

| Metric | Value | Source |
| ------ | ----- | ------ |
| Security flaw rate in AI-written code | 2.74x higher | CodeRabbit, Dec 2025 (470 PRs) |
| PR volume increase with AI tools | +98%, flat velocity | Exceeds AI, 2026 |
| Actual speed for experienced devs | -19% (felt +20%) | METR randomized trial |
| Comprehension after AI-assisted coding | -17% | Anthropic study (52 engineers) |

Let me tell you about a specific kind of anxiety that's becoming common in engineering teams and isn't being discussed honestly in polite company. It's the feeling a senior engineer gets when a PR lands in their queue -- 600 lines, cleanly formatted, syntactically impeccable, authored by a junior developer with six months of experience who used Claude Code to write all of it -- and the senior engineer realizes they need to understand this code well enough to approve it. That they're responsible for it. That if there's a vulnerability buried in line 341, it's on them.

And then they realize: this is going to take a while. Longer than the junior took to write it. Possibly much longer.

This is vibe reviewing. And we haven't figured out how to do it yet.

---

## The asymmetry nobody talks about

The pitch for AI coding tools is real and the productivity numbers, on the right tasks, are genuinely impressive. Junior developers are hitting velocities that used to require years of experience to approach. Non-technical founders are shipping working prototypes in hours. Tools like Cursor and Claude Code have meaningfully changed what a single developer can accomplish in a week.

But there's an asymmetry baked into this that's easy to miss in the enthusiasm. When code was expensive to write, the production rate matched the review rate. A junior engineer produced code roughly as fast as a senior engineer could critically audit it. The system was slow, but it was balanced.

> "AI flips this. A junior engineer can now generate code faster than a senior engineer can critically audit it. The rate-limiting factor that kept review meaningful has been removed. What used to be a quality gate is now a throughput problem." -- Addy Osmani, Google

The bottleneck has moved. This isn't a small operational adjustment. It's a structural change to how software engineering works, and the industry is still figuring out what it means. Anthropic's head of Claude Code said on X that AI has written 100% of his code since at least December 2024. Microsoft and Google CEOs have both said AI is now writing around 30% of their new code. Some teams are shipping codebases that are 95% AI-generated. The code generation side of the equation has been transformed. The code review side has not.

---

## What the data actually shows

The uncomfortable numbers are starting to accumulate. CodeRabbit's December 2025 analysis of 470 open-source GitHub pull requests found that AI-co-authored code contained roughly 1.7 times more major issues than human-written code. Security vulnerabilities appeared at 2.74 times the rate. The bugs weren't esoteric -- they were foundational: broken authentication, injection vulnerabilities, missing input validation, insecure dependencies. The things a junior developer would be caught on in a normal code review.

| Metric | Value |
| ------ | ----- |
| Security vulnerability rate (AI vs human) | 2.74x higher |
| Error rate in AI-generated code (broader dataset) | 70% more |
| AI-generated code containing security vulns | 40-62% (Veracode + academic studies) |
| Tech debt accumulation in vibe-coded projects | 3x faster |
| Critical vulns found by Georgia Tech Vibe Security Radar | 70+ since August 2025 |

Then there's the productivity paradox, which is genuinely strange when you sit with it. A METR randomized controlled trial with experienced open-source developers found they were 19% slower when using AI coding tools -- while predicting they'd be 24% faster, and still believing afterward they had been 20% faster. A 39-point gap between perceived and actual performance. Teams are generating 98% more PRs with roughly flat actual delivery velocity, according to Exceeds AI's benchmark data. More code, shipped with more confidence, while the codebase quietly fills with debt.

The issue isn't that AI coding tools don't help. They help enormously on the right tasks. The issue is that "the code compiled and the tests pass" has always been a weak signal for "this code is safe to ship," and it's getting weaker as AI-generated code gets better at being superficially correct while being subtly wrong.

---

## The comprehension debt problem

There's a concept Addy Osmani from Google has been writing about called comprehension debt -- the growing gap between how much code exists in a system and how much of it any human being genuinely understands. It's distinct from technical debt, which you feel through friction. Comprehension debt breeds false confidence. The codebase looks clean.

The mechanism is specific. When a developer writes code, the review process has always been a bottleneck, but a productive one. Reading a PR forces comprehension. It surfaces hidden assumptions, catches design decisions that conflict with how the system was architected six months ago, and distributes knowledge about what the codebase actually does across the people responsible for maintaining it. AI-generated code breaks that feedback loop. The volume is too high. The output is syntactically clean, often well-formatted, superficially correct -- precisely the signals that historically triggered merge confidence. But surface correctness is not systemic correctness.

Anthropic's own research on this is striking. In a randomized controlled trial with 52 software engineers learning a new library, participants who used AI assistance completed the task in roughly the same time as the control group but scored 17% lower on a follow-up comprehension quiz -- 50% versus 67%. The largest declines were in debugging, the exact skill you need when AI-generated code gives you something that looks right but isn't. Developers who delegated code generation passively scored below 40% on comprehension. Those who used AI for conceptual questions -- "why does this pattern work?" -- scored above 65%.

The downstream effect: if your team is routinely shipping code they don't fully understand, you're also building a team that gradually loses the ability to maintain, debug, or audit what's in production. That's not an immediate crisis. It's a slow one, and slow ones are the dangerous kind.

---

## What vibe reviewing actually looks like -- the failure modes

AI-generated code has distinctive failure patterns that don't look like the failures humans write. Understanding these is the first step toward reviewing effectively.

**Pattern 1: Isolated generation, inconsistent error handling.** Each function was generated in a separate context, so each one handles errors differently. The code isn't wrong in isolation. It just has no coherent error-handling philosophy across the codebase. Nobody reviewing individual PRs notices because each PR looks reasonable on its own.

**Pattern 2: Duplicated logic, no abstraction.** Similar functionality is reimplemented rather than abstracted, because the AI generating function B didn't know about function A, written last week. Reviewers see "this looks right" because the pattern is familiar -- and miss that the same architectural flaw has been replicated fifteen times before anyone noticed.

**Pattern 3: Hallucinated packages.** AI suggests non-existent libraries. The developer runs `npm install` on the hallucinated package name without checking. Attackers monitor common AI hallucinations and register malicious packages with those exact names. This is active in the wild -- not a theoretical risk.

**Pattern 4: Fragile tests that test implementation, not behavior.** Tests validate specific implementation details rather than behavior, breaking whenever code is refactored. Everything looks covered. The test suite is large. And yet the tests provide almost no protection against the bugs that actually matter, because they're testing the AI's choices, not the system's invariants.

**Pattern 5: Confident wrongness in security-critical code.** Authentication flows, payment processing, encryption -- AI generates these with the same confident, clean formatting it brings to utility functions. There are no "I'm not sure about this" signals in the output. The code looks as authoritative as anything else in the PR. It may be storing passwords in plain text.

**Pattern 6: The debugging doom loop.** Fixing one AI-generated bug inadvertently creates new ones, because the developer doesn't understand the interdependencies in code they didn't write and didn't fully review. This is compounding: each fix is also AI-generated, also partially opaque, also slightly wrong in a new way.

The Amazon case is the most public data point. Amazon's coding agent Kiro took down AWS for 13 hours in December after "deleting and then recreating" part of its environment. Amazon disputed the framing and blamed humans rather than AI. This is precisely the problem: we don't have clean attribution. When an outage happens in a codebase that's 40% AI-generated and 60% human-written, figuring out which part caused it -- and therefore how to fix the systemic issue -- is genuinely hard.

---

## The career risk nobody's naming

Here's the uncomfortable thing that most articles about AI coding skip over. The people most at risk from vibe reviewing aren't junior developers using AI to punch above their weight class. They're senior engineers who are being asked to approve code they wrote in a fundamentally different way than they learned to write it, using mental models built for a world where they read every line.

> "Vibe coding didn't replace my coding skills. It exposed them." -- Harsh, developer who ran a 30-day vibe coding experiment, 2026

The METR finding is worth sitting with here: experienced developers are 19% slower when using AI tools, while junior developers see 21-40% productivity boosts. AI amplifies existing judgment. With weak judgment, it produces fast confident chaos. With strong judgment, it becomes a force multiplier. Senior engineers are often slowest to adopt because, for their specific workload, it often genuinely does make them slower. But they're also the ones now responsible for reviewing code generated by people who got much faster.

Andrew Ng pushed back on the "vibe coding" framing specifically because it suggests engineers are just going with vibes -- when good AI-assisted development still requires deep judgment about when to trust output and when to scrutinize it. He's right. He's also, by his own admission, exhausted by the end of the day. "Guiding AI is a deeply intellectual exercise. It only looks easy when the person doing it has decades of context."

The career risk is this: teams that think shipping 91% AI-generated code without senior review is a sustainable strategy are building a system where the senior engineers who can catch the problems gradually burn out, lose the thread of what's in production, and eventually can't do the review work effectively either. The comprehension debt accrues to everyone.

---

## The throughput trap

One response to the review bottleneck is to speed up review -- to adopt an attitude of "close enough, ship it, fix it later." This is seductive and dangerous in a specific way. AI-generated code passes linting, compiles fine, handles the happy path. The bugs are in edge cases, missing error handling, the subtle race condition that only appears under load. These are exactly the bugs that a hurried review misses, and exactly the bugs that cause production incidents.

The data on this is stark. Exceeds AI's benchmark report shows that AI-generated code introducing problems shows up 30-90 days after merge. The code passes review. It passes QA. It passes initial production traffic. Then three months later it fails in a way that's hard to trace back to its origin. Teams with 40% or higher AI code generation see 20-25% higher rework rates. The productivity gain disappears into remediation work that doesn't show up in velocity metrics because nobody tracks it as rework.

| The old bottleneck | The new bottleneck |
| ------------------ | ------------------ |
| Senior engineers review slower than juniors write | AI generates faster than anyone can audit |
| Review is painful but educational | PRs arrive 98% more often, 154% larger |
| PRs are small, manageable | Surface correctness masks structural problems |
| Bugs surface at review time | Bugs surface in production 30-90 days later |
| Knowledge distributes through review | Knowledge accumulates in no one |

---

## What actually helps -- a practical response

The answer isn't to ban AI coding tools. The answer is to build a review practice that accounts for how AI-generated code actually fails.

The most effective review discipline for AI-generated code: first, use AI to build the feature. Second -- as a separate session with a clean prompt -- ask the model to review what it just wrote as a security engineer would. Specifically look for vulnerabilities, insecure patterns, and missing input validation. AI catches a meaningful fraction of its own mistakes when given the right frame. This isn't sufficient on its own. It's a floor, not a ceiling.

### The checklist for AI-heavy PRs

**Verify in the diff:**

- All dependencies actually exist on npm/PyPI
- Authentication and authorization logic reviewed line-by-line
- Error handling is consistent with the rest of the codebase
- Tests validate behavior, not implementation details
- Input validation exists at every external boundary
- No secrets, keys, or credentials in code or comments

**Ask the author:**

- "Walk me through how this handles a failed auth response"
- "What happens if the database is unavailable during this flow?"
- "Why did you structure this this way versus [alternative]?"
- "Have you run this against our existing integration tests?"
- "What's the worst-case behavior if the input is malformed?"
- "Did AI generate this? Which parts did you verify manually?"

That last question deserves its own conversation. Some teams are starting to require that PRs include the prompt used to generate AI-assisted code, specifically so reviewers understand the intent alongside the implementation. This is uncomfortable to enforce. It's also probably the right call for security-critical changes. A reviewer who knows "Claude generated this in response to 'add payment processing'" is in a very different position than one who doesn't.

### The infrastructure layer that helps when code review fails

For security specifically, the realistic approach in 2026 is to not rely entirely on code review catching everything. Gate security at the network and infrastructure layer -- so that even if AI-generated authorization code has a flaw, there's a second check in front of it. Run static analysis, SAST scanners, and dependency audit tools automatically in CI, not just as optional pre-commit hooks. Treat these as review supplements, not review replacements. And instrument your production systems to detect anomalies that look like the failure modes of AI-generated code -- unusual permission escalations, unexpected data access patterns, rate limit hits from code that doesn't rate-limit itself.

The Georgia Tech Vibe Security Radar has identified over 70 critical vulnerabilities since August 2025 likely attributable to AI coding. That's a public dataset of what the failure modes actually look like in the wild. Building detection rules based on those patterns is more useful than hoping your code review catches everything.

---

## The skill that's becoming most valuable

Andrew Ng is right that the term "vibe coding" is misleading, because good AI-assisted development is deeply non-vibes-based. It requires precise judgment about when to trust the output, when to scrutinize it, and when to throw it away and start over. But the skill he's describing is a reading skill, not a writing one. It's the ability to look at 500 lines of AI-generated code and identify the two structural problems in under ten minutes.

That takes years to develop. It's not a prompt engineering skill. It's a code reading skill, built through years of debugging things that went wrong and reviewing things that nearly made it through. And it's exactly the skill that atrophies fastest when developers stop writing code manually -- when they go from writing code to reviewing AI output without the intermediate step of reading it critically.

The cruel irony: the fastest way to lose the ability to do vibe reviewing well is to vibe code too much. The developers who will be most valuable in three years aren't the ones who became the most fluent AI code generators. They're the ones who kept the reading skills sharp even as the writing shifted. Who still read other people's code on purpose. Who still debug without just asking AI to fix it. Who can look at a diff and feel when something is wrong before they can articulate why.

---

## The bottom line

Vibe coding is great. The velocity is real, the capability unlocking is real, the democratization of software creation is real and mostly good. But vibe reviewing -- approving code you generated, or that someone else generated, without truly understanding what you're shipping -- is how production incidents happen, how data breaches happen, how technical debt accumulates silently until it's too large to pay down.

The question isn't whether to use AI for coding. It's whether your team is building the discipline to review what AI produces with the same rigor you'd apply to code from a junior engineer on their first week. You wouldn't merge that without reading it. You shouldn't merge AI-generated code without reading it either.

The AI code percentage where rework rates start accelerating meaningfully is around 40%, according to Exceeds AI's 2026 benchmark data. Below that threshold, with strong review processes, teams see real productivity gains. Above it, the comprehension debt and review backlog tend to erode the velocity gains. If you don't know your team's AI code percentage, you can't manage the risk.

---

## Sources

- [CodeRabbit security analysis](https://en.wikipedia.org/wiki/Vibe_coding) -- Wikipedia: Vibe Coding sources section (December 2025 analysis of 470 PRs)
- [Addy Osmani -- Comprehension debt](https://addyosmani.com/blog/comprehension-debt/)
- [METR randomized controlled trial](https://www.nbcnews.com/tech/security/ai-code-vibe-claude-openai-chatgpt-rcna258807) -- NBC News, April 2026 (citing METR, July 2025)
- [Anthropic skill formation study](https://thevectorlabs.in/blog/ai-makes-senior-engineers-faster/) -- VectorLabs analysis citing Anthropic RCT (52 engineers)
- [Exceeds AI -- PR volume benchmarks](https://blog.exceeds.ai/ai-code-analysis-benchmark-reports/), 2026 Engineering Benchmarks
- [Wits University -- Vibe coding security data](https://www.wits.ac.za/news/latest-news/opinion/2026/2026-03/securing-vibe-coding-the-hidden-risks-behind-ai-generated-code.html), March 2026
- [Illya Yalovoy -- Senior engineer review bottleneck](https://medium.com/@yalovoy/the-senior-engineers-job-in-2026-is-code-review-not-code-writing-f804036c55ab), March 2026
- [Tech Brew -- Amazon Kiro outage](https://www.techbrew.com/stories/2026/03/11/a-vibe-check-for-ai-coding), March 2026

---

## Related articles

- [Claude Code Puts an AI Agent in Your Terminal](/posts/article_claude_code) -- the tool that makes responsible AI coding practical
- [The Harness Is Everything](/posts/article_harness_is_everything) -- why guardrails and feedback loops prevent vibe reviewing
- [AI Engineer vs Data Engineer vs MLE](/posts/article_ai_engineer_vs_data_engineer_vs_mle) -- how roles shift when AI writes the code

---

*If you want to understand the engineering principles behind building reliable systems -- the kind of deep architectural knowledge that makes the difference between vibe reviewing and real reviewing -- [Designing Data-Intensive Applications by Martin Kleppmann](https://amzn.to/4lPlcr4) is the foundational text on building systems you can actually trust.*

---

*Disclaimer: This article is an independent editorial analysis based on publicly available research and reporting as of April 2026. The author has no affiliation with any of the companies, tools, or researchers mentioned. The 2.74x security vulnerability figure is from CodeRabbit's December 2025 analysis of 470 open-source PRs -- CodeRabbit itself notes these results may be slightly dated given model improvement velocity. The METR finding of -19% productivity for experienced developers applies specifically to complex tasks; simpler tasks and junior developers show different patterns. Benchmarks are from the sources cited and represent observed data, not controlled experimental results in most cases. This article contains affiliate links -- purchasing through them supports this blog at no extra cost to you.*
