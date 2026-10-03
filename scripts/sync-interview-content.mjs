#!/usr/bin/env node
/* eslint-disable no-console -- CLI build script: logging is its output */
/**
 * Pulls the validated Data Engineering Interview Prep content into this site.
 *
 * Source of truth: https://github.com/Amin-Siddique/data-eng-problems
 * Its CI validates every change (SQL + Python solutions executed, links, Mermaid diagrams)
 * and, only when green, publishes `content-bundle.tar.gz` to the rolling `content-latest`
 * release. This script downloads that bundle on every build (npm `prebuild`/`predev`).
 *
 * Output (both gitignored, regenerated on every build):
 *   src/data/interview/        markdown for the `interview` content collection
 *   public/interview-prep/app  the interactive app (SQL/Python runners, flashcards)
 *   public/interview-prep/assets  diagrams referenced by pages and the app
 *
 * Env overrides:
 *   INTERVIEW_CONTENT_DIR=../data-eng-problems   use a local checkout instead of downloading
 *   INTERVIEW_CONTENT_URL=https://...tar.gz      download from a different URL
 *   INTERVIEW_CONTENT_OPTIONAL=1                 don't fail the build if the bundle is unavailable
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";

const ROOT = process.cwd();
const OUT_MD = join(ROOT, "src/data/interview");
const OUT_PUBLIC = join(ROOT, "public/interview-prep");
const REPO = "https://github.com/Amin-Siddique/data-eng-problems";
const BUNDLE_URL =
  process.env.INTERVIEW_CONTENT_URL ||
  `${REPO}/releases/download/content-latest/content-bundle.tar.gz`;
const CONTENT_DIRS = ["learn", "practice", "interview-qa"];
const ROUTE = "/interview-prep";

const log = (...a) => console.log("[interview-content]", ...a);

/** Same id rule as the `interview` collection's generateId in src/content.config.ts. */
export function toId(repoPath) {
  return repoPath
    .replace(/\.md$/, "")
    .replace(/\/README$/, "")
    .toLowerCase();
}

async function download(url, dest, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return;
    } catch (e) {
      log(`download attempt ${i}/${attempts} failed: ${e.message}`);
      if (i === attempts) throw e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** (i - 1)));
    }
  }
}

async function obtainSource() {
  if (process.env.INTERVIEW_CONTENT_DIR) {
    const dir = join(ROOT, process.env.INTERVIEW_CONTENT_DIR);
    log(`using local checkout ${dir}`);
    return dir;
  }
  const tmp = mkdtempSync(join(tmpdir(), "interview-"));
  const tarball = join(tmp, "bundle.tar.gz");
  log(`downloading ${BUNDLE_URL}`);
  await download(BUNDLE_URL, tarball);
  execFileSync("tar", ["-xzf", tarball, "-C", tmp]);
  return tmp;
}

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Rewrite repo-relative links to site routes and mermaid fences to client-rendered blocks. */
function transformMarkdown(md, repoPath, srcRoot) {
  const out = [];
  const parts = md.split(/(^```[^\n]*\n[\s\S]*?^```[ \t]*$)/m);
  for (const part of parts) {
    if (part.startsWith("```")) {
      const m = /^```mermaid\n([\s\S]*?)```/.exec(part);
      out.push(
        m ? `<pre class="mermaid not-prose">${escapeHtml(m[1])}</pre>` : part,
      );
      continue;
    }
    out.push(
      part.replace(
        /(!?)\[([^\]]*)\]\(([^)\s]+)\)/g,
        (all, bang, text, href) => {
          if (/^(https?:|mailto:|#)/.test(href)) return all;
          const [path, frag] = href.split("#");
          const abs = posix.normalize(
            posix.join(posix.dirname(repoPath), path),
          );
          const hash = frag ? `#${frag}` : "";
          if (bang)
            return abs.startsWith("assets/")
              ? `![${text}](${ROUTE}/${abs})`
              : all;
          if (abs.endsWith(".md"))
            return `[${text}](${ROUTE}/${toId(abs)}/${hash})`;
          const dirReadme = posix.join(abs, "README.md");
          if (existsSync(join(srcRoot, dirReadme)))
            return `[${text}](${ROUTE}/${toId(dirReadme)}/${hash})`;
          if (abs === "platform" || abs.startsWith("platform/"))
            return `[${text}](${ROUTE}/app/)`;
          return `[${text}](${REPO}/blob/main/${abs}${hash})`;
        },
      ),
    );
  }
  return out.join("");
}

async function main() {
  let src;
  try {
    src = await obtainSource();
  } catch (e) {
    if (process.env.INTERVIEW_CONTENT_OPTIONAL) {
      log(
        `WARNING: content unavailable (${e.message}); continuing without interview pages`,
      );
      mkdirSync(OUT_MD, { recursive: true });
      return;
    }
    // Failing the build is deliberate: Netlify keeps the previous deploy live.
    console.error(
      `[interview-content] ERROR: could not obtain content: ${e.message}`,
    );
    process.exit(1);
  }

  rmSync(OUT_MD, { recursive: true, force: true });
  rmSync(OUT_PUBLIC, { recursive: true, force: true });
  mkdirSync(OUT_MD, { recursive: true });

  let pages = 0;
  for (const dir of CONTENT_DIRS) {
    const base = join(src, dir);
    if (!existsSync(base)) throw new Error(`bundle is missing ${dir}/`);
    for (const file of walk(base)) {
      if (!file.endsWith(".md")) continue;
      const repoPath = file
        .slice(src.length + 1)
        .split("\\")
        .join("/");
      const dest = join(OUT_MD, repoPath);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(
        dest,
        transformMarkdown(readFileSync(file, "utf8"), repoPath, src),
      );
      pages++;
    }
  }
  cpSync(join(src, "assets"), join(OUT_PUBLIC, "assets"), { recursive: true });
  if (existsSync(join(src, "platform")))
    cpSync(join(src, "platform"), join(OUT_PUBLIC, "app"), { recursive: true });
  log(`synced ${pages} pages, assets and the interactive app`);
}

main().catch((e) => {
  console.error("[interview-content] ERROR:", e);
  process.exit(1);
});
