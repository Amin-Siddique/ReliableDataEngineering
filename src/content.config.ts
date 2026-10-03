import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE } from "@/config";

export const BLOG_PATH = "src/data/blog";

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: z.string().or(image()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
    }),
});

// Data Engineering Interview Prep: synced from github.com/Amin-Siddique/data-eng-problems
// by scripts/sync-interview-content.mjs (runs before dev/build). Never edit src/data/interview by hand.
export const INTERVIEW_PATH = "src/data/interview";

const interview = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: `./${INTERVIEW_PATH}`,
    // keep ids identical to the routes the sync script writes into links
    generateId: ({ entry }) =>
      entry
        .replace(/\.md$/, "")
        .replace(/\/README$/, "")
        .toLowerCase(),
  }),
  schema: z
    .object({
      title: z.string(),
      description: z.string(),
      section: z.string(),
      type: z.enum(["learn", "practice", "qa", "index"]),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      topics: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      companies: z.array(z.string()).optional(),
      order: z.number().optional(),
      time_minutes: z.number().optional(),
    })
    .passthrough(),
});

export const collections = { blog, interview };
