import {readFile, writeFile, mkdir, copyFile, cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = JSON.parse(await readFile(path.join(root, 'data/profile.json'), 'utf8'));
const research = JSON.parse(await readFile(path.join(root, 'data/publications.json'), 'utf8'));
const repository = JSON.parse(await readFile(path.join(root, 'data/github.json'), 'utf8'));
const papers = [...research.publications, ...(research.additional_publications || [])];
const recentIds = new Set((research.additional_publications || []).map(p => p.id));
const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const icon = (name, size = 15) => {
  const icons = {
    arrow:'<path d="M7 17 17 7M7 7h10v10"/>',
    github:'<path d="M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-3c3-.3 6-1.5 6-7a5.4 5.4 0 0 0-1.5-3.7 5 5 0 0 0-.1-3.6S17.2.4 14.5 2a13 13 0 0 0-7 0C4.8.4 3.6.7 3.6.7a5 5 0 0 0-.1 3.6A5.4 5.4 0 0 0 2 8c0 5.5 3 6.7 6 7a3.5 3.5 0 0 0-1 3v4"/>',
    scholar:'<path d="m2 9 10-6 10 6-10 6L2 9Zm4 3v5c3 3 9 3 12 0v-5M22 9v8"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-5 3 2-18"/>',
    star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
    fork:'<circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="12" cy="20" r="2"/><path d="M6 6v3a6 6 0 0 0 6 6m6-9v3a6 6 0 0 1-6 6v3"/>',
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
};
const ext = (url, text, cls = '') => `<a href="${e(url)}" target="_blank" rel="noopener noreferrer"${cls ? ` class="${cls}"` : ''}>${text}</a>`;
function bibtex(paper) {
  const isConference = paper.type === 'conference';
  const key = `${paper.authors[0].split(' ').at(-1).toLowerCase()}${paper.year}${paper.id.replace(/-/g,'')}`;
  const fields = {
    title: `{${paper.title}}`,
    author: paper.authors.join(' and '),
    ...(isConference ? {booktitle: paper.venue_full} : {journal: `arXiv preprint arXiv:${paper.arxiv}`}),
    year: paper.year,
    ...(paper.volume ? {volume:paper.volume} : {}),
    ...(paper.pages ? {pages:paper.pages.replace(/–/g,'--')} : {}),
    ...(paper.doi_type === 'proceedings DOI' ? {doi:paper.doi} : {}),
    ...(!isConference ? {eprint:paper.arxiv,archivePrefix:'arXiv'} : {}),
    url: paper.urls.paper
  };
  return `@${isConference ? 'inproceedings' : 'article'}{${key},\n${Object.entries(fields).map(([key,value])=>`  ${key} = {${value}}`).join(',\n')}\n}`;
}
const topicId = paper => paper.topic === 'Multimodal models' ? 'multimodal' : paper.topic === 'Neural network theory' ? 'foundations' : 'long-context';
function renderPaper(paper, lang) {
  const zh = lang === 'zh';
  const isPreprint = paper.type === 'preprint';
  const marker = isPreprint ? 'arXiv' : paper.venue.replace(/ \d{4}/,'');
  const authors = paper.authors.map(author => author === profile.name ? `<strong>${e(author)}</strong>` : e(author)).join(', ');
  const actions = [ext(paper.urls.paper, `${icon('file',12)} ${zh ? '论文' : 'Paper'}`)];
  if (paper.urls.pdf) actions.push(ext(paper.urls.pdf, 'PDF'));
  if (paper.urls.code) actions.push(ext(paper.urls.code, `${icon('code',12)} ${zh ? '代码' : 'Code'}`));
  if (paper.urls.arxiv && paper.urls.arxiv !== paper.urls.paper) actions.push(ext(paper.urls.arxiv, 'arXiv'));
  const cite = bibtex(paper);
  return `<article class="paper" id="${e(paper.id)}" data-topic="${topicId(paper)}" data-search="${e([paper.title, ...paper.authors, paper.venue, paper.summary, paper.summary_zh, paper.year].join(' ').toLocaleLowerCase())}">
    <div class="paper-marker${isPreprint ? ' preprint' : ''}" aria-label="${e(paper.venue)}"><span>${e(marker)}</span><small>${paper.year}</small></div>
    <div class="paper-body"><h3 class="paper-title">${ext(paper.urls.paper,e(paper.title))}${recentIds.has(paper.id) ? `<span class="preprint-label">${zh ? '最新预印本' : 'New preprint'}</span>` : ''}</h3>
      <p class="authors">${authors}</p>
      <p class="venue-line">${e(isPreprint ? `arXiv:${paper.arxiv} · ${paper.year}` : paper.venue)}</p>
      <p class="paper-summary">${e(zh ? paper.summary_zh || paper.summary : paper.summary)}</p>
      <div class="paper-actions">${actions.join('')}<button class="bibtex-button" hidden type="button" aria-label="${zh ? '导出 BibTeX：' : 'BibTeX for '}${e(paper.title)}">BibTeX</button></div>
      <template>${e(cite)}</template>
    </div></article>`;
}
const years = [...new Set(papers.map(p => p.year))].sort((a,b)=>b-a);
const order = ['which-long-documents-matter','longforge','policylong','entropylong','litelong','longbench-pro','layer-normalization','tinyllava-factory','tinyllava'];
const rank = id => order.includes(id) ? order.indexOf(id) : order.length;
papers.sort((a,b)=>rank(a.id)-rank(b.id));
const structuredData = { '@context':'https://schema.org', '@type':'Person', name:profile.name, alternateName:profile.chineseName, affiliation:{'@type':'CollegeOrUniversity',name:profile.affiliation}, sameAs:[profile.scholar,profile.github], knowsAbout:['Long-context modeling','Multimodal large language models'] };
function renderRepositoryStats(lang) {
  const zh = lang === 'zh';
  const stats = [
    ['stargazers_count','Stars','star','stargazers'],
    ['forks_count','Forks','fork','forks'],
    ['subscribers_count','Watchers','eye','watchers']
  ];
  for (const [field] of stats) {
    if (!Number.isSafeInteger(repository[field]) || repository[field] < 0) throw new Error(`Invalid GitHub statistic: ${field}`);
  }
  const date = new Date(repository.checked_at);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid GitHub statistics date');
  const formattedDate = new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {year:'numeric',month:zh ? 'numeric' : 'short',day:'numeric',timeZone:'Asia/Shanghai'}).format(date);
  return `<div class="project-stats" role="group" aria-label="${zh ? 'GitHub 项目影响力' : 'GitHub project impact'}" data-repository="${e(repository.full_name)}" data-checked-at="${e(repository.checked_at)}" data-stats-source="snapshot">${stats.map(([field,label,glyph,route])=>ext(`${repository.html_url}/${route}`,`${icon(glyph,17)}<span><strong data-repo-count="${field}">${repository[field].toLocaleString('en-US')}</strong><span class="repo-stat-label">${label}</span></span>`,'repo-stat')).join('')}</div><p class="stats-meta">GitHub · ${zh ? '更新于' : 'Updated'} <time data-repo-updated datetime="${e(repository.checked_at)}" title="${e(repository.checked_at)}">${e(formattedDate)}</time></p>`;
}
function renderPage(lang) {
  const zh = lang === 'zh';
  const t = (en, cn) => zh ? cn : en;
  const prefix = zh ? '../' : '';
  const name = t(profile.name,profile.chineseName);
  const affiliation = t(profile.affiliation,profile.affiliationZh);
  const updated = t(profile.updated,profile.updatedZh);
  const scholar = profile.scholar.replace('hl=en',zh ? 'hl=zh-CN' : 'hl=en');
  const yearGroups = years.map(year=>`<div class="publication-year"><h3 class="year-heading">${year}</h3>${papers.filter(p=>p.year===year).map(p=>renderPaper(p,lang)).join('\n')}</div>`).join('\n');
  const description = t(`${profile.name}'s academic homepage. Research on long-context language models, multimodal learning, publications, and TinyLLaVA Factory.`,`${profile.chineseName}的学术主页，研究方向包括长上下文建模和多模态大语言模型。收录论文与 TinyLLaVA Factory 开源项目。`);
  return `<!doctype html>
<html lang="${t('en','zh-CN')}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ffffff">
<title>${e(name)} | ${e(affiliation)}</title><meta name="description" content="${e(description)}">
<meta property="og:type" content="profile"><meta property="og:title" content="${e(name)} — ${t('Academic Homepage','学术主页')}"><meta property="og:description" content="${e(description)}">
<link rel="alternate" hreflang="en" href="${zh ? '../' : './'}"><link rel="alternate" hreflang="zh-CN" href="${zh ? './' : 'zh/'}">
<link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${prefix}styles.css"><script src="${prefix}app.js" defer></script>
<script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g,'\\u003c')}</script></head>
<body><a class="skip-link" href="#main">${t('Skip to content','跳到正文')}</a>
<header class="site-header"><div class="header-inner">
  <a class="brand" href="#about"><span class="brand-mark" aria-hidden="true">JJ</span>${e(name)}</a>
  <div class="header-actions"><nav class="nav" id="main-nav" aria-label="${t('Main navigation','主导航')}">
    <a href="#about" class="active">${t('About','关于我')}</a><a href="#publications">${t('Publications','学术论文')}</a><a href="#open-source">${t('Open Source','开源项目')}</a>${ext(scholar,`Scholar ${icon('arrow',12)}`,'external')}
  </nav><a class="language-link" href="${zh ? '../' : 'zh/'}" lang="${t('zh-CN','en')}" hreflang="${t('zh-CN','en')}" aria-label="${t('切换为中文','Switch to English')}">${t('中文','English')}</a><button class="menu-button" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="${t('Toggle navigation','展开或收起导航')}">${icon('menu',20)}</button></div>
</div></header>
<div class="page-layout"><aside class="profile" aria-label="${t('Personal profile','个人资料')}">
  <div class="portrait-wrap"><img class="portrait" src="${prefix}${e(profile.photo)}" alt="${e(name)}" width="152" height="152"></div>
  <h1>${e(name)}</h1><p class="chinese-name" lang="${t('zh-CN','en')}">${e(t(profile.chineseName,profile.name))}</p><p class="profile-role">${e(t(profile.role,profile.roleZh))}</p><p class="affiliation">${e(affiliation)}</p><p class="department">${e(t(profile.department,profile.departmentZh))}</p>
  <div class="profile-links">${ext(scholar,`${icon('scholar',16)} ${t('Google Scholar','谷歌学术')}`)}${ext(profile.github,`${icon('github',15)} GitHub`)}${profile.email ? `<a href="mailto:${e(profile.email)}">${icon('mail',15)} ${t('Email','邮箱')}</a>` : ''}</div>
  <p class="sidebar-label">${t('RESEARCH INTERESTS','研究方向')}</p><ul class="sidebar-topics"><li>${t('Long-context modeling','长上下文建模')}</li><li>${t('Multimodal language models','多模态大语言模型')}</li><li>${t('Efficient data &amp; training','高效数据与训练')}</li></ul><p class="sidebar-note">${t('Last updated','最近更新')} · ${e(updated)}</p>
</aside>
<main class="content" id="main"><section class="about-section" id="about" aria-labelledby="about-title">
  <p class="eyebrow">${t('About me','关于我')}</p><h2 class="intro-title" id="about-title">${e(t(profile.intro,profile.introZh))}</h2><p class="bio">${e(t(profile.bio,profile.bioZh))}</p>
  <div class="research-topics" aria-label="${t('Research topics','研究主题')}"><span class="topic-chip"><span></span>${t('Long-context modeling','长上下文建模')}</span><span class="topic-chip"><span></span>${t('Multimodal learning','多模态学习')}</span><span class="topic-chip"><span></span>${t('Efficient training','高效训练')}</span></div>
</section>
<section class="project-section" id="open-source" aria-labelledby="project-title">
  <div class="section-heading"><h2 id="project-title">${t('Open Source','开源项目')}</h2>${ext('https://github.com/TinyLLaVA/TinyLLaVA_Factory',`${t('View on GitHub','在 GitHub 查看')} ${icon('arrow',12)}`,'section-link')}</div>
  <article class="project-card"><div class="project-copy"><div class="project-eyebrow">${icon('github',13)} ${t('FEATURED PROJECT','代表项目')}</div><h3>TinyLLaVA Factory</h3><p>${t('A modular framework for building small-scale multimodal models, with interchangeable model components and reproducible training recipes.','面向小规模多模态大模型的模块化框架，支持灵活替换模型组件，并提供可复现的训练方案。')}</p>
  ${renderRepositoryStats(lang)}
  <div class="project-actions">${ext('https://github.com/TinyLLaVA/TinyLLaVA_Factory',`${t('Repository','代码仓库')} ${icon('arrow',11)}`)}${ext('https://arxiv.org/abs/2405.11788',t('Paper','论文'))}${ext('https://tinyllava-factory.readthedocs.io/en/latest/',t('Docs','文档'))}${ext('https://huggingface.co/tinyllava',t('Models','模型'))}</div></div>
  <figure class="project-image"><a href="${prefix}assets/tinyllava-architecture.jpg" target="_blank" rel="noopener" aria-label="${t('View full TinyLLaVA Factory architecture diagram','查看 TinyLLaVA Factory 完整架构图')}"><img src="${prefix}assets/tinyllava-architecture.jpg" alt="${t('TinyLLaVA Factory architecture with interchangeable language models, vision encoders, connectors, and training recipes','TinyLLaVA Factory 架构，包含可替换的语言模型、视觉编码器、连接器和训练方案')}" width="1598" height="913" loading="lazy"></a><figcaption>${t('Modular by design. Open for research.','模块化设计，为研究而开源。')}</figcaption></figure></article>
</section>
<section class="publication-section" id="publications" aria-labelledby="publication-title">
  <div class="section-heading publication-heading"><h2 id="publication-title">${t('Publications','学术论文')} <span class="section-number">${papers.length}</span></h2>${ext(scholar,`${t('Google Scholar','谷歌学术')} ${icon('arrow',12)}`,'section-link')}</div><p class="section-description">${t('Papers and preprints, grouped by year. My name is highlighted.','按年份列出论文与预印本，作者列表中加粗标注本人姓名。')}</p>
  <div class="publication-tools" hidden><div class="filters" role="group" aria-label="${t('Filter publications by topic','按研究主题筛选论文')}"><button class="filter active" type="button" data-filter="all" aria-pressed="true">${t('All work','全部')}</button><button class="filter" type="button" data-filter="long-context" aria-pressed="false">${t('Long context','长上下文')}</button><button class="filter" type="button" data-filter="multimodal" aria-pressed="false">${t('Multimodal','多模态')}</button><button class="filter" type="button" data-filter="foundations" aria-pressed="false">${t('Foundations','基础研究')}</button></div>
  <label class="search-wrap">${icon('search',13)}<input class="search-input" type="search" placeholder="${t('Search publications…','搜索论文…')}" aria-label="${t('Search publications','搜索论文')}" autocomplete="off"></label></div>
  <p class="results-status" aria-live="polite" role="status"></p>${yearGroups}<p class="empty-state" hidden>${t('No publications match your search.','没有找到匹配的论文。')}</p>
</section></main></div>
<footer class="site-footer"><span>© ${e(name)} · ${e(updated)}</span><div class="footer-links">${ext(scholar,t('Scholar','谷歌学术'))}${ext(profile.github,'GitHub')}<a href="${prefix}data/publications.bib" download>${t('Download BibTeX','下载 BibTeX')}</a><a href="#about">${t('Back to top','返回顶部')} ↑</a></div></footer>
<dialog class="dialog" aria-labelledby="citation-title"><div class="dialog-header"><h2 id="citation-title">${t('BibTeX citation','BibTeX 引用')}</h2><button class="close-dialog" type="button" aria-label="${t('Close citation','关闭引用')}">×</button></div><pre id="citation-text" tabindex="0"></pre><button class="copy-button" type="button">${t('Copy BibTeX','复制 BibTeX')}</button><span class="dialog-status" role="status" aria-live="polite"></span></dialog>
</body></html>`;
}
await mkdir(path.join(root,'dist/data'),{recursive:true});
await mkdir(path.join(root,'dist/zh'),{recursive:true});
await writeFile(path.join(root,'dist/index.html'),renderPage('en'));
await writeFile(path.join(root,'dist/zh/index.html'),renderPage('zh'));
await writeFile(path.join(root,'dist/data/publications.json'), JSON.stringify(papers,null,2)+'\n');
await writeFile(path.join(root,'dist/data/publications.bib'),papers.map(bibtex).join('\n\n')+'\n');
// Keep a root copy for repositories already configured to publish main / (root).
for (const filename of ['index.html','styles.css','app.js','.nojekyll']) {
  await copyFile(path.join(root,'dist',filename),path.join(root,filename));
}
await cp(path.join(root,'dist/assets'),path.join(root,'assets'),{recursive:true});
await cp(path.join(root,'dist/zh'),path.join(root,'zh'),{recursive:true});
await copyFile(path.join(root,'dist/data/publications.bib'),path.join(root,'data/publications.bib'));
console.log(`Generated English and Chinese pages: ${papers.length} publications (${research.publications.length} Scholar + ${(research.additional_publications||[]).length} additional preprint).`);
