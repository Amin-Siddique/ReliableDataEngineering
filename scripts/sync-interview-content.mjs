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
 *   INTERVIEW_CONTENT_TOKEN=github_pat_...       read token, required while data-eng-problems is private
 *                                                (fine-grained PAT: that repo only, Contents: read-only)
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
const RELEASE_API =
  "https://api.github.com/repos/Amin-Siddique/data-eng-problems/releases/tags/content-latest";
const ASSET_NAME = "content-bundle.tar.gz";
const TOKEN = process.env.INTERVIEW_CONTENT_TOKEN || "";
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

class HttpError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

async function download(url, dest, headers = {}, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { redirect: "follow", headers });
      if (!res.ok) throw new HttpError(res.status);
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return;
    } catch (e) {
      log(`download attempt ${i}/${attempts} failed: ${e.message}`);
      // 401/403/404 won't fix themselves on retry
      if (i === attempts || [401, 403, 404].includes(e.status)) throw e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** (i - 1)));
    }
  }
}

/** Private repo: resolve the release asset through the API and download it with the token. */
async function downloadWithToken(dest) {
  const auth = {
    Authorization: `Bearer ${TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const res = await fetch(RELEASE_API, {
    headers: { ...auth, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new HttpError(res.status);
  const release = await res.json();
  const asset = (release.assets || []).find((a) => a.name === ASSET_NAME);
  if (!asset) throw new Error(`release content-latest has no ${ASSET_NAME}`);
  // asset.url + octet-stream returns the binary (via a redirect to signed storage)
  await download(asset.url, dest, {
    ...auth,
    Accept: "application/octet-stream",
  });
}

async function obtainSource() {
  if (process.env.INTERVIEW_CONTENT_DIR) {
    const dir = join(ROOT, process.env.INTERVIEW_CONTENT_DIR);
    log(`using local checkout ${dir}`);
    return dir;
  }
  const tmp = mkdtempSync(join(tmpdir(), "interview-"));
  const tarball = join(tmp, "bundle.tar.gz");
  try {
    if (TOKEN && !process.env.INTERVIEW_CONTENT_URL) {
      log(
        "downloading content-latest bundle via the GitHub API (token provided)",
      );
      await downloadWithToken(tarball);
    } else {
      log(`downloading ${BUNDLE_URL}`);
      await download(BUNDLE_URL, tarball);
    }
  } catch (e) {
    if (e.status === 404 && !TOKEN) {
      e.message +=
        " (if data-eng-problems is private, set INTERVIEW_CONTENT_TOKEN to a read-only token, or make the repo public)";
    }
    throw e;
  }
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
          if (abs === "platform" || abs.startsWith("platform/"))
            return `[${text}](${ROUTE}/app/)`;
          const dirReadme = posix.join(abs, "README.md");
          if (existsSync(join(srcRoot, dirReadme)))
            return `[${text}](${ROUTE}/${toId(dirReadme)}/${hash})`;
          // the source repo is private: keep the text, drop links that have no page on this site
          return text;
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
  rmSync(join(OUT_PUBLIC, "app", "README.md"), { force: true }); // developer notes, not for visitors
  log(`synced ${pages} pages, assets and the interactive app`);
}

main().catch((e) => {
  console.error("[interview-content] ERROR:", e);
  process.exit(1);
});
