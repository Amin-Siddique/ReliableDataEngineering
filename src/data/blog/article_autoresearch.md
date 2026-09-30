---
title: "Karpathy Let an AI Agent Do ML Research While He Slept — It Ran 100 Experiments by Morning"
description: "AutoResearch gives an AI agent one file, one GPU, and one metric. The agent modifies the code, trains for 5 minutes, checks if it improved, and repeats all night long. The results are surprisingly good."
draft: true
pubDatetime: 2026-03-22
tags:
  - machine-learning
  - ai-agents
  - automation
  - karpathy
ogImage: "/images/blog/research.webp"
---

# Karpathy Let an AI Agent Do ML Research While He Slept. It Ran 100 Experiments by Morning.

*AutoResearch gives an AI agent one file, one GPU, and one metric. The agent modifies the code, trains for 5 minutes, checks if it improved, and repeats all night long. The results are surprisingly good.*

---

*Machine Learning | AI Agents | Automation | March 2026*
*~14 min read*

---

## The setup sounds like a joke

Here is the pitch. Take a single Python file that trains a small language model. Give it to an AI agent (Claude, Codex, whatever). Tell the agent: "Make this model better. You have 5 minutes per experiment. Go."

Then go to sleep.

The agent reads the code. It changes the model architecture, or the learning rate, or the optimizer, or the batch size. Runs training for exactly 5 minutes. Checks the validation loss. If it improved, keep the change. If not, revert. Pick a new hypothesis. Repeat.

By morning, the agent has run ~100 experiments. There is a log of every change it tried, what worked, what failed. And sitting on disk: a model that is measurably better than what it started with.

That is [AutoResearch](https://github.com/karpathy/autoresearch). Andrej Karpathy, former Tesla AI director, OpenAI founding team member, and the person who taught half the internet deep learning through YouTube, posted it on March 6, 2026. It hit 40,000 GitHub stars in 11 days.

The README opens with a fictional preface from a future where AI research has been fully automated:

> Research is now entirely the domain of autonomous swarms of AI agents running across compute cluster megastructures in the skies. The agents claim that we are now in the 10,205th generation of the code base. No one could tell if that's right or wrong as the "code" is now a self-modifying binary that has grown beyond human comprehension. This repo is the story of how it all began.

He is kidding. Probably.

---

## Three files. That's the whole thing.

The repo is deliberately minimal:

| File | Purpose | Who edits it |
| ---- | ------- | ------------ |
| prepare.py | Data download, tokenizer training, evaluation utilities | Nobody (fixed) |
| train.py | GPT model, optimizer, training loop, the full experiment | The AI agent |
| program.md | Instructions for the agent, the "research org code" | The human |

That is it. No framework. No experiment tracker. No distributed training. No complex configs. One GPU, one file, one metric.

`train.py` contains a complete GPT implementation: the model architecture, a Muon + AdamW optimizer, and the training loop. Everything is fair game for the agent to modify. Architecture, hyperparameters, optimizer configuration, batch size, attention patterns, layer depth, embedding dimensions. The entire model fits in a single file, which is an important constraint. If the agent had to coordinate changes across multiple files, the failure rate would climb sharply. Keeping everything in one place means the agent can read the full context before making a change.

`program.md` is the philosophically interesting part. It is a markdown file that instructs the AI agent on how to do research. Not the code, but the research methodology. What to try, how to evaluate, when to keep or discard a change, how to structure experiments.

Karpathy describes this as "programming the program":

> You are not touching any of the Python files like you normally would as a researcher. Instead, you are programming the program.md Markdown files that provide context to the AI agents and set up your autonomous research org.

The human writes research strategy. The agent executes research tactics.

---

## How a single experiment runs

```
Agent reads program.md
    |
    v
Agent reads train.py (current best version)
    |
    v
Agent forms a hypothesis ("What if I increase depth from 8 to 12?")
    |
    v
Agent edits train.py
    |
    v
Training runs for exactly 5 minutes (wall clock)
    |
    v
Validation bits-per-byte (val_bpb) measured
    |
    v
Better?  ──yes──> Keep the change. Log the result.
  |
  no
  |
  v
Revert train.py. Log the failure. Try something else.
```

The fixed 5-minute time budget is the smartest design choice in the project. Regardless of what the agent changes (bigger model, different architecture, smaller batch size), training always runs for exactly 5 minutes.

This has two effects. First, every experiment is directly comparable. A 12-layer model that trains for 5 minutes versus an 8-layer model that trains for 5 minutes: same budget, fair comparison, best val_bpb wins.

Second, the agent naturally discovers the most efficient model for the available hardware. On an H100, a 5-minute budget allows for larger models and bigger batches. On a MacBook, the agent will converge toward smaller architectures that train faster. The optimal configuration emerges from the constraint, not from someone hand-tuning model size to match their GPU.

The metric, validation bits per byte (val_bpb), is vocabulary-size-independent. If the agent changes the tokenizer's vocabulary size from 8192 to 4096, the metric still works. No need to normalize or adjust. Lower is better. Simple, unambiguous, hard to game.

---

## What the agent actually tries

Nobody tells the agent which specific experiments to run. The `program.md` provides general research methodology, but the specific hypotheses come from the agent itself, based on whatever ML knowledge is baked into the language model.

In practice, agents try things like:

- Changing model depth (8 layers to 12, or down to 6)
- Adjusting the attention pattern ("SSSL" sliding window vs. full "L" attention)
- Modifying the optimizer: learning rate schedules, warmup periods, weight decay
- Experimenting with batch sizes (trading sequence length for more examples)
- Architectural changes like different activation functions or normalization strategies
- Tweaking the embedding dimension relative to depth

Some of these work. Many don't. The agent does not know in advance which changes will improve val_bpb. It hypothesizes, tests, and observes. The same loop that human ML researchers run, except the agent completes a cycle every 5 minutes instead of every few hours.

The overnight math is straightforward: roughly 12 experiments per hour, roughly 100 experiments while a human sleeps for 8 hours. A typical human researcher might run 3 to 5 experiments per day, once you account for thinking time, debugging, meetings, and lunch. The agent runs 100. They are not necessarily smarter experiments, but the sheer volume of iteration has a compounding effect. Bad ideas get eliminated fast, and the surviving changes accumulate.

---

## The "research org code" concept

The interesting idea in AutoResearch is not the automation loop itself. It is the framing of `program.md` as code.

ML research has always involved two activities: deciding what to try (strategy) and executing the experiment (tactics). Researchers spend most of their time on tactics. Writing code, debugging CUDA errors, waiting for training runs, interpreting loss curves. Strategy gets squeezed into the gaps.

AutoResearch inverts this. The human focuses on strategy: what methodology should the agent follow, what kinds of experiments are most promising, how should results be interpreted. The tactics are fully automated.

The important thing is that `program.md` is iterable. A researcher can run AutoResearch overnight with one set of instructions, review the morning's results, update the strategy in `program.md`, and launch another overnight run with refined instructions.

```
Night 1: "Try varying model depth and attention patterns"
         → Agent discovers depth=10 with sliding window beats baseline

Night 2: "Keep depth=10. Focus on optimizer changes and learning rate schedules"
         → Agent discovers warmup helps significantly

Night 3: "Keep depth=10, current LR schedule. Explore activation functions and FFN variants"
         → Agent discovers GeGLU outperforms SwiGLU
```

After a few nights of this, the agent has run hundreds of experiments. A human researcher could have reached similar conclusions, but it would have taken weeks of focused experimentation and a lot of staring at terminal output.

Karpathy hints at this trajectory:

> It's obvious how one would iterate on it over time to find the "research org code" that achieves the fastest research progress, how you'd add more agents to the mix, etc.

Multiple agents, different research programs, parallelized hypothesis testing. The `program.md` starts to look less like instructions for one agent and more like the charter for a research organization.

---

## Forks everywhere within days

The original repo requires an NVIDIA GPU (tested on H100) and uses PyTorch with CUDA. Within days, the community forked it for every other platform:

| Platform | Fork | Notes |
| -------- | ---- | ----- |
| Apple Silicon (MLX) | autoresearch-mlx | M1/M2/M3/M4 Macs |
| AMD (ROCm) | autoresearch-rocm | RX 7900 and similar |
| CPU-only | autoresearch-cpu | Slow but works |
| Windows | autoresearch-windows | WSL2 recommended |

For smaller hardware, Karpathy provides tuning advice directly in the README:

- Switch to TinyStories dataset (lower entropy, works with smaller models)
- Drop vocabulary size from 8192 down to 1024 or even 256 (byte-level)
- Lower MAX_SEQ_LEN to 256
- Reduce DEPTH from 8 to 4
- Use full attention ("L") instead of sliding window ("SSSL")
- Decrease TOTAL_BATCH_SIZE to 2^14

A MacBook Air running AutoResearch overnight will not compete with an H100. But it will find the best model that its hardware can produce in 5-minute increments. The constraint-driven design scales down gracefully, even if the absolute results are modest. This is probably why it spread so fast: you do not need a datacenter to try it. You need a laptop and a free evening.

---

## Why this hit a nerve

40,000 stars in 11 days is not normal for a repo with three files and no framework. A few things converged.

Start with the obvious: it's Karpathy. But more specifically, it's Karpathy building the thing that replaces Karpathy's old job. The person who trained Tesla's self-driving neural networks is now building agents that autonomously train neural networks. There is an undeniable self-awareness to it, and people respond to that.

Then there is the "vibe coding" angle. The `program.md` file is a natural language description of a research program. No Python. No config files. Just prose: "try these kinds of things, evaluate using this metric, keep changes that improve it." The fact that this produces real research results gives ammunition to the "programming by intent" crowd, who have been arguing that code will increasingly be written in English.

The iteration speed matters too. 100 experiments overnight, each informed by what the agent observed in previous runs. This is not grid search or Bayesian optimization. It is a language model doing what language models are actually good at: reading code, forming hypotheses about what might work, and writing modifications based on prior results.

And finally, the repo is small enough to understand in 10 minutes. Three files. MIT licensed. Copy-paste-able. Anyone with a GPU can try it tonight, which means everyone did try it, and everyone had results to share. The tweet engagement loop fed the star count.

---

## Where it falls short

AutoResearch has real constraints that the hype cycle tends to gloss over.

**The experiments are not novel research.** The agent varies hyperparameters, adjusts architectures, and tweaks optimizers within the existing `train.py` paradigm. It is not inventing new attention mechanisms or discovering something like flash attention. It is hill-climbing within a known search space, which is useful but not the same as "AI doing research." The distinction matters because the framing ("AI ran 100 experiments") invites people to imagine something more ambitious than what actually happened.

**The 5-minute budget caps ambition.** Some research ideas, like longer training runs, curriculum learning, or multi-stage procedures, simply cannot be tested in 5 minutes. The fixed budget makes comparison fair but also means entire categories of experiments are off the table.

**The agent can get stuck.** Like any optimization loop, it can converge on a local minimum and keep trying variations that never escape. A human researcher would recognize the plateau and try something fundamentally different. The agent, operating within `program.md` constraints, often will not. This is the oldest problem in optimization, and wrapping a language model around it does not make it go away.

**Metric gaming is a real risk.** val_bpb is the only success signal. An agent could find changes that improve val_bpb without actually improving the model's generative quality, for example by overfitting to the validation set. Human researchers catch this through qualitative evaluation: sampling from the model, checking for coherence, spotting degenerate outputs. The automated loop has no such check.

Karpathy is honest about the project's scope:

> The default program.md in this repo is intentionally kept as a bare bones baseline.

It is a starting point. The interesting work is in what people build on top of it.

---

## What this actually changes for ML researchers

AutoResearch will not replace ML researchers. But it reshapes how they spend their time.

Most of a researcher's day goes to implementation and waiting. Writing the code for an experiment, debugging it, launching training, watching the loss curve, checking for NaNs. The actual intellectual work (deciding what to try, interpreting what happened) gets compressed into the gaps between mechanical tasks.

AutoResearch removes the mechanical part. The researcher writes `program.md`, launches the agent, then reviews results in the morning. Implementation and waiting are handled by the agent.

This shifts the bottleneck. The quality of `program.md` determines how productive the overnight run is: what hypotheses to prioritize, how to interpret ambiguous results, when to pivot strategy entirely. That is a more interesting bottleneck than "waiting for a training run to finish," and it rewards the skills that experienced researchers actually have, like intuition about which directions are worth exploring and which are dead ends.

The cost structure changes too. An experiment that used to require a full researcher-day now costs 5 minutes of GPU time and a few cents of LLM API calls. This means more hypotheses tested, more dead ends identified quickly, and faster convergence on promising directions. A single researcher with a GPU and a well-crafted `program.md` can cover ground overnight that would have taken a small lab a month of focused effort.

There is a less comfortable implication here. If most of a researcher's value was in implementation, and that part gets automated, then researchers who primarily contribute implementation skill will find their role compressed. Researchers whose value lies in taste, judgment, and knowing which questions are worth asking will become more valuable. AutoResearch is, in this sense, a sorting function.

---

## Try it

```bash
# Requirements: single NVIDIA GPU, Python 3.10+, uv
curl -LsSf https://astral.sh/uv/install.sh | sh
git clone https://github.com/karpathy/autoresearch.git
cd autoresearch
uv sync
uv run prepare.py         # one-time data prep (~2 min)
uv run train.py           # manual test run (~5 min)

# Then point your AI agent at the repo and prompt:
# "Have a look at program.md and let's kick off a new experiment!"
```

- [GitHub](https://github.com/karpathy/autoresearch) — 40K stars, MIT License
- Works with Claude Code, Codex, or any coding agent
- macOS/Windows/AMD forks linked in README

---

*Disclaimer: This article is based on the public repository and README of Karpathy's autoresearch as of March 2026. The author is not affiliated with Andrej Karpathy or any related entity. The "100 experiments overnight" figure is an approximation based on 5-minute experiment cycles over 8 hours. Research quality and results vary by hardware, agent capability, and program.md instructions. AutoResearch is a research tool, not a production training framework. Star counts are a snapshot in time. AI-assisted ML research should be validated by qualified researchers before publication or deployment.*
