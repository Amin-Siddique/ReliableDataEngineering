---
title: "OpenClaw Is the New Computer — Jensen Huang Was Right, and 320K Developers Agree"
description: "A lobster-themed open-source project just became the fastest-growing AI repository in GitHub history. It turns WhatsApp, Telegram, and Slack into an operating system. Here's why Jensen Huang compared it to a computer — and what people are actually doing with it"
pubDatetime: 2026-03-22
tags:
  - openclaw
  - nvidia
ogImage: "/images/blog/nvidia.webp"
---

# "OpenClaw Is the New Computer" — Jensen Huang Was Right, and 320K Developers Agree

**A lobster-themed open-source project just became the fastest-growing AI repository in GitHub history. It turns WhatsApp, Telegram, and Slack into an operating system. Here's why Jensen Huang compared it to a computer — and what people are actually doing with it.**

---

*AI Assistants | Open Source | Personal Computing | March 2026*
*~12 min read*

---

## A Space Lobster Ate the Computer

At GTC 2026, Jensen Huang held up his phone and said something that made headlines for a week:

> "OpenClaw is the new computer."

Not a metaphor. Not marketing. He meant it literally.

The argument: a traditional computer takes input (keyboard, mouse), processes it (CPU), and produces output (screen, speakers). OpenClaw does the same thing — except the input is natural language across 22 messaging platforms, the processing is an LLM with tool access, and the output goes back to whatever channel the message came from.

You text it on WhatsApp. It books your flight. You message it on Slack. It deploys your code. You talk to it on your phone. It reads your emails and tells you what matters.

No app to open. No interface to learn. No screen to stare at.

The developer community responded accordingly. OpenClaw hit 319,000 GitHub stars. It spawned a skills registry with 13,729 community-built extensions. The "awesome-openclaw-usecases" repo documents 40+ real-world use cases from people who run it as their daily driver.

A space lobster named Molty became the mascot of the post-GUI computing era.

Let's talk about why.

---

## What OpenClaw Actually Is (In 60 Seconds)

OpenClaw is an open-source personal AI assistant that runs on your own hardware. No cloud service. No subscription. No company holding your data.

Three pieces:

**1. The Gateway** — A local WebSocket server (Node.js) that manages sessions, channels, tools, and events. Think of it as the kernel.

**2. Channels** — Connectors to messaging platforms. WhatsApp (via Baileys), Telegram (via grammY), Slack (via Bolt), Discord, Signal, iMessage, Microsoft Teams, Matrix, IRC, Google Chat, LINE, and 11 more. All bidirectional. All real-time.

**3. Skills** — Markdown files that teach the agent new capabilities. Browse the web. Control your smart home. Manage your calendar. Write and deploy code. Each skill is a `SKILL.md` file dropped into `~/.openclaw/workspace/skills/`.

Install:

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

That's a running AI assistant connected to your messaging apps in under 5 minutes.

---

## Why "The New Computer" Isn't Hyperbole

Jensen's comparison sounds like tech keynote fluff. It's not. Here's the structural argument.

### The old model: you go to the computer

Open laptop. Launch app. Navigate UI. Click buttons. Type in fields. Switch to another app. Repeat.

Every application has its own interface. Every interface has its own learning curve. The human adapts to the machine.

### The OpenClaw model: the computer comes to you

Text a message on the platform you're already using. The assistant receives it, figures out what tools to invoke, executes, and responds in the same thread.

No context switching. No app switching. No UI learning. The machine adapts to the human.

This isn't a chatbot. A chatbot answers questions. OpenClaw *does things*:

```
You (WhatsApp): "What's on my calendar tomorrow?"
Claw: "3 meetings: standup at 9am, design review at 2pm, 1:1 with Sarah at 4pm.
       The design review has no agenda yet. Want me to draft one from the Figma file?"

You: "Yes, and move the 1:1 to 4:30, Sarah said she's running late"
Claw: "Done. Calendar updated. Sarah gets a notification. Here's the design review
       agenda based on the Figma comments from this week: ..."
```

That exchange involved: calendar read, calendar write, notification send, Figma API access, document generation, and calendar update. Six tool invocations. Zero apps opened.

Multiply this by every task in a day. Email triage. Meeting prep. Code deployment. Expense reports. Travel booking. Research. Each one traditionally requires opening a different app, navigating a different UI, performing different clicks.

OpenClaw collapses all of it into one surface: the messaging app already open on the phone.

*That's* what Jensen meant by "the new computer."

---

## The Architecture: Simpler Than Expected

```
WhatsApp / Telegram / Slack / Discord / Signal / iMessage / Teams / ...
              |
              v
   ┌──────────────────────┐
   │       Gateway         │
   │    (control plane)    │
   │  ws://127.0.0.1:18789 │
   └──────────┬───────────┘
              |
              ├── Pi agent (LLM reasoning + tools)
              ├── CLI (openclaw ...)
              ├── WebChat UI
              ├── macOS app
              └── iOS / Android nodes
```

The Gateway is the hub. Every message from every channel flows through it. Every tool invocation routes through it. Every response goes back through it.

The Pi agent is the brain — an LLM (Claude, GPT, Gemini, local models, anything) that receives messages, decides which tools to call, executes them, and crafts a response.

The nodes are optional. macOS app gives a menu bar icon, voice wake ("Hey Claw"), and push-to-talk. iOS and Android nodes add camera access, location, screen recording, and device-specific commands. All optional. The Gateway alone handles the core experience.

Everything runs on `localhost`. No cloud dependency. No data leaving the machine.

---

## Skills: The App Store Moment

OpenClaw launched with basic capabilities. The community turned it into an operating system.

ClawHub, the skills registry, hosts 13,729 skills as of March 2026. That's an entire ecosystem built in under 7 months.

A skill is just a `SKILL.md` file. Markdown instructions that tell the agent how to use a specific tool, API, or workflow. No compiled code. No binary packages. Just text that the LLM reads and follows.

Install one:

```bash
clawhub install steipete/slack
```

Or paste a GitHub link into the chat and say "use this." The agent handles the rest.

Here's a sample of what people have built across 30+ categories:

### Daily life

| Skill | What it does |
|-------|-------------|
| Morning Brief | Aggregates news, calendar, weather, tasks. Texts a summary every morning at 7am. |
| Inbox Declutter | Reads newsletters, generates a digest, forwards the summary, archives the originals. |
| Family Calendar | Merges family members' calendars. Sends a group briefing. Monitors messages for appointments. |
| Health Tracker | Logs food and symptoms via chat. Identifies triggers over time. Sends check-in reminders. |
| Habit Coach | Daily check-ins via Telegram. Tracks streaks. Adapts tone based on progress. Gets pushier when needed. |

### Professional

| Skill | What it does |
|-------|-------------|
| Multi-Agent Team | Runs strategy, dev, marketing, and business agents as a coordinated team in Telegram channels. |
| Meeting Notes | Transcribes meetings. Generates structured summaries. Creates Jira tickets assigned to the right person. |
| Customer Service | Unifies WhatsApp, Instagram, email, and Google Reviews into one AI-powered inbox. 24/7. |
| PR Auto-Merger | Monitors GitHub PRs. Runs checks. Merges when criteria are met. Posts to Slack. |
| Project State | Event-driven project tracking with automatic context capture. Replaces Kanban boards. |

### Infrastructure

| Skill | What it does |
|-------|-------------|
| Self-Healing Server | SSH access + cron jobs + monitoring. Agent detects when a service is down and restarts it. |
| n8n Orchestration | Delegates API calls to n8n workflows via webhooks. Agent never touches credentials. |
| Dynamic Dashboard | Parallel data fetching from APIs, databases, and social media. Renders a live dashboard. |

### Creative

| Skill | What it does |
|-------|-------------|
| YouTube Pipeline | Scouts video ideas, does research, generates outlines, tracks the content calendar. |
| Podcast Production | From topic selection to guest research to show notes to social promo. End to end. |
| Content Factory | Multi-agent pipeline in Discord. Research agent, writing agent, thumbnail agent. Dedicated channels. |
| Overnight Builder | Brain dump goals before bed. Agent generates, schedules, and completes tasks autonomously. Builds surprise mini-apps. |

### Research

| Skill | What it does |
|-------|-------------|
| arXiv Reader | Fetch papers by ID. Browse sections conversationally. Compare abstracts. Get AI summaries. |
| Knowledge Base | Drop URLs, tweets, and articles into chat. Builds a searchable RAG knowledge base over time. |
| Idea Validator | Scans GitHub, HN, npm, PyPI, Product Hunt before building. Stops if space is crowded. |
| LaTeX Writer | Write and compile LaTeX papers conversationally with instant PDF preview. No local TeX install. |

5,400+ of these skills have been vetted by the community (the other 8,300 include spam, duplicates, and 373 skills flagged as malicious by security researchers — the ecosystem is large enough to have an actual security problem).

---

## The Multi-Channel Trick That Changes Everything

Most AI assistants live in one place. ChatGPT lives in a browser tab. Siri lives on the phone. Alexa lives in a speaker.

OpenClaw lives everywhere simultaneously. Same agent, same memory, same skills — accessible from WhatsApp, Telegram, Slack, Discord, iMessage, or a dozen other platforms. All at the same time.

This sounds like a feature. It's actually an architecture.

The Gateway maintains **sessions** — isolated conversation contexts. The main session (the owner's direct chat) has full tool access. Group sessions can be sandboxed. Channel-specific permissions control what the agent can do in each context.

```json5
{
  agent: {
    model: "anthropic/claude-opus-4-6",
  },
  channels: {
    whatsapp: { allowFrom: ["+1234567890"] },
    telegram: { botToken: "123456:ABCDEF" },
    slack: { botToken: "xoxb-...", appToken: "xapp-..." },
  },
}
```

Three channels. One config file. One agent serving all of them.

The security model is thoughtful. DMs from unknown senders trigger a pairing code — the agent won't process the message until the owner approves. Group chats require mention gating. Non-main sessions can be Docker-sandboxed. Run `openclaw doctor` to surface risky configurations.

---

## Voice: The Interface That Replaces All Interfaces

Text is OpenClaw's primary input. But voice is where it gets uncanny.

**Voice Wake** on macOS and iOS: say a wake word, and the agent starts listening. No button press. No app open.

**Talk Mode** on Android: continuous voice conversation. Ask a question, get a spoken answer, ask a follow-up. Hands-free.

**Phone calls**: the community built skills that let OpenClaw answer actual phone calls. Morning briefings delivered by voice. Event guest confirmations via automated calls. Two-way voice conversations with the agent from any phone.

The phone call use case is worth lingering on.

A developer in the community set up OpenClaw to call a list of event guests, one by one, confirm attendance, collect notes about dietary restrictions, and compile a summary spreadsheet. Fully automated. The guests had a natural voice conversation with the AI. Most didn't realize it wasn't a human assistant.

That's not a chatbot. That's a personal secretary.

---

## Agent-to-Agent: When One Brain Isn't Enough

OpenClaw supports multi-agent routing. Different sessions can run different models, different skills, different permissions.

```
You: "Research this market, write a report, then generate a pitch deck"

Session 1 (Research Agent): Searches the web, reads papers, compiles findings
Session 2 (Writer Agent): Takes research output, writes structured report
Session 3 (Design Agent): Takes report, generates pitch deck in Canvas
```

The `sessions_send` tool lets agents message each other. Agent 1 finishes research, sends the output to Agent 2. Agent 2 finishes writing, sends to Agent 3. Each has its own memory, tools, and model. They coordinate without a central orchestrator.

The community "Multi-Agent Specialized Team" use case runs four agents — strategy, development, marketing, and business — in a single Telegram group. The human posts a message. The right agent responds based on the topic. They hand off tasks to each other when needed.

---

## The "Second Brain" That Actually Works

Every "second brain" app requires the human to do the work: capture, tag, organize, review. OpenClaw flips this.

The community "Second Brain" use case is simple: text anything to the bot. A thought. A link. A screenshot. A voice memo. The agent stores it, indexes it, and makes it searchable.

```
You: [sends a screenshot of a whiteboard]
Claw: "Got it. I see a system architecture diagram with three microservices.
       Tagged: architecture, microservices, backend. Anything to add?"

(Three weeks later)

You: "What was that architecture diagram I took a photo of?"
Claw: "The whiteboard from March 3rd. Three microservices: auth, billing,
       notifications. Want the full image or just the summary?"
```

No Notion. No Obsidian. No tagging system. No weekly review ritual. Just text the thing. Find it later by asking.

This is the pattern that makes Jensen's comparison click. A computer stores files and retrieves them. OpenClaw stores *everything you tell it* and retrieves it via natural language. The filing system is the LLM.

---

## The Privacy Argument That Actually Holds Up

Every AI assistant conversation is a corporate data mine — except this one.

OpenClaw runs on `localhost`. The Gateway binds to `127.0.0.1`. No telemetry. No analytics. No data collection. The code is MIT-licensed and fully auditable.

The only external call is to the LLM provider — and even that is the user's choice. Use Claude via API key. Use GPT via OAuth. Use a local model via Ollama. Use whatever. OpenClaw doesn't care. It's a client, not a platform.

For the privacy-conscious (or the enterprise-paranoid), this matters enormously. Every competitor — ChatGPT, Gemini, Copilot — requires sending data to someone else's server. OpenClaw sends messages to the LLM provider and nothing else. No middleman. No platform risk. No terms of service that grant a company rights to training on conversation data.

---

## The Security Problem Nobody Talks About

A skills ecosystem with 13,729 entries has a security problem. OpenClaw's community acknowledges this openly.

373 skills have been flagged as malicious by security researchers. That's 2.7% of the registry. Prompt injections. Tool poisoning. Hidden payloads. Unsafe data handling.

The defenses:

- **VirusTotal partnership** — skills are scanned, reports visible on ClawHub
- **Community vetting** — the awesome-openclaw-skills repo filters down to 5,366 "safe" skills
- **DM pairing** — unknown senders can't access the agent without approval
- **Docker sandboxing** — non-main sessions can run in containers
- **Tool allowlists/denylists** — granular control over what each session can do

The honest assessment: it's early. The security surface area is large. Running an AI agent with tool access on your machine, connected to your messaging platforms, talking to strangers who might send adversarial messages — that's a real threat model. The mitigations exist but require the user to configure them correctly.

`openclaw doctor` helps. It scans the configuration and flags risky settings. But "run the doctor" is not a security guarantee. Anyone running OpenClaw connected to public channels should understand the risks.

---

## Why 319K Stars in 7 Months?

Three converging forces:

**1. The messaging-first generation doesn't want apps.**

Billions of people spend most of their phone time in messaging apps. WhatsApp alone has 2.7 billion users. For this audience, "download an app" is friction. "Text the bot" is natural. OpenClaw meets people where they already are.

**2. AI assistant fatigue created demand for something self-hosted.**

Everyone has tried ChatGPT. Everyone hit the limits: can't access email, can't book things, can't run code on your machine, can't control smart home devices, and every conversation trains someone else's model. The desire for a *private, capable, extensible* assistant was latent and enormous.

**3. Skills turned users into builders.**

A skill is a markdown file. Anyone who can write instructions in English can create one. The barrier to contribution is close to zero. This created a flywheel: more skills attract more users attract more skill builders attract more skills. 13,729 in 7 months.

---

## What This Means for Computing

Jensen Huang's statement wasn't really about OpenClaw. It was about a trajectory.

The GUI was a paradigm shift from command lines. Touch screens were a paradigm shift from mice. Natural language interfaces, delivered through messaging platforms, connected to tools and APIs, running locally on the user's hardware — that's the next shift.

OpenClaw is the first credible open-source implementation of this idea. It won't be the last. Apple, Google, and Microsoft are all building toward the same vision, except proprietary and cloud-dependent.

The open-source version will matter because the privacy argument will matter. When the assistant knows your calendar, email, health data, finances, and daily routine, the question of who controls the infrastructure becomes existential. "Trust us" is not a satisfying answer. "Run it yourself" is.

A space lobster named Molty, built by a developer named Peter Steinberger, backed by OpenAI and Vercel, running on 319K developers' machines, is currently the most convincing prototype of what personal computing looks like next.

Whether it wins or gets absorbed into something bigger, the pattern is established. The computer isn't a device anymore. It's an agent. And the interface is the conversation.

---

## Try It

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

- [GitHub](https://github.com/openclaw/openclaw) — 319K+ stars, MIT License
- [Documentation](https://docs.openclaw.ai)
- [ClawHub Skills Registry](https://clawhub.com)
- [Discord Community](https://discord.gg/clawd)
- [Awesome Use Cases](https://github.com/hesamsheikh/awesome-openclaw-usecases) — 40+ real-world examples
- [Awesome Skills](https://github.com/VoltAgent/awesome-openclaw-skills) — 5,400+ vetted skills

Requires Node.js 22+. Runs on macOS, Linux, and Windows (WSL2).

---

*Disclaimer: This article is based on public documentation, GitHub READMEs, and community repositories as of March 2026. The author is not affiliated with OpenClaw, its maintainers, or its sponsors. Star counts and skill registry numbers are snapshots that change daily. Jensen Huang's GTC quote is referenced from public reporting of the event. Security assessments are based on community-published findings and should not be treated as a professional audit. Benchmark claims have not been independently verified. OpenClaw has no official cryptocurrency, token, or coin — any claims otherwise are scams. AI assistants with tool access carry inherent security risks; users should review the security documentation before deployment.*
