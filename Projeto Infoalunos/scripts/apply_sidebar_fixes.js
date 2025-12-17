const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const rules = [
  [/^index\.html$/i, 'Index/$0'],
  [/^geral-(.+)$/i, 'Geral/$0'],
  [/^geral-(.+)\.html$/i, 'Geral/$&'],
  [/^servicos-(.+)\.html$/i, 'Serviços/$&'],
  [/^concursos-(.+)\.html$/i, 'Concursos/$&'],
  [/^avaliacao-(.+)\.html$/i, 'Avaliação/$&'],
  [/^creditacoes-(.+)\.html$/i, 'Creditações/$&'],
  [/^documentos-(.+)\.html$/i, 'Documentos/$&'],
  [/^aula-(.+)\.html$/i, 'Aula/$&'],
  [/^disciplina-(.+)\.html$/i, 'Disciplina/$&'],
  [/^curso-(.+)\.html$/i, 'Curso/$&'],
  [/^instituicao-(.+)\.html$/i, 'Instituição/$&'],
  [/^eleicoes\.html$/i, 'Eleições/eleicoes.html']
];

function applyRules(href) {
  for (const [re, repl] of rules) {
    if (re.test(href)) {
      // For generic replacements, avoid double-prefixing
      if (href.includes('/') || href.includes('://')) return href;
      const out = href.replace(re, (match) => {
        // handle special case: use forward slashes and keep filename
        if (/^index\.html$/i.test(href)) return 'Index/index.html';
        if (/^eleicoes\.html$/i.test(href)) return 'Eleições/eleicoes.html';
        if (/^geral-/i.test(href)) return 'Geral/' + href;
        if (/^servicos-/i.test(href)) return 'Serviços/' + href;
        if (/^concursos-/i.test(href)) return 'Concursos/' + href;
        if (/^avaliacao-/i.test(href)) return 'Avaliação/' + href;
        if (/^creditacoes-/i.test(href)) return 'Creditações/' + href;
        if (/^documentos-/i.test(href)) return 'Documentos/' + href;
        if (/^aula-/i.test(href)) return 'Aula/' + href;
        if (/^disciplina-/i.test(href)) return 'Disciplina/' + href;
        if (/^curso-/i.test(href)) return 'Curso/' + href;
        if (/^instituicao-/i.test(href)) return 'Instituição/' + href;
        return match;
      });
      return out.replace(/\\/g, '/');
    }
  }
  return href;
}

let modified = 0;
let filesChanged = 0;

function walk(dir) {
  let results = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) results = results.concat(walk(p));
    else if (st.isFile() && p.endsWith('.html')) results.push(p);
  }
  return results;
}

const files = walk(root);
for (const filePath of files) {
  let s = fs.readFileSync(filePath, 'utf8');

  // find nav block(s)
  const navRegex = /<nav class="sidebar-nav">[\s\S]*?<\/nav>/g;
  const blocks = s.match(navRegex);
  if (!blocks) continue;

  let newS = s;
  for (const block of blocks) {
    let replacedBlock = block.replace(/href=\"([^\"]+)\"/g, (m, href) => {
      const cleaned = href.trim();
      // ignore absolute URLs and anchors and mailto
      if (/^(https?:|mailto:|#)/i.test(cleaned)) return m;
      const newHref = applyRules(cleaned);
      if (newHref !== cleaned) {
        modified++;
        return `href="${newHref}"`;
      }
      return m;
    });
    if (replacedBlock !== block) {
      newS = newS.replace(block, replacedBlock);
      filesChanged++;
    }
  }

  if (newS !== s) fs.writeFileSync(filePath, newS, 'utf8');
}

console.log(`Files changed: ${filesChanged}, hrefs updated: ${modified}`);
if (filesChanged === 0) process.exit(1);
