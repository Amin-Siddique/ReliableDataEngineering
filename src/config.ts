export const SITE = {
  website: "https://reliable-data-engineering.netlify.app/",
  author: "Amin Siddique",
  profile: "https://medium.com/@amin-siddique",
  desc: "Building resilient data pipelines. Practical guides on data engineering, SQL migration, dbt, Spark, and modern data stack.",
  title: "Reliable Data Engineering",
  ogImage: "og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 6,
  postPerPage: 8,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: false,
  showBackButton: true,
  editPost: {
    enabled: false,
    text: "Suggest edit",
    url: "https://github.com/reliable-data-engineering/reliable-data-engineering/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr",
  lang: "en",
  timezone: "Europe/Berlin",
} as const;
