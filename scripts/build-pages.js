const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'site');
const assetDir = path.join(outputDir, 'assets');

const sourcePages = [
  {
    file: 'README.md',
    slug: 'readme',
    title: 'README',
    description: 'Operational overview, setup, and usage.'
  },
  {
    file: 'architecture.md',
    slug: 'architecture',
    title: 'Architecture',
    description: 'System design, modules, and data flow.'
  },
  {
    file: 'projectdocumentation.md',
    slug: 'projectdocumentation',
    title: 'Project Documentation',
    description: 'Technical depth, workflow, and validation.'
  }
];

marked.setOptions({
  mangle: false,
  headerIds: true
});

function readMarkdown(fileName) {
  return fs.readFileSync(path.join(rootDir, fileName), 'utf8');
}

function renderMarkdown(markdown) {
  const preparedMarkdown = markdown.replace(/```mermaid\s*\n([\s\S]*?)```/g, (_, diagram) => {
    return `<div class="mermaid">\n${diagram.trim()}\n</div>`;
  });

  return marked.parse(preparedMarkdown);
}

function htmlEscape(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildShell({ title, description, activeSlug, content }) {
  const nav = sourcePages
    .map((page) => {
      const isActive = page.slug === activeSlug ? ' aria-current="page"' : '';
      return `<a href="./${page.slug}.html"${isActive}>${page.title}</a>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${htmlEscape(description)}" />
  <title>${htmlEscape(title)}</title>
  <link rel="stylesheet" href="./assets/style.css" />
  <script defer src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
  <div class="backdrop backdrop-a"></div>
  <div class="backdrop backdrop-b"></div>
  <div class="site-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">DocuForge</p>
        <h1>${htmlEscape(title)}</h1>
        <p class="lede">${htmlEscape(description)}</p>
      </div>
      <nav class="nav">${nav}</nav>
    </header>
    <main class="content-panel">${content}</main>
    <footer class="footer">
      <span>Published from repository markdown via GitHub Pages.</span>
    </footer>
  </div>
  <script>
    window.addEventListener('load', () => {
      if (window.mermaid) {
        mermaid.initialize({ startOnLoad: true, theme: 'base' });
      }
    });
  </script>
</body>
</html>`;
}

function buildHomePage() {
  const cards = sourcePages.map((page) => `
    <a class="card" href="./${page.slug}.html">
      <span class="card-kicker">${htmlEscape(page.title)}</span>
      <strong>${htmlEscape(page.description)}</strong>
      <span class="card-link">Open page</span>
    </a>
  `).join('');

  const summary = `
    <section class="hero">
      <div>
        <p class="eyebrow">GitHub Pages site</p>
        <h2>Backend documentation, published as a static site.</h2>
        <p>
          This Pages build turns the repository's markdown documentation into a navigable site.
          It is intended for project documentation only; the Express API itself still runs separately.
        </p>
      </div>
      <div class="hero-stats">
        <div><strong>3</strong><span>Documentation pages</span></div>
        <div><strong>Mermaid</strong><span>Diagrams rendered client-side</span></div>
        <div><strong>Node</strong><span>Static build step</span></div>
      </div>
    </section>
    <section class="grid">${cards}</section>
    <section class="notes">
      <h3>What lives here</h3>
      <ul>
        <li>README content for setup and usage.</li>
        <li>Architecture notes for modules, data flow, and trade-offs.</li>
        <li>Project documentation for workflow, testing, and production readiness.</li>
      </ul>
    </section>
  `;

  return buildShell({
    title: 'DocuForge Documentation',
    description: 'Static documentation hub for the collaborative document store backend.',
    activeSlug: 'readme',
    content: summary
  });
}

function buildDocPage(page) {
  const markdown = readMarkdown(page.file);
  const rendered = renderMarkdown(markdown);

  return buildShell({
    title: `${page.title} - DocuForge`,
    description: page.description,
    activeSlug: page.slug,
    content: `<article class="markdown-body">${rendered}</article>`
  });
}

function writeFile(filePath, contents) {
  fs.writeFileSync(filePath, contents, 'utf8');
}

function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(assetDir, { recursive: true });

  writeFile(path.join(assetDir, 'style.css'), `:root {
  color-scheme: light;
  --bg: #f5f1ea;
  --bg-strong: #ede5da;
  --panel: rgba(255, 255, 255, 0.82);
  --panel-border: rgba(44, 39, 33, 0.12);
  --text: #171411;
  --muted: #5a5248;
  --accent: #b74f2f;
  --accent-strong: #8d341a;
  --shadow: 0 18px 50px rgba(47, 36, 24, 0.14);
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: "Segoe UI", "Trebuchet MS", sans-serif;
  color: var(--text);
  background:
    radial-gradient(circle at top left, rgba(183, 79, 47, 0.12), transparent 26%),
    radial-gradient(circle at top right, rgba(120, 83, 43, 0.12), transparent 24%),
    linear-gradient(180deg, var(--bg), var(--bg-strong));
}

a {
  color: inherit;
  text-decoration: none;
}

.backdrop {
  position: fixed;
  inset: auto;
  width: 30rem;
  height: 30rem;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.3;
  pointer-events: none;
}

.backdrop-a {
  top: -8rem;
  right: -6rem;
  background: #d8a17e;
}

.backdrop-b {
  bottom: -10rem;
  left: -10rem;
  background: #c8b39a;
}

.site-shell {
  position: relative;
  width: min(1120px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.25rem 0 2.5rem;
}

.topbar,
.content-panel,
.footer {
  backdrop-filter: blur(14px);
  background: var(--panel);
  border: 1px solid var(--panel-border);
  box-shadow: var(--shadow);
}

.topbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.5rem;
  border-radius: 1.5rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 0.75rem;
  color: var(--accent-strong);
}

h1,
h2,
h3 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  letter-spacing: -0.02em;
}

h1 {
  font-size: clamp(2rem, 4vw, 3.6rem);
}

.lede {
  margin: 0.75rem 0 0;
  max-width: 58ch;
  color: var(--muted);
  line-height: 1.6;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: flex-end;
}

.nav a {
  padding: 0.7rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(183, 79, 47, 0.18);
  background: rgba(255, 255, 255, 0.72);
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}

.nav a:hover,
.nav a[aria-current="page"] {
  transform: translateY(-1px);
  border-color: rgba(183, 79, 47, 0.45);
  background: rgba(255, 255, 255, 0.95);
}

.content-panel {
  margin-top: 1rem;
  border-radius: 1.5rem;
  padding: 1.5rem;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 1fr);
  gap: 1rem;
  align-items: stretch;
}

.hero p {
  line-height: 1.7;
  color: var(--muted);
}

.hero-stats {
  display: grid;
  gap: 0.75rem;
}

.hero-stats div,
.card,
.notes {
  border-radius: 1.2rem;
  border: 1px solid rgba(44, 39, 33, 0.1);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12px 30px rgba(61, 48, 34, 0.08);
}

.hero-stats div {
  padding: 1rem 1.1rem;
}

.hero-stats strong {
  display: block;
  font-size: 1.3rem;
}

.hero-stats span {
  color: var(--muted);
  font-size: 0.95rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.card {
  display: grid;
  gap: 0.65rem;
  padding: 1.1rem;
  min-height: 11rem;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 36px rgba(61, 48, 34, 0.12);
}

.card-kicker {
  color: var(--accent-strong);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.72rem;
}

.card-link {
  margin-top: auto;
  color: var(--accent);
  font-weight: 600;
}

.notes {
  margin-top: 1rem;
  padding: 1.1rem 1.2rem;
}

.notes ul {
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
  color: var(--muted);
  line-height: 1.75;
}

.markdown-body {
  max-width: 920px;
  margin: 0 auto;
  line-height: 1.75;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4 {
  margin-top: 1.6rem;
  margin-bottom: 0.6rem;
}

.markdown-body p,
.markdown-body li {
  color: var(--text);
}

.markdown-body p,
.markdown-body ul,
.markdown-body ol,
.markdown-body table,
.markdown-body pre {
  margin-top: 0.85rem;
  margin-bottom: 0.85rem;
}

.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
}

.markdown-body th,
.markdown-body td {
  padding: 0.75rem 0.8rem;
  border: 1px solid rgba(44, 39, 33, 0.12);
  vertical-align: top;
}

.markdown-body th {
  text-align: left;
  background: rgba(183, 79, 47, 0.08);
}

.markdown-body pre {
  overflow: auto;
  padding: 1rem;
  border-radius: 1rem;
  background: #1d1714;
  color: #f4ebe4;
}

.markdown-body code {
  font-family: Consolas, "Liberation Mono", monospace;
  font-size: 0.95em;
}

.markdown-body :not(pre) > code {
  padding: 0.15rem 0.4rem;
  border-radius: 0.45rem;
  background: rgba(183, 79, 47, 0.1);
}

.markdown-body img {
  max-width: 100%;
}

.mermaid {
  overflow: auto;
  padding: 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.88);
}

.footer {
  margin-top: 1rem;
  padding: 0.95rem 1.1rem;
  border-radius: 1rem;
  color: var(--muted);
  font-size: 0.95rem;
}

@media (max-width: 920px) {
  .topbar,
  .hero {
    grid-template-columns: 1fr;
    display: grid;
  }

  .topbar {
    align-items: start;
  }

  .nav {
    justify-content: flex-start;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}
`);

  writeFile(path.join(outputDir, 'index.html'), buildHomePage());

  for (const page of sourcePages) {
    writeFile(path.join(outputDir, `${page.slug}.html`), buildDocPage(page));
  }

  console.log(`Built GitHub Pages site in ${outputDir}`);
}

main();