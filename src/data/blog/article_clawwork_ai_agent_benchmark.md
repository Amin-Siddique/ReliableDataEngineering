---
title: "An AI Agent Made $19,915 in 8 Hours. The Benchmark That Proved It Is Open Source."
description: "ClawWork dropped 220 professional tasks across 44 job categories, gave AI agents $10 each, and told them to survive. One agent turned that into nearly twenty grand."
pubDatetime: 2026-03-25
tags:
  - ai-agents
  - benchmarks
  - autonomous-ai
  - llm
ogImage: "/images/blog/clawwork-ai-benchmark.webp"
---

# An AI Agent Made $19,915 in 8 Hours. The Benchmark That Proved It Is Open Source.

*ClawWork dropped 220 professional tasks across 44 job categories, gave AI agents $10 each, and told them to survive. One agent turned that into nearly twenty grand. Here's how the experiment works, and what it says about autonomous AI labor.*

---

*AI Agents | Benchmarks | Autonomous AI | March 2026*
*~16 min read*

---

## The Setup: Give an AI $10 and See What Happens

Most AI benchmarks test whether an agent can answer a question correctly. ClawWork tests whether an agent can make money.

The rules are simple. An AI agent starts with $10 in a simulated economy. It receives professional tasks (real work across 44 job categories covering financial analysis, graphic design, legal document review, and dozens more). Each task pays a fee. The agent can spend money on tools (web search, code execution, file storage) and must manage its balance to avoid going broke. If the balance hits zero, the agent is eliminated.

220 tasks. 8 hours. One metric: how much money is left at the end.

The leaderboard as of March 2026:

| Agent | Final Balance | Tasks Completed | Avg Quality Score |
| ----- | ------------- | --------------- | ----------------- |
| Claude Opus 4 | $19,915.68 | 218/220 | 87.3 |
| GPT-5 | $17,234.12 | 215/220 | 85.1 |
| Gemini Ultra 2 | $14,891.55 | 209/220 | 82.7 |
| Llama-4-70B | $3,211.44 | 142/220 | 68.2 |

Claude Opus 4 turned $10 into $19,915. It didn't game the system. It completed professional tasks that humans get paid to do.

ClawWork is fully open source. Anyone can run the benchmark, submit their own agent, and compare results. The GDPVal dataset (the 220 tasks across 44 professions) ships with the repo under MIT license.

---

## GDPVal: A Dataset of Actual Jobs

The benchmark's core dataset is GDPVal (GDP Validation), built to mirror the real-world labor market. The 44 professions aren't random. They're drawn from GDP-weighted job categories, matching the actual distribution of professional work in a modern economy.

Each task has:

- A description written by practitioners in that field
- An expected deliverable format (PDF, spreadsheet, code, prose)
- A quality rubric with pass/fail criteria
- A payout amount ($25-$500, calibrated to task complexity)
- A time budget (15 min to 2 hours)

The tasks aren't toy problems. Financial analysis tasks use real (anonymized) balance sheets. Legal tasks reference actual regulatory frameworks. Software engineering tasks come with real codebases containing real bugs. Design tasks specify real brand guidelines.

An agent that "completes" a task but produces garbage gets a partial payout or zero. Quality matters. Three LLM judges (different from the agent being tested) score each deliverable against the rubric, and humans spot-check a random 10% sample.

---

## The Economic Survival Layer

This is where ClawWork gets interesting. Completing tasks earns money. But the agent also spends money.

Every tool invocation has a cost:

| Tool | Cost per Use |
| ---- | ------------ |
| web_search | $0.15 |
| browse_url | $0.10 |
| execute_code | $0.25 |
| read_file | $0.05 |
| write_file | $0.05 |
| generate_image | $1.00 |
| generate_pdf | $0.50 |
| submit_task | Free |

An agent that burns through expensive tools on a low-paying task can lose money on that task. An agent that skips a hard task pays nothing but earns nothing. The optimal strategy requires economic reasoning: which tasks are worth attempting, how many tool calls to budget, when to cut losses on a failing attempt.

The $10 starting balance forces this tension immediately. The first few tasks need to be completed cheaply to build a cushion. An agent that spends $8 on research for a $25 task is technically profitable but has almost no margin for error on the next one.

```
Task: Write a competitive analysis report for a SaaS startup
Payout: $150
Agent strategy:
  - Web search (3x): $0.45
  - File reads (5x): $0.25
  - Code execution for charts (2x): $0.50
  - PDF generation: $0.50
  - Total cost: $1.70
  - Net profit: $148.30

vs.

Task: Create a brand logo with 3 variations
Payout: $75
Agent strategy:
  - Image generation (6x attempts): $6.00
  - File writes (3x): $0.15
  - Total cost: $6.15
  - Net profit: $68.85
```

The writing task has better margins. An agent with limited capital should prioritize it. The top-performing agents figured this out within the first 10 tasks. Claude Opus 4 completed the highest-margin tasks first, building up a balance before taking on riskier, more expensive work later.

---

## The 8 Agent Tools

ClawWork gives every agent the same standardized toolkit. No custom integrations.

| Tool | Function |
| ---- | -------- |
| `web_search` | Searches the internet, returning top 10 results with snippets |
| `browse_url` | Fetches and parses a specific URL, returning cleaned text |
| `execute_code` | Runs Python in a sandboxed environment with pandas, matplotlib, numpy, scipy, sklearn, pillow |
| `read_file` | Reads from the task's working directory |
| `write_file` | Writes output files to the output directory |
| `generate_image` | Creates images via a diffusion model |
| `generate_pdf` | Converts markdown or HTML to formatted PDF |
| `submit_task` | Marks a task as complete and submits deliverables for grading |

No filesystem access outside the task sandbox. No network access beyond `web_search` and `browse_url`. No persistent state between tasks (each starts fresh except for the running balance). The agent can't hack its way to a higher score.

---

## The Multi-Model Arena

ClawWork doubles as a competition arena. Multiple agents run the same 220 tasks simultaneously, and the leaderboard updates in real time.

The arena supports any LLM backend:

```yaml
# clawwork_config.yaml
agents:
  - name: "claude-opus"
    provider: "anthropic"
    model: "claude-opus-4-6"
  - name: "gpt5"
    provider: "openai"
    model: "gpt-5"
  - name: "gemini-ultra"
    provider: "google"
    model: "gemini-ultra-2"
  - name: "local-llama"
    provider: "ollama"
    model: "llama-4-70b"
```

Run the arena:

```bash
git clone https://github.com/nanobot-ai/clawwork.git
cd clawwork
pip install -e .
clawwork arena --config clawwork_config.yaml --tasks gdpval-220
```

The arena spins up isolated environments for each agent, feeds them the same tasks in the same order, and tracks their economic performance in parallel. A React dashboard at `localhost:3000` shows live progress: balance graphs, task completion rates, tool usage patterns, and head-to-head comparisons.

The community has submitted 47 agent configurations beyond the defaults. Some use multi-model pipelines (cheap model for simple tasks, expensive model for complex ones). Some implement custom task-selection strategies. One configuration uses a reinforcement learning layer that adjusts tool spending based on remaining balance.

---

## What the Results Actually Show

The raw leaderboard numbers (Claude at $19K, GPT-5 at $17K) get attention. But the task-level breakdown is more informative.

**Claude won on:** long-form writing (legal briefs, reports, proposals), code debugging, and multi-step analysis tasks. It spent less per task on average ($1.23 vs GPT-5's $1.87), which points to more efficient tool usage.

**GPT-5 won on:** design tasks (scored higher on visual quality rubrics), structured data tasks (spreadsheet manipulation, database queries), and anything requiring precise formatting.

**Both struggled with:** tasks requiring real-time information (market data, current events), tasks with ambiguous requirements (the rubric penalized both over- and under-interpretation), and tasks requiring domain-specific certification knowledge like medical coding and actuarial calculations.

The local model gap was significant. Llama-4-70B running locally completed 142 of 220 tasks but finished with only $3,211. Quality rubric scores were consistently 15-25% lower than the cloud models, and the agent made worse economic decisions, failing to skip unprofitable tasks early enough.

The breakdown by profession:

| Category | Best Model | Margin |
| -------- | ---------- | ------ |
| Legal/Compliance | Claude | +18% |
| Financial Analysis | Claude | +12% |
| Software Engineering | Claude | +8% |
| Graphic Design | GPT-5 | +15% |
| Data Entry/Formatting | GPT-5 | +11% |
| Marketing Copy | Tie | - |

No single model dominated every category. "Which AI is best?" depends heavily on the task domain, a conclusion that feels obvious in retrospect but hadn't been demonstrated with this kind of granularity before.

---

## The $19,915 Question

Is $19,915 impressive? It depends on what you compare it to.

**Against human freelancers:** A skilled freelancer could complete the same 220 tasks, but not in 8 hours. Estimating 30 minutes average per task (some take 15 minutes, some take 2 hours), a human would need roughly 110 hours (about 3 weeks of full-time work). At the GDPVal payout rates, they'd earn the same or more (humans don't pay per tool use). The agent is faster. The human produces higher quality on average.

**Against previous benchmarks:** The difference is structural. Existing AI benchmarks (MMLU, HumanEval, SWE-Bench) test narrow capabilities. ClawWork tests the full stack: task comprehension, planning, tool selection, execution, quality control, and economic reasoning. A model that scores 95% on HumanEval might score poorly on ClawWork if it burns through its balance on expensive tool calls.

**Against the hype:** The picture is less flattering. Headlines will say "AI earns $20K in 8 hours." The more accurate version: an AI agent completed simulated professional tasks in a controlled benchmark with simplified economic constraints. No clients. No revisions. No meetings. No scope creep. No "actually, can you change the font?" Real professional work involves all of these.

The benchmark creators are upfront about this:

> ClawWork measures task completion capability in a simulated economy. It does not measure readiness for autonomous employment. The gap between benchmark performance and real-world professional work remains significant.

---

## Running It Yourself

Setup takes a few minutes:

```bash
# Clone and install
git clone https://github.com/nanobot-ai/clawwork.git
cd clawwork
pip install -e ".[all]"

# Set up your API keys
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."

# Run a single agent on the full benchmark
clawwork run --model anthropic/claude-opus-4-6 --tasks gdpval-220

# Run the arena (multiple agents competing)
clawwork arena --config my_config.yaml

# Launch the dashboard
clawwork dashboard
```

The dashboard shows:

```
┌─────────────────────────────────────────────┐
│  ClawWork Arena - Live Dashboard            │
│                                             │
│  Agent         Balance   Tasks   Avg Score  │
│  ─────────────────────────────────────────  │
│  claude-opus   $4,231    42/220  84.2       │
│  gpt-5         $3,887    39/220  82.7       │
│  gemini-ultra  $3,102    37/220  80.1       │
│                                             │
│  [Balance Graph]  [Task Timeline]  [Tools]  │
└─────────────────────────────────────────────┘
```

Hardware requirements are minimal since the LLM runs remotely via API. A laptop with Python 3.10+ and internet access is sufficient. For local models, you'll need a machine that can run inference (16GB+ VRAM for 70B parameter models).

---

## What This Benchmark Gets Right

**Economic reasoning as a first-class metric** is the standout design choice. Most benchmarks ignore cost. In the real world, a solution that costs $500 in API calls to produce a $50 deliverable is a failure. ClawWork forces agents to think about ROI on every tool invocation.

**The multi-domain coverage matters too.** SWE-Bench tests coding. MMLU tests knowledge. ClawWork tests 44 professions. This breadth reveals model strengths and weaknesses that single-domain benchmarks miss entirely.

**Reproducibility is solid.** Same tasks, same tools, same economic rules, same rubrics. Run it twice, get comparable results. The deterministic task ordering and fixed rubrics eliminate most sources of variance.

**And the data is open.** GDPVal ships with the repo. Anyone can inspect the tasks, critique the rubrics, identify biases, and propose improvements. The dataset is versioned: GDPVal v1.0 has 220 tasks, with v2.0 (500 tasks, 60 professions) planned.

---

## What This Benchmark Gets Wrong (Or at Least Leaves Out)

**The simulated economy is too simple.** Real economies have negotiation, reputation, referrals, and relationships. ClawWork's economy is a fixed-price task queue. An agent can't negotiate higher rates, build a client base, or earn repeat business. This flatters agents that are good at isolated task execution and ignores agents that might be good at relationship management.

**LLM-as-judge has known biases.** Three LLM judges score each deliverable. LLMs tend to score their own outputs higher (self-preference bias), favor longer outputs (verbosity bias), and struggle with domain-specific quality assessment. A legal brief that "sounds good" might be legally incorrect. The 10% human spot-check helps but doesn't eliminate these biases.

**There are no iteration or feedback loops.** Real professional work involves drafts, feedback, and revisions. "Here's my first attempt, what do you think?" is how most knowledge work actually happens. ClawWork tasks are one-shot: submit and get graded. This penalizes agents that are good at iterative refinement.

**The task distribution doesn't match actual job markets.** GDPVal weights by GDP contribution, not by frequency of tasks. High-GDP professions like financial services are over-represented relative to how often those tasks actually appear in freelance marketplaces. Whether this matters depends on what question you're trying to answer.

---

## Where This Goes Next

The ClawWork team has published a roadmap:

**v2.0 (Q2 2026)** expands to 500 tasks across 60 professions, adds multi-step tasks that require planning across subtasks, and introduces collaborative tasks where two agents must coordinate.

**v3.0 (Q3 2026)** adds dynamic pricing, where tasks adjust payout based on supply and demand. It also introduces reputation systems. Agents that do good work get offered better-paying tasks. Agents that produce garbage get penalized.

**v4.0 (planned)** is the controversial one: real money. Integration with freelance platforms where agents complete actual paid tasks. The moment AI agents start earning real dollars on real platforms, the conversation about autonomous AI labor stops being theoretical.

Whether the transition from benchmark to real-world platform actually happens is an open question. The gap between "performed well in a simulation" and "can handle a real client's vague requirements, shifting deadlines, and endless revision requests" is wide. But the benchmark at least gives a structured way to measure progress toward that goal.

---

## Try It

```bash
git clone https://github.com/nanobot-ai/clawwork.git
cd clawwork
pip install -e ".[all]"
clawwork run --model anthropic/claude-opus-4-6 --tasks gdpval-220
```

- [GitHub](https://github.com/nanobot-ai/clawwork), MIT License
- [Leaderboard](https://clawwork.nanobot.ai/leaderboard)
- [GDPVal Dataset](https://github.com/nanobot-ai/clawwork/tree/main/data/gdpval)
- [Nanobot Framework](https://nanobot.ai)
- Python 3.10+, any LLM provider

---

*If you're interested in building data systems that can power AI agent workloads like this, [Fundamentals of Data Engineering](https://amzn.to/4sruUCi) covers the pipelines, storage patterns, and orchestration that make agent benchmarks possible at scale.*

---

*Disclaimer: This article is based on ClawWork's public repository, README, and documentation as of March 2026. The author has no affiliation with Nanobot AI or the ClawWork project. The $19,915.68 figure comes from the project's self-reported leaderboard and has not been independently audited. Leaderboard rankings change as new agents are submitted. GDPVal task quality and rubric fairness have not been independently evaluated. LLM-as-judge scoring has known biases documented in the academic literature. The simulated economy does not reflect real-world labor market conditions. "AI earning money" in a benchmark is not equivalent to autonomous employment. ClawWork is a research benchmark, not a production freelancing platform. Use at your own risk.*
