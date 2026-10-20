# 学术个人主页

一个可直接部署到 GitHub Pages 的中英双语个人主页，包含个人介绍、论文列表和 TinyLLaVA Factory 项目。英文首页位于 `/`，中文页位于 `/zh/`，通过导航栏的“中文 / English”链接切换。使用 Node.js 内置功能生成 HTML，无需安装 npm 依赖。

## 本地预览

修改资料后，在本目录运行生成命令，再启动本地服务器（需要 Node.js 和 Python 3）：

```sh
node scripts/build.mjs
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

浏览器打开英文页 <http://127.0.0.1:8000/> 或中文页 <http://127.0.0.1:8000/zh/>。按 `Ctrl+C` 停止。论文已写入生成的 HTML，即使禁用 JavaScript 也可阅读；主题筛选、搜索和 BibTeX 弹窗通过 JavaScript 启用。

## 编辑内容

- `data/profile.json`：姓名、单位、介绍、头像路径和个人链接；`affiliationZh`、`departmentZh`、`introZh`、`bioZh` 和 `updatedZh` 为对应的中文资料。
- `data/publications.json`：论文、作者、年份、会议、链接和核验来源；`summary` 为英文简介，`summary_zh` 为中文简介。
- `data/SOURCES.txt`：资料核验记录与不同论文版本的说明。
- `scripts/build.mjs`：将同一份资料生成为中英文 HTML、论文 JSON 和 BibTeX。
- `dist/styles.css`：颜色、排版和响应式布局。
- `dist/app.js`：筛选、搜索、导航和 BibTeX 交互。
- `dist/assets/`：本地头像、TinyLLaVA Factory 架构图和图标。

请编辑源数据后重新运行 `node scripts/build.mjs`。`dist/index.html`（英文）、`dist/zh/index.html`（中文）、`dist/data/publications.json` 和 `dist/data/publications.bib` 为生成文件，直接编辑会在下次生成时被覆盖。两种语言共用样式、脚本、图片和 BibTeX；论文标题和作者保留原文。增补论文时按现有字段格式填写中英文简介，并将 `scripts/build.mjs` 中的论文顺序和主题映射同步调整。

截至 2026 年 10 月 20 日，页面收录了所提供 [Google Scholar 主页](https://scholar.google.com/citations?user=c9vYGLgAAAAJ&hl=zh-CN)中的全部 7 篇论文，并另收录 [LongForge](https://arxiv.org/abs/2610.23167) 最新预印本。会议和作者信息经 arXiv、官方会议论文集交叉核验；PolicyLong 与 EntropyLong 的版本作者差异保存在源数据中。具体来源见每篇论文的 `sources` 字段和 `data/SOURCES.txt`。

头像从上述公开 Scholar 主页下载保存在本地，项目架构图来自 [TinyLLaVA Factory 仓库](https://github.com/TinyLLaVA/TinyLLaVA_Factory)。可替换 `dist/assets/profile.jpg` 为自己的清晰照片。博士生身份和公开邮箱来自原有 GitHub 主页的 `index.md`；可在 `data/profile.json` 中修改后重新生成。主页资料为本次核验的静态快照，后续论文需要手动更新。

## 部署为 GitHub 个人主页

1. 使用已确认的 GitHub 账号 `jiajunlong` 新建公开仓库，名称为 `jiajunlong.github.io`。
2. 将**本目录里的所有站点文件**放在新仓库根目录，包含 `.github/workflows/pages.yml`、`data/`、`scripts/` 与 `dist/`。不要把整个 `academic-homepage` 文件夹作为仓库内的一层子目录。默认分支使用 `main`。
3. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
4. 提交文件后，在 **Actions → Deploy academic homepage** 查看运行情况；如果首次提交早于 Pages 设置，也可点击 **Run workflow** 手动部署。
5. 部署成功后访问英文首页 <https://jiajunlong.github.io/> 或中文页 <https://jiajunlong.github.io/zh/>；部署任务也会显示实际网址。

可以通过 GitHub 网页上传文件，但请确认隐藏的 `.github` 目录也已上传。已有本地 Git 仓库时，可将这些文件提交并推送到该仓库的 `main` 分支。

工作流先运行 `node scripts/build.mjs` 重新生成页面，再将 `dist/` 发布；在 `main` 分支更新后自动部署，也支持手动运行。它使用 GitHub 提供的 `GITHUB_TOKEN`，无需配置个人访问令牌或其他 Secrets。如果账号或组织限制了 Actions，或 `github-pages` 环境设置了审批规则，需要先满足对应的仓库策略。

部署流程依据 [GitHub Pages 官方工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

兼容已有发布配置：生成脚本同时把站点输出到仓库根目录（`index.html`、`zh/`、`assets/`、`styles.css`、`app.js`、`.nojekyll`、`data/publications.bib`），可沿用 `main / (root)` 的 Pages 发布来源。根目录输出为生成文件，请修改 `dist/styles.css`、`dist/app.js` 或源数据后重新生成。原有 `index.md` 与 `_config.yml` 保留，`.nojekyll` 使它们不参与新站点的渲染。
