# Miracle2Master 笔记站

基于 [VitePress](https://vitepress.dev/) 的个人学习笔记站。

## 本地调试

在项目根目录执行：

```bash
npm install          # 首次需要，安装依赖
npm run docs:dev     # 启动开发服务器，浏览器打开 http://localhost:5173/
```

- 改 `docs/` 下的 `.md` 笔记，页面会实时刷新。
- 别双击 `index.html` 打开，那样是 `file://` 协议，会白屏。

## 构建（生成最终网页文件）

```bash
npm run docs:build    # 生成到 .vitepress/dist/
npm run docs:preview  # 本地预览构建结果 http://localhost:4173/
```

## 线上部署

本仓库用 GitHub Actions 自动构建部署到 GitHub Pages。

### 一次性设置（必做）

在仓库网页上：

> **Settings → Pages → Build and deployment → Source** 选 **"GitHub Actions"**

（如果这里选的是 "Deploy from a branch"，会用 Jekyll 错误地渲染笔记，导致 `{%` 报错、站点 404。）

### 日常发布

```bash
git add -A
git commit -m "更新笔记"
git push
```

push 到 `main` 后，GitHub Actions 会自动运行 `npm run docs:build` 并发布，无需手动构建。

## 增删笔记

只需在 `docs/` 下增删或修改 `.md` 文件：

- 新增、删除、改名笔记后，首页目录和侧边栏会**自动**更新（程序扫描 `docs/` 生成），无需手动改任何配置。
- 笔记标题自动取自 md 里第一个 `# 一级标题`。
- 按所在文件夹自动分组；根目录散落的 md 归入「其他」组。

## 目录结构

```
docs/             # 笔记源码（Markdown），按文件夹分组
.vitepress/       # VitePress 配置与主题
  config.mts      # 站点配置（base、侧边栏自动生成逻辑）
  theme/          # 自定义主题（首页 NoteList 组件）
.github/workflows/deploy.yml   # 自动部署脚本
CLAUDE.md         # 项目宪法
```
