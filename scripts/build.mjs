import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { katex } from "@mdit/plugin-katex";
import hljs from "highlight.js";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import footnote from "markdown-it-footnote";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content", "writing");
const GENERATED_DIRS = [
  path.join(ROOT, "writing"),
  path.join(ROOT, "projects"),
  path.join(ROOT, "12sqwdwq.github.io"),
];
const TYPES = {
  Essay: "essays",
  "Build Note": "build-notes",
  "Research Note": "research-notes",
  Note: "notes",
};
const STATUSES = new Set(["published", "working", "archived"]);
const PUBLIC_STATUSES = new Set(["published", "working"]);

const site = JSON.parse(await readFile(path.join(ROOT, "content", "site.json"), "utf8"));
const topicDefinitions = JSON.parse(
  await readFile(path.join(ROOT, "content", "topics.json"), "utf8"),
);
const projects = JSON.parse(await readFile(path.join(ROOT, "content", "projects.json"), "utf8"));
const topicMap = new Map(topicDefinitions.map((topic) => [topic.name, topic]));
const projectMap = new Map(projects.map((project) => [project.id, project]));

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(value) {
  return escapeHtml(value);
}

function slugify(value) {
  const slug = String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function href(route = "/") {
  if (/^(?:https?:|mailto:|#)/.test(route)) return route;
  const normalized = route.startsWith("/") ? route : `/${route}`;
  return `${site.basePath}${normalized}`.replace(/\/{2,}/g, "/");
}

function canonical(route = "/") {
  const normalized = route === "/" ? "" : route.replace(/\/$/, "");
  return `${site.siteUrl}${normalized}`;
}

function parseFrontmatter(text, file) {
  const normalized = text.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---\n")) {
    throw new Error(`${file}: frontmatter is required`);
  }
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) throw new Error(`${file}: unterminated frontmatter`);
  const data = YAML.parse(normalized.slice(4, end)) ?? {};
  return { data, body: normalized.slice(end + 5).trim() };
}

function dateString(value, field, file) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${file}: ${field} must be YYYY-MM-DD`);
  }
  return value;
}

function displayDate(value) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function stripSourceFrontmatter(text) {
  const normalized = text.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---\n")) return normalized;
  const end = normalized.indexOf("\n---\n", 4);
  return end === -1 ? normalized : normalized.slice(end + 5);
}

function stripFirstH1(text) {
  const lines = text.split("\n");
  const index = lines.findIndex((line) => /^#\s+/.test(line));
  if (index !== -1) lines.splice(index, 1);
  return lines.join("\n").trim();
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function rewriteRelativeReferences(markdown, sourcePath, sourceUrl) {
  if (!sourcePath) return markdown;
  const sourceDir = path.posix.dirname(sourcePath.replaceAll("\\", "/"));
  const pattern = /(!?\[[^\]]*\])\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  const matches = [...markdown.matchAll(pattern)];
  let output = markdown;

  for (const match of matches.reverse()) {
    const target = match[2];
    if (/^(?:[a-z]+:|#|\/)/i.test(target)) continue;
    const [pathname, suffix = ""] = target.split(/(?=[?#])/u, 2);
    const resolved = path.posix.normalize(path.posix.join(sourceDir, pathname));
    const localTarget = path.resolve(ROOT, ...resolved.split("/"));
    let replacement;
    if (localTarget.startsWith(ROOT) && (await exists(localTarget))) {
      replacement = `${href(`/${resolved}`)}${suffix}`;
    } else if (sourceUrl) {
      replacement = new URL(target, sourceUrl).href;
    } else {
      throw new Error(`${sourcePath}: unresolved relative reference ${target}`);
    }
    const updated = `${match[1]}(${replacement})`;
    output = `${output.slice(0, match.index)}${updated}${output.slice(match.index + match[0].length)}`;
  }
  return output;
}

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  highlight(code, language) {
    if (language && hljs.getLanguage(language)) {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language }).value}</code></pre>`;
    }
    return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
  },
})
  .use(anchor, { level: [2, 3, 4], slugify })
  .use(footnote)
  .use(katex, { output: "mathml", throwOnError: false, strict: "ignore" });

function wrapWideContent(html) {
  return html
    .replaceAll("<table>", '<div class="table-scroll"><table>')
    .replaceAll("</table>", "</table></div>");
}

const files = (await readdir(CONTENT_DIR)).filter((name) => name.endsWith(".md")).sort();
const articles = [];
for (const name of files) {
  const file = path.join(CONTENT_DIR, name);
  const raw = await readFile(file, "utf8");
  const { data, body } = parseFrontmatter(raw, name);
  const slug = name.replace(/\.md$/, "");
  for (const key of ["title", "description", "date", "type", "topics", "status"]) {
    if (data[key] === undefined || data[key] === null || data[key] === "") {
      throw new Error(`${name}: missing ${key}`);
    }
  }
  if (!(data.type in TYPES)) throw new Error(`${name}: invalid type ${data.type}`);
  if (!Array.isArray(data.topics) || data.topics.length === 0) {
    throw new Error(`${name}: topics must be a non-empty list`);
  }
  for (const topic of data.topics) {
    if (!topicMap.has(topic)) throw new Error(`${name}: unknown topic ${topic}`);
  }
  if (!STATUSES.has(data.status)) throw new Error(`${name}: invalid status ${data.status}`);
  if (data.project && !projectMap.has(data.project)) {
    throw new Error(`${name}: unknown project ${data.project}`);
  }
  if (data.featured !== undefined && typeof data.featured !== "boolean") {
    throw new Error(`${name}: featured must be boolean`);
  }
  if (data.source && (typeof data.source !== "string" || path.isAbsolute(data.source))) {
    throw new Error(`${name}: source must be a repository-relative path`);
  }

  const date = dateString(data.date, "date", name);
  const updated = data.updated ? dateString(data.updated, "updated", name) : undefined;
  if (updated && updated < date) throw new Error(`${name}: updated precedes date`);

  let sourceBody = "";
  if (data.source) {
    const sourceFile = path.resolve(ROOT, ...data.source.split("/"));
    if (!sourceFile.startsWith(ROOT) || !(await exists(sourceFile))) {
      throw new Error(`${name}: source not found: ${data.source}`);
    }
    sourceBody = stripFirstH1(stripSourceFrontmatter(await readFile(sourceFile, "utf8")));
  }
  const combined = [body, sourceBody].filter(Boolean).join("\n\n---\n\n");
  const rewritten = await rewriteRelativeReferences(combined, data.source, data.source_url);
  const rendered = wrapWideContent(markdown.render(rewritten));

  articles.push({
    ...data,
    slug,
    date,
    updated,
    featured: data.featured === true,
    route: `/writing/${slug}/`,
    rendered,
    sortDate: updated ?? date,
    source_url: data.source_url,
  });
}

const duplicateRoutes = articles.filter(
  (article, index) => articles.findIndex((other) => other.route === article.route) !== index,
);
if (duplicateRoutes.length) throw new Error(`duplicate article routes: ${duplicateRoutes.join(", ")}`);

const publicArticles = articles.filter((article) => PUBLIC_STATUSES.has(article.status));
const sorted = [...publicArticles].sort(
  (a, b) => b.sortDate.localeCompare(a.sortDate) || a.title.localeCompare(b.title),
);
const featured = sorted.filter((article) => article.featured);
if (featured.length < 3 || featured.length > 5) {
  throw new Error(`featured count must be 3-5; found ${featured.length}`);
}

const seriesMap = new Map();
for (const article of publicArticles) {
  if (!article.series) continue;
  const entries = seriesMap.get(article.series) ?? [];
  entries.push(article);
  seriesMap.set(article.series, entries);
}
for (const [series, entries] of seriesMap) {
  if (entries.length < 3) throw new Error(`series ${series} has fewer than 3 public entries`);
  const orders = entries.map((entry) => Number(entry.series_order));
  if (orders.some((order) => !Number.isInteger(order) || order < 1)) {
    throw new Error(`series ${series} requires positive integer series_order values`);
  }
  if (new Set(orders).size !== orders.length) throw new Error(`series ${series} has duplicate order`);
  entries.sort((a, b) => a.series_order - b.series_order);
}

const usedTopics = topicDefinitions.filter((topic) =>
  publicArticles.some((article) => article.topics.includes(topic.name)),
);

function articleMeta(article, includeTopics = true) {
  const typeLink = `<a href="${href(`/writing/${TYPES[article.type]}/`)}">${escapeHtml(article.type)}</a>`;
  const status = article.status === "working" ? " · Working" : "";
  const topics = includeTopics
    ? ` · ${article.topics
        .map(
          (topic) =>
            `<a href="${href(`/writing/topics/${slugify(topic)}/`)}">${escapeHtml(topic)}</a>`,
        )
        .join(", ")}`
    : "";
  return `${displayDate(article.date)}${article.updated ? ` · updated ${displayDate(article.updated)}` : ""} · ${typeLink}${status}${topics}`;
}

function articleList(entries, { descriptions = true } = {}) {
  if (entries.length === 0) return '<p class="quiet">No public entries yet.</p>';
  return `<ol class="entry-list">${entries
    .map(
      (article) => `<li>
        <a class="entry-title" href="${href(article.route)}">${escapeHtml(article.title)}</a>
        <div class="entry-meta">${articleMeta(article, false)}</div>
        ${descriptions ? `<p>${escapeHtml(article.description)}</p>` : ""}
      </li>`,
    )
    .join("")}</ol>`;
}

function header(active) {
  const links = [
    ["Home", "/", "home"],
    ["Projects", "/projects/", "projects"],
    ["Writing", "/writing/", "writing"],
    ["CV", "/CV_Ziyu_Zhao_final.pdf", "cv"],
  ];
  return `<header class="site-header">
    <div class="wrap header-row">
      <a class="site-name" href="${href("/")}">${escapeHtml(site.name)}</a>
      <nav aria-label="Primary navigation"><ul>${links
        .map(
          ([label, route, id]) =>
            `<li><a${active === id ? ' aria-current="page"' : ""} href="${href(route)}">${label}</a></li>`,
        )
        .join("")}<li><a href="${site.github}">GitHub</a></li></ul></nav>
    </div>
  </header>`;
}

function layout({ title, description, route, body, active, lang = "en", article = false }) {
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="color-scheme" content="light dark">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${article ? "article" : "website"}">
  <link rel="canonical" href="${canonical(route)}">
  <link rel="alternate" type="application/rss+xml" title="Writing RSS" href="${href("/writing/rss.xml")}">
  <link rel="stylesheet" href="${href("/assets/site.css")}">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <a class="skip-link" href="#content">Skip to content</a>
  ${header(active)}
  <main class="wrap${article ? " article-wrap" : ""}" id="content">${body}</main>
  <footer><div class="wrap">Static HTML generated from frontmatter and Markdown · no client-side framework · no analytics</div></footer>
</body>
</html>
`.replace(/[ \t]+$/gm, "");
}

async function writeRoute(route, html) {
  const relative = route === "/" ? "index.html" : `${route.replace(/^\//, "")}index.html`;
  const target = path.join(ROOT, ...relative.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
}

function relatedWriting(article) {
  return publicArticles
    .filter((candidate) => candidate.slug !== article.slug)
    .map((candidate) => {
      const sharedTopics = candidate.topics.filter((topic) => article.topics.includes(topic)).length;
      const score =
        sharedTopics +
        (article.project && candidate.project === article.project ? 3 : 0) +
        (article.series && candidate.series === article.series ? 4 : 0);
      return { candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.candidate.sortDate.localeCompare(a.candidate.sortDate) ||
        a.candidate.title.localeCompare(b.candidate.title),
    )
    .slice(0, 4)
    .map(({ candidate }) => candidate);
}

for (const directory of GENERATED_DIRS) await rm(directory, { recursive: true, force: true });

const selectedProjects = projects.filter((project) => project.selected);
const latest = sorted.slice(0, 5);
const interests = usedTopics.slice(0, 8);
const homeBody = `
<section class="lede">
  <p class="eyebrow">Undergraduate engineering notebook</p>
  <h1>Projects, experiments, and questions I am trying to understand.</h1>
  <p>I study Microelectronics Science and Technology at Xi'an Jiaotong-Liverpool University. This site keeps project state, technical notes, research limits, and failed checks close to the work that produced them.</p>
</section>
<span id="engineering" aria-hidden="true"></span>
<span id="embedded" aria-hidden="true"></span>
<span id="research" aria-hidden="true"></span>
<section id="projects">
  <div class="section-heading"><h2>Selected work</h2><a href="${href("/projects/")}">View all projects →</a></div>
  <ul class="project-index">${selectedProjects
    .map(
      (project) => `<li><div><a class="project-name" href="${href(`/projects/${project.id}/`)}">${escapeHtml(project.name)}</a><span>${escapeHtml(project.status)}</span></div><p>${escapeHtml(project.summary)}</p></li>`,
    )
    .join("")}</ul>
</section>
<section>
  <h2>Current interests</h2>
  <p class="topic-line">${interests
    .map((topic) => `<a href="${href(`/writing/topics/${slugify(topic.name)}/`)}">${escapeHtml(topic.name)}</a>`)
    .join(" · ")}</p>
</section>
<span id="notes" aria-hidden="true"></span>
<section>
  <div class="section-heading"><h2>Latest writing</h2><a href="${href("/writing/")}">View all writing →</a></div>
  ${articleList(latest)}
</section>
<section id="about">
  <h2>About</h2>
  <p>I use coding agents as part of development, but try to keep the problem definition, architecture, experiments, negative results, and validation boundaries inspectable. Current work spans systems tooling, engineering software, CAE/CAD, scientific computing, embedded systems, and medical AI.</p>
  <p><a href="mailto:${site.email}">Email</a> · <a href="${site.github}">GitHub</a> · <a href="${href("/CV_Ziyu_Zhao_final.pdf")}">CV (PDF)</a></p>
</section>`;
await writeRoute(
  "/",
  layout({
    title: site.title,
    description: site.description,
    route: "/",
    active: "home",
    body: homeBody,
  }),
);

const legacySiteRoute = "/12sqwdwq.github.io/";
const legacyRedirect = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=/">
  <link rel="canonical" href="${canonical("/")}">
  <link rel="stylesheet" href="${href("/assets/site.css")}">
  <title>Site moved — ${escapeHtml(site.name)}</title>
</head>
<body>
  <main class="wrap" id="content">
    <header class="page-heading">
      <p class="eyebrow">Address corrected</p>
      <h1>This site has moved.</h1>
      <p>The canonical address is now <a href="${href("/")}">${escapeHtml(`${site.siteUrl}/`)}</a>.</p>
    </header>
  </main>
</body>
</html>
`;
await writeRoute(legacySiteRoute, legacyRedirect);

const redactedNetworkBody = `<header class="page-heading"><p class="eyebrow">Redacted legacy URL</p><h1>JetBrains Remote Development network validation</h1><p>The earlier page at this address rendered a raw diagnostic bundle containing infrastructure-specific identifiers. It has been replaced with a public-safe summary that preserves the troubleshooting method and evidence boundaries.</p><p><a href="${href("/writing/jetbrains-network-validation/")}">Read the redacted notebook entry →</a></p></header>`;
await writeRoute(
  "/docs/html/jetbrains-network-validation/",
  layout({
    title: `JetBrains network validation — ${site.name}`,
    description: "A redacted legacy route for a remote-development download investigation.",
    route: "/docs/html/jetbrains-network-validation/",
    active: "writing",
    body: redactedNetworkBody,
  }),
);

const groups = [...new Set(projects.map((project) => project.group))];
const projectsBody = `<header class="page-heading"><p class="eyebrow">Index</p><h1>Projects</h1><p>Repositories, prototypes, research code, and small experiments. Each page links back to writing associated through frontmatter.</p></header>${groups
  .map(
    (group) => `<section><h2>${escapeHtml(group)}</h2><ul class="project-index">${projects
      .filter((project) => project.group === group)
      .map(
        (project) => `<li><div><a class="project-name" href="${href(`/projects/${project.id}/`)}">${escapeHtml(project.name)}</a><span>${escapeHtml(project.status)}</span></div><p>${escapeHtml(project.summary)}</p></li>`,
      )
      .join("")}</ul></section>`,
  )
  .join("")}`;
await writeRoute(
  "/projects/",
  layout({
    title: `Projects — ${site.name}`,
    description: "Engineering software, systems tools, research code, and embedded experiments.",
    route: "/projects/",
    active: "projects",
    body: projectsBody,
  }),
);

for (const project of projects) {
  const writing = sorted.filter((article) => article.project === project.id);
  const extraLinks = (project.links ?? [])
    .map((link) => `<a href="${href(`/${link.url}`)}">${escapeHtml(link.label)}</a>`)
    .join(" · ");
  const body = `<header class="page-heading"><p class="eyebrow">${escapeHtml(project.status)}</p><h1>${escapeHtml(project.name)}</h1><p>${escapeHtml(project.summary)}</p><p><a href="${project.repo}">Repository →</a>${extraLinks ? ` · ${extraLinks}` : ""}</p></header>
  <section><h2>Writing about this project</h2>${articleList(writing)}</section>`;
  await writeRoute(
    `/projects/${project.id}/`,
    layout({
      title: `${project.name} — ${site.name}`,
      description: project.summary,
      route: `/projects/${project.id}/`,
      active: "projects",
      body,
    }),
  );
}

const typeCounts = Object.keys(TYPES).map((type) => ({
  type,
  count: publicArticles.filter((article) => article.type === type).length,
}));
const recentResearchBuild = sorted
  .filter((article) => ["Research Note", "Build Note"].includes(article.type))
  .slice(0, 6);
const writingBody = `<header class="page-heading"><p class="eyebrow">Technical notebook</p><h1>Writing</h1><p>Notes, experiments, and longer writing around systems, engineering software, simulation, and things I am currently trying to understand.</p></header>
<section><h2>Featured</h2>${articleList(featured)}</section>
<section><h2>Recent</h2>${articleList(sorted.slice(0, 7))}</section>
<section><h2>Research / Build Notes</h2>${articleList(recentResearchBuild, { descriptions: false })}</section>
<section><h2>Browse by type</h2><ul class="archive-links">${typeCounts
  .map(
    ({ type, count }) => `<li><a href="${href(`/writing/${TYPES[type]}/`)}">${escapeHtml(type)}</a><span>${count}</span></li>`,
  )
  .join("")}</ul></section>
<section><h2>Topics</h2><ul class="archive-links">${usedTopics
  .map((topic) => {
    const count = publicArticles.filter((article) => article.topics.includes(topic.name)).length;
    return `<li><a href="${href(`/writing/topics/${slugify(topic.name)}/`)}">${escapeHtml(topic.name)}</a><span>${count}</span></li>`;
  })
  .join("")}</ul></section>
<section><h2>Series</h2><ul class="archive-links">${[...seriesMap.entries()]
  .map(
    ([series, entries]) => `<li><a href="${href(`/writing/series/${slugify(series)}/`)}">${escapeHtml(series)}</a><span>${entries.length}</span></li>`,
  )
  .join("")}</ul></section>
<section><h2>All writing</h2>${Object.keys(TYPES)
  .map(
    (type) => `<h3>${escapeHtml(type)}</h3>${articleList(
      sorted.filter((article) => article.type === type),
      { descriptions: false },
    )}`,
  )
  .join("")}</section>
<p class="rss-link"><a href="${href("/writing/rss.xml")}">RSS feed</a></p>`;
await writeRoute(
  "/writing/",
  layout({
    title: `Writing — ${site.name}`,
    description: "A technical notebook of essays, build notes, research notes, and shorter working notes.",
    route: "/writing/",
    active: "writing",
    body: writingBody,
  }),
);

for (const [type, typeSlug] of Object.entries(TYPES)) {
  const entries = sorted.filter((article) => article.type === type);
  const body = `<header class="page-heading"><p class="eyebrow">Content type</p><h1>${escapeHtml(type)}</h1><p>${entries.length} public ${entries.length === 1 ? "entry" : "entries"}.</p></header>${articleList(entries)}`;
  await writeRoute(
    `/writing/${typeSlug}/`,
    layout({
      title: `${type} — Writing — ${site.name}`,
      description: `${type} entries in Ziyu Zhao's technical notebook.`,
      route: `/writing/${typeSlug}/`,
      active: "writing",
      body,
    }),
  );
}

for (const topic of usedTopics) {
  const entries = sorted.filter((article) => article.topics.includes(topic.name));
  const route = `/writing/topics/${slugify(topic.name)}/`;
  const body = `<header class="page-heading"><p class="eyebrow">Topic</p><h1>${escapeHtml(topic.name)}</h1><p>${escapeHtml(topic.description)}</p><p>${entries.length} public ${entries.length === 1 ? "entry" : "entries"}.</p></header>${articleList(entries)}`;
  await writeRoute(
    route,
    layout({
      title: `${topic.name} — Writing — ${site.name}`,
      description: topic.description,
      route,
      active: "writing",
      body,
    }),
  );
}

for (const [series, entries] of seriesMap) {
  const route = `/writing/series/${slugify(series)}/`;
  const body = `<header class="page-heading"><p class="eyebrow">Series</p><h1>${escapeHtml(series)}</h1><p>${entries.length} parts.</p></header>${articleList(entries)}`;
  await writeRoute(
    route,
    layout({
      title: `${series} — Writing — ${site.name}`,
      description: `${series}, a technical notebook series by Ziyu Zhao.`,
      route,
      active: "writing",
      body,
    }),
  );
}

for (const article of publicArticles) {
  const project = article.project ? projectMap.get(article.project) : undefined;
  const series = article.series ? seriesMap.get(article.series) : undefined;
  const part = series ? series.findIndex((entry) => entry.slug === article.slug) + 1 : undefined;
  const related = relatedWriting(article);
  const topicLinks = article.topics
    .map(
      (topic) => `<a href="${href(`/writing/topics/${slugify(topic)}/`)}">${escapeHtml(topic)}</a>`,
    )
    .join(", ");
  const body = `<article>
    <header class="article-heading">
      <p class="eyebrow">${escapeHtml(article.type)}${article.status === "working" ? " · Working" : ""}</p>
      <h1>${escapeHtml(article.title)}</h1>
      <p class="article-description">${escapeHtml(article.description)}</p>
      <p class="entry-meta">${displayDate(article.date)}${article.updated ? ` · updated ${displayDate(article.updated)}` : ""} · <a href="${href(`/writing/${TYPES[article.type]}/`)}">${escapeHtml(article.type)}</a> · ${topicLinks}</p>
      ${
        project
          ? `<p class="relation">Related project: <a href="${href(`/projects/${project.id}/`)}">${escapeHtml(project.name)}</a></p>`
          : ""
      }
      ${
        series
          ? `<p class="relation">Part ${part} of <a href="${href(`/writing/series/${slugify(article.series)}/`)}">${escapeHtml(article.series)}</a></p>`
          : ""
      }
    </header>
    <div class="prose">${article.rendered}</div>
    ${
      article.source_url
        ? `<p class="source-link">Current public source: <a href="${article.source_url}">repository document →</a></p>`
        : ""
    }
  </article>
  <section class="related"><h2>Related writing</h2>${articleList(related, { descriptions: false })}</section>`;
  await writeRoute(
    article.route,
    layout({
      title: `${article.title} — ${site.name}`,
      description: article.description,
      route: article.route,
      active: "writing",
      lang: article.lang ?? "en",
      body,
      article: true,
    }),
  );
}

const rssItems = sorted
  .map(
    (article) => `<item>
  <title>${escapeXml(article.title)}</title>
  <link>${canonical(article.route)}</link>
  <guid isPermaLink="true">${canonical(article.route)}</guid>
  <pubDate>${new Date(`${article.date}T00:00:00Z`).toUTCString()}</pubDate>
  <description>${escapeXml(article.description)}</description>
  <category>${escapeXml(article.type)}</category>
  ${article.topics.map((topic) => `<category>${escapeXml(topic)}</category>`).join("\n  ")}
</item>`,
  )
  .join("\n");
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${escapeXml(site.name)} — Writing</title>
<link>${canonical("/writing/")}</link>
<description>${escapeXml("Essays, build notes, research notes, and working technical notes.")}</description>
<language>en</language>
${rssItems}
</channel></rss>\n`;
await writeFile(path.join(ROOT, "writing", "rss.xml"), rss, "utf8");

const contentIndex = publicArticles.map((article) => ({
  title: article.title,
  description: article.description,
  date: article.date,
  updated: article.updated ?? null,
  type: article.type,
  topics: article.topics,
  status: article.status,
  project: article.project ?? null,
  series: article.series ?? null,
  featured: article.featured,
  url: href(article.route),
}));
await writeFile(
  path.join(ROOT, "writing", "content-index.json"),
  `${JSON.stringify(contentIndex, null, 2)}\n`,
  "utf8",
);

const sitemapRoutes = [
  "/",
  "/projects/",
  "/writing/",
  ...projects.map((project) => `/projects/${project.id}/`),
  ...publicArticles.map((article) => article.route),
  ...Object.values(TYPES).map((type) => `/writing/${type}/`),
  ...usedTopics.map((topic) => `/writing/topics/${slugify(topic.name)}/`),
  ...[...seriesMap.keys()].map((series) => `/writing/series/${slugify(series)}/`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapRoutes.map((route) => `  <url><loc>${canonical(route)}</loc></url>`).join("\n")}
</urlset>\n`;
await writeFile(path.join(ROOT, "sitemap.xml"), sitemap, "utf8");

console.log(
  `Built ${publicArticles.length} public writing entries, ${usedTopics.length} topic archives, ${Object.keys(TYPES).length} type archives, ${seriesMap.size} series, and ${projects.length} project pages.`,
);
