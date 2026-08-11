# Ziyu Zhao — engineering notebook

Static GitHub Pages site for projects and technical writing.

Live site: <https://12sqawdwq.github.io/>

## Content model

Public notebook entries live in `content/writing/`. Each Markdown file requires frontmatter for:

- `title`, `description`, `date`;
- one of `Essay`, `Build Note`, `Research Note`, or `Note`;
- canonical `topics`;
- `status` (`published`, `working`, or `archived`);
- optional `project`, `series`, `series_order`, `featured`, and public `source_url`.

`source` may point to a repository-local public Markdown document. The generator incorporates that body without changing its legacy URL. Draft stubs live in `content-inbox/` and are never emitted. Private staging systems such as Notion do not drive publication directly; a candidate must pass manual evidence and privacy review before it moves into the public collection.

Project pages and Project ↔ Writing links are generated from `content/projects.json`. Type, Topic, Series, RSS, sitemap, related-writing, and homepage indexes are computed rather than hand-maintained.

## Build

Requires Node.js 22 or newer.

```bash
npm ci
npm test
```

Generated HTML is committed because GitHub Pages serves the repository root directly. The site uses no browser JavaScript, framework runtime, analytics, or remote font dependency.

See `docs/WRITING_CONTENT_AUDIT.md` for the migration disposition of legacy material.
