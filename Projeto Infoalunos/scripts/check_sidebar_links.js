const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getHtmlFiles(filePath));
    } else if (file.endsWith('.html')) {
      results.push(filePath);
    }
  });
  return results;
}

const htmlFiles = getHtmlFiles(root);
const navRe = /<nav\s+class="sidebar-nav">([\s\S]*?)<\/nav>/i;
const hrefRe = /href=\"([^\"]+)\"/g;
let broken = [];

htmlFiles.forEach(file => {
  const txt = fs.readFileSync(file, 'utf8');
  const m = navRe.exec(txt);
  if (!m) return;
  const nav = m[1];

  // Detect <base href="..."> and resolve links relative to it when present
  const baseRe = /<base\s+href=["']([^"']+)["']/i;
  const baseMatch = baseRe.exec(txt);
  let baseResolved = path.dirname(file);
  if (baseMatch) {
    const baseHref = baseMatch[1];
    if (baseHref.startsWith('http')) {
      baseResolved = baseHref; // remote base - we'll skip fs checks for these
    } else if (baseHref.startsWith('/')) {
      // Treat leading slash as project-root-relative
      baseResolved = path.resolve(root, baseHref.replace(/^\/+/, ''));
    } else {
      baseResolved = path.resolve(path.dirname(file), baseHref);
    }
  }

  let match;
  while ((match = hrefRe.exec(nav)) !== null) {
    const href = match[1];
    if (href.startsWith('http') || href.startsWith('#')) continue;
    // If baseResolved is a remote URL, skip filesystem checks for this file
    if (typeof baseResolved === 'string' && baseResolved.startsWith('http')) continue;
    const resolved = path.resolve(baseResolved, href);
    if (!fs.existsSync(resolved)) {
      broken.push({ file: path.relative(root, file), href, resolved });
    }
  }
});

if (broken.length) {
  console.log('Broken links found:');
  broken.forEach(b => {
    console.log(`- ${b.file} -> ${b.href} (resolved: ${b.resolved})`);
    const basename = path.basename(b.href);
    const matches = htmlFiles.filter(f => path.basename(f) === basename);
    if (matches.length === 0) {
      console.log(`  No file named ${basename} found in project.`);
    } else if (matches.length === 1) {
      const rel = path.relative(root, matches[0]).replace(/\\\\/g, '/');
      console.log(`  Suggestion: update href to "${rel}"`);
    } else {
      console.log(`  Multiple matches for ${basename}:`);
      matches.forEach(m => console.log(`   - ${path.relative(root, m)}`));
    }
  });
} else {
  console.log('No broken sidebar links found.');
}
