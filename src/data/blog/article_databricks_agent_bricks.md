---
title: "Databricks Agent Bricks Is Quietly Changing How Data Engineers Work"
description: "Describe the task. Connect your data. Let the platform handle the rest. That's the promise of Agent Bricks — and for a specific, important set of data engineering problems, it's actually delivering."
pubDatetime: 2026-03-22
tags:
  - databricks
  - ai-agents
  - data-engineering
  - etl
ogImage: "/images/blog/dbx.png"
---

# Databricks Agent Bricks Is Quietly Changing How Data Engineers Work

*Describe the task. Connect your data. Let the platform handle the rest. That's the promise of Agent Bricks — and for a specific, important set of data engineering problems, it's actually delivering.*

---

*Data Engineering | AI Agents | Databricks | March 2026*
*~16 min read*

---

## The Tuesday afternoon problem

There's a specific type of pain that every data engineer knows intimately. It arrives on a Tuesday afternoon, usually when something unstructured shows up where structured data was expected — a batch of PDFs instead of a CSV, a folder of scanned invoices instead of a database export, an email thread instead of an API response. Processing it means either writing brittle custom parsers, spinning up a separate NLP service, or doing it manually. None of these options are good.

Databricks Agent Bricks, announced at Data + AI Summit 2025 and currently in beta, is the most direct answer the platform has given to that problem. It sits inside the Mosaic AI stack — the same stack that houses Vector Search, Model Serving, and the Agent Framework — and it changes the data engineering workflow in a way that is both practical and genuinely new.

This article explains what Agent Bricks is under the hood, where it fits in the broader Databricks ecosystem, and — most importantly — walks through the real-world data engineering use cases where it provides the most concrete value. Every section includes working code examples that can be adapted directly into a Databricks notebook.

---

## What Agent Bricks actually is

The clearest description came from Databricks CEO Ali Ghodsi at the Summit announcement: Agent Bricks is "a new way of building and deploying AI agents that can reason on your data." Peel that back a layer and the mechanics become more concrete.

An Agent Brick is a pre-built, production-optimized AI agent for a specific task category. The data engineer describes what the agent needs to do in natural language, connects enterprise data sources, and Agent Bricks handles the pipeline scaffolding: synthetic training data generation, task-based evaluation benchmarks, model selection, quality optimization, and deployment — all within the Unity Catalog governance boundary.

There are four core pre-built agent types at launch:

| Agent Type | Purpose |
| ---------- | ------- |
| Information Extraction | Pulls structured fields from unstructured sources (PDFs, emails, images, contracts) |
| Knowledge Assistance | Reliable question answering grounded in enterprise data with citation |
| Text Transformation | Classification, translation, summarization, normalization at pipeline scale |
| Multi-Agent Orchestration | Composing the above into end-to-end agentic workflows |

The key architectural decision is where Agent Bricks sits: inside Lakeflow, Databricks' unified data engineering platform. This means agent logic is not a separate microservice or an external API call bolted onto a pipeline. It is a first-class step inside the same pipeline runtime — governed by Unity Catalog, observable through MLflow 3.0, and executable within the same Lakeflow Jobs orchestration layer that already handles ETL.

---

## The two AI functions that change everything in ETL

Before getting to the full use case walkthroughs, two Databricks AI functions deserve specific attention — because they are available today, run inside Delta Live Tables or Spark pipelines, and solve problems that previously required a separate ML service.

`ai_query()` calls a foundation model directly inside a SQL expression or PySpark transformation. `ai_parse_document()` extracts structured data from unstructured file content — PDFs, images, scanned documents — as part of a standard pipeline step.

These two functions are what Databricks means when it says AI is "embedded in the ETL workflow." There is no API boundary to manage, no token budget to track separately, no separate service to authenticate to. The AI step is just another column transformation.

### ai_query() — classify and extract inside a SQL pipeline step

```sql
-- Classify support ticket severity using a foundation model
-- inside a Delta Live Tables pipeline - no Python required
CREATE OR REFRESH STREAMING TABLE silver_support_tickets
AS SELECT
  ticket_id,
  created_at,
  customer_id,
  raw_text,
  -- ai_query() runs a foundation model as a column transformation
  ai_query(
    'databricks-meta-llama-3-3-70b-instruct',
    CONCAT(
      'Classify this support ticket into one of: ',
      '[BILLING, TECHNICAL, ACCOUNT, OTHER]. ',
      'Return only the category label, nothing else. ',
      'Ticket: ', raw_text
    )
  ) AS category,
  ai_query(
    'databricks-meta-llama-3-3-70b-instruct',
    CONCAT(
      'Rate the urgency of this support ticket as: ',
      '[LOW, MEDIUM, HIGH, CRITICAL]. ',
      'Return only the urgency label. ',
      'Ticket: ', raw_text
    )
  ) AS urgency_level
FROM STREAM(bronze_raw_tickets);
```

### ai_parse_document() — extract structured fields from PDFs in a pipeline

```sql
-- Extract structured fields from uploaded PDF invoices
-- ai_parse_document() handles the OCR + extraction in one step
CREATE OR REFRESH STREAMING TABLE silver_invoices
AS SELECT
  file_path,
  file_modification_time,
  -- ai_parse_document() takes binary file content + extraction schema
  ai_parse_document(
    content,  -- binary PDF content loaded by Auto Loader
    'Extract the following fields as JSON:
     {
       "vendor_name": "string",
       "invoice_number": "string",
       "invoice_date": "date in YYYY-MM-DD format",
       "total_amount": "numeric",
       "line_items": [{"description": "string", "amount": "numeric"}],
       "payment_terms": "string"
     }
     Return only valid JSON, no explanation.'
  ) AS extracted_fields
FROM STREAM(bronze_invoice_files);
```

**Cost management note:** Both `ai_query()` and `ai_parse_document()` consume foundation model tokens on every row processed. Always filter to the rows that actually need AI processing before calling these functions — do not run them against entire tables. Use `WHERE raw_text IS NOT NULL` and batch size limits in streaming pipelines to keep token costs predictable.

---

## The architecture: how it all fits together

Before the use cases, it helps to see how Agent Bricks sits inside the broader Databricks platform:

```
┌─────────────────────────────────────────────────────────────┐
│                     Unity Catalog                           │
│  (Governance, Lineage, Permissions, Data Discovery)         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Lakeflow   │  │  Mosaic AI  │  │  Agent Bricks       │ │
│  │  (ETL/ELT)  │  │  (Models)   │  │  (AI Agents)        │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│         └────────────────┼─────────────────────┘            │
│                          │                                  │
│                   ┌──────┴──────┐                          │
│                   │  MLflow 3.0 │                          │
│                   │  (Tracing)  │                          │
│                   └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

Unity Catalog is the thread that runs through every layer. It means the agent knows what data it can access before it tries to access it. Data lineage flows automatically — from the raw source file through every transformation to the final output table — without any additional instrumentation. MLflow 3.0 tracks every agent invocation, prompt version, and evaluation score. This is governance built into the architecture, not added on top of it.

---

## Five real data engineering use cases

The following use cases are not hypothetical. Each one maps to a documented pattern from Databricks' own engineering blog, customer case studies, or partner accelerator implementations.

### 1. Claims processing pipeline

Auto Loader → ai_parse_document → Delta table

```python
import dlt
from pyspark.sql.functions import col, from_json
from pyspark.sql.types import StructType, StructField, StringType, DoubleType

# Step 1: Ingest raw claim files with Auto Loader
@dlt.table(
    name="bronze_claims_raw",
    comment="Raw claim documents ingested from cloud storage"
)
def bronze_claims_raw():
    return (
        spark.readStream
        .format("cloudFiles")
        .option("cloudFiles.format", "binaryFile")  # handle PDFs + images
        .option("cloudFiles.includeExistingFiles", "true")
        .load("abfss://claims-inbox@storage.dfs.core.windows.net/incoming/")
    )

# Step 2: Extract structured fields with ai_parse_document
@dlt.table(
    name="silver_claims_extracted",
    comment="Structured claim data extracted from raw documents"
)
@dlt.expect_or_drop("valid_claim_number", "claim_number IS NOT NULL")
@dlt.expect("valid_amount",  "claimed_amount > 0")
def silver_claims_extracted():
    return spark.sql("""
        SELECT
            path                         AS file_path,
            modificationTime             AS received_at,
            ai_parse_document(
                content,
                'Extract these fields as JSON. Return only JSON, no explanation:
                {
                  "claimant_name":    "full name string",
                  "policy_number":    "string",
                  "claim_number":     "string",
                  "date_of_loss":     "YYYY-MM-DD",
                  "claimed_amount":   "numeric, no currency symbol",
                  "claim_type":       "one of: AUTO, PROPERTY, LIABILITY, MEDICAL",
                  "description":      "brief damage description"
                }'
            )                            AS extracted_json
        FROM STREAM(LIVE.bronze_claims_raw)
        WHERE length(content) > 0
    """)
```

### 2. Review intelligence pipeline

Multilingual sentiment + topic extraction in a single AI call:

```python
@dlt.table(
    name="gold_review_intelligence",
    comment="Structured intelligence extracted from raw product reviews"
)
def gold_review_intelligence():
    return spark.sql("""
        WITH ai_enriched AS (
            SELECT
                review_id,
                product_id,
                review_date,
                star_rating,
                raw_review_text,
                -- Single ai_query call returns all fields as JSON
                -- (one call is cheaper than five separate calls)
                ai_query(
                    'databricks-meta-llama-3-3-70b-instruct',
                    CONCAT(
                        'Analyze this product review. ',
                        'Return ONLY a valid JSON object with these fields: ',
                        '{"language": "ISO 639-1 code", ',
                        '"sentiment": "POSITIVE | NEUTRAL | NEGATIVE", ',
                        '"sentiment_score": "float -1.0 to 1.0", ',
                        '"topics_mentioned": ["array", "of", "topics"], ',
                        '"actionable": true or false} ',
                        'Review: ', raw_review_text
                    )
                ) AS ai_json
            FROM LIVE.silver_reviews
            WHERE ai_enriched_at IS NULL
              AND length(raw_review_text) > 10
        )
        SELECT
            review_id,
            product_id,
            review_date,
            star_rating,
            raw_review_text,
            get_json_object(ai_json, '$.language')   AS language,
            get_json_object(ai_json, '$.sentiment')  AS sentiment,
            CAST(get_json_object(ai_json, '$.sentiment_score') AS FLOAT)
                                                     AS sentiment_score,
            CAST(get_json_object(ai_json, '$.actionable') AS BOOLEAN)
                                                     AS actionable,
            current_timestamp()                      AS ai_enriched_at
        FROM ai_enriched
        WHERE ai_json IS NOT NULL
    """)
```

### 3. Data quality agent

Classify violations, generate root cause, route alerts:

```python
from databricks.sdk import WorkspaceClient
import json

w = WorkspaceClient()

# Define the data quality monitoring agent
agent_config = {
    "name": "data_quality_monitor",
    "task_description": """
        You are a data quality agent for a financial data pipeline.
        When given a quality violation report, you must:
        1. Classify the violation type (schema_drift, null_explosion,
           volume_anomaly, value_range_violation, referential_integrity)
        2. Rate severity: LOW, MEDIUM, HIGH, CRITICAL
        3. Generate a root cause hypothesis in plain English
        4. Recommend an immediate remediation action
        5. Identify which downstream tables are at risk
        Always respond as structured JSON.
    """,
    "data_sources": [
        "catalog.main.pipeline_quality_metrics",
        "catalog.main.schema_history",
        "catalog.main.data_lineage"
    ]
}

# Trigger evaluation on a quality violation event
def handle_quality_violation(violation_report: dict) -> dict:
    response = w.agent_bricks.invoke(
        agent_id=agent.agent_id,
        input_data={
            "violation_report": json.dumps(violation_report),
            "pipeline_name": violation_report.get("pipeline_name"),
            "table_name": violation_report.get("table_name")
        }
    )
    result = json.loads(response.output)

    # Route based on severity
    if result["severity"] in ["HIGH", "CRITICAL"]:
        send_alert(
            channel="#data-oncall",
            message=f"[{result['severity']}] {result['root_cause']}",
            remediation=result["remediation"]
        )

    return result
```

### 4. Legacy SQL analysis agent

Extract business rules, generate DLT equivalent:

```python
def analyse_legacy_sql(legacy_sql: str, source_platform: str = "Oracle") -> dict:
    """
    Use ai_query to analyse legacy SQL:
    1. Extract business logic and transformation rules
    2. Identify anti-patterns specific to the source platform
    3. Generate Delta Live Tables equivalent
    4. Flag areas requiring human review
    """
    analysis_prompt = f"""
    You are a data migration expert specialising in {source_platform} to Databricks.
    Analyse this SQL and return ONLY a valid JSON object:
    {{
        "transformation_type": "ETL type: AGGREGATION|JOIN|FILTER|WINDOW|UPSERT|OTHER",
        "business_logic_summary": "plain English description",
        "source_tables": ["list of source tables"],
        "platform_specific_functions": ["list of {source_platform}-specific functions"],
        "complexity": "LOW|MEDIUM|HIGH",
        "databricks_dlt_equivalent": "complete Delta Live Tables Python code",
        "migration_warnings": ["things that need human review"]
    }}
    Legacy SQL:
    {legacy_sql}
    """

    result = spark.sql(f"""
        SELECT ai_query(
            'databricks-meta-llama-3-3-70b-instruct',
            '{analysis_prompt.replace("'", "''")}'
        ) AS analysis
    """).collect()[0]["analysis"]

    return json.loads(result)
```

### 5. Multi-agent orchestration

Router + specialist agents + MLflow tracing:

```python
import mlflow
mlflow.set_experiment("/agents/financial-filing-pipeline")

def route_document(document_text: str, file_name: str) -> str:
    """Classify incoming document and return agent type to dispatch to."""
    result = spark.sql(f"""
        SELECT ai_query(
            'databricks-meta-llama-3-3-70b-instruct',
            'Classify this financial document type. Return ONLY ONE of:
             EARNINGS_CALL | ANNUAL_REPORT | REGULATORY_FILING | UNKNOWN
             File name: {file_name}
             First 500 chars: {document_text[:500]}'
        ) AS doc_type
    """).collect()[0]["doc_type"].strip()
    return result

def process_financial_document(file_path: str, document_text: str):
    with mlflow.start_run(run_name=f"filing_{file_path.split('/')[-1]}"):
        mlflow.log_param("file_path", file_path)
        mlflow.log_param("doc_length_chars", len(document_text))

        # Step 1: Route the document
        doc_type = route_document(document_text, file_path)
        mlflow.log_param("doc_type", doc_type)

        # Step 2: Dispatch to specialist agent
        if doc_type == "EARNINGS_CALL":
            extracted = extract_earnings_call(document_text)
            target_table = "catalog.finance.gold_earnings_calls"
        else:
            mlflow.log_param("status", "UNHANDLED_TYPE")
            return

        # Step 3: Write to Unity Catalog governed table
        if extracted:
            mlflow.log_metric("extraction_fields_populated",
                sum(1 for v in extracted.values() if v is not None))
            mlflow.log_param("status", "SUCCESS")
            spark.createDataFrame([extracted]).write \
                .mode("append") \
                .saveAsTable(target_table)

        return extracted
```

---

## When to use Agent Bricks — and when not to

| Use Case | Agent Bricks? | Why |
| -------- | ------------- | --- |
| PDF invoice extraction | Yes | Unstructured → structured is the sweet spot |
| Support ticket classification | Yes | Text transformation at scale |
| Real-time fraud detection | No | Latency requirements too tight |
| Simple ETL (CSV → Delta) | No | Overkill, just use Spark |
| Complex reasoning chains | Maybe | Test thoroughly, monitor closely |

---

## Observability: MLflow 3.0 is the missing piece

One of the most underappreciated parts of the Agent Bricks stack is MLflow 3.0, which was redesigned from the ground up for agentic workloads. Every agent invocation generates a trace: input data, retrieved context, intermediate reasoning steps, tool calls made, output produced, latency at each step, and token consumption. These traces are stored in Unity Catalog and queryable like any other dataset.

**Production monitoring pattern:** Set up a daily notebook job that queries `system.mlflow.traces` for agent runs where `latency_ms > 5000`, `token_count > 2000`, or `output_confidence < 0.7`. These three metrics catch the most common production issues before they affect downstream consumers.

---

## The bottom line

Agent Bricks does not replace the data engineer. It removes the category of work that data engineers find least valuable — writing brittle custom parsers for unstructured data, building one-off NLP integrations that break on schema changes, doing manual document extraction that should have been automated three years ago.

What remains is more interesting: designing the pipeline architecture, defining the quality expectations, building the evaluation benchmarks, monitoring the agent behaviour in production, and deciding where human judgment is genuinely required.

The teams that are getting the most out of Agent Bricks in 2026 are the ones that started with a specific, bounded problem — one unstructured data type, one transformation rule, one extraction task — ran it through evaluation, measured it against production data, and expanded from there. The technology is genuinely capable. The implementation discipline is what determines whether that capability translates into a reliable production system or an impressive demo.

---

*Disclaimer: This article is based on publicly available Databricks documentation, Data + AI Summit 2025 announcements, and partner implementation guides as of March 2026. The author has no affiliation with Databricks. Code examples are illustrative and may require adaptation for specific environments. Agent Bricks is currently in beta; features and APIs may change. Token costs for ai_query() and ai_parse_document() depend on model selection and input size. Always test AI-assisted pipelines thoroughly before production deployment. MLflow 3.0 features described are based on announced capabilities.*
