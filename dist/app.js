const menuButton = document.querySelector('.menu-button');
const isChinese = document.documentElement.lang.startsWith('zh');
const nav = document.querySelector('.nav');
menuButton.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(expanded));
  nav.classList.toggle('open', expanded);
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  nav.classList.remove('open');
}));

const papers = [...document.querySelectorAll('.paper')];
document.querySelector('.publication-tools').hidden = false;
document.querySelectorAll('.bibtex-button').forEach(button => { button.hidden = false; });
const filters = [...document.querySelectorAll('.filter')];
const search = document.querySelector('.search-input');
let activeTopic = 'all';
function updatePapers() {
  const query = search.value.trim().toLocaleLowerCase();
  let count = 0;
  papers.forEach(paper => {
    const visible = (activeTopic === 'all' || paper.dataset.topic === activeTopic) && paper.dataset.search.includes(query);
    paper.hidden = !visible;
    if (visible) count++;
  });
  document.querySelectorAll('.publication-year').forEach(group => {
    group.hidden = ![...group.querySelectorAll('.paper')].some(paper => !paper.hidden);
  });
  document.querySelector('.empty-state').hidden = count !== 0;
  document.querySelector('.results-status').textContent = activeTopic !== 'all' || query ? (isChinese ? `显示 ${count} / ${papers.length} 篇论文` : `${count} of ${papers.length} publications`) : '';
}
filters.forEach(button => button.addEventListener('click', () => {
  activeTopic = button.dataset.filter;
  filters.forEach(filter => {
    const selected = filter === button;
    filter.classList.toggle('active', selected);
    filter.setAttribute('aria-pressed', String(selected));
  });
  updatePapers();
}));
search.addEventListener('input', updatePapers);

const dialog = document.querySelector('.dialog');
const citation = document.querySelector('#citation-text');
const copyButton = document.querySelector('.copy-button');
const copyStatus = document.querySelector('.dialog-status');
let citationTrigger;
document.querySelectorAll('.bibtex-button').forEach(button => button.addEventListener('click', () => {
  citationTrigger = button;
  citation.textContent = button.closest('.paper').querySelector('template').content.textContent.trim();
  copyStatus.textContent = '';
  copyButton.textContent = isChinese ? '复制 BibTeX' : 'Copy BibTeX';
  dialog.showModal();
}));
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => citationTrigger?.focus());
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(citation.textContent);
    copyButton.textContent = isChinese ? '已复制' : 'Copied';
    copyStatus.textContent = isChinese ? '引用已复制到剪贴板。' : 'Citation copied to clipboard.';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(citation);
    selection.removeAllRanges();
    selection.addRange(range);
    copyStatus.textContent = isChinese ? '按 Ctrl+C 或 ⌘C 复制已选中的引用。' : 'Press Ctrl+C or ⌘C to copy the selected citation.';
  }
});

if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('.nav a[href^="#"]')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) links.forEach(link => link.classList.toggle('active', link.hash === `#${entry.target.id}`)); });
  }, {rootMargin:'-12% 0px -65% 0px', threshold:0});
  document.querySelectorAll('main > section').forEach(section => observer.observe(section));
}

// The HTML contains a verified snapshot, so GitHub limits never leave empty metrics.
async function refreshRepositoryStats() {
  const element = document.querySelector('.project-stats');
  if (!element) return;
  const repository = element.dataset.repository;
  if (!/^[A-Za-z\d_.-]+\/[A-Za-z\d_.-]+$/.test(repository)) return;
  const fields = ['stargazers_count', 'forks_count', 'subscribers_count'];
  const snapshotTime = Date.parse(element.dataset.checkedAt);
  const key = `github-stats:${repository}`;
  const ttl = 60 * 60 * 1000;
  const valid = data => data && fields.every(field => Number.isSafeInteger(data[field]) && data[field] >= 0) && Number.isFinite(Date.parse(data.checked_at));
  function render(data, source) {
    fields.forEach(field => { element.querySelector(`[data-repo-count="${field}"]`).textContent = data[field].toLocaleString('en-US'); });
    const updated = document.querySelector('[data-repo-updated]');
    updated.dateTime = data.checked_at;
    updated.title = data.checked_at;
    updated.textContent = new Intl.DateTimeFormat(isChinese ? 'zh-CN' : 'en-US', {year:'numeric',month:isChinese ? 'numeric' : 'short',day:'numeric',timeZone:'Asia/Shanghai'}).format(new Date(data.checked_at));
    element.dataset.statsSource = source;
  }
  try {
    const cached = JSON.parse(localStorage.getItem(key));
    const timestamp = Date.parse(cached?.checked_at);
    if (valid(cached) && timestamp >= snapshotTime && timestamp <= Date.now() && Date.now() - timestamp < ttl) {
      render(cached, 'cache');
      return;
    }
  } catch { /* Storage can be unavailable; the snapshot and API still work. */ }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://api.github.com/repos/${repository}`, {
      headers: {Accept:'application/vnd.github+json'},
      signal:controller.signal,
      credentials:'omit'
    });
    if (!response.ok) return;
    const result = await response.json();
    if (result.full_name?.toLowerCase() !== repository.toLowerCase()) return;
    const data = Object.fromEntries(fields.map(field => [field,result[field]]));
    data.checked_at = new Date().toISOString();
    if (!valid(data)) return;
    render(data, 'live');
    try { localStorage.setItem(key,JSON.stringify(data)); } catch { /* Optional cache. */ }
  } catch { /* Keep the dated snapshot when offline or rate limited. */ }
  finally { clearTimeout(timeout); }
}
refreshRepositoryStats();
