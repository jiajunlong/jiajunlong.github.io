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
