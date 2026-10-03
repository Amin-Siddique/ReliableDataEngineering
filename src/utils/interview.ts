import type { CollectionEntry } from "astro:content";
import { INTERVIEW_PATH } from "@/content.config";

export type InterviewEntry = CollectionEntry<"interview">;

export const INTERVIEW_BASE = "/interview-prep";
export const INTERVIEW_APP = `${INTERVIEW_BASE}/app/`;

export const LEARN_TRACKS = [
  {
    id: "learn/system-design",
    title: "System Design",
    desc: "Interview framework, estimation, building blocks, reliability, hot keys and design patterns.",
  },
  {
    id: "learn/architecture",
    title: "Data Architecture",
    desc: "Lakehouse, streaming, CDC, table formats, orchestration, quality, governance, AI, mesh and the big picture.",
  },
  {
    id: "learn/sql",
    title: "SQL",
    desc: "Window functions, advanced query patterns, performance and dialects.",
  },
  {
    id: "learn/python",
    title: "Python",
    desc: "The coding round, 16 algorithm patterns, and production Python: decorators, OOP, generators, testing.",
  },
  {
    id: "learn/data-modeling",
    title: "Data Modeling",
    desc: "Grain, dimensional modeling, SCD types, Data Vault and modern modeling.",
  },
  {
    id: "learn/spark-databricks",
    title: "Spark",
    desc: "Internals, memory and OOM debugging, joins and broadcast, caching, explain plans, shuffle, spill and skew, tuning.",
  },
  {
    id: "learn/cloud",
    title: "Cloud Platforms",
    desc: "Databricks in depth: compute and cost, Delta internals, Unity Catalog, pipelines, jobs, DevOps and security.",
  },
] as const;

export const PRACTICE_TRACKS = [
  {
    id: "practice/system-design",
    title: "System Design",
    desc: "Full designs with diagrams, trade-offs, failure modes, follow-ups and rubrics.",
  },
  {
    id: "practice/sql",
    title: "SQL",
    desc: "Problems verified in CI and auto-checked in your browser.",
  },
  {
    id: "practice/python",
    title: "Python",
    desc: "Data engineering coding problems with tests, a step debugger and per-test feedback.",
  },
  {
    id: "practice/algorithms",
    title: "Algorithms",
    desc: "Classic DSA problems grouped by pattern: sliding window, two pointers, heaps, monotonic stacks, DP and more.",
  },
  {
    id: "practice/data-modeling",
    title: "Data Modeling",
    desc: "Case studies with ER diagrams and rubrics.",
  },
  {
    id: "practice/spark",
    title: "Spark and Databricks",
    desc: "Query plans, executor sizing, skew, UDFs, partitioning, DPP and an end-to-end Databricks design.",
  },
] as const;

/** Path of the source file inside the data-eng-problems repository. */
export function repoPath(entry: InterviewEntry): string {
  return (entry.filePath ?? "").replace(new RegExp(`^${INTERVIEW_PATH}/`), "");
}

export function entryUrl(entry: InterviewEntry): string {
  return `${INTERVIEW_BASE}/${entry.id}/`;
}

/** Deep link into the interactive app for this page. */
export function appUrl(entry: InterviewEntry): string {
  const path = repoPath(entry);
  if (entry.data.type === "qa")
    return `${INTERVIEW_APP}#/cards/study?decks=${encodeURIComponent(path)}`;
  return `${INTERVIEW_APP}#/p/${path}`;
}

/** The index page (README) of the folder that contains this entry, if any. */
export function parentIndexId(entry: InterviewEntry): string {
  return entry.id.split("/").slice(0, -1).join("/");
}

export function byOrder(a: InterviewEntry, b: InterviewEntry): number {
  return (
    (a.data.order ?? 999) - (b.data.order ?? 999) || a.id.localeCompare(b.id)
  );
}

/** Pages in the same folder and of the same type, sorted for prev/next navigation. */
export function siblings(
  entry: InterviewEntry,
  all: InterviewEntry[],
): InterviewEntry[] {
  const folder = entry.id.split("/").slice(0, -1).join("/");
  return all
    .filter(
      (e) =>
        e.data.type === entry.data.type &&
        e.id.split("/").slice(0, -1).join("/") === folder,
    )
    .sort(byOrder);
}
