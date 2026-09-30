---
title: "Anthropic's 10-Trillion Parameter Model Just Leaked — And It Wasn't a Hack"
description: "A misconfigured CMS exposed Claude Mythos, Anthropic's most powerful AI model ever built. Three thousand files. A new model tier. And a cybersecurity panic that moved markets."
draft: true
pubDatetime: 2026-03-29
tags:
  - anthropic
  - claude-mythos
  - ai-safety
  - cybersecurity
  - frontier-models
ogImage: "/images/blog/claude_mythos.webp"
---

# Anthropic's 10-Trillion Parameter Model Just Leaked. It Wasn't a Hack. It Was a Default Setting.

*A misconfigured CMS, three thousand exposed files, and a 10-trillion parameter model that rattled stock markets, spooked cybersecurity firms, and forced Anthropic to confirm what it was still deciding whether to announce.*

---

*AI Safety | Anthropic | Claude Mythos | Cybersecurity | Frontier Models | March 2026*
*~14 min read*

---

## What happened on March 26

On the evening of March 26, 2026, Roy Paz -- a senior AI security researcher -- was doing what researchers do: poking around publicly accessible corners of the internet looking for things that should not be there. What he found was, by any measure, remarkable. Approximately 3,000 files from Anthropic's internal blog infrastructure were sitting in an unsecured, publicly searchable data cache. Any search engine could find them. Anyone could read them.

Among those files was a draft blog post. And in that draft blog post was the announcement Anthropic had not yet decided to make -- the existence of Claude Mythos, internally described as "by far the most powerful AI model we've ever developed."

Fortune broke the story. Anthropic confirmed it. Stock markets moved. And the AI world spent the next 72 hours simultaneously trying to understand what Mythos actually is, and wondering what it means that a company building what it calls an unprecedented cybersecurity threat left the announcement of that threat in an unsecured public data store.

The irony needed no elaboration. Everyone elaborated on it anyway.

---

## How the leak actually happened

The mechanism was mundane, which makes it somehow more alarming. Anthropic uses a content management system to draft and stage blog posts before publication. That CMS had a default configuration that automatically made uploaded assets publicly accessible. Not hidden behind a login. Not behind any authentication at all. Just -- publicly accessible, publicly searchable, sitting there.

Here is the timeline:

| Date | Event | Detail |
| ---- | ----- | ------ |
| Mar 26, early evening | Roy Paz discovers the exposed data cache | Security researcher finds ~3,000 Anthropic blog assets in an unsecured, publicly searchable data store. Among them: draft blog posts for an unannounced model. |
| Mar 26, same evening | Fortune reviews the drafts and contacts Anthropic | Two versions of the same draft blog post are found -- one naming the model "Mythos," one calling it "Capybara." Both describe the same model in nearly identical terms. |
| Mar 26, late evening | Anthropic confirms and removes public access | Spokesperson says the model represents "a step change" and is "the most capable we've built to date." Company removes the cache. Calls the documents "early drafts being considered for publication." |
| Mar 27, morning | Markets react. Cybersecurity stocks fall sharply. | Palo Alto Networks, CrowdStrike, and Fortinet each drop 4-6%. The iShares Expanded Tech-Software ETF (IGV) falls nearly 3%. Bitcoin slides to $66,000 alongside the broader software sector. |
| Mar 27, same day | Bloomberg and The Information report on Anthropic IPO plans | Reports surface that Anthropic is considering going public as early as October 2026. The timing alongside the Mythos leak sparks widespread industry discussion about pre-IPO positioning. |
| Mar 28-29 | Global tech press completes the picture | Fortune, CoinDesk, SiliconAngle, The Decoder, Geeky Gadgets, and dozens of other outlets synthesize the available information. The story becomes the defining AI news event of the week. |

---

## What Claude Mythos actually is

There are two distinct things to understand about Mythos: what is confirmed and what is reported from leaked drafts. These are different confidence levels and should be treated as such.

**Confirmed by Anthropic:** The model exists. It is finished training. It is being piloted with a small group of early access customers. It represents "a step change" in AI performance. It is "the most capable we've built to date." The company is "developing a general purpose model with meaningful advances in reasoning, coding, and cybersecurity."

**Reported from the leaked draft blog post (not yet officially confirmed):** The model is internally named Mythos. It is positioned in a new tier called "Capybara" -- larger and more capable than Opus, which was until now Anthropic's most powerful model tier. It has been described as having approximately 10 trillion parameters. It achieves "dramatically higher scores" than Claude Opus 4.6 on coding, academic reasoning, and cybersecurity benchmarks. It is expensive to serve. It poses "unprecedented cybersecurity risks."

> "By far the most powerful AI model we've ever developed." -- Anthropic internal draft blog post, leaked March 26, 2026

The name question is worth pausing on. The two drafts found -- one titled "Mythos," one titled "Capybara" -- appear to be the same document with the model name swapped throughout. Except, tellingly, the subtitle. Both versions contain the subtitle: "We have finished training a new AI model: Claude Mythos." Anthropic appears to have been deciding between two names for the same model. Both drafts justify the Mythos name the same way: it was chosen to evoke "the deep connective tissue that links together knowledge and ideas."

---

## The numbers that define the story

| Stat | Value | Context |
| ---- | ----- | ------- |
| Parameters | 10T | The scale reported in leaked documents -- vs. billions in current models |
| Exposed assets | 3,000 | Anthropic internal files sitting in the unsecured data cache |
| CrowdStrike/Fortinet drop | -6% / -4% | Stock decline on the day of the leak |
| Bitcoin low | $66K | Price during the broader tech selloff triggered by the news |
| Draft versions found | 2 | "Mythos" (v1) and "Capybara" (v2) -- same model, different name candidates |
| Reported IPO timeline | Oct 2026 | Potential Anthropic IPO -- reported the same week the leak surfaced |

---

## The new model tier nobody knew was coming

Understanding why Mythos matters requires understanding what tier it occupies. Anthropic's current model architecture has three tiers: Haiku (fast and cheap), Sonnet (balanced), and Opus (most powerful). Mythos/Capybara represents a fourth tier -- positioned above Opus, more capable and more expensive than anything Anthropic has previously shipped.

| Tier | Description | Status |
| ---- | ----------- | ------ |
| Capybara / Mythos | New tier above Opus -- 10T parameters, dramatically higher benchmark scores, unprecedented cybersecurity capabilities, expensive to serve | NEW -- Leaked |
| Opus | Current most powerful tier -- Claude Opus 4.6 is the benchmark Mythos exceeds "dramatically" on coding, reasoning, and cybersecurity | Current Top |
| Sonnet | Balanced tier -- Claude Sonnet 4.6 is the current flagship for most use cases | Current Mid |
| Haiku | Fast and cheap -- optimized for high-volume, latency-sensitive applications | Current Fast |

The Capybara positioning is significant not just as a capability story but as a product story. Adding a tier above Opus creates an enterprise product matrix with four clear price/performance bands -- which is exactly what a company planning a public offering wants to have before it goes public. Investors can see where revenue scales as enterprise customers upgrade tiers.

---

## Six things Mythos can reportedly do

The leaked draft documents describe capabilities that go beyond incremental improvements. These are worth listing individually because they explain the market reaction.

**Zero-day vulnerability discovery.** Identifies previously unknown vulnerabilities in production codebases. Anthropic already demonstrated that Opus 4.6 found 22 Firefox vulnerabilities in a single month. Mythos reportedly surpasses this dramatically.

**Active exploitation capability.** The draft documents warn that Mythos can not only find vulnerabilities but exploit them -- at a speed that "far outpaces the efforts of defenders." This is why Anthropic is limiting initial access to cyber defense organizations specifically.

**Dramatically improved coding.** Benchmark scores on coding tasks are "dramatically higher" than Opus 4.6, which already sits at or near the top of competitive coding benchmarks. The gap is described as substantial, not incremental.

**Advanced academic reasoning.** Academic reasoning benchmarks -- which test formal logic, mathematical proof, and multi-step inference -- show similarly large gains over the current Opus tier. The model was described as excelling in "high-stakes applications."

**Security architecture analysis.** Attack surface mapping and security architecture assessment at a level that matches or exceeds specialized security tools. The model understands system design well enough to identify the weakest link, not just the most obvious vulnerability.

**Biological research (Operon).** Separate from Mythos but part of the same release cycle: Anthropic's Operon is a specialized AI agent for biological research, providing collaborative tools that accelerate genomics and drug discovery at research-institution scale.

---

## The cybersecurity panic -- and why it is justified

When a new AI model is announced, cybersecurity company stocks do not usually fall 4-6% overnight. The reaction to Mythos was categorically different from any previous model announcement. Understanding why requires understanding what the leaked documents actually said about the model's capabilities.

The draft blog post did not describe Mythos as a cybersecurity tool. It described it as a cybersecurity threat -- one that Anthropic itself was responsible for creating and was now trying to manage responsibly. The key passage, as reported by multiple outlets:

> "Mythos is currently far ahead of any other AI model in cyber capabilities and heralds an imminent wave of models that can exploit vulnerabilities in ways that far exceed the efforts of defenders."

That is an extraordinary thing for a company to write about its own product. And it explains exactly why the following happened:

| Ticker | Change | Company |
| ------ | ------ | ------- |
| PANW | -5% | Palo Alto Networks |
| CRWD | -6% | CrowdStrike |
| FTNT | -4% | Fortinet |
| IGV | -3% | iShares Expanded Tech-Software ETF |
| BTC | -$10K | Bitcoin slide to $66K |

The investor logic is straightforward: if an AI model can identify and exploit vulnerabilities faster than human security teams can patch them, the existing model of "hire a large security operations team and pay for endpoint protection software" becomes less defensible. Products from CrowdStrike and Palo Alto are valuable because detecting and responding to threats is hard. If an AI makes executing those threats dramatically easier, the attack volume increases -- but the market's question was whether the existing defense solutions scale with it, or whether a new AI-native defense paradigm displaces them.

Anthropic's response to this tension is the phased rollout. First access goes specifically to cyber defense organizations -- the reasoning being that defenders need a head start before offensive actors get the same tools. This is the same logic that governs how zero-day vulnerability research is handled in traditional security: responsible disclosure, defense first, then broader access.

This is not purely theoretical. Anthropic has already documented a Chinese state-sponsored group running a coordinated campaign using Claude Code to infiltrate roughly 30 organizations -- tech companies, financial institutions, and government agencies -- before detection. Anthropic investigated, banned the accounts, and notified affected organizations. Claude Opus 4.6, the current model, was used in that attack. Mythos reportedly surpasses Opus 4.6 dramatically on exactly these cybersecurity capabilities. The concern in the leaked documents is not hypothetical risk assessment -- it reflects something the company has already seen happen with its weaker model.

---

## What makes 10 trillion parameters mean something

Numbers like "10 trillion parameters" get cited in AI headlines with an implicit assumption that bigger always means better. The relationship is real but not linear, and understanding the nuance matters for interpreting what Mythos actually represents.

GPT-4 is estimated at roughly 1.8 trillion parameters. Claude Opus 4.6 is not publicly specified but is widely estimated in the hundreds of billions. A 10-trillion-parameter model represents not an incremental scaling step but a genuine architectural leap -- similar to what happened when models first crossed from the billions into the hundreds of billions.

At that scale, emergent capabilities appear. Behaviors and reasoning patterns that do not exist at lower parameter counts emerge spontaneously -- not because they were explicitly trained in, but because the sheer scale of the model's internal representations creates new cognitive structures. This is why the leaked document describes Mythos as representing "a step change" rather than an improvement on existing dimensions. Step changes at the capability frontier tend to surface things nobody specifically designed for -- including, apparently, the cybersecurity capabilities that have Anthropic itself worried enough to restrict initial access.

**The cost reality.** The leaked blog post acknowledged explicitly that Mythos is "very expensive for us to serve, and will be very expensive for our customers to use." Anthropic says it is working to make the model "much more efficient before any general release." This is a known pattern in AI scaling: train at massive scale, identify the capabilities, then work backward on efficiency. The 10-trillion-parameter version that exists today is likely not the version that ships to the public -- it is the existence proof that those capabilities are achievable, which then informs a smaller, faster, cheaper model trained to replicate them.

---

## The IPO question

On the same day the Mythos leak broke -- March 27, 2026 -- Bloomberg and The Information independently reported that Anthropic is considering an IPO as early as October 2026. Analysts immediately noted that announcing the world's most powerful AI model in the months before an IPO would be an extremely well-timed valuation event.

Anthropic has not commented on the IPO reports or their relationship to the Mythos announcement timing. The coincidence was noted by everyone who writes about AI for a living.

If accurate, the company has roughly six months to turn Mythos from a leaked secret into a launched product before going public. A pre-IPO Mythos launch would be the highest-profile model release in the company's history and would directly influence the valuation at which it goes public. The four-tier product matrix -- Haiku, Sonnet, Opus, Capybara -- gives investors a clear enterprise pricing story. That is not an accident.

---

## The irony that defined the story

This was the most-cited observation from every reporter who covered the leak, and it deserves its own section because it speaks to something deeper than a configuration mistake.

A company building what it describes as an AI model with unprecedented, dual-use cybersecurity capabilities -- one that can find and exploit vulnerabilities "in ways that far outpace the efforts of defenders" -- left the announcement of that model in an unsecured, publicly searchable data store due to a CMS misconfiguration. Anthropic regularly discusses security frameworks, risk levels, and authorized approvals. Its own model leak happened because of a default setting nobody checked.

The company that warned about AI-powered cyberattacks got breached by a search engine.

To be fair to Anthropic, the breach did not expose the model itself -- just documents about it. No weights, no architecture details, no training data. What was exposed was marketing copy and internal planning documents. The security failure was embarrassing; it was not catastrophic.

But the optics matter. The Igor's Lab analysis put the tension precisely: "Ironically, a company that regularly discusses security frameworks, risk levels, and authorized approvals had the existence of a new flagship model revealed not through an announcement, but due to a configuration error in its own release process." The company's response -- attributing the exposure to "human error" and describing the documents as "early drafts being considered for publication" -- was measured. Whether it was fully satisfying is a different question.

---

## What happens next

Several threads are now running in parallel and are worth watching closely.

**The name question.** Two draft versions existed -- "Mythos" and "Capybara." The subtitle of both said "Claude Mythos." It is likely that Mythos is the internal codename and Capybara is the planned product tier name (similar to how Opus, Sonnet, and Haiku are tier names). Whether the final product ships under either name, both, or something entirely different is unknown.

**The release timeline.** Anthropic confirmed early access testing is underway with a small group of cyber defense organizations. The company has also said it is working to reduce the model's computational cost before a general release. Neither a general release date nor pricing has been officially announced.

**The IPO thread.** Bloomberg and The Information's October 2026 IPO reporting did not come from Anthropic. If accurate, the company has roughly six months to turn Mythos from a leaked secret into a launched product before going public. A pre-IPO Mythos launch would be the highest-profile model release in the company's history and would directly influence the valuation at which it goes public.

**The competitive response.** Anthropic's claim -- via leaked draft -- that Mythos is "currently far ahead of any other AI model in cyber capabilities" is a direct competitive claim against OpenAI, Google DeepMind's Gemini 3.1, and every other frontier lab. Those labs do not typically stay quiet when a competitor makes such a claim. The AI capability race has a new benchmark event to respond to.

---

## The deeper story behind the leak

It would be easy to frame this entire episode as an embarrassing mistake by a careless company. That framing misses the more interesting story.

Anthropic has spent years positioning itself as the "responsible AI" lab -- the company that takes safety seriously, that publishes Constitutional AI research, that voluntarily submits to third-party evaluations, that participates in government AI safety frameworks. The leaked documents for Mythos are consistent with that positioning in a surprising way: they are candid about the model's risks in a manner that is unusual for an AI company about to launch a product.

Most model launches lead with the capabilities and bury the risks in technical footnotes. The Mythos draft blog post apparently led with both -- describing the model as a "step change" in capability and simultaneously warning that it "presages an upcoming wave of models that can exploit vulnerabilities in ways that far outpace the efforts of defenders." The phased rollout to cyber defenders first is not a typical product launch strategy. It is a harm-reduction strategy applied to a commercial product.

Whether that makes the release responsible or merely the most elaborate PR strategy in AI history is a question the industry will debate for the length of Mythos's commercial life. What is indisputable is that the leak forced Anthropic to have a conversation it was still preparing to have -- and the company's response, while clearly improvised, was more transparent than it could have been.

The name Mythos was chosen, according to the leaked draft, to evoke "the deep connective tissue that links together knowledge and ideas." There is something appropriately mythological about how this particular model entered the public consciousness -- not through a carefully orchestrated launch event, not through a blog post drafted with exactly the right words, but through a misconfigured default setting and a security researcher who was paying attention.

History tends to note the things that arrived unplanned. Claude Mythos arrived about as unplanned as it gets. What it will become -- the capabilities it will enable, the risks it will create, the market it will reshape, and whether it arrives under that name at all -- is the story still being written. The prologue was published by accident. The rest will be released deliberately. Probably.

---

*If the architecture of large-scale systems and how data flows through them interests you, [Designing Data-Intensive Applications](https://amzn.to/4lPlcr4) remains the best single resource for understanding the distributed systems fundamentals that underpin models like Mythos -- from replication and partitioning to the encoding formats that make trillion-parameter training possible.*

---

*Disclaimer: This article is an independent editorial synthesis of publicly confirmed reporting from Fortune, The Decoder, SiliconAngle, CoinDesk, Trending Topics, Geeky Gadgets, Igor's Lab, and APIYI as of March 29, 2026. The author has no affiliation with Anthropic. Details sourced from Anthropic's leaked draft blog post are clearly attributed and have not been independently verified beyond what Anthropic has publicly confirmed. Final model specifications, release naming, and pricing remain unconfirmed by official product documentation. Stock figures and Bitcoin prices are approximate snapshots from the trading sessions cited and may not reflect current values. This is not insider information -- it is journalism.*
