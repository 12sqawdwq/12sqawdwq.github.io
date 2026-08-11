import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(await readFile(path.join(ROOT, "content", "site.json"), "utf8"));
const index = JSON.parse(await readFile(path.join(ROOT, "writing", "content-index.json"), "utf8"));
const errors = [];

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function hasExactCase(target) {
  const relative = path.relative(ROOT, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  let current = ROOT;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    const names = await readdir(current);
    if (!names.includes(segment)) return false;
    current = path.join(current, segment);
  }
  return true;
}

async function htmlFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await htmlFiles(target)));
    else if (entry.name.endsWith(".html")) output.push(target);
  }
  return output;
}

const generated = [
  path.join(ROOT, "index.html"),
  path.join(ROOT, "docs", "html", "jetbrains-network-validation", "index.html"),
  ...(await htmlFiles(path.join(ROOT, "writing"))),
  ...(await htmlFiles(path.join(ROOT, "projects"))),
];
const htmlCache = new Map();
for (const file of generated) htmlCache.set(file, await readFile(file, "utf8"));

function resolveInternal(reference, sourceFile) {
  const [rawPath, fragment] = reference.split("#", 2);
  const clean = rawPath.split("?", 1)[0];
  let target;
  if (!clean) {
    target = sourceFile;
  } else if (clean.startsWith(site.basePath)) {
    target = path.join(ROOT, ...clean.slice(site.basePath.length).split("/").filter(Boolean));
  } else if (clean.startsWith("/")) {
    return { outsideProject: true, fragment };
  } else {
    target = path.resolve(path.dirname(sourceFile), decodeURIComponent(clean));
  }
  if (clean.endsWith("/") || (target && path.extname(target) === "")) target = path.join(target, "index.html");
  return { target, fragment };
}

for (const [file, html] of htmlCache) {
  const relative = path.relative(ROOT, file).replaceAll("\\", "/");
  if ((html.match(/<link rel="canonical"/g) ?? []).length !== 1) {
    errors.push(`${relative}: expected one canonical link`);
  }
  if (/<script\b/i.test(html)) errors.push(`${relative}: script element is not allowed`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, position) => ids.indexOf(id) !== position);
  if (duplicates.length) errors.push(`${relative}: duplicate ids ${[...new Set(duplicates)].join(", ")}`);

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|data:)/i.test(reference)) continue;
    const { target, fragment, outsideProject } = resolveInternal(reference, file);
    if (outsideProject) {
      errors.push(`${relative}: root-relative URL escapes project base: ${reference}`);
      continue;
    }
    if (!(await exists(target))) {
      errors.push(`${relative}: missing internal target ${reference}`);
      continue;
    }
    if (!(await hasExactCase(target))) {
      errors.push(`${relative}: internal target has a case mismatch: ${reference}`);
      continue;
    }
    if (fragment && target.endsWith(".html")) {
      const targetHtml = htmlCache.get(target) ?? (await readFile(target, "utf8"));
      const decoded = decodeURIComponent(fragment);
      if (!new RegExp(`\\sid="${decoded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(targetHtml)) {
        errors.push(`${relative}: missing fragment ${reference}`);
      }
    }
  }
}

const combinedGenerated = [...htmlCache.values()].join("\n");
for (const pattern of [
  /https?:\/\/(?:www\.)?(?:notion\.so|notion\.site)/i,
  /C:\\Users\\/i,
  /D:\\PROJECT\\/i,
  /\b(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/,
  /\.ts\.net\b/i,
  /\b\d{4}\.site\b/i,
  /\b[a-z]+-ecs-[a-z0-9-]+\b/i,
]) {
  if (pattern.test(combinedGenerated)) errors.push(`generated site matches private-data guard ${pattern}`);
}

const publicStatuses = new Set(["published", "working"]);
for (const entry of index) {
  for (const key of ["title", "description", "date", "type", "topics", "status", "url"]) {
    if (entry[key] === undefined || entry[key] === null || entry[key] === "") {
      errors.push(`content index entry ${entry.title ?? "<untitled>"} misses ${key}`);
    }
  }
  if (!publicStatuses.has(entry.status)) errors.push(`${entry.title}: non-public status emitted`);
  if (!Array.isArray(entry.topics) || entry.topics.length === 0) errors.push(`${entry.title}: no topics`);
}

const featuredCount = index.filter((entry) => entry.featured).length;
if (featuredCount < 3 || featuredCount > 5) errors.push(`featured count is ${featuredCount}, expected 3-5`);

const rss = await readFile(path.join(ROOT, "writing", "rss.xml"), "utf8");
const itemCount = (rss.match(/<item>/g) ?? []).length;
if (itemCount !== index.length) errors.push(`RSS has ${itemCount} items; content index has ${index.length}`);

for (const route of ["essays", "build-notes", "research-notes", "notes"]) {
  if (!(await exists(path.join(ROOT, "writing", route, "index.html")))) {
    errors.push(`missing type archive writing/${route}/`);
  }
}
for (const draft of await readdir(path.join(ROOT, "content-inbox"))) {
  if (!draft.endsWith(".md") || draft === "README.md") continue;
  const slug = draft.replace(/\.md$/, "");
  if (await exists(path.join(ROOT, "writing", slug))) errors.push(`draft inbox item was emitted: ${slug}`);
}

const legacyUrls = [
  "docs/ansys-skill/skill/SKILL.md",
  "docs/blueknow-offset/remote_solve_packages.md",
  "docs/cough-project/README.md",
  "docs/learning-plan/270-day-engineering-cs-chip-learning-plan.md",
  "docs/terminal-gauss/README.md",
  "docs/html/eye-pressure-callgraph/index.html",
];
for (const legacy of legacyUrls) {
  if (!(await exists(path.join(ROOT, ...legacy.split("/"))))) errors.push(`legacy URL target missing: ${legacy}`);
}

if (errors.length) {
  console.error(`Site checks failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Checked ${generated.length} generated HTML pages, ${index.length} content records, RSS, archives, internal links, fragments, privacy guards, and legacy targets.`);
