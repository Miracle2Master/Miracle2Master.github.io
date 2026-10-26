# Miracle2Master 笔记站

基于 [VitePress](https://vitepress.dev/) 的个人学习笔记站。

## 本地调试

### 方式一：开发服务器（实时刷新，适合写笔记/调样式，但主容器内笔记图片不显示）

在项目根目录执行：

```bash
npm install          # 首次需要，安装依赖
npm run docs:dev     # 启动开发服务器，浏览器打开 http://localhost:5173/
```

- 改 `docs/` 下的 `.md` 笔记，页面会实时刷新。
- 别双击 `index.html` 打开，那样是 `file://` 协议，会白屏。
- ⚠️ 主容器内阅读的笔记图片需要构建产物（`dist/assets`），dev 模式下**图片可能不显示**。

### 方式二：构建 + 预览（与线上一致，笔记图片正常显示，适合调试主容器阅读/图片）

```bash
npm run docs:build    # 构建到 .vitepress/dist/（图片重写为 /assets/hash.png）
npm run docs:preview  # 预览构建产物，浏览器打开 http://localhost:4173/
```

- 与线上部署（GitHub Actions `docs:build` + 发布 dist）**完全一致**。
- 每次改动代码/笔记后需要重新 `npm run docs:build`，再刷新预览。

### 方式三：一键构建 + 预览脚本（推荐，改动后只需一条命令）

```bash
npm run docs:dev-build
```

- 等价于 `npm run docs:build && npm run docs:preview`，一条命令搞定构建 + 启动预览。
- 浏览器打开 `http://localhost:4173/` 查看。
- 每次改完代码/笔记，重新执行这条命令，再刷新页面即可看到最新效果。
- 首次需要 `npm install` 安装依赖。

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
