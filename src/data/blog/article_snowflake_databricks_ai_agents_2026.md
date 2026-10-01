---
title: "Snowflake and Databricks Converged on AI Agents in 2026. Here Is What Changes for Data Engineers"
description: "Both platforms now ship agents as governed objects, managed MCP servers, AI gateways and SQL extraction functions. The work moving to data engineers is context, permissions and cost control."
pubDatetime: 2026-10-01
tags:
  - ai-agents
  - databricks
  - snowflake
  - mcp
  - data-engineering
---

*Snowflake and Databricks spent 2026 shipping nearly the same agent stack under different names: agents as catalog objects, managed MCP servers, AI gateways and document extraction in SQL. The platforms now differ less on features than on how they expect you to supply context and enforce permissions, and that work is landing on data engineers.*

## Two summits, one roadmap

Snowflake announced its agent lineup at Summit 26 in early June. Databricks published its Data + AI Summit announcements on June 16. Read them side by side and the overlap is hard to miss.

Snowflake renamed its two agent products. Snowflake Intelligence became **CoWork**, the agent for business users, and Cortex Code became **CoCo**, the coding agent. The [CoCo press release](https://www.snowflake.com/en/news/press-releases/snowflake-coco-redefines-enterprise-ai-development-as-the-coding-agent-built-for-faster-easier-and-more-powerful-innovation-anywhere/) (June 2, 2026) lists a desktop app, VS Code and Excel extensions, a mobile app, a Slackbot and a Claude Code plugin. Snowflake also introduced Cortex Sense, a context layer for both agents.

Databricks put Agent Bricks at the center of its keynote. The [Agent Bricks summit post](https://www.databricks.com/blog/agent-bricks-dais-2026) (June 16, 2026) claims more than 100,000 agents built and more than one quadrillion tokens per year of agent traffic. It also announced MCP support in Unity Catalog, an agent memory service backed by Lakebase, a sandbox for agent code execution and Unity AI Gateway.

Strip away the branding and both vendors are making the same bet. The agent runs next to the data, inherits the catalog's permissions and is reachable from outside clients over MCP.

| Capability | Snowflake | Databricks |
| --- | --- | --- |
| Agent as a governed object | `CREATE AGENT` (Cortex Agents) | Agents registered in Unity Catalog |
| Business-user agent | CoWork | Genie |
| Coding agent | CoCo | Harness-agnostic (Claude Code SDK, LangGraph, CrewAI and others) |
| Context layer | Cortex Sense, semantic views | Genie Ontology, Unity Catalog Metrics |
| External access | Snowflake-managed MCP server | Managed MCP servers, MCP in Unity Catalog |
| Model gateway | Cortex AI Gateway | Unity AI Gateway |
| Document extraction | `AI_EXTRACT` | `ai_extract`, `ai_parse_document` |

## Agents are now database objects

The most important change is the least flashy one: an agent is now an object you create, grant, version and drop, like a table or a view.

On Snowflake that object is a Cortex Agent, defined in SQL with a YAML specification. The [CREATE AGENT reference](https://docs.snowflake.com/en/sql-reference/sql/create-agent) shows the shape. You name the orchestration model, set a time and token budget, and list the tools the agent can call:

```sql
CREATE OR REPLACE AGENT analytics.agents.revenue_assistant
  COPY GRANTS
  COMMENT = 'Answers revenue and refund policy questions'
  FROM SPECIFICATION
  $$
  models:
    orchestration: auto
  orchestration:
    tool_not_accessible: reject
    budget:
      seconds: 30
      tokens: 16000
  instructions:
    orchestration: "Use Analyst for revenue numbers; use Search for policy documents"
  tools:
    - tool_spec:
        type: "cortex_analyst_text_to_sql"
        name: "Analyst"
        description: "Revenue metrics from the finance semantic view"
    - tool_spec:
        type: "cortex_search"
        name: "Search"
        description: "Refund and billing policy documents"
  tool_resources:
    Analyst:
      semantic_view: "analytics.finance.revenue_sv"
    Search:
      search_service: "analytics.docs.policy_search"
      max_results: "5"
  $$;
```

Three details matter for anyone running this in production. `COPY GRANTS` keeps existing privileges when you replace the agent; without it the replacement keeps only future grants, which can break integrations that depend on the old ones. `tool_not_accessible: reject` makes a run fail when the caller lacks access to a configured tool, instead of quietly continuing without it (the default is `accept`). The specification is capped at 100,000 bytes.

In September Snowflake made temporary agents, secure agents, `COPY GRANTS` and agents in personal databases generally available ([release note, Sep 16, 2026](https://docs.snowflake.com/en/release-notes/2026/other/2026-09-16-cortex-agents-object-enhancements-ga)). A secure agent hides its specification from roles that can run it but do not own it. That matters when the system prompt encodes business logic you would rather not expose.

Databricks takes the same approach through Unity Catalog. The Agent Bricks post says the Unity Catalog Registry now extends to agents, tools and models, and that contextual policies let you write "custom security policies for tools, guardrails for agents, directly in SQL."

What this means for you: agent definitions belong in version control and CI, deployed the same way you deploy dbt models or table DDL. An agent created by hand in a UI is the new hand-edited production view.

## Lineage now runs through the agent

Once agents are catalog objects, lineage can include them. Snowflake added this on September 2: semantic views and Cortex Search services referenced by an agent's tools now appear upstream of the agent, so you can trace a path from a table, through a semantic view, to the agent that reads it ([release note](https://docs.snowflake.com/en/release-notes/2026/other/2026-09-02-cortex-agent-lineage)). One catch: Snowflake records these links when an agent is created or a new version is committed, so older agents don't appear until you commit again.

Databricks made external lineage generally available, extending it to source systems and BI reports, according to its [Unity Catalog summit post](https://www.databricks.com/blog/whats-new-unity-catalog-data-ai-summit-2026).

This changes how you assess impact. Before you drop a column or rename a metric, the question used to be "which dashboards break?" Now it is also "which agents start giving wrong answers?" An agent fails more quietly than a dashboard. It doesn't throw an error. It writes a confident sentence built on a column that no longer means what it used to.

## MCP is the front door on both platforms

Both platforms now let outside agents, such as Claude, Cursor or an internal app, reach governed data over the Model Context Protocol.

Snowflake's [managed MCP server](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp) supports MCP revision `2025-11-25` and is created as a schema object. It can expose Cortex Analyst, Cortex Search, Cortex Agents, custom tools and SQL execution. Snowflake recommends exposing a single governed agent rather than many low-level tools:

```sql
CREATE OR REPLACE MCP SERVER analytics.agents.finance_mcp
  FROM SPECIFICATION $$
  tools:
    - title: "Governed revenue agent"
      name: "revenue_assistant"
      type: "CORTEX_AGENT_RUN"
      identifier: "analytics.agents.revenue_assistant"
      description: "Use for revenue and refund policy questions."
  $$;
```

The security notes on that page are worth reading closely. Access to the MCP server does not grant access to its tools; each tool needs its own grant. Snowflake recommends OAuth over hardcoded tokens and warns about tool poisoning when several MCP servers are combined. It also caps recursion at 10 invocations to stop agent-calls-MCP-calls-agent loops.

Databricks offers three paths, according to its [MCP and agent tools docs](https://docs.databricks.com/agents/mcp-tools/): managed servers for Genie, AI Search, Databricks SQL, Unity Catalog functions and a code interpreter; external MCP servers registered as Unity Catalog securables; and custom servers hosted as Databricks Apps. The summit post adds that MCP support in Unity Catalog lets agents connect to Google Drive, Jira, Slack and GitHub.

The pattern is the same on both sides. MCP servers are catalog objects with grants, not sidecar processes someone runs on a laptop. If your organization already has engineers wiring agents to the warehouse with personal access tokens, this is the migration path.

## Context is the new modeling work

Agents fail on real warehouses for a predictable reason. They don't know what your tables mean. A column named `status` with values 1 to 7, a `revenue` table that excludes refunds, three definitions of "active customer": none of that sits in the schema.

Snowflake's answer is Cortex Sense. Its [announcement post](https://www.snowflake.com/en/blog/enterprise-ai-agents-grounded-context/) (June 30, 2026) describes a layer that learns from "queries your analysts have run in the past, the models defined in your transformation tools and the metrics that already live in your BI." On Snowflake's own product analytics benchmark, accuracy rose from 24.1% to 86.3% and cost per query fell from $1.76 to $0.59. Most of the savings came from agents no longer running `DESCRIBE TABLE` against dozens of objects to work out the schema. The post said private preview would begin in mid-July.

Databricks is building the same layer from its catalog. The Agent Bricks post introduced Genie Ontology for business semantics. The Unity Catalog post added Metrics (public preview, with imports from Power BI and Tableau in beta), a Glossary for "authoritative concepts, terms, and taxonomies", and column-level popularity signals meant to help agents reason.

Treat those benchmark numbers as vendor numbers on a vendor benchmark. The direction is still clear. Semantic views, metric definitions, glossaries and column descriptions used to be documentation that helped humans. Now they are inputs that decide whether an agent gets the right answer. Writing and maintaining them is data engineering work, and it deserves the same review and testing as transformation code.

## Gateways turn tokens into a line item you can govern

Both platforms now route model traffic through a gateway with budgets, tracing and access control.

Snowflake's [Cortex AI Gateway](https://docs.snowflake.com/en/release-notes/2026/other/2026-09-15-cortex-ai-gateway) entered preview on September 15. Each account gets one gateway object named `SNOWFLAKE`, reachable with the OpenAI Chat Completions or Anthropic Messages API formats. A per-gateway trace table records models called, step timing, token counts and errors. You can attach the gateway to a budget or set per-user quotas. Two defaults to check: `USAGE` is granted to `PUBLIC`, so every role can send traffic until you revoke it, and prompts and responses are recorded only if you turn on payload capture.

Databricks' [Unity Gateway](https://docs.databricks.com/unity-gateway/) covers models, MCP servers, skills and coding agents. The Unity Catalog post lists hard spend caps across external model providers, built-in guardrails against PII exposure and prompt injection, and unified tracing of model and MCP activity.

| Control | Snowflake Cortex AI Gateway | Databricks Unity Gateway |
| --- | --- | --- |
| API formats | OpenAI Chat Completions, Anthropic Messages | One API across GPT, Claude, Gemini and serving endpoints |
| Spend control | Budgets, per-user quotas | Hard spend caps, rate limits |
| Tracing | Per-gateway trace table, account usage view | Unified agent tracing for models and MCP |
| Default exposure | `USAGE` granted to `PUBLIC` | Admin-managed access policies |

Here is a query you can run once the gateway is live: find the users whose agent traffic grew fastest this week. The exact view names depend on your account. Check the `ACCOUNT_USAGE` schema for the gateway usage view the documentation references, then adapt:

```sql
-- Weekly token growth per user through the AI gateway
WITH weekly AS (
  SELECT
    user_name,
    DATE_TRUNC('week', start_time)  AS week,
    SUM(tokens)                     AS tokens
  FROM snowflake.account_usage.<gateway_usage_view>
  WHERE start_time >= DATEADD('week', -2, CURRENT_DATE)
  GROUP BY 1, 2
)
SELECT
  user_name,
  MAX(IFF(week = DATE_TRUNC('week', CURRENT_DATE), tokens, 0))                     AS this_week,
  MAX(IFF(week = DATE_TRUNC('week', DATEADD('week', -1, CURRENT_DATE)), tokens, 0)) AS last_week
FROM weekly
GROUP BY 1
ORDER BY this_week - last_week DESC
LIMIT 20;
```

Whoever owns warehouse cost now owns agent cost too. The difference is that a runaway agent loop can spend in minutes what a bad query spends in a month.

## SQL extraction functions replace small ML pipelines

The least hyped part of this convergence may be the most useful day to day. Both platforms let you pull structured fields from text and documents in plain SQL.

Databricks' [`ai_extract`](https://docs.databricks.com/aws/en/sql/language-manual/functions/ai_extract) takes text, or the VARIANT output of [`ai_parse_document`](https://docs.databricks.com/aws/en/sql/language-manual/functions/ai_parse_document), plus a JSON schema. Version 2.1 adds citations and confidence scores. The Agent Bricks post moved these Document Intelligence functions to general availability. A typical invoice pipeline:

```sql
CREATE OR REPLACE TABLE finance.silver.invoices AS
WITH parsed AS (
  SELECT path, ai_parse_document(content) AS doc
  FROM READ_FILES('/Volumes/finance/raw/invoices/', format => 'binaryFile')
)
SELECT
  path,
  ai_extract(
    doc,
    '{"vendor_name": {"type": "string"},
      "invoice_id":  {"type": "string"},
      "total_amount": {"type": "number"}}',
    map('version', '2.1', 'enableConfidenceScores', 'true')
  ) AS extracted
FROM parsed;
```

Snowflake's [`AI_EXTRACT`](https://docs.snowflake.com/en/sql-reference/functions/ai_extract) does the same job against a string or a staged file, with an optional `scores` argument for confidence.

Note the limits. `ai_parse_document` fails outright on documents over 500 pages unless you pass a `pageRange`. `ai_extract` runs only in some regions and not on Databricks SQL Classic. Databricks also states it may swap the underlying model when a better one performs well on its internal benchmarks, so the same input can produce different output after an upgrade. Pin the function version, keep a labeled sample of documents and compare outputs before trusting a change.

## Sandboxes and memory make agents stateful

Two more capabilities moved agents from answering questions toward doing work.

Code execution: Databricks announced Databricks Sandbox, isolated VMs with downscoped data access, for running agent-written code. Snowflake lets Cortex Agents use `code_execution` and `code_toolset_all` sandbox tools. Its [September 1 release note](https://docs.snowflake.com/en/release-notes/2026/other/2026-09-01-native-apps-agent-code-execution) lists the guardrails: the Python sandbox doesn't run SQL, the SQL tool supports only `SELECT` and `SHOW`, and calling the agent from an owner's-rights stored procedure removes both tools.

Memory: Databricks' agent memory service, built on Lakebase, persists context and session history across sessions. Snowflake took a different angle with a [Compact API](https://docs.snowflake.com/en/release-notes/2026/other/2026-09-21-cortex-agents-compact-api-preview) (preview, September 21) that summarizes a conversation so later runs use fewer tokens.

Memory is data. It has retention requirements, it can contain PII and someone will eventually ask for it to be deleted. If your platform team turns on agent memory, data engineering should own its schema and lifecycle from day one, just as with any other table.

## Where the convergence falls short

The feature lists look alike. The day-to-day experience doesn't, yet.

- **Preview labels are everywhere.** Cortex AI Gateway and the Compact API are in preview. Cortex Sense was announced for private preview. On the Databricks side, contextual service policies and ABAC for models are in beta, and Metrics is in public preview. Design around what is generally available in your region today.
- **Vendor benchmarks are not your benchmark.** The Cortex Sense numbers come from Snowflake's own product analytics test set. Agent accuracy depends heavily on how messy your schemas are and how good your metadata is.
- **Lock-in moved up a layer.** Iceberg and open table formats made storage portable. Agent specifications, semantic views, ontologies and gateway policies are not portable. A Cortex Agent's YAML doesn't run on Databricks, and a Genie Ontology doesn't run on Snowflake.
- **Defaults lean open.** Snowflake's gateway grants `USAGE` to `PUBLIC` by default, and Cortex Agents accept inaccessible tools unless you set `reject`. Review defaults before any rollout.
- **Model churn is real.** Both vendors reserve the right to change the model behind managed functions. That makes regression testing your job, not theirs.
- **Costs are new and hard to forecast.** Token-based pricing on agent runs doesn't map cleanly to warehouse credit budgets you already understand.

## What to do this quarter

You don't need to adopt every feature. A few moves pay off on either platform:

1. **Put agent and MCP server definitions in git.** Deploy them through CI like DDL, with `COPY GRANTS` (Snowflake) or catalog-managed grants (Databricks).
2. **Pick one governed domain to expose first.** Finance or product analytics, with a semantic view or metric definitions you trust. Expose one agent over MCP, not raw SQL execution.
3. **Turn on the gateway and lock down defaults.** Revoke broad usage grants, set per-user quotas or spend caps, and alert on token growth.
4. **Write context like code.** Column descriptions, metric definitions and glossary terms get reviews and tests.
5. **Build an evaluation set.** Collect 50 to 100 real business questions with known answers and rerun them whenever a model, prompt or semantic definition changes.

## Try it

- Snowflake: [CREATE AGENT reference](https://docs.snowflake.com/en/sql-reference/sql/create-agent), [managed MCP server](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp), [CoWork overview](https://docs.snowflake.com/en/user-guide/snowflake-cortex/snowflake-cowork), [Cortex Code (CoCo) docs](https://docs.snowflake.com/en/user-guide/cortex-code/cortex-code-cli)
- Databricks: [MCPs and agent tools](https://docs.databricks.com/agents/mcp-tools/), [Unity Gateway](https://docs.databricks.com/unity-gateway/), [ai_extract](https://docs.databricks.com/aws/en/sql/language-manual/functions/ai_extract), [ai_parse_document](https://docs.databricks.com/aws/en/sql/language-manual/functions/ai_parse_document)
- Summit recaps from the vendors: [Agent Bricks at DAIS 2026](https://www.databricks.com/blog/agent-bricks-dais-2026), [Unity Catalog at DAIS 2026](https://www.databricks.com/blog/whats-new-unity-catalog-data-ai-summit-2026), [Cortex Sense](https://www.snowflake.com/en/blog/enterprise-ai-agents-grounded-context/)

## Related articles

- [Databricks Agent Bricks Is Quietly Changing How Data Engineers Work](/posts/article_databricks_agent_bricks_data_engineering)
- [Your Data Stack Wasn't Built for This: Architecting for AI Agents](/posts/article_ai_agents_data_stack)
- [RAG Is Lying to You: The Data Pipeline Failures Hiding Behind Your LLM](/posts/article_rag_pipeline_failures)

---

*Agents, semantic layers and gateways are new, but the trade-offs underneath them are the old ones: where state lives, who can read it and what happens when definitions drift. [Fundamentals of Data Engineering](https://amzn.to/4sruUCi) covers the data lifecycle and governance thinking that makes these platforms work in practice.*

---

*Disclaimer: This article is based on Snowflake and Databricks public documentation, release notes, blog posts and press releases as of October 2026. The author has no affiliation with Snowflake or Databricks. Feature availability, preview status and benchmark figures are vendor-reported and change frequently; check the linked documentation for your region before relying on them. This article was researched and drafted with AI assistance and checked against the sources linked above. It contains affiliate links; purchasing through them supports this blog at no extra cost to you.*
