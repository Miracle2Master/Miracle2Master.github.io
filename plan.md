# 计划书：为笔记站添加登录保护

> 日期：2026-09-16
> 状态：**登录保护待用户决策**（未实施）；**外观改版已按方案 A 完成**（2026-09-16，见第七节）

## 一、背景与目标

当前 `Miracle2Master.github.io` 是部署在 GitHub Pages 上的 **VitePress 静态站点**，所有笔记（67 个 md 文件）公开可访问。用户希望加一层登录保护，让不能所有人都直接看。

## 二、前提约束

- **无服务器**：站点是纯静态托管（GitHub Pages），没有后端，无法做真正的服务端鉴权。
- 数据在构建期打包成静态 HTML 发布，源码里的内容等于线上内容。
- 站点使用自定义主题（`HomeLayout.vue`、`NoteList.vue` 等），笔记源码在 `docs/`，构建产物在 `.vitepress/dist/`。

## 三、选定的方案：前端密码门（纯静态，无服务器）

### 3.1 原理

所有页面在内容渲染前，先弹出一个密码门遮罩；输对密码才显示内容，并用 `sessionStorage` 记住登录状态（一次登录，整站可看）。

### 3.2 安全设计

- 密码**不写明文**，用不可逆的 SHA-256 哈希比对，源码里看不到明文密码。
- 登录状态存 `sessionStorage`（关浏览器即失效），不写 localStorage。

### 3.3 实施步骤（全在 VitePress 主题层，不碰 `docs/` 笔记源码）

1. 生成密码哈希：`echo -n "密码" | sha256sum`（Windows 可用 Git Bash 或 PowerShell `Get-FileHash`）。
2. 新建 `.vitepress/theme/passwordGuard.ts`：遮罩组件 + 密码校验 + sessionStorage 记忆逻辑。
3. 修改 `.vitepress/theme/index.ts` 的 `Layout`，把遮罩挂到整站所有页面。
4. 样式内联在组件内，不依赖外部文件。

### 3.4 改动文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `.vitepress/theme/passwordGuard.ts` | 新增 | 遮罩组件与校验逻辑 |
| `.vitepress/theme/index.ts` | 修改 | 挂载密码门到整站 Layout |
| `plan.md` | 新增 | 本计划书 |

`docs/` 下所有笔记 md **一律不动**。

## 四、局限（必须知晓）

- 内容仍以 HTML 明文存在于 GitHub 仓库中，**防不了技术高手**（查看源码即可绕过）——本方案防的是"顺手点进来的普通访客"。
- 需要提醒用户：不要把真正私密、不能泄露的内容放进来。

## 五、备选方案（记录，供以后考虑）

| 方案 | 强度 | 代价 |
|------|------|------|
| A. 前端密码门（选定） | 低-中，防普通访客 | 零成本，5 分钟接入 |
| B. PageCrypt 整页 AES 加密 | 中，防直接阅读 | 页面加密后仍可暴力破解；与 VitePress 多页架构集成较繁琐 |
| C. 换 Netlify 托管 + 平台密码认证（服务端 401） | 高，真正拦截 | 需迁移部署；免费额度内可用 |
| D. GitHub 私有仓库 | 最高，最彻底 | 需 GitHub Pro 付费；访问者需有 GitHub 账号且接受仓库邀请；不再适合作为公开站点 |
| E. 笔记级 AES 加密 + 部署时解密（需私有仓库放密钥） | 高，源码无法直接读 | 构建流程复杂；密钥管理有风险 |

## 六、待用户决策

- [ ] 是否采用方案 A（前端密码门）？
- [ ] 单密码，还是 用户名+密码 双输入？
- [ ] 密码具体用什么？
- [ ] 是否对访问频率 / 分享链接做额外限制？

> 用户当前状态：**先想想，以后再决定**，本计划书暂不实施。

---

## 七、外观改版方案 A（极客/程序员风）— 已完成

> 2026-09-16 实施完成，构建通过（`npm run docs:build` 成功，68 个 HTML 全部注入默认深色）。

### 7.1 设计决策（已确认）

| 决策点 | 选择 |
|--------|------|
| 风格方向 | A 极客/程序员风（深色为主） |
| 深色策略 | **默认深色，可切换**（构建期注入 `class="dark"`，右上角按钮保留） |
| 等宽字体 | 纯系统栈（Consolas 等，零外部请求） |

### 7.2 改动文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `.vitepress/theme/style.css` | 修改 | 品牌色（青 `#22d3ee`）+ 极客冷灰 + 深色变量 + hero/按钮/代码/引用样式 |
| `.vitepress/theme/HomeNoteList.vue` | 修改 | 目录卡片荧光青描边 + hover 发光 + 标签青色填充 |
| `.vitepress/theme/NoteList.vue` | 修改 | 升级为响应式卡片网格（与首页统一） |
| `.vitepress/config.mts` | 修改 | `transformHtml` 构建期给所有页面注入默认 `class="dark"` |
| `docs/index.md` | 修改 | hero 增加次按钮「分类索引」，tagline 极客化（`//` 注释风） |
| `plan.md` | 修改 | 追加本记录 |

`docs/` 下 67 篇笔记 **未改动**。

### 7.3 设计明细

- **品牌色**：主青 `#22d3ee` / hover `#67e8f9` / 深青 `#06b6d4`；浅色同色系。
- **深色底**：`#0b1220` 冷黑 + 冷灰文字；代码块 `#0a101d`。
- **默认深色实现**：`config.mts` 的 `transformHtml` 在构建时给每个 `<html>` 加 `class="dark"`；用户手动切浅色后由 VitePress 的 localStorage（`vitepress-theme-appearance`）接管，刷新后尊重用户选择。
- **hero**：深色下青色渐变发光标题；主按钮青渐变 + 发光，次按钮青描边透明底。
- **目录卡片**：`rgba(34,211,238,.28)` 边框 + hover 青发光；标签 hover 青色填充（文字转深色）。
- **正文**：inline code 青底青字、引用青色竖线、代码块深色底。

### 7.4 验证结果

- `npm run docs:build` 通过（26s）。
- 68 个 HTML 均含 `<html ... class="dark">`（含 404 页）。

### 7.5 备注

- 构建产物 `.vitepress/dist/` 未提交（.gitignore 忽略），线上由 GitHub Actions 重新构建。
- 密码门（方案 A 登录保护）仍**待你决策**，需要时在第三节基础上继续。

---

## 八、笔记主容器阅读 + 图片路径 — 方案记录

> 2026-10-24 前后完成，与「笔记子页面 → 主容器内阅读」重构相关。

### 8.1 背景

顶部二级导航与笔记点击不再整页跳转，改为在首页 main 容器内就地阅读（`LearningPane.vue` + `NoteView.vue` 三栏：左文件目录 / 中正文 / 右本页目录）。

### 8.2 图片 404 根因（已修复，方案 A）

- **现状 A（已实施）**：自建渲染（`config.mts` 的 `buildNoteContent` 用 markdown-it 渲染笔记正文）**绕过了 VitePress 的图片管线**，`<img src="img/xxx.png">` 保留相对路径，构建产物根目录下没有 `img/` → 404。
- **修复**：`buildNoteContent` 构建期建立「docs 源图片 → `dist/assets/hash`」映射（`buildImgHashMap`），把相对 src 重写为 `/assets/hash.png`（`rewriteImgSrcs`）。dev 下退回源目录相对路径（VitePress dev server 可映射），build 下对齐 VitePress 独立页机制。同名图片内容相同、hash 唯一，无冲突。
- **验证**：`docs:build` 通过，产物中笔记 `<img src="/assets/1778250034231-58.BzGY-B6h.png">` 正确。

### 8.3 备选方案 B（更规范，未实施，留待考虑）

回归 **VitePress 标准 markdown 管线**渲染笔记正文（像独立页那样），由 VitePress 自动：
1. 扫描 `docs/` 图片 → 拷贝到 `dist/assets/` 并加 hash；
2. 自动把 `<img src>` 重写为 `/assets/hash.png`；
3. dev / build 行为一致。

代价：需要放弃自建 `markdown-it` 渲染，笔记正文的渲染方式要大改（涉及 `buildNoteContent`、`LearningPane`、`NoteView` 的数据来源）。好处：不维护手动映射，长期更规范、更抗变动（新增图片自动处理）。

> 若以后自建渲染暴露出更多与 VitePress 机制的摩擦，优先考虑切到 B。

---

## 九、目录重构 + 动态二级导航 — 实施计划

> 日期：2026-10-25
> 状态：**待实施**（等 9.10 的待确认项拍板后动手）

### 9.1 目标与最终效果

**一句话**：二级导航里**只有「首页」是写死的固定项**，笔记 / 日记 / 归档三项全部由构建期扫描 `docs/` 的一级子文件夹得出——即 `docs/` 下每个一级子文件夹 = 二级导航里的一项。导航清单不再写死，新增栏目只需建文件夹。

**改造完成后，用户看到的样子**

顶部二级导航（`SecNav`，标题栏下方那条）：

```
首页 │ 笔记 │ 日记 │ 归档
```

四项的来源：

| 导航项 | 来源 |
|--------|------|
| 首页 | 代码里写死的固定项（`HOME_KEY`），**不在扫描结果里** |
| 笔记 | 扫描到 `docs/notes/` |
| 日记 | 扫描到 `docs/diary/` |
| 归档 | 扫描到 `docs/archive/` |

需要说清楚的是分工：**扫描决定「有哪些项、各自指向哪个目录」**；显示文字与排列顺序仍来自两张小表（`SECTION_LABELS` / `SECTION_ORDER`，见 9.4），未登记的目录直接用文件夹名。两张表各只有几行，加新分区各加一行即可，不必碰 `SecNav.vue`。

四个入口的行为：

| 点击 | 内容区显示什么 | URL |
|------|----------------|-----|
| 首页 | 站名横幅「奇迹师 笔记站」+ 关于我 | `/` |
| 笔记 | 笔记列表：Spring / 机器学习 / 深度学习 / 周志华机器学习笔记 / 微服务 五张卡片。点卡片 → 分类列表；点标签 → 三栏阅读（左文件目录 / 中正文 / 右本页目录） | `/#notes` |
| 日记 | 年份网格（2025 / 2026）。点年份 → 年份页（左日记列表 / 右正文，点正文弹密码门） | `/#diary` |
| 归档 | 归档文件夹页面列表（当前为空 → 「该分区暂无页面。」），点某一项**在内容区就地展开** | `/#archive` |

全站**不跳页**（除直接访问独立页），四个入口都是首页内容区的就地切换，这与你选定的「保持首页 Tab 联动」一致。

**开发者视角**

- 新增栏目 = 在 `docs/` 下建一个文件夹、放 md → 重启构建，导航自动多一项，**不用改 `SecNav.vue`**（想要中文名和指定顺序，就在 `SECTION_LABELS` / `SECTION_ORDER` 各补一行；不补则显示文件夹名、排在表外）。
- 该栏目**不用写任何组件**：未在 `SECTION_PANES` 注册的分区会自动落到通用兜底 pane，列出该目录下所有页面并支持就地阅读（`archive` 就是这么来的）。
- **空文件夹也会出现在导航里**（见 9.5.2）：先建目录、以后再放内容，这是被支持的用法，不需要拿壳页占位。
- 想让某个分区有专属体验（如笔记的三栏阅读、日记的年份网格），才需要在 `HomeNoteList.vue` 的 `SECTION_PANES` 里注册一次（Vue 组件无法从配置文件序列化过去，只能放在 theme 层）。

**顺带修掉的既有缺陷**：`SecNav.vue:25-35` 现在的独立页高亮逻辑只判断 `/notes`、`/planning` 两个前缀。真实笔记页路径是 `/<一级目录>/<文件>.html`（如 `/Spring/AI/x.html`），两个前缀都不匹配 → **直接访问独立笔记页时二级导航一个都不亮**。本次改成「路径第一段 = 分区 key」的统一判定后，该问题自然消失，无需额外打补丁。

### 9.2 已确认决策

| 决策点 | 选择 |
|--------|------|
| 分区目录名 | `docs/notes/`（笔记）、`docs/diary/`（日记）、`docs/archive/`（归档） |
| 孤儿页处理 | `notes.md`、`planning.md` **移入 `docs/archive/`**，导航因此多出「归档」一项（**后已推翻，见下行**） |
| 导航点击行为 | **保持首页 Tab 联动**（就地切换，不跳页） |
| **归档 Tab 内容（最终）** | **归档 = 一个普通内容文件夹**，和 `notes/`、`diary/` 同性质：显示 `docs/archive/` 自己的 md，不再跨目录聚合。两个孤儿壳页已删除；`ArchivePane.vue` 已删除；归档走通用兜底 `SectionPagesPane`（见 9.5.2） |
| 导航文字来源 | 目录名 → 显示名映射表，未登记的目录直接用目录名 |
| 冗余图片 `docs/img/` | **删除**（已二次核验无引用，见 9.2.1） |
| `plan.md` | 追加为新章节（即本节），旧内容保留 |
| `docs/category/` 分类页 | **C 自动生成**：删 9 个手写 md，改 VitePress 动态路由；扫描 `notes/` 下**所有层级**含 md 的目录（共 14 个），见 9.7.1 |
| `buildSidebar()` 死代码 | **A 删除**（连带 `firstTitle()` / `orderOf()` / `type SidebarItem` / L45 `EXCLUDED` / `basename` 导入） |
| `SectionNav.vue` | **B 从年份页移除**（见 9.10 第七项说明） |
| 分区切换 hash | `#notes` / `#diary` / `#archive`（计划原案） |
| 分类点击行为 | **直接显示该分类 order 最小的笔记正文**（分类页与首页卡片两处统一）；原「查看全部清单」入口保留（见 9.7.2） |

#### 9.2.1 `docs/img/` 删除前的二次核验结果

| 核验方式 | 结果 |
|----------|------|
| 解析全部 894 条本地图片引用，判断解析后路径是否落在 `docs/img/` 下 | **0 条** |
| 全项目文本搜索 `docs/img` 路径（含 `*.md` / `*.vue` / `*.ts` / `*.mts` / `*.css` / `*.html` / `*.json` / `README.md` / `vp-icons.css` / `hashmap.json`） | 仅命中 `plan.md` 自身，**无实际引用** |
| `docs/img/` vs `docs/Spring/img/` 文件名集合 | 完全一致（115 个） |
| 逐文件 MD5 比对 | **115 个全部一致，0 个不同** |
| 构建产物 `.vitepress/dist/img/` | 不存在（Vite 未把它复制进产物，说明没有任何资源引用它） |

结论：`docs/img/` 是 `docs/Spring/img/` 的一份完整副本（8.8 MB），且被 git 跟踪，但**没有任何页面引用它**。删除安全。

> 注意：`docs/Spring/img/` 会随 `Spring/` 一起搬进 `docs/notes/Spring/img/`，这才是真正被引用的那份（701 条 `img/xxx.png` 引用都指向各自父目录下的 `img/`）。**删的只是根目录那份副本。**

### 9.3 目标目录结构

```
docs/
├── index.md                 首页（不变）
├── notes/                   ★ 新建：全部学习笔记
│   ├── Spring/              （整体搬入，含 Spring/img、Spring/Redis/img 等）
│   ├── 机器学习/            （含 img/）
│   ├── 深度学习/
│   ├── 周志华机器学习笔记/   （含 补充/）
│   └── 微服务/              （含 img/）
├── diary/                   ★ 新建：原 docs/planning/ 整体搬入
│   ├── 日记/
│   │   ├── 2025.md          年份壳页（layout: PlanningYear）
│   │   ├── 2026.md
│   │   ├── 2025/  2026/     各年日记
│   │   └── claude.md / 原则.md / plan.md / 日记评价与建议.md
│   └── 目标与方向.md
├── archive/                 ★ 普通内容文件夹（导航「归档」），当前为空，只有 .gitkeep
│                              （原 notes.md / planning.md 两个壳页已删除，见 9.5.1）
├── category/                ★ 手写 md 全删，改动态路由自动生成（见 9.7.1）
│   ├── [name].md            唯一模板页（内容只有一行 <CategoryPage />）
│   └── [name].paths.ts      构建期扫描 notes/ 所有层级含 md 的目录（14 个）
├── img/                     ★ 删除（冗余副本，已核验无引用）
└── public/                  保持不动（VitePress 公共资源，静态直出，不是分区）
```

**同一次操作里要删掉的旧分类页 md**（9 个，**都是纯壳，正文只有 `# 标题` + `<CategoryList name="…" />`**）：

```
docs/category/Spring.md               docs/category/一、Docker容器.md
docs/category/周志华机器学习笔记.md       docs/category/五、ES.md
docs/category/微服务.md                docs/category/六、Redis.md
docs/category/机器学习.md               docs/category/四、MQ.md
docs/category/深度学习.md
```

> 删掉它们不丢任何功能：其中 4 个（`一、Docker容器` / `五、ES` / `六、Redis` / `四、MQ`）**当前渲染就是空的**（已核对构建产物，0 个条目），另外 5 个的内容会由新动态路由按真实目录名重新生成，且覆盖范围更大（14 个）。

**关键点：整棵子目录树一起搬**，md 里的 `img/xxx.png` 相对路径因此全部保持有效，**一篇笔记的正文都不需要改**。

### 9.4 分区扫描规则

在 `config.mts` 新增：

```ts
// 分区目录黑名单：这些目录是站点基础设施，不是内容分区
const NON_SECTION_DIRS = new Set(['img', 'public', 'category', 'node_modules', '.vitepress'])

// 分区目录 → 导航显示文字；未登记的目录直接用目录名
const SECTION_LABELS: Record<string, string> = {
  notes: '笔记',
  diary: '日记',
  archive: '归档'
}

// 导航顺序：先按此表，表外目录按名称排在后面
const SECTION_ORDER = ['notes', 'diary', 'archive']
```

扫描实现（`buildSections()`）：

1. `readdirSync(docsDir)` 取一级条目；
2. 过滤：必须是目录、不在黑名单、不以 `.` 或 `_` 开头；
3. ~~必须至少含 1 个 `.md` 文件（递归）——空目录或纯资源目录不成为导航项~~ → **已改**：**空文件夹同样是分区**，新建 `docs/<名字>/` 后重新构建就会出现导航项（见 9.5.2）；
4. 映射：`{ key: 目录名, text: SECTION_LABELS[目录名] ?? 目录名 }`；
5. 排序：按 `SECTION_ORDER` 的位置，未列出的按 `localeCompare('zh-CN')` 排后面。

**每个分区还要扫出「叶子页清单」**，供两类消费方使用：

| 消费方 | 用途 |
|--------|------|
| 任何未注册专属 pane 的分区（含 `archive`） | 在首页就地列出该文件夹下的页面（标题 + 摘要），点击就地渲染 |

所以扫描结果的数据结构是：

```ts
type SectionPage = {
  title: string          // 页面标题（md 第一个 H1；无 H1 用文件名）
  key: string            // 相对该分区目录的路径，去后缀，如 'notes'、'planning'
  filePath: string       // 相对 docs 的路径，带后缀，如 'archive/notes.md'
  html: string           // 构建期渲染好的正文 HTML（archive 就地渲染要用）
}

type SectionEntry = {
  key: string
  text: string
  pages: SectionPage[]   // 该分区下的全部叶子页（递归）
}

// pageData.sectionNav: SectionEntry[]
```

> **为什么兜底 pane 的 html 要构建期渲染**：和 `noteContent` 一样的理由——运行时没有 markdown 渲染器，`v-html` 只能吃现成 HTML。归档以后放多少页面，体积都跟着它自己走。
>
> `notes` / `diary` 分区也会带一份 `pages`，但它们的正文由各自的 pane（`LearningPane` / `PlanningPane`）用已有机制渲染，`pages` 里的 `html` 对它们不被使用。为避免首页序列化体积翻倍，**`pages[].html` 只对「不在 `PANE_REGISTERED` 里」的分区填充**，其余分区只保留 `title` / `key` / `filePath`（`html` 为空串）。这条规则写在 `buildSections()` 里，注释说明原因。

结果注入到每个页面的 `pageData.sectionNav`（沿用现有 `planningYears` / `noteContent` 的注入模式）。

> 备选：写进 `themeConfig` + 模块类型扩充，可避免每个页面重复序列化一份。当前数组只有 2 项，成本可忽略，先用注入。

### 9.5 数据类型与数据流

**新增类型**（`section.ts`）：

```ts
// 分区的叶子页面（供通用兜底 pane 使用）
export type SectionPage = {
  title: string      // md 第一个 H1；无 H1 用文件名
  key: string        // 相对分区目录、去后缀，如 'notes'、'planning'
  filePath: string   // 相对 docs、带后缀，如 'archive/notes.md'
  html: string       // 构建期渲染好的正文；仅未注册 pane 的分区填充，其余为空串
}

// 一个分区（= docs 下一个一级子文件夹）
export type SectionEntry = {
  key: string        // 目录名，也是导航 key 与 URL 第一段
  text: string       // 导航显示文字
  pages: SectionPage[]
}
```

**`section.ts` 现状 → 目标**

| 现状 | 目标 |
|------|------|
| `type SectionTab = 'home' \| 'learning' \| 'planning'` | 删除该联合类型，改用 `string` |
| `export const sectionTab = ref<SectionTab>('home')` | `export const sectionTab = ref<string>(HOME_KEY)` |
| —（无） | `export const HOME_KEY = 'home'`：首页固定标识，**不出现在扫描结果里** |
| —（无） | `setSection(key)`：改 `sectionTab` 并同步 URL（首页回 `/`，其余 `#<key>`） |

> **实做调整**：`SECTION_PANES` / `WIDE_SECTIONS` **没有**放进 `section.ts`，而是放在 `HomeNoteList.vue` 里。原因是它们只在 `HomeNoteList` 的模板里被消费，`section.ts` 若引入这些组件会形成「状态文件 → 组件 → 状态」的循环依赖链，且 `section.ts` 会被非组件模块（如 `SecNav`）引用。放回纯状态文件只保留 `HOME_KEY` / `sectionTab` / `setSection` 三样东西，职责更干净。
>
> `SectionPagesPane` 也不在 `section.ts`，而是由 `HomeNoteList.vue` 直接 import 作为兜底。

> `home` 也放进 `SECTION_PANES`，是为了让 `HomeNoteList` 的模板只剩一条渲染路径（不用为首页单开一个分支）。导航栏里首页是固定项，扫描结果不包含它。

**数据流**

```
config.mts buildSections()
   └─ transformPageData → pageData.sectionNav: SectionEntry[]
        ├─ SecNav.vue         渲染导航项 + 高亮判定
        └─ HomeNoteList.vue   渲染对应 pane（SECTION_PANES[key] ?? SectionPagesPane）
```

**为什么 pane 映射留在客户端**：`SECTION_PANES` 的值是 Vue 组件对象，无法从配置文件序列化过去，只能放在 theme 层（实做时放在 `HomeNoteList.vue`，见上方说明）。

**扫描与渲染的分工**（这是整套设计的关键边界）：

| 环节 | 谁负责 | 决定什么 |
|------|--------|----------|
| 扫描 | `config.mts` 的 `buildSections()`（构建期，Node） | **导航里有哪些项**、每项打到哪个目录 |
| 注册 | `HomeNoteList.vue` 的 `SECTION_PANES`（主题层，手写） | **点开后长什么样**（专属 pane） |
| 兜底 | `SectionPagesPane`（主题层，通用） | 未注册的分区自动变成页面列表 |

两者解耦 → 新增一个文件夹，导航立刻有它；不写任何组件也能点开看内容。

### 9.5.1 「归档」Tab 的实现（最终版：普通内容文件夹）

> **本节已按你的要求改写过**。原方案（`ArchivePane.vue` 跨目录聚合 `notes/` + `diary/`）已废弃并删除，保留在下方「原方案留档」里仅作决策痕迹。

**最终定义**：归档 = `docs/archive/` 文件夹本身。它和 `notes/`、`diary/` **完全同性质**——显示这个文件夹里有什么，不显示别处的任何东西。

| 项 | 内容 |
|----|------|
| 数据来源 | **只有 `docs/archive/`**（`buildSections()` 扫出的 `pages[]`） |
| 渲染组件 | 通用兜底 `SectionPagesPane.vue`（`HomeNoteList.vue` 的 `SECTION_PANES` 里**没有** `archive`，自动落到兜底） |
| 有 md 时 | 列出页面卡片（标题 + 80 字摘要），点击就地展开渲染好的正文 |
| 空文件夹时 | 显示「该分区暂无页面。」，导航项仍然存在 |
| 专属组件 | **无**。`ArchivePane.vue` 已删除 |
| 原孤儿页 | `docs/archive/notes.md`、`planning.md` 已删除（正文只有 `<NoteList />` / `<PlanningList />` 两个组件调用，不是内容） |
| git 空目录 | `docs/archive/.gitkeep` 占位，保证目录能进仓库（扫描只统计 `.md`，所以它不影响「空分区」的判断） |

**为什么删 `ArchivePane.vue`**：它的唯一作用是去 `notes/` 和 `diary/日记/` 里捞数据拼成一页。这与你「归档应该指向一个单独文件夹」的要求直接冲突。删掉后，归档自动回落到通用兜底路径——**这也正好证明了「新文件夹无需写组件」这条设计是成立的**。

#### 原方案留档（已废弃）

当时的设计是：`SECTION_PANES` 里注册 `archive: ArchivePane`，由 `ArchivePane.vue` 挂 `<NoteList />`（读 `docs/notes/`）和 `<PlanningList />`（读 `diary/日记/<年份>/`）。难点在于 `archive/notes.md` 的 `<NoteList />` 在构建期只会被渲染成字面文本，不会变成组件，所以必须走组件直挂而非 `v-html`。

该方案的问题：归档的内容全部来自**别的文件夹**，`docs/archive/` 自身只是个空壳。你指出「归档应该和笔记、日记一样指向一个文件夹」后，此方案作废。

#### 分层（最终）

| 分区 | 用哪个 pane | 效果 |
|------|-------------|------|
| `notes` | `LearningPane`（专用） | 卡片列表 → 分类 → 三栏阅读 |
| `diary` | `PlanningPane`（专用） | 年份网格 |
| `archive` | `SectionPagesPane`（兜底） | 列出 `docs/archive/` 自己的页面 |
| 未来任意新目录 | `SectionPagesPane`（兜底） | 同上，无需写代码 |

**扫描决定「导航有没有这一项」，注册决定「点开长什么样」**——两者解耦。

> 兜底 pane 的 `pages[].html` 由 `buildSections()` 构建期填充，**只对不在 `PANE_REGISTERED`（`notes` / `diary`）里的分区填**，避免首页序列化体积翻倍。

### 9.5.2 空文件夹也是分区（你的测试目标）

**要验证的事**：新建一个文件夹、什么都不放，它能不能出现在导航里？

**原实现不能**：`buildSections()` 里有一行 `if (files.length === 0) continue`，空目录被跳过。这正是「归档」当初必须塞两个壳页才出现在导航里的原因。

**改法**（`config.mts`）：

```ts
const files = walk(full)
// 每个一级文件夹都是一个分区，空文件夹同样保留：
// 新建 docs/<名字>/ 后重新构建，导航里就会立刻多出一项（点进去显示「该分区暂无页面」），
// 不需要先放 md、也不需要改配置。
```

即**删掉那行跳过逻辑**。副作用与边界：

| 情况 | 结果 |
|------|------|
| `docs/archive/` 空 | 导航有「归档」，点进去「该分区暂无页面。」 |
| 往里放 `x.md` | 立刻出现页面卡片（已实测：临时放入 `test.md` → 构建后卡片标题「归档测试」+ 摘要正常出现；随后已删除） |
| `docs/public/` | 仍被 `NON_SECTION_DIRS` 黑名单排除，不会变成导航项 |
| `docs/category/` | 同上，被黑名单排除 |
| 纯图片文件夹 | **会**变成导航项（以前不会）。点进去是「暂无页面」，因为只统计 `.md`。若嫌碍眼，把目录名加进 `NON_SECTION_DIRS` 即可 |

**这不是「自动热更新」**：扫描仍在构建期执行一次。新增文件夹后需要**重新构建**（线上由 GitHub Actions 在 push 时自动完成），本地 dev 需重启服务。

**空目录进 git 的问题**：git 不跟踪空目录，所以空的 `docs/archive/` 在 CI 上会不存在、导航项也就没了。用 `.gitkeep` 占位解决（扫描只认 `.md`，占位文件不影响「空分区」判定）。

### 9.6 文件迁移（M1：纯文件系统操作）

> 不使用任何 git 命令（项目宪法第一条第四款）。迁移用 `mv`，提交时 git 会自动识别为重命名。

```bash
cd F:/web/Miracle2Master.github.io/docs

mkdir -p notes diary archive

# 1) 笔记分区：5 个顶层内容目录整体搬入 notes/
mv Spring notes/
mv 机器学习 notes/
mv 深度学习 notes/
mv 周志华机器学习笔记 notes/
mv 微服务 notes/

# 2) 日记分区：planning/ 全部内容搬入 diary/
mv planning/* diary/
rmdir planning

# 3) 归档分区：两个孤儿页搬入 archive/
mv notes.md archive/
mv planning.md archive/

# 4) 删除冗余图片副本（已核验无引用，见 9.2.1）
rm -rf img/
```

**迁移后必须逐项核对**：

| 核对项 | 期望 |
|--------|------|
| `docs/notes/Spring/img/`、`docs/notes/微服务/img/` 等 | 随父目录一起搬走，文件数不变（78/73/115/92/61/211/79 等） |
| `docs/diary/日记/2025.md`、`2026.md` | 存在于新路径 |
| `docs/diary/目标与方向.md` | 存在于新路径 |
| `docs/archive/notes.md`、`planning.md` | 存在于新路径 |
| `docs/` 根目录 | 只剩 `index.md`、`notes/`、`diary/`、`archive/`、`category/`、`public/`（**`img/` 已删**） |

### 9.7 代码改动（M2–M7）

#### M2 `config.mts` — 路径与扫描

| 位置 | 现状 | 改为 |
|------|------|------|
| 新增 | — | `buildSections()` + `SECTION_LABELS` / `SECTION_ORDER` / `NON_SECTION_DIRS` |
| `buildPlanningYears()` L99 | `join(docsDir, 'planning', '日记')` | `join(docsDir, 'diary', '日记')` |
| 同上 L106 | `link: \`/planning/日记/${name}.html\`` | `` `/diary/日记/${name}.html` `` |
| `buildYearData()` L116 | `join(docsDir, 'planning', '日记', year)` | `join(docsDir, 'diary', '日记', year)` |
| `injectPlanningData()` L149 | `/planning\/日记\/(\d{4})\.md$/` | `/diary\/日记\/(\d{4})\.md$/` |
| `buildNoteContent()` L234 | `walk(docsDir)` | `walk(NOTES_DIR)`，`const NOTES_DIR = join(docsDir, 'notes')` |
| 同上 L235 | `relative(docsDir, file)` | `relative(NOTES_DIR, file)`（**必须换基准**，否则 key 会变成 `notes/Spring/...`） |
| 同上 L236-240 | `EXCLUDED` / `startsWith('planning/')` / `seg[0] === 'category'` 三重过滤 | 三行全部删除——遍历 `notes/` 已天然排除日记页、分类页、首页 |
| 同上 L248 | `const key = rel.replace(/\.md$/, '')` | **保持不变**——`key` 必须相对 `notes/`，否则 `NoteView` 的 `key.split('/')[0]` 会取到 `notes` 而不是 `Spring` |
| 同上 L250 | `noteDir` 相对 `notes/` | 保持；`rewriteImgSrcs` 的相对基准同步换成 `NOTES_DIR` |
| `rewriteImgSrcs()` L209 / L218 | `join(docsDir, srcPath)` | `join(NOTES_DIR, srcPath)`（图片兜底路径） |
| `injectIndexData()` / `injectPlanningData()` | `file.endsWith('index.md')` 无路径限定 | **建议收紧**为 `file === 'index.md' \|\| file === 'index.html'`。当前写法下，将来若在 `notes/` 里加 `index.md`，它也会被塞进 `noteContent`（体积几十 MB 的 HTML），白白撑大页面 |
| 新增 | — | `buildSections()` 需要为**未注册 pane 的分区**（当前是 `archive`、以及未来任何新目录）填充 `pages[].html`；已注册的 `notes` / `diary` 不填，避免首页序列化体积翻倍 |
| `buildSidebar()` L30–95 + `const sidebar` L95 | 已无消费者（`themeConfig.sidebar: false`），`sidebar` 变量全项目无人读取 | **建议删除**（死代码，且内部硬编码 `seg[0] === 'planning'` 会造成误导）。若删除，需一并清掉只被它使用的 `firstTitle()`、`orderOf()`、`type SidebarItem`、L45 的 `EXCLUDED` 常量，以及只被 `firstTitle` 使用的 `basename` 导入。若你不希望删，则至少把里面的 `'planning'` 改 `'diary'` |

#### M3 `SecNav.vue` — 动态导航

- 新增 `useData()`，读 `page.value.sectionNav`；
- 模板：`首页`（固定）+ `v-for` 扫描结果；
- `go(item)`：首页内只改 `sectionTab.value = item.key`；独立页整页跳 `/#<key>`；
- `isActive(item)` 重写为**单一判定**（见下），彻底消除 9.1 描述的「独立笔记页二级导航一个都不亮」的缺陷：

```ts
// 首页：由共享 Tab 状态驱动；其他页面：只看路径第一段，不回退到 sectionTab
// （sectionTab 是首页内状态，独立页上它可能是过期的残留值，不能参与判定）
// 例：/notes/Spring/AI/x.html → 第一段 notes → 高亮「笔记」
function isActive(item: { key: string }): boolean {
  const p = route.path
  if (p === '/' || p === '/index.html') return sectionTab.value === item.key
  const first = p.replace(/^\//, '').split('/')[0].replace(/\.html$/, '')
  return first === item.key
}
```

> 这样 `/notes/Spring/AI/x.html`、`/notes.html`（根级 md 页，第一段去 `.html` 后正好是 `notes`）、`/diary/日记/2026.html` 都能正确高亮；`/category/Spring.html` 第一段是 `category`，没有对应导航项，全部不高亮——符合预期。

#### M4 `HomeNoteList.vue` — 动态 pane

| 位置 | 现状 | 改为 |
|------|------|------|
| L4-6 | 静态 import 三个 pane | 保留（`SECTION_PANES` 在 `section.ts` 里引用它们） |
| L14-28 `syncFromHash()` | 判断 `#learning` / `#planning` | 先判 `#note-` / `#cat-`（→ `notes`），否则把 hash 去掉 `#` 后与 `sectionNav` 的 key 比对，命中即切，未命中回 `home` |
| L42-51 | `visiblePane` 三值 | 改为 `SECTION_PANES[active.value]` |
| L55 | `:class="{ 'is-learning': active === 'learning' }"` | `:class="{ 'is-wide': WIDE_SECTIONS.has(active) }"` |
| L59-69 模板 | 三个写死的 `v-show` 块 | 改为一条渲染路径：遍历 `[HOME_KEY, ...sectionNav.map(i => i.key)]`，每项渲染 `<component :is="SECTION_PANES[key] ?? SectionPagesPane" :section-key="key" :pages="..." />`，用 `v-show` 控制显隐（保留现有 panes「切换不销毁」的行为） |
| 样式 L99-113 | `.is-learning` 相关规则 | 选择器改为 `.is-wide`，规则内容不变 |

> 让 pane 拿 `section-key` 的原因：`LearningPane` 现在有 3 处 `sectionTab.value = 'learning'` 的硬编码，改为 `sectionTab.value = props.sectionKey` 后，组件不用知道自己在哪个目录下。

#### M5 `LearningPane.vue`

| 位置 | 改动 |
|------|------|
| L88 / L97 / L105 | `sectionTab.value = 'learning'` → `sectionTab.value = props.sectionKey` |
| L138 | `watch(sectionTab, v => { if (v !== 'learning') ... })` → `if (v !== props.sectionKey)` |
| 其余 | 不动（`allNotes` / 分组 / 三栏视图逻辑全部复用） |

#### M6 `PlanningYear.vue` + `SectionNav.vue` + `HomePane.vue`

| 文件 | 位置 | 改动 |
|------|------|------|
| `PlanningYear.vue` | L70-78 `goTab()` | `/#learning` → `/#notes`，`/#planning` → `/#diary`；更稳妥的做法是从 `page.sectionNav` 取 key，不写死 |
| `PlanningYear.vue` | L51 注释里的示例路径 | 更新为 `/diary/日记/2025#...` |
| `SectionNav.vue` | L5-9 `tabs` | 目前仍是写死的「个人主页 / 学习记录 / 人生规划」，与其他导航不一致。**建议从 `PlanningYear` 移除**（该组件仅此一处使用，职责与 `SecNav` 重复）；备选是改为消费 `sectionNav` |
| `HomePane.vue` | L8-9 | `href="/#learning"` → `/#notes`，`/#planning` → `/#diary` |

#### M7 分类页与遗留组件

| 文件 | 位置 | 改动 |
|------|------|------|
| `CategoryList.vue` | L23-31 | 扫描前缀改为 `notes/`，分类名用 `dirs.lastIndexOf(name)` 在**任意层级**匹配（比原计划更通用，同时覆盖了原稿漏掉的 `seg.length === 2 → 3`、`sub = seg[1] → seg[2]` 两处坑）。⚠️ 手写壳页删除后它已**无消费者**，见 9.7.1 末尾的遗留说明 |
| `NoteList.vue` | L17-31 | 两处必须改：<br>1. 过滤：`rel.startsWith('notes/')` 之外的**全部跳过**——否则会把 `diary/`、`archive/` 也列进来；<br>2. 分组：`group` 从 `seg[0]` 改为 `seg[1]`，否则所有笔记会挤进一个名为 `notes` 的组。<br>3. 链接：`'/' + rel.replace(...)` 已自带 `notes/` 前缀，无需改。<br>⚠️ 归档改用普通文件夹后它已**无消费者**（见 M9） |
| 新增 `SectionPagesPane.vue` | — | **通用兜底 pane**：未注册 pane 的分区（含归档）用它，列出页面 + 就地渲染 |
| ~~新增 `ArchivePane.vue`~~ | — | ❌ **已废弃**（M9 删除）：原设计跨目录聚合 `notes/` + `diary/`，与「归档 = 独立文件夹」冲突 |
| ~~`archive/notes.md` / `archive/planning.md`~~ | — | ❌ **已删除**（M9）：正文只有组件调用，不是内容 |
| `PlanningList.vue` | — | **保留**；`props.years` 为空时回落到本页 `pageData.planningYears`——`diary` 分区外的裸 `<PlanningList />` 靠这条兜底 |
| `index.ts` | L16-22 `enhanceApp` | 注册新增的 `SectionPagesPane`；不注册 `ArchivePane` |

> 9.7 的 M2–M7 编号对应关系：M2 `config.mts`、M3 `SecNav`、M4 `HomeNoteList`、M5 `LearningPane`、M6 `PlanningYear`/`SectionNav`/`HomePane`、M7 本节；分类页自动生成为 **M8**（9.7.1），归档改为普通文件夹为 **M9**（9.5.1 / 9.5.2）。

#### 9.7.1 分类页自动生成（M8）：动态路由

**要解决的问题**：`docs/category/` 原来靠 9 个手写 md 壳页 + `<CategoryList name="…" />` 识别分类。手写壳页有三个毛病：目录名改了壳页不跟着改（所以 4 个壳页早就指向了不存在的目录名、渲染为空）、新增分类必须手工补壳、壳页与真实目录之间没有任何机制保证一致。

**改法**：VitePress 动态路由（`[name].md` + 同名 `[name].paths.ts`），分类清单在**构建期扫描**得出，不再手写。

| 文件 | 动作 | 说明 |
|------|------|------|
| `docs/category/*.md`（9 个旧壳页） | **删除** | 纯壳，无独立内容 |
| `docs/category/[name].md` | 新增 | 正文只有 frontmatter `layout: page` + 一行 `<CategoryPage />` |
| `docs/category/[name].paths.ts` | 新增 | 构建期扫描 `docs/notes/`，收集「所有含 md 的目录名」→ `[{ params: { name } }]` |
| `.vitepress/theme/CategoryPage.vue` | 新增 | 读注入数据，用 `NoteView` 直接渲染该分类 order 最小的一篇 |
| `.vitepress/config.mts` | 新增 `injectCategoryData()` | 按 `pageData.params.name` 只渲染**本分类**的笔记，注入 `categoryName` / `categoryNotes` |
| `.vitepress/theme/index.ts` | 注册 `CategoryPage` | `app.component('CategoryPage', CategoryPage)` |

**`[name].paths.ts` 的两处关键点**：

1. **基准路径**：文件位于 `docs/category/`，`notes/` 是它的**上一级**，所以是 `fileURLToPath(new URL('../notes', import.meta.url))`。写成 `'../../notes'` 会解析到项目根目录、构建直接 `ENOENT`（本次实做时踩过）。
2. **扫描口径**：取每个 md 的**父目录名**加入集合（`seg[seg.length - 2]`），因此 `notes/根级.md` 这种没有父目录的文件被跳过、不产生分类页；`notes/Spring/AI/x.md` 同时贡献 `AI` 一个分类。实测 `notes/` 下共 **14 个**含 md 的目录。

**`injectCategoryData()` 的匹配规则**：目录路径里**任意一层**出现同名目录即归入该分类（`dirs.lastIndexOf(name) !== -1`），所以 `Spring` 分类包含 `Spring/` 下全部子目录的笔记，`AI` 分类只包含 `Spring/AI/` 的笔记。排序复用 `order` + 中文标题兜底，与首页笔记列表同一口径。

**为什么不把全站笔记都注入分类页**：分类页只需要自己那一份。`injectCategoryData` 在构建期按 `params.name` 过滤后再渲染，单页体积与分类规模成正比，不会把 80 MB 的 `noteContent` 复制 14 份。

**`CategoryPage.vue` 如何复用三栏阅读**：把 `categoryNotes` 直接喂给 `NoteView`，并传 `root` = 笔记 key 中「分类名这一段及其之前」的前缀（如 `Spring/AI`）。`NoteView` 的目录树因此只在分类作用域内展开，不会把别的分类混进来。

**新增分类 / 改目录名的后续操作**：什么都不用做，重新构建即自动出现/消失。这是选 C 方案的全部收益。

> **遗留**：`CategoryList.vue` 在所有手写壳页删除后已**没有消费者**（仅 `index.ts` 还注册着），性质与 `buildSidebar()` 相同。是否一并删除待你确认，未擅自处理。

#### 9.7.2 分类点击行为：直接显示 order 最小的笔记

**目标**：点分类不再先给一张「目录清单」，而是**直接进入阅读**——打开该分类 `order` 最小（即学习顺序第一篇）的笔记正文。两处入口统一：

| 入口 | 行为 |
|------|------|
| 首页「笔记」Tab 的分类卡片 | 点卡片空白处 → 就地显示第一篇（`LearningPane.goCategory`）；卡片内的标签链接与「查看全部」保持原有行为 |
| `/category/<name>.html` 分类页 | 打开即显示第一篇正文（`CategoryPage` 取 `categoryNotes[0]`），左栏是该分类目录，右栏是标题目录 |

**实现要点**：

- 排序在构建期完成（`order` 升序、同 order 按中文标题），运行时取数组第一项即可，不需要二次排序；
- 首页卡片用 `e.target.closest('a')` 区分「点卡片」与「点卡片里的链接」，避免抢掉标签和「查看全部」的点击；
- 若该分类下没有任何笔记（理论上不会发生，因为分类本身由 md 扫出来），回退到清单视图，不抛错。

**「查看全部清单」入口保留**：分类卡片上的「查看全部（共 N 篇）→」仍然进入原来的清单视图（`#cat-<分类>` 深链不变），分类页上则通过左栏目录浏览同一分类的其它笔记。

### 9.8 破坏性影响与回滚

**会变的东西**

| 项目 | 影响 |
|------|------|
| 所有笔记 URL | `/Spring/AI/x.html` → `/notes/Spring/AI/x.html`；老书签/外链 404（GitHub Pages 无服务端重定向） |
| 年份页 URL | `/planning/日记/2026.html` → `/diary/日记/2026.html` |
| 归档页 URL | `/notes.html` → **已删除**（原页面不存在了）；`/planning.html` → **已删除**。归档现在是 `/#archive` 就地内容 |
| 页内深链 hash | `#note-Spring/AI/x`、`#cat-Spring` 格式不变（key 仍相对 `notes/`）；`#learning` / `#planning` 改为 `#notes` / `#diary`；归档 Tab 用 `#archive` |
| 密码门 session 键 | `miracle-auth-diary` 不变 |
| 搜索索引 | 构建期重建，自动指向新路径，无需处理 |

**不会变的东西**

- 所有 md 正文与 frontmatter（含 `order`）**一字不改**（`archive/` 两页已连同壳页删除，见 9.5.1）；
- 相对图片路径（整树搬迁，相对关系不变）；
- 笔记正文的渲染管线、图片 hash 重写机制；
- 笔记 `key` 的形态（仍是 `Spring/AI/x`），因此分组、排序、深链逻辑全部复用。

#### 9.8.1 `/notes.html` 与 `/notes/` 会不会打架

**改造后会彻底不打架**——原 `notes.md` 已删除（曾短暂移入 `archive/`），根目录不再有 `/notes.html`，`/notes/` 是唯一的笔记路径前缀。

改造前（若不动）也不会冲突：`docs/notes/` 下没有 `index.md`，构建不产出 `/notes/index.html`。但两者语义混淆，这正是当初移走 `notes.md` 的原因（现在已直接删除）。

#### 9.8.2 老链接是否要做跳转

GitHub Pages 是纯静态托管，没有服务端 302。可选做法：

| 方案 | 效果 | 代价 |
|------|------|------|
| A 不处理 | 老链接 404 | 零成本；个人站点，外链极少 |
| B 写 `404.html` 前端跳转 | 老链接自动跳到新路径 | 需写一段匹配旧路径的 JS，维护一张路径映射 |
| C 保留旧路径的空壳 md | 老链接能落地 | 每个旧文件都要留一份壳，与「目录重构」目标相悖 |

**建议 A**：本站是个人笔记站，外链可忽略；等真有需要再上 B。

**回滚**：迁移是纯 `mv`/`rm`，回滚即把 `notes/*`、`diary/*`、`archive/*` 反向 `mv` 回 `docs/` 并恢复 `planning/` 目录名。⚠️ **`docs/img/` 是 `rm -rf` 删除的，本地无法恢复**——若要保留退路，删之前先把它 `mv` 到项目外做备份，或依赖 git 历史恢复（该目录已被 git 跟踪，`git checkout` 可恢复）。代码改动集中在 7 个文件，可按 9.7 的表格逐条还原。

### 9.9 验证清单

> 项目宪法规定不主动执行构建。以下命令**经你同意后**再运行。

```bash
npm run docs:build      # 必须 0 error
npm run docs:preview
```

逐项检查（`☑` = 已用构建产物核对通过；`☐` = 需浏览器/预览环境，尚未验证）：

- ☑ 首页二级导航显示「首页 / 笔记 / 日记 / 归档」，**顺序正确**
- ☐ 首页点「笔记」→ 就地切 Tab，URL 变 `/#notes`，三栏布局宽度正常（宽容器生效）
- ☐ 首页点「日记」→ 就地切 Tab，URL 变 `/#diary`，年份网格正常
- ☐ 首页点「归档」→ 就地切 Tab，URL 变 `/#archive`，内容区显示「该分区暂无页面。」（**归档 = `docs/archive/` 自己的内容，不再聚合笔记与日记**）
- ☑ 首页「归档」Tab 已不再出现「笔记目录」聚合卡片（产物中 `class="note-list"` 为 0 处）
- ☑ 归档 Tab 走通用兜底 `SectionPagesPane`（产物 `<div class="section-pages-pane">` + `<p class="empty">该分区暂无页面。</p>`）
- ☑ 空文件夹 `docs/archive/`（仅 `.gitkeep`）仍出现在导航里 → 验证「新建空文件夹自动成为分区」
- ☑ 临时放入 `docs/archive/test.md` 后重新构建，归档 Tab 出现卡片「归档测试」+ 摘要；删除后恢复为空（已实测）
- ☑ 笔记列表卡片分组仍是 `Spring / 机器学习 / 深度学习 / 周志华机器学习笔记 / 微服务`（**不是 `notes`**）
- ☑ 归档里的「笔记目录」分组也仍是那 5 个分类名（不是 `notes`）
- ☐ 点开任意笔记 → 正文图片正常显示（不是 404）
- ☑ 直接访问 `/notes/Spring/AI/xxx.html` → 独立页正常渲染，顶部导航「笔记」高亮（这是本次顺带修掉的旧缺陷）
- ☑ 直接访问 `/diary/日记/2026.html` → 年份页正常，左侧日记列表正常（密码门需浏览器验证）
- ☑ `/archive/notes.html`、`/archive/planning.html` 已随壳页删除而消失（预期行为）
- ☑ 直接访问 `/category/Spring.html` → 分类页正常、**不为空**，直接显示 order 最小的 `准备Linux环境`，左栏列出该分类全部 24 篇（含当前项高亮），链接指向 `/notes/...`，顶部导航无高亮（category 不是分区）
- ☑ `/category/` 下 14 个动态页全部生成：`AI / Docker容器 / ES / MQ消息队列 / Redis / Redis高级 / Spring / SpringAI / 其他 / 周志华机器学习笔记 / 微服务 / 机器学习 / 深度学习 / 补充`
- ☐ 刷新 `/#notes`、`/#diary`、`/#archive` 能还原到对应 Tab
- ☑ 搜索索引里的笔记链接指向 `/notes/...`（`/diary/日记/...` 同步更新，无旧路径残留）
- ☐ 浏览器控制台无错误

> 已核对项来自 `.vitepress/dist` 的静态产物（`npx vitepress build` 0 error，43.59 s）；标 `☐` 的必须跑 `docs:preview` 才能真正确认。

### 9.10 待确认事项

> 以下 3 项**已全部由你拍板并实施完毕**，保留原文作为决策留档。

| # | 事项 | 已定方案 | 结果 |
|---|------|----------|------|
| 1 | `docs/category/`（9 个分类索引页） | ~~A 保留并修 `CategoryList.vue` / B 整目录删除~~ → **C 自动生成** | ✅ 已删 9 个手写 md，改动态路由（9.7.1）；14 个分类页构建自动产出 |
| 2 | `config.mts` 里的死代码 `buildSidebar()` | **A 删除**（连带 `firstTitle()` / `orderOf()` / `type SidebarItem` / `EXCLUDED` / `basename` 导入） | ✅ 已删除 |
| 3 | `SectionNav.vue`（年份页顶部的三格 Tab） | **B 从年份页移除** | ✅ 组件已删除，年份页改为「← 返回日记」按钮 |

#### 关于你问的「第六项」和「第七项」

**第六项（原：深链前缀 `#note-` / `#cat-`）——不是要把前缀去掉。**

那是一个**我多虑了**的提议，现已撤销，**保持原样，不做任何改动**。解释一下当时为什么列它：

- 页面内的深链（可分享、可刷新还原的地址）现在长这样：
  - `/#note-Spring/AI/xxx` —— 表示「笔记分区里，正在看这篇」
  - `/#cat-Spring` —— 表示「笔记分区里，正在看这个分类」
- 改成动态导航后，分区切换的 hash 变成了 `#notes`、`#diary`、`#archive`。
- 我当时担心 `#notes`（分区）和 `#note-Spring/...`（笔记深链）看起来太像，会混淆，所以提议把深链前缀改成 `#file-` / `#folder-`。

**结论：不改。** 三个字符就能区分（`#notes` 是 `s` 结尾、没有短横线；`#note-` 带短横线），而且改前缀会影响所有已存在的书签，收益不抵风险。这一项从待确认列表移除，视为「保持现状」。

**第七项（`SectionNav.vue`）——它是年份页里的一条重复导航。**

现状是：打开某个年份页（如 `/planning/日记/2026.html`）时，页面顶部会出现一个三格横排的 Tab：

```
┌──────────┬──────────┬──────────┐
│ 个人主页  │ 学习记录  │ 人生规划  │   ← 这就是 SectionNav.vue
└──────────┴──────────┴──────────┘
```

而屏幕最上方（标题栏下方）**已经有**一条 `SecNav`：

```
首页 │ 笔记 │ 日记 │ 归档                  ← 这是 SecNav.vue（全站固定）
```

问题在于：

1. **两套导航并存**，一条说「学习记录 / 人生规划」，另一条说「笔记 / 日记」，**用词都不一致**；
2. `SectionNav.vue` 的文案**写死在代码里**（`SectionNav.vue:5-9`），改造后 `SecNav` 是扫描生成的，它却还是旧的三个词，会显得更突兀；
3. 它只被 `PlanningYear.vue` 用了一次。

**选项 A**：让 `SectionNav` 也去读扫描结果，跟 `SecNav` 保持一致。代价是页面上仍有两套导航，视觉上重复。

**选项 B（我建议）**：把 `SectionNav` 从年份页里移除。年份页自带一个「← 返回日记」按钮就够了（回 `/#diary`），全站回到「只有一条二级导航」。截掉这块后年份页的实际布局是：

```
屏幕顶部：  首页 │ 笔记 │ 日记 │ 归档          ← 唯一导航，全站一致
            ────────────────────────────
年份页面：  ← 返回日记
            ┌──────────┬──────────────────┐
            │ 2026 年  │                  │
            │ 10月     │   （点左侧某篇      │
            │ 9月      │   才显示正文）      │
            │ ...      │                  │
            └──────────┴──────────────────┘
```

**执行状态：M1–M8 全部完成，构建通过。**

| 阶段 | 内容 | 对应章节 | 状态 |
|------|------|----------|------|
| M1 | 文件迁移：建 `notes/` `diary/` `archive/`，搬内容，`rm -rf docs/img/` | 9.6 | ✅ |
| **复核点** | **停下来给你看一次目录结构，确认无误再动代码** | — | ✅ |
| M2 | `config.mts`：`planning` → `diary`、新增 `buildSections()`、`buildNoteContent` 换基准 | 9.7 M2 | ✅ |
| M3 | `section.ts`（`sectionTab` 改 `string`、`HOME_KEY` / `setSection`）+ `SecNav.vue` 动态渲染 + 统一高亮判定 | 9.5、9.7 M3 | ✅ |
| M4 | `HomeNoteList.vue`：动态 pane + hash 解析 | 9.7 M4 | ✅ |
| M5 | `LearningPane.vue`：硬编码 `'learning'` → `props.sectionKey`；分类卡片改为直达首篇 | 9.7 M5、9.7.2 | ✅ |
| M6 | `PlanningYear.vue` / `HomePane.vue`：路径与链接更新；`SectionNav.vue` 删除 | 9.7 M6 | ✅ |
| M7 | 新增 `ArchivePane.vue`（归档 Tab）与 `SectionPagesPane.vue`（通用兜底）；`NoteList.vue` / `CategoryList.vue` 改扫描前缀；`index.ts` 注册新组件 | 9.5.1、9.7 M7 | ✅ |
| M8 | 分类页自动生成：删 9 个手写 md，新增 `category/[name].md` + `[name].paths.ts` + `CategoryPage.vue` + `injectCategoryData()` | 9.7.1 | ✅ |
| **构建** | `npx vitepress build` → build complete in 43.59s，0 error，产出 14 个分类页 | 9.9 | ✅ |
| **预览验证** | `docs:preview` 逐项过 9.9 的 `☐` 项（需你同意后执行） | 9.9 | ☐ |

**M1 实际执行记录**（与计划的两处偏差，均为环境原因，不影响结果）：

- `node:fs EPERM rename`：Typora 持有文件句柄，`mv docs/Spring → notes/Spring` 失败；改为**逐个孩子目录搬入 `notes/Spring/`**，再 `rmdir docs/Spring`。`planning/日记/` 同理。
- 迁移后实测：`notes/` 61 个 md / 977 个文件 / 83.02 MB；`diary/` 27 个 md；`archive/` 2 个 md；`docs/img/` 8.45 MB 已删除。

---

# 十、分区界面统一（已收尾 · 2026-10-27 完成）

> 本节独立记录，与上文九章（目录重构）分属两轮工作。九章已收尾，本章已于 2026-10-27 完成，执行记录见 **10.9**。

## 10.1 这轮的目标（你的原话）

1. 「我点击的**笔记**这个导航，我不需要展示这个（分类卡片墙），所有笔记目录直接跳转到当前文件第一个面对文档或 **order 最小**的文档中，**除了首页，都要这个逻辑**」
2. 「所有的这个主界面内容应该跟**笔记的主界面一模一样**，包括**日记**这个界面也应该是一模一样」
3. 「然后这个**鉴权**，是单独加的。之后可以再考虑」
4. 「归档这个界面他新建一个文件，新建一个文件夹，在这个样式就已经和笔记不一样了」（→ 归档也要和笔记同一套）

## 10.2 已拍板的决策

| 事项 | 决策 | 备注 |
|------|------|------|
| 点「笔记」导航 | 不显示分类卡片墙，直接渲染 **order 最小的那篇**正文 | ✅ 已实现 |
| 笔记左栏 | 列出**全部笔记目录**（任意层级文件夹树） | ✅ 已实现 |
| 点「日记」导航 | **完全平铺，年份当文件夹** —— 首页三栏里直接显示第一篇日记，左栏是 `日记/` 下的完整目录树（`2025/`、`2026/` 当文件夹，散文件直接列出） | ✅ 已实现 |
| 日记密码门 | **改为点左栏日记条目时弹门**，复用现有 `PasswordGuard`；只锁正文，左栏始终可见 | ✅ 已实现 |
| 其余分区（归档等） | 与笔记同一套三栏界面 | ✅ 已实现 |
| 首页 | 保持不变 | — |

## 10.3 已完成（代码已落地，最后一次构建 37.41s 通过并验证）

| 文件 | 改动 | 状态 |
|------|------|------|
| `.vitepress/theme/FileTree.vue` | **新增**。递归文件树组件（原来 `NoteView` 里写死到二级，放开到全部笔记后会出现三级以上，如 `Spring/Redis/Redis高级/xxx`）。`NoteView` 里原有的 `.file-nav-*` 样式整体搬入本组件 | ✅ |
| `.vitepress/theme/NoteView.vue` | ① 新增 `hideBack` prop；② `root` 改为三态语义（`undefined`=当前笔记一级目录 / `''`=全部笔记 / `'Spring/AI'`=指定目录）；③ `buildTree()` 改为**任意深度**下钻；④ 排序改为递归到任意层（原来只排到第二层，第三层以后乱序） | ✅ |
| `.vitepress/theme/LearningPane.vue` | 删掉分类卡片墙，改为直接渲染 `NoteView`（`root=""` + `hide-back`）；`currentKey = pickedKey \|\| allNotes[0].key` | ✅ |
| `.vitepress/theme/SectionPagesPane.vue` | `pickedKey` / `firstKey` / `currentKey`，**默认打开第一页**，保留「← 返回列表」入口 | ✅ |
| `.vitepress/theme/PlanningPane.vue` | 过渡方案：进入时跳转**最新年份页**（`planningYears[0].link`），并加 `v-show` 守卫（见 10.7 坑 2） | ✅（后续被平铺方案取代） |
| `.vitepress/theme/section.ts` | **新增** `sectionClick` 计数器 + `navToSection()`。理由：pane 内部（切笔记、返回清单）也会调 `setSection` 锁定分区，若混在一起就分不清「从导航进入」还是「内部操作」 | ✅ |
| `.vitepress/theme/SecNav.vue` | 首页内点击改用 `navToSection`；独立页仍整页跳 `/#<key>` | ✅ |
| `docs/archive/` | 变成**真正的空文件夹**（`ArchivePane.vue`、`notes.md`、`planning.md`、`.gitkeep` 全部删除），验证「新建文件夹 → 重新构建 → 导航自动多一项」 | ✅ |
| `.vitepress/config.mts` `buildSections()` | 删掉 `if (files.length === 0) continue`，**空文件夹也成为一个分区** | ✅ |

**构建验证结果**（`dist/index.html`）：`learning-empty` 出现 0 次（首屏不是空状态）；左栏标题「全部笔记」，正文首屏 = `1.准备Linux环境`（order 11，全库最小）；目录树按钮 61 个 = `docs/notes` 下 md 数；`group-grid` / `cat-view` 均为 0（卡片墙已不存在）。

## 10.4 当前代码状态：**已于 2026-10-27 补齐（见 10.9）**

`config.mts` 的 `buildSections()` 已被我简化，**但配套函数还没写**：

```ts
// 现在的样子（config.mts:47-73）
// 分区只存「标识 + 显示名」，不再产出 pages[]
type SectionEntry = { key: string; text: string }
sections.push({ key: name, text: SECTION_LABELS[name] ?? name })
```

- 已删除：`PANE_REGISTERED`、`SectionPage` 类型、`headingOf()` 函数
- 已失效：`config.mts:48` 注释提到的 `buildSectionContent()` —— **这个函数还不存在**
- 前端后果：`HomeNoteList.vue:41` 的 `pagesOf()` 读 `s.pages` 恒为 `[]` → **归档分区会退化为空**（显示「该分区暂无页面。」）

> 代码里已无悬空符号引用（可编译），但**行为是半成品**，且这次改动**尚未做构建验证**。

## 10.5 未完成清单（按执行顺序）

### 10.5.0 分区界面的显示规则（本轮补充，务必逐条落实）

统一数据源之后，**所有分区共用同一个 `SectionPane` → `NoteView` → `FileTree`**，所以下面这些情形不是某个分区的特例，而是全站一致的行为：

| 情形 | 应有表现 | 由谁实现 |
|------|----------|----------|
| 分区根上有 md（如 `docs/archive/xxx.md`） | 作为文件条目出现在左栏**最上方**，可点开阅读 | `NoteView.buildTree()` 里 `seg.length === 1 → rootFiles`；`FileTree` 先渲染 `rootFiles` |
| 分区根上既有 md 又有文件夹 | 根级文件在上、文件夹在下的同一棵树里并列 | 同上 |
| 子文件夹套子文件夹（任意深度） | 递归展开，层数不设上限 | `FileTree.vue` 自递归 |
| 分区完全为空（无任何 md） | 左栏标题照常显示，中栏显示「该分区暂无内容。」，不白屏、不报错 | `SectionPane` 的 `v-else` 分支 |
| 分区里只有图片、没有 md | 同「完全为空」，但导航项仍然存在 | `buildSections()` 空文件夹也保留 |

> 递归不是新写的机制：`NoteView.buildTree()` 已经下钻到任意深度（10.3 已改），`FileTree` 已经自递归。本轮只是把所有分区都接到这一套上——**归档根级的 md、日记根级的散文件（如 `目标与方向.md`）都会自然出现在树里**，不需要为它们单独写逻辑。

### 第一步：构建期统一数据源（`config.mts`）

1. 写 `buildSectionContent()`：遍历每个分区目录 → 产出**同一种**数据结构，注入 `pageData.sectionContent`
   - 每篇：`{ title, key, html, order }`，key 为相对**分区根**的路径（如 `2025/反思日记1-3`）
   - 图片路径复用现有 `rewriteImgSrcs()`，`baseDir` 传该分区目录
   - 排序沿用 `order` 升序，无 `order` 的按 `key.localeCompare(..., { numeric: true })`
2. 清理旧注入口径：`injectIndexData()` 里的 `noteContent`、`planningYears`，`injectCategoryData()`
   - ⚠️ 注意：`docs/category/` 动态路由与 `docs/diary/日记/2025.md|2026.md` 年份壳页仍依赖现有注入，删除前要一并决定它们的去留（见 10.6 第 3 条）

### 第二步：前端只留一个 `SectionPane`

3. **新建** `SectionPane.vue`：由 `LearningPane.vue` 改写，props 传 `sectionKey`，数据读 `pageData.sectionContent[sectionKey]`，内部就是 `NoteView` 那套三栏
4. `HomeNoteList.vue`：`SECTION_PANES` 只保留 `home`；其余全走 `SectionPane`；`WIDE_SECTIONS` 从 `{'notes'}` 改为**所有非首页分区**
5. 停用/删除 `LearningPane.vue`、`PlanningPane.vue`、`SectionPagesPane.vue`

### 第三步：鉴权旁挂

6. `PasswordGuard` 接进 `SectionPane` 的选中回调：日记分区选中条目时 `sessionStorage` 无钥匙 → 弹门，`@success` 后打开该篇
7. 需要保留「直链带 hash 直达」能力（现有 `PlanningYear.vue:51-60` 有这套逻辑，可移植）

### 第四步：收尾

8. 删除 `docs/archive/test.md`（0 字节测试残留，见 10.6 第 2 条）
9. 死代码清理：`NoteList.vue`、`CategoryList.vue` 已无任何消费者（只在 `index.ts` 注册）
10. 体积问题：首页 JS 分块已 **4.0 MB**（全部笔记正文序列化进首页），日记并入后会到 ~5 MB；是否拆分按需加载待定（见 10.6 第 4 条）

## 10.6 待确认问题：**已全部拍板并实施**（保留原文作为决策留档）

| # | 问题 | 你的决定 |
|---|------|----------|
| 1 | 日记**未解锁时**，左栏目录是否可见？ | **只锁正文**：左栏目录完整可见可点，中栏显示锁提示，点任一条弹密码门 |
| 2 | `docs/archive/test.md`（0 字节）删不删？ | **删**；补 `.gitkeep` 占位，保证空目录能进 git（否则 CI 上「归档」分区会消失） |
| 3 | `docs/diary/日记/2025.md`、`2026.md` 与 `docs/category/` 动态分类页去留？ | **全部删除**（导航已不指向它们） |
| 4 | 首页 4 MB 体积是否本轮一并处理？ | **本轮不处理**，留待后续 |

> 另：树根口径定为「**分区目录本身**」——`docs/<分区>/` 下的散文件、子文件夹、任意深度 md 全部进同一棵树，全站统一。

## 10.7 两个今天踩过、下次别再踩的坑

**坑 1：SSR 阶段 `onMounted` 不执行**
`LearningPane` 最初在 `onMounted` 里给 `currentKey` 赋值，结果 SSG 产出的是 `<p class="learning-empty">暂无笔记。</p>`，首屏会闪一下空状态。
→ **正确做法：用 `computed` 回落默认值**（`pickedKey || firstKey`），构建期就能拿到 pageData 直接渲染第一篇。

**坑 2：`HomeNoteList` 用 `v-show`，所有分区在首页加载时**同时挂载
`PlanningPane` 原本无条件 `window.location.replace(最新年份)`，导致**一进首页就被踢去日记页**。
→ **正确做法：跳转/副作用必须先用 `sectionTab.value === props.sectionKey` 守卫**。

## 10.8 下次验收方法

```bash
npx vitepress build          # 约 37s，要求 0 error
# 然后检查 .vitepress/dist/index.html：
#   1) 首屏应有 note-view / file-nav-title，不应出现 section-empty
#   2) file-nav-item 数量 = docs/notes 下 md 数（当前 61）
#   3) 日记 pane 应渲染锁提示 locked-tip，且左栏条目数 = docs/diary 下 md 数（当前 25）
#   4) dist/category/、dist/diary/日记/2025.html、dist/archive/test.html 均不应存在
# 再经你同意后跑 docs:preview 逐项点验
```

## 10.9 本轮执行记录（2026-10-27）

### 代码

| 文件 | 改动 |
|------|------|
| `config.mts` | 新增 `orderOf()` / `buildSectionContent()` / `buildAllSectionContent()`；`transformPageData` 只注入 `sectionContent` + `sectionNav`；删除 `buildPlanningYears` / `buildYearData` / `injectPlanningData` / `buildNoteContent` / `injectIndexData` / `injectCategoryData`；`NON_SECTION_DIRS` 去掉 `'category'`；`rewriteImgSrcs` 的 `baseDir` 改为按分区目录传入 |
| **新增** `SectionPane.vue` | 全站唯一分区 pane：`pageData.sectionContent[分区]` + `NoteView(root="")`；`AUTH_SCOPES` 旁挂密码门（只锁正文，左栏照常可点）；`doorRequested && sectionTab === sectionKey` 守卫，避免未选中的 pane 弹门 |
| `NoteView.vue` | 新增 `label` prop（`root=""` 时的左栏标题）；新增 `locked` prop + `#lock` 插槽（只换正文，左栏与点击不受影响）；`watch([currentKey, locked])` 触发重扫标题 |
| `HomeNoteList.vue` | `SECTION_PANES` 只留 `home`，其余全部 `SectionPane`；`WIDE_SECTIONS` → `isWide`（所有非首页分区）；删除 `pagesOf`；`syncFromHash` 用 `sectionOfNote()` 按内容归属判断分区；分区被删时退回首页 |
| `SecNav.vue` | `SectionEntry` 去掉 `pages` |
| `index.ts` | 只保留 `Layout: CustomLayout`，全局组件注册全部移除 |
| `HomePane.vue` | props 只留 `sectionKey` |
| `section.ts` | 注释更新（不再有 `setSection` 内部调用与「最新年份」） |

### 删除的文件

- `.vitepress/theme/`：`LearningPane.vue`、`PlanningPane.vue`、`SectionPagesPane.vue`、`PlanningYear.vue`、`PlanningList.vue`、`NoteList.vue`、`CategoryList.vue`、`CategoryPage.vue`、`HomeLayout.vue`
- `docs/diary/日记/2025.md`、`docs/diary/日记/2026.md`（年份壳页）
- `docs/category/`（`[name].md` + `[name].paths.ts`）
- `docs/archive/test.md`；新增 `docs/archive/.gitkeep` 占位

### 静态校验（未跑构建）

- `esbuild` 解析 `config.mts`：通过
- `@vue/compiler-sfc` 解析 + 编译全部 8 个 `.vue`：0 error
- 扫描模拟：`notes` 61 md / `diary` 25 md / `archive` 0 md（空分区仍出现在导航，中栏显示「该分区暂无内容。」）

> 构建（`npx vitepress build`）与预览按项目宪法**未执行**，等你点头。

## 10.10 分区映射表（2026-10-27）

目录名与导航显示名的对应关系从代码里搬到了独立文件，以后新建文件夹只改这个文件。

| 项目 | 内容 |
|------|------|
| 文件 | `.vitepress/sections.txt`（纯文本，UTF-8） |
| 格式 | 一行一条 `文件夹名 - 导航显示名`；`#` 注释、空行忽略 |
| 顺序 | **行的先后 = 二级导航顺序** |
| 未登记 | 照常出现在导航，显示名 = 文件夹名，排在已登记项之后 |
| 登记了但目录不存在 | 静默忽略 |
| 重复登记 | 以第一次为准，构建时 `console.warn` |
| 文件缺失 | 不报错，全部回退为文件夹名 |

代码侧改动（`config.mts`）：

- 新增 `loadSectionMap()`：解析该文件 → `Map<文件夹名, 显示名>`，保留行序
- 删除硬编码的 `SECTION_LABELS` / `SECTION_ORDER` 两个常量
- `buildSections()`：`text` 取映射值（缺省文件夹名）；排序按「登记行序在前，未登记按名称排后」

模拟运行结果（未跑构建，用 stub 渲染器直接调 `transformPageData`）：

```
sectionNav = [{"key":"notes","text":"笔记"},{"key":"diary","text":"日记"},{"key":"archive","text":"归档"}]
notes   => 61 items，首篇 Spring/Docker容器/准备Linux环境
diary   => 25 items，首个 目标与方向，其后 日记/2025/...
archive => 0 items（空分区，导航项保留）
```

边界情况实测：临时新建 `docs/zztest/`（未登记）→ 导航末尾出现 `zztest`；临时追加重复登记行 → 输出 `[sections.txt] 「notes」重复登记，以第一次为准`；临时追加 `nonexistent - 不存在` → 不出现、不报错。测试文件已删除，`sections.txt` 已还原。

### 10.10.1 新建文件夹的操作步骤

> 目标：新建一个分区（导航里多一项），全程**不改任何代码**。

#### 步骤 1：建目录

在 `docs/` 下新建一级文件夹，例如 `docs/随想/`。

- 目录名会成为导航的 `key`、深链 hash 的前缀，**建好后不要再改名**（改名 = 旧链接失效）
- 不能以 `.` 或 `_` 开头（扫描会跳过，用于临时目录）
- 不能叫 `img`、`public`（在 `NON_SECTION_DIRS` 黑名单里，属于站点基础设施）
- 中文目录名可以用，例如 `docs/随想/`（现在的 `diary` 下就有 `日记/`）

#### 步骤 2：放内容（可选）

往里面放 `.md` 文件，**层级不限**：

```
docs/随想/
├── 第一篇.md            ← 根级散文件，直接出现在左栏最上方
├── 2026/
│   └── 三月.md          ← 子文件夹，左栏显示为「2026」文件夹分组
└── img/
    └── a.png            ← 图片随 md 放在一起，相对路径照常引用
```

- 空文件夹也能成为分区（导航里有一项，点进去中栏显示「该分区暂无内容。」）
- 但 **git 不跟踪空文件夹**：只建空目录就提交，CI 构建时它会消失。要保留就先放一个 `.md`，或放一个 `.gitkeep` 占位（`docs/archive/` 就是这么做的）
- 每篇的 `order` 写在 frontmatter 里（`---` 之间 `order: 12`）。**order 最小的那篇 = 点进分区时默认显示的第一篇**；不写 order 的排在最后

#### 步骤 3：登记导航名（关键步骤）

打开 `.vitepress/sections.txt`，在文件末尾的映射区加一行：

```
随想 - 随想录
```

- 左边的「随想」必须与 `docs/` 下的文件夹名**完全一致**（区分大小写）
- 右边的「随想录」是导航栏上显示的文字，随意取
- **这一行放在第几行，导航里就排第几位** —— 想让它排在「笔记」之前，就把这行插到 `notes` 上面
- 不登记也能用，导航里会直接显示文件夹名「随想」，排在所有已登记项之后

#### 步骤 4：重新构建

```bash
npm run docs:build      # 本地预览用，构建后 npm run docs:preview
```

线上由 GitHub Actions 在 push 到 `main` 时自动构建，不需要手动操作。

扫描只发生在**构建期**，所以改完 `sections.txt` 必须重新构建（本地 dev 则重启服务）才生效。

#### 步骤 5：验收

构建完成后确认三件事：

1. 二级导航多出一项，位置、文字与 `sections.txt` 里写的一致
2. 点进去是三栏界面（左栏目录 / 中栏正文 / 右栏本页目录），与「笔记」完全一致
3. 左栏里：根级 md 在最上方、子文件夹在下方且可逐级展开，条目数 = 该目录下（含所有子目录）md 数

#### 不需要做的事

| 不需要 | 原因 |
|--------|------|
| 改 `config.mts` | 分区清单与显示名全部来自 `sections.txt` + 目录扫描 |
| 写新的 pane / 组件 | 所有分区共用 `SectionPane`，界面天生一致 |
| 在 `index.ts` 注册组件 | 全局组件注册已全部移除 |
| 手工加导航项 | `SecNav` 直接读构建期扫描结果 |
| 给图片做特殊路径处理 | `rewriteImgSrcs()` 按分区根自动重写相对路径 |

#### 需要鉴权的分区

默认全部公开。若某个分区要密码，在 `SectionPane.vue` 的 `AUTH_SCOPES` 里加一行：

```ts
const AUTH_SCOPES: Record<string, string> = {
  diary: 'miracle-auth-diary',
  '随想': 'miracle-auth-suishan'   // ← 加这一行（中文键名要加引号）
}
```

这样该分区未解锁时：左栏目录仍可见可点，中栏显示锁提示，点任一条弹 `PasswordGuard`。


## 10.11 左栏文件夹折叠（2026-10-27）

左栏目录树的每个子文件夹都可以手动收起 / 展开。

| 项目 | 实现 |
|------|------|
| 默认状态 | **全部收起**（只看到一级文件夹名），当前笔记的各级父文件夹自动展开，保证选中项可见 |
| 单个文件夹 | 点文件夹标题（带 ▸ 箭头）切换；展开时箭头朝下，收起时朝右 |
| 全部展开 / 收起 | 左栏标题右侧的文字按钮，在「全部展开」与「全部收起」之间切换 |
| 换笔记 | 自动展开新笔记的各级父文件夹，其它文件夹保持用户的手动状态 |
| 换分区 / 换作用域 | 展开状态重置为该作用域下当前笔记的祖先链 |

实现位置：

- `NoteView.vue`：持有 `expanded: string[]`（**相对作用域根的完整路径**，如 `Spring`、`Spring/Desktop`），
  由 `buildTree()` 为每个节点补 `path`；`ancestorPaths` 计算当前笔记的父链；`toggleFolder` / `toggleAll` 改状态。
- `FileTree.vue`：纯展示 + 上报，`expanded` 由 `NoteView` 传入，点击文件夹标题 `emit('toggle', path)`，
  递归子节点透传同样的 `expanded` 与事件。收起时不渲染子树（`v-if`）。

为什么用**完整路径**而不是文件夹名作 key：不同层级的同名文件夹（如 `a/img` 与 `b/img`）会互相串台，
一个展开另一个跟着展开。实测：`['a/img/x','b/img/y']` 得到 `a, a/img, b, b/img` 四个互不相同的 key。

按钮语义的判定用 `allCollapsed`（「除当前笔记祖先链外都已收起」）而不是 `allExpanded`：
祖先链是自动展开的，若按「全部展开了吗」判断，收到只剩祖先链时按钮会错误显示「全部收起」而点了没反应。

逻辑实测（用同样的算法在 node 里跑）：

```
allPaths = [Spring, Spring/Docker容器, Spring/AI, 机器学习, 机器学习/基础, 微服务]
当前 Spring/Docker容器/准备Linux环境 → ancestors = [Spring, Spring/Docker容器]
初始 expanded = [Spring, Spring/Docker容器]  → allCollapsed = true（按钮=全部展开）
点全部展开 → 6 个；点全部收起 → 回到 [Spring, Spring/Docker容器]
手动展开「机器学习」→ allCollapsed = false（按钮=全部收起）→ 再点 → 回到祖先链
```

> 未跑 `vitepress build`，`@vue/compiler-sfc` 对 8 个 `.vue` 编译 0 error。
