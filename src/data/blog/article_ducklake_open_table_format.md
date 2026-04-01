---
title: "Iceberg Built a Maze. DuckLake Just Handed You a Map."
description: "DuckDB's new open table format ditches files-on-files metadata and replaces it with a SQL database. One query resolves everything."
pubDatetime: 2026-04-01
tags:
  - ducklake
  - iceberg
  - delta-lake
  - lakehouse
  - duckdb
ogImage: "/images/blog/ducklake.png"
---

# Iceberg Built a Maze. DuckLake Just Handed You a Map.

*The DuckDB team's new open table format ditches the files-on-files-on-files metadata architecture that's been quietly killing lakehouse performance since 2018 — and replaces it with something embarrassingly obvious in hindsight: a SQL database.*

---

*Data Engineering | Open Table Formats | DuckLake | Iceberg | Delta Lake | April 2026*
*~11 min read*

---

## The quiet tax data engineers have been paying

There's a particular kind of engineering frustration that's unique to the modern data stack. You've set up your lakehouse perfectly — Iceberg tables on S3, a Glue catalog, Spark for the heavy lifting. Then you run a simple point lookup. You watch. The logs show eight separate HTTP calls just to figure out which Parquet files to read. You've done nothing wrong. The architecture just requires it.

This is the quiet tax data engineers have been paying for years. And the DuckDB team — the same people who put an OLAP engine inside a Python process and made Spark fans genuinely nervous — just published a formal complaint about it. They called it a manifesto. Then they shipped an alternative.

That alternative is [DuckLake](https://ducklake.select/) — an open table format that stores all lakehouse metadata in a SQL database instead of a labyrinth of JSON, Avro, and Parquet files on blob storage. It sounds almost insultingly simple. That's the point.

| Metric | Value |
| ------ | ----- |
| SQL queries to resolve full table metadata | 1 |
| License | MIT (spec and DuckDB extension) |
| Snapshots supported without compaction | 1M+ |

---

## How Iceberg got here — and why the architecture feels off

Before dismissing the current orthodoxy, it's worth understanding why Iceberg and Delta Lake were built the way they were. The core bet of the data lake era was noble: decouple storage from compute, use open formats, avoid vendor lock-in. Store raw Parquet on S3. Query it with whatever engine you want. The freedom was real.

The problem is that Parquet files on blob storage have no concept of transactions, schema evolution, or time travel. They're immutable. You can't update a row. You can't atomically swap a file reference. You can't even reliably know which files constitute the "current" state of a table without something tracking it.

Iceberg's answer was metadata files — a hierarchy of JSON and Avro tracking snapshots, manifest lists, manifest files, and data file paths. Delta Lake used transaction logs. Both approaches work. And both carry a fundamental cost: resolving the current state of a table requires chasing a chain of files across blob storage. Each file is a network round trip. Each network round trip is latency you can't eliminate, just hide behind caching.

**Storage round trips to resolve a simple query:**

| Format | Round Trips |
| ------ | ----------- |
| Iceberg | 6-10+ (catalog -> version -> manifest list -> manifests -> data files) |
| Delta Lake | 4-7 (transaction log -> checkpoint -> data files) |
| DuckLake | 1 (single SQL query) |

Then came catalogs — services layered on top of Iceberg and Delta Lake to give engines a stable starting point. The catalog pointed to a database that tracked the current version number for each table. Which meant the stack now included: a blob store, a table format, *and* a catalog service backed by a database. The database was already there. Nobody revisited whether it should be doing more.

> Both Iceberg and Delta Lake were designed explicitly to *avoid* requiring a database. Their designers built elaborate file-based structures to achieve this. Then they added a catalog backed by a database anyway — and never reconsidered whether the elaborate file structures were still necessary.

---

## DuckLake's actual design

The DuckLake manifesto — authored by DuckDB co-creators Mark Raasveldt and Hannes Mühleisen — is direct: if a database is already in the lakehouse stack for catalog purposes, use it for *all* the metadata. Don't half-commit. The data can stay on blob storage as Parquet. The metadata — snapshots, schemas, statistics, file paths, column stats — moves into SQL tables with proper ACID guarantees.

The architecture resolves into two components:

**Catalog Database (SQL metadata store):** Snapshots, schemas, file paths, column statistics, transaction log, everything else. PostgreSQL, MySQL, SQLite, or DuckDB itself. Any ACID-compliant database works.

**Blob Storage (Parquet data files):** Immutable. Named with UUIDs. Local disk, S3, GCS, Azure Blob — any storage target. Fully compatible with Apache Iceberg data file format for metadata-only migrations.

When a query runs against a DuckLake table, the engine fires a single SQL query at the catalog database. That query returns the current snapshot, the relevant Parquet file paths (already filtered by partition and column statistics), and schema information. One round trip. Then it reads the files. No manifest lists. No chasing chains of Avro. No retry logic for S3 consistency windows.

The manifesto frames this as a return to first principles: storage systems are good at storing files at scale; databases are good at managing metadata with transactional guarantees. Stop fighting the second constraint with the first tool.

### What the catalog database actually contains

It helps to look at what a single write operation sends to the metadata store. Here's what DuckLake executes when you run a simple `INSERT INTO demo VALUES (42), (43)`:

```sql
BEGIN TRANSACTION;

  -- Register the new Parquet file
  INSERT INTO ducklake_data_file
  VALUES (0, 1, 2, NULL, NULL,
    'data_files/ducklake-8196...13a.parquet',
    'parquet', 2, 279, 164, 0, NULL, NULL);

  -- Update global table row count + size stats
  INSERT INTO ducklake_table_stats
  VALUES (1, 2, 2, 279);

  -- Update column-level min/max
  INSERT INTO ducklake_table_column_stats
  VALUES (1, 1, false, NULL, '42', '43');

  -- File-level column statistics for pruning
  INSERT INTO ducklake_file_column_statistics
  VALUES (0, 1, 1, NULL, 2, 0, 56, '42', '43', NULL);

  -- Create snapshot #2
  INSERT INTO ducklake_snapshot
  VALUES (2, now(), 1, 2, 1);

  -- Log the change for incremental scans
  INSERT INTO ducklake_snapshot_changes
  VALUES (2, 'inserted_into_table:1');

COMMIT;
```

The key thing to notice: this transaction is identical in cost whether you're inserting 2 rows or 200 million rows. The Parquet write happens before the transaction. The metadata write is always a fixed set of SQL inserts. Compare this to Iceberg, where every snapshot produces a new root metadata file containing the *entire history* of all previous snapshots — a file that grows indefinitely until you run compaction.

---

## Getting your hands on it

DuckLake ships as a DuckDB extension, which means the setup surface is genuinely small. You need two things: a SQL database for the catalog (Postgres via Supabase's free tier works out of the box) and a storage location for Parquet files (S3, GCS, local disk, or anything DuckDB can write to).

```sql
-- Install extensions
INSTALL ducklake;
INSTALL postgres;

-- Wire up S3 credentials
CREATE OR REPLACE SECRET s3_creds (
    TYPE s3,
    PROVIDER credential_chain   -- picks up AWS env / SSO / instance role
);

-- Wire up Postgres catalog
CREATE SECRET pg_catalog (
    TYPE postgres,
    HOST 'your-supabase-host',
    PORT 6543,
    DATABASE postgres,
    USER 'postgres',
    PASSWORD 'your-password'
);

-- Attach DuckLake — this is your lakehouse handle
ATTACH 'ducklake:postgres:dbname=postgres'
    AS my_lake
    (DATA_PATH 's3://my-bucket/ducklake/');

USE my_lake;
```

From here, standard SQL takes over. Creating a table, ingesting data, inspecting snapshots, querying history — all look like DuckDB SQL you already know:

```sql
-- Create table from S3 CSV (writes Parquet to your bucket)
CREATE TABLE air_quality AS
SELECT * FROM 's3://public-datasets/who_air_quality_2024.csv';

-- Inspect what happened
FROM my_lake.snapshots();

-- Schema evolution — add a column, update some rows
ALTER TABLE air_quality ADD COLUMN iso2 VARCHAR;
UPDATE air_quality SET iso2 = 'DE' WHERE iso3 = 'DEU';

-- Time travel — query state at a specific snapshot version
SELECT * FROM air_quality
AT (VERSION => 1)
LIMIT 5;

-- Cross-table ACID transaction (multi-table, no saga pattern needed)
BEGIN;
  INSERT INTO table_a VALUES (...);
  UPDATE table_b SET status = 'processed' WHERE id = 99;
COMMIT;  -- atomic across both tables
```

> For development and prototyping you don't need Postgres or S3. A single `ATTACH 'ducklake:metadata.ducklake' AS dev_lake` uses a local DuckDB file as the catalog. Same API, same time travel, no infrastructure. Migrate to Postgres when you're ready for multi-writer concurrency.

---

## Where DuckLake genuinely changes the game

The round-trip reduction story is compelling on its own. But there are three less-discussed properties that matter more over time for production data engineering.

### Snapshots without the compaction tax

In Iceberg, snapshots accumulate metadata. The root metadata file grows because it contains the full history. You run EXPIRE_SNAPSHOTS periodically, which itself is a potentially expensive operation with its own set of file reads and writes. This maintenance burden is real enough that entire vendor products exist specifically to manage it.

DuckLake snapshots are rows in a SQL table. Adding a snapshot is an insert. Expiring one is a delete. There's no manifest list to rewrite, no new root file to generate. The DuckLake manifesto explicitly states the format supports millions of snapshots without proactive pruning — because the catalog database handles the lookup efficiently regardless of snapshot count. Snapshots can even refer to portions of a Parquet file, meaning you get fine-grained history without an explosion of file count.

### Small writes are no longer expensive

One of the genuine weaknesses of Iceberg for streaming or CDC workloads is that every small append produces new metadata files. A thousand small transactions per minute = a thousand new manifest files per minute. The small-files problem is real, widely documented, and the source of ongoing compaction anxiety in every Iceberg deployment at scale.

DuckLake addresses this at the design level, not with band-aids. For writes below a configurable threshold, it can inline data directly into the catalog database — bypassing the write-to-Parquet step entirely. The metadata store itself becomes the data store for small changes. When enough inlined changes accumulate, they flush to Parquet. It's essentially automatic micro-batching with zero extra infrastructure.

> "Entire companies exist and are still being started to solve this problem of managing fast-changing data. Almost as if a specialized data management system of sorts would be a good idea." — DuckLake Manifesto

### Encryption as a first-class feature

This one tends to get buried in the feature list but deserves attention: DuckLake supports optional encryption of all data files at the format level, with keys managed by the catalog database. This enables zero-trust data hosting — where the blob storage provider has no readable view of your data. Iceberg treats encryption as a layer you add on top. DuckLake specifies it in the format itself.

---

## DuckLake vs. Iceberg vs. Delta Lake — practically speaking

| Property | Apache Iceberg | Delta Lake | DuckLake |
| -------- | -------------- | ---------- | -------- |
| Metadata storage | JSON + Avro files on blob storage | Transaction log files on blob storage | SQL database (Postgres/MySQL/SQLite/DuckDB) |
| Metadata round trips | 6-10+ HTTP calls per query | 4-7 HTTP calls per query | 1 SQL query |
| Multi-table ACID | No (single-table only) | No (single-table only) | Yes — cross-table transactions |
| Small write handling | Produces many small files; needs compaction | Produces transaction log entries; needs OPTIMIZE | Optional inlining into catalog DB |
| Snapshot cost | Grows per snapshot; needs EXPIRE_SNAPSHOTS | Log entries accumulate; needs VACUUM | Rows in SQL table; cheap deletes |
| External catalog needed | Yes (Glue, Unity, Nessie, etc.) | Yes (Unity Catalog for cross-engine) | No — catalog is the SQL DB itself |
| Engine support | Spark, Flink, Trino, DuckDB, many more | Spark, Flink, Trino, some others | DuckDB today; spec is open for others |
| Data file compatibility | Parquet (standard) | Parquet (standard) | Parquet, Iceberg-compatible deletion files |
| Encryption | External / engine-level | External / engine-level | Native, key-managed by catalog |
| License | Apache 2.0 | Apache 2.0 (Linux Foundation) | MIT |
| Maturity | Production-grade, wide adoption | Production-grade within Databricks ecosystem | v0.1, early release |

---

## The real constraints — be honest with yourself

The DuckLake architecture is elegant enough that it's easy to get swept up in it. A few things to keep grounded on before migrating anything important.

**Engine support is DuckDB-only today.** Iceberg's killer feature for many teams is that Spark, Trino, Flink, and a dozen other engines can all read the same tables. DuckLake's spec is open and the data files are Parquet, but the ecosystem hasn't formed yet. If your pipeline is Spark-heavy, you're not switching next quarter.

**The catalog database is now critical infrastructure.** With Iceberg, the table data and metadata both live on blob storage — which is extremely durable and available. With DuckLake, your Postgres instance (or whichever SQL database you choose) becomes a dependency for every read and write. You need to treat it with the same operational seriousness as a production database, because it is one. Backup, failover, connection pooling — all of this becomes your problem if you're self-hosting.

**v0.1 is v0.1.** The format was released recently. There are no production war stories yet. The DuckDB team has an extremely strong track record — DuckDB itself went from research project to serious production tool faster than almost anything in the data ecosystem — but the honesty is that this hasn't been stress-tested at enterprise scale across diverse workloads. Start with non-critical workloads and build confidence.

> DuckLake data and deletion files are explicitly compatible with Apache Iceberg's format. The manifesto notes this enables "metadata-only migrations" — meaning you can potentially adopt DuckLake for new tables while existing Iceberg tables stay as-is, with a migration path that doesn't require rewriting all your Parquet data.

---

## Who should actually pay attention to this

DuckLake isn't for every team today. But it's immediately relevant for a few specific profiles:

1. **Teams where DuckDB is already a first-class tool.** If you're using DuckDB for analytics, local development, or as a query layer over Parquet, DuckLake is a natural extension. You're already in the ecosystem.
2. **Teams that hate compaction jobs.** If your Iceberg EXPIRE_SNAPSHOTS and Delta Lake VACUUM jobs have caused incidents, or if you're managing small-files problems at scale, DuckLake's architectural approach to this is genuinely different — not just a configuration knob.
3. **Teams building greenfield lakehouses.** For a new project where you're not already tied to the Spark/Iceberg stack, evaluating DuckLake as a primary format is legitimate. The operational simplicity — no catalog service to run, no compaction scheduler to babysit — is a real advantage for smaller teams.
4. **Platform engineers thinking about what 2027 looks like.** Even if you don't adopt DuckLake this year, the design principles it's surfacing — SQL databases for metadata, unified catalog-and-format, multi-table transactions — are going to reshape how the broader ecosystem thinks about lakehouse architecture. Following this closely is worth the time.

The data engineering world has a habit of adding layers. The catalog was a layer added to fix Iceberg's consistency problem. Compaction is a layer added to fix the small-files problem. External encryption is a layer added to fix the security gap. DuckLake's argument is that most of these layers could have been avoided if the metadata had been in a database from the start.

It's a hard argument to refute. Whether the ecosystem rallies around it the way it rallied around Iceberg is a different question — one that depends less on technical merit than on timing, community momentum, and whether the next major compute engine decides to implement the spec. Watch the [GitHub discussions](https://github.com/duckdb/ducklake) closely.

---

## Try it

```bash
# In DuckDB CLI
INSTALL ducklake;
ATTACH 'ducklake:my_lakehouse.ducklake' AS lake;
USE lake;
CREATE TABLE demo AS SELECT 42 AS x;
FROM lake.snapshots();
```

- [DuckLake Home](https://ducklake.select/)
- [The Manifesto](https://ducklake.select/manifesto)
- [GitHub Repo](https://github.com/duckdb/ducklake)
- [Documentation](https://ducklake.select/docs/stable/)
- [MotherDuck Tutorial](https://motherduck.com/blog/getting-started-ducklake-table-format/)

---

If you want to understand the deeper architectural patterns behind lakehouse designs, data storage trade-offs, and why certain approaches win at scale, this is the foundational text:

[Designing Data-Intensive Applications by Martin Kleppmann](https://amzn.to/4lPlcr4) — the definitive guide to the storage, retrieval, and processing patterns that underpin modern data infrastructure.

---

*Disclaimer: This is an independent editorial analysis based on the publicly available DuckLake Manifesto, MotherDuck's getting started guide, and the DuckLake GitHub repository. All technical claims are sourced from these materials. DuckLake is in early release (v0.1) — treat production suitability assessments as preliminary. The author has no affiliation with DuckDB Labs or MotherDuck. This article contains affiliate links — purchasing through them supports this blog at no extra cost to you.*
