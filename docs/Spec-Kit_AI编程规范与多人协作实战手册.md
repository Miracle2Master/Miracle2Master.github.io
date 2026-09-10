# Spec-Kit AI编程规范与多人协作实战手册

> 适用课程：民族大学AI实训课程  
> 版本：v1.0  
> 日期：2026-05-31  
> 作者：张犇

---

## 一、Spec-Kit 是什么

Spec-Kit 是 GitHub 官方开源的**规格驱动开发（SDD）工具包**，核心理念：

> **先写规格，再生成代码。规格即真相，代码由AI按规格生成。**

传统开发：写代码 → 补文档（文档永远过时）  
AI+SDD：写规格 → AI生成代码 → 规格即真相

Spec-Kit安装

打开windows的powershell

cd 项目目录

powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

 

MAC:

curl -LsSf https://astral.sh/uv/install.sh | sh

 

 

 

安装 specify-cli (MAC同Windows)

 

uv --version

git --version

py --version

uv tool install specify-cli --from git+https://gitee.com/mirrors_trending/spec-kit.git --index-url https://pypi.tuna.tsinghua.edu.cn/simple

 

specify version

 

(强制安装指定版本)

uv tool install specify-cli --force --from git+https://gitee.com/mirrors_trending/spec-kit.git@v0.8.13 --index-url https://pypi.tuna.tsinghua.edu.cn/simple

 

 

初始化项目

cd E:\workspace\CodeBuddy\education-platform

specify init . --integration codebuddy --script ps --ignore-agent-tools

---

## 二、Spec-Kit 完整命令手册

### 2.1 CLI 命令（终端直接执行）

| 命令                                    | 说明       | 示例                                      |
| ------------------------------------- | -------- | --------------------------------------- |
| `specify --version`                   | 查看版本     | `specify --version`                     |
| `specify check`                       | 检查系统环境   | `specify check`                         |
| `specify init <项目名> --ai <agent>`     | 初始化项目    | `specify init campus-trade --ai claude` |
| `specify init . --ai claude`          | 当前目录初始化  | `specify init . --ai claude`            |
| `specify init . --ai claude --no-git` | 跳过git初始化 | `specify init . --ai claude --no-git`   |
| `specify extension search [关键词]`      | 搜索扩展     | `specify extension search git`          |
| `specify extension add <名称>`          | 安装扩展     | `specify extension add git`             |
| `specify extension remove <名称>`       | 卸载扩展     | `specify extension remove git`          |
| `specify extension list`              | 查看已安装扩展  | `specify extension list`                |
| `specify extension update [名称]`       | 更新扩展     | `specify extension update`              |

**支持的 AI Agent**：`claude`、`copilot`、`cursor`、`gemini`、`windsurf`

---

### 2.2 核心斜杠命令（在 AI 助手中输入）

**标准执行顺序**：

```python
① /speckit.constitution  →  建立项目宪法
② /speckit.specify       →  写需求规格（做什么）
③ /speckit.clarify       →  澄清需求
④ /speckit.plan          →  制定技术方案（怎么做）
⑤ /speckit.tasks         →  分解任务清单
⑥ /speckit.analyze       →  交叉验证一致性
⑦ /speckit.checklist     →  质量检查清单（可选）
⑧ /speckit.implement     →  执行任务，生成代码
⑨ /speckit.git.commit    →  提交代码（需安装git扩展）
⑩ /speckit.taskstoissues →  转为GitHub Issues（团队协作）
```

---

#### ① `/speckit.constitution` — 项目宪法

```python
/constitution Focus on code quality, testing standards, UX consistency, security rules
```

> **说明**：最先执行。建立项目治理原则，所有后续步骤都参考它。  
> **生成文件**：`.specify/memory/constitution.md`

---

#### ② `/speckit.specify` — 需求规格

```bash
/specify 校园二手交易系统，支持用户注册登录、发布商品、浏览商品、联系卖家
```

> **说明**：只写"做什么"和"为什么"，**不写技术栈**。  
> **生成文件**：`specs/001-xxx/spec.md`，自动创建功能分支

---

#### ③ `/speckit.clarify` — 澄清需求

```bash
/clarify
# AI 会自动提问，你回答即可
# 例如：Q: 图片存在哪里？ A: 本地存储 /uploads/
```

> **说明**：在 `/plan` 之前执行。把模糊的需求搞清楚。

---

#### ④ `/speckit.plan` — 技术方案

```bash
/plan 使用 Node.js + Express + MySQL 做后端，Vue3 + Vite 做前端，JWT做认证
```

> **说明**：这时才定技术栈。  
> **生成文件**：`plan.md`、`data-model.md`、`contracts/api-spec.json`

---

#### ⑤ `/speckit.tasks` — 任务分解

```bash
/tasks
```

> **说明**：AI 读取 plan.md，生成 tasks.md（任务清单，可分配给不同人）。  
> **生成文件**：`tasks.md`  
> **`[P]` 标记**：表示可并行执行的任务

---

#### ⑥ `/speckit.analyze` — 交叉验证

```bash
/analyze
```

> **说明**：检查 spec.md / plan.md / tasks.md 之间是否一致，有没有遗漏。  
> **执行时机**：在 `/tasks` 之后、`/implement` 之前。

---

#### ⑦ `/speckit.checklist` — 质量检查清单

```bash
/checklist
```

> **说明**：生成需求完整性检查清单，类似"需求层面的单元测试"。

---

#### ⑧ `/speckit.implement` — 执行任务，生成代码

```bash
# 执行所有任务（不推荐一次性全跑）
/implement

# 只执行指定任务（推荐）
/implement --task T001

# 从某个任务开始执行
/implement --from T003
```

> **⚠️ 重要**：不要一次性全跑！做完一个任务停下来检查，确认没问题再继续。  
> AI 按 tasks.md 逐个任务执行，生成实际代码文件。

---

#### ⑨ `/speckit.git.commit` — AI智能提交（需先安装git扩展）

```bash
# 先安装git扩展
# 在终端执行：specify extension add git

# 然后在 AI 助手中输入：
/speckit.git.commit
# AI 会自动：
# 1. 查看 git diff 里改了什么
# 2. 自动生成规范的 commit message
# 3. 执行 git add . && git commit
```

> **与手写 git commit 的区别**：AI 根据改动内容自动生成规范化提交信息，比手写更规范。

**也可以配置自动触发**（改配置文件 `.specify/extensions/git/git-config.yml`）：

```yaml
auto_commit:
  default: false
  after_specify:
    enabled: true
    message: "[Spec Kit] Add specification"
  after_plan:
    enabled: true
    message: "[Spec Kit] Add implementation plan"
```

---

#### ⑩ `/speckit.taskstoissues` — 转为 GitHub Issues

```bash
/speckit.taskstoissues
```

> **说明**：把 tasks.md 转成 GitHub Issues，可以分配给不同人、追踪进度。  
> **适用场景**：团队协作，任务可视化跟踪。

---

## 三、多人协作完整流程（4人小组实战）

### 3.1 团队分工模型

| 角色        | 负责内容           | 对应命令                                    |
| --------- | -------------- | --------------------------------------- |
| **组长/产品** | 需求规格、用户故事      | `/speckit.specify` → `/speckit.clarify` |
| **技术负责人** | 技术选型、架构方案、任务分解 | `/speckit.plan` → `/speckit.tasks`      |
| **后端开发**  | 数据模型、API实现     | `/speckit.implement`（做后端任务）             |
| **前端开发**  | 页面、交互          | `/speckit.implement`（做前端任务）             |

> **实际建议**：学生水平参差不齐，不要强行分角色，让组内自行决定谁干什么。

---

### 3.2 完整协作流程（按时间顺序）

**场景**：校园二手交易系统，4人小组（张三/李四/王五/赵六）

---

#### 阶段一：项目初始化（张三，5分钟）

```javascript
mkdir campus-trade && cd campus-trade
git init
specify init campus-trade --ai claude
git add .
git commit -m "chore: 项目初始化 spec-kit 结构"
git remote add origin https://github.com/xxx/campus-trade.git
git push -u origin main
```

> **通知全组**："仓库已建好，大家 `git clone` 拉代码"

---

#### 阶段二：写项目宪法（张三，10分钟）

```bash
# 在 AI 助手中执行：
/speckit.constitution

# 输入：
制定团队开发规范：
1. 代码使用 ESLint + Prettier
2. AI生成代码必须标注注释
3. 禁止硬编码密钥
4. 所有PR必须至少1人review才能合并
```

AI 生成 `.specify/memory/constitution.md`

```bash
git add .specify/memory/constitution.md
git commit -m "docs: 添加团队治理原则 constitution.md"
git push origin main
```

> **全组同步**：所有人执行 `git pull origin main`

---

#### 阶段三：写需求规格（张三，20分钟）

```bash
# 在 AI 助手中执行：
/speckit.specify

# 输入：
校园二手交易系统，核心功能：
1. 用户注册登录（手机号+密码）
2. 发布商品（标题、价格、图片、描述）
3. 浏览商品列表（支持按分类筛选）
4. 联系卖家（站内信）
```

```bash
# 继续澄清需求
/speckit.clarify
# AI提问，张三回答...

git add specs/
git commit -m "docs: 添加需求规格 spec.md"
git push origin main
```

---

#### 阶段四：制定技术方案（李四，15分钟）

```bash
git pull origin main

# 在 AI 助手中执行：
/speckit.plan

# 输入：
技术栈：
- 后端：Node.js + Express + MySQL
- 前端：Vue 3 + Vite
- 认证：JWT
- 文件上传：multer
```

```bash
git add specs/
git commit -m "docs: 添加技术实现计划 plan.md"
git push origin main
```

---

#### 阶段五：任务分解（李四，10分钟）

```bash
/speckit.tasks
# AI 生成 tasks.md
```

```bash
git add specs/
git commit -m "docs: 添加任务分解 tasks.md"
git push origin main
```

> **此时全组都有 tasks.md，可以开始分配任务了**

---

#### 阶段六：后端开发（王五）

```bash
git pull origin main
git checkout -b feature/backend-auth

# 在 AI 助手中执行（推荐指定任务，不要一次性全跑）：
/speckit.implement --task T001

# 做完检查代码，确认没问题后：
/speckit.git.commit
git push origin feature/backend-auth

# 继续做下一个任务
/speckit.implement --task T002
/speckit.git.commit
git push

# 所有任务完成，提 PR（GitHub上操作）
# PR描述写：完成的任务编号、AI生成代码说明
```

---

#### 阶段七：前端开发（赵六，与王五并行）

```bash
git pull origin main
git checkout -b feature/frontend-auth

/speckit.implement  # AI 会自动执行 tasks.md 中前端相关任务

/speckit.git.commit
git push origin feature/frontend-auth
# 提 PR
```

> **关键点**：王五和赵六改的是不同文件，完全不冲突，可以并行开发。

---

#### 阶段八：Code Review（全组参与）

```bash
# 张三作为组长，review 王五的 PR
# 检查清单：
# □ 代码逻辑正确吗？
# □ 有没有安全风险？（密钥硬编码？SQL注入？）
# □ 符合 constitution.md 规范吗？
# □ AI生成的代码有没有幻觉？

# 确认无误后：Approve → Merge 到 main
```

---

#### 阶段九：全组同步

```bash
# 王五、赵六、李四都执行：
git checkout main
git pull origin main
# 现在每个人本地都有最新的 merged 代码了
```

---

### 3.3 两个后端人员如何协调（不冲突）？

**解决方案：按模块拆分任务，不碰同一份代码**

```bash
王五（后端A）负责：用户认证模块
  分支：feature/auth
  改动文件：src/routes/auth.js、src/models/User.js

赵六（后端B）负责：商品模块
  分支：feature/product
  改动文件：src/routes/product.js、src/models/Product.js

→ 两人改不同的文件，完全不冲突
```

**如果必须改同一个文件**：

在 `tasks.md` 里明确标注责任人：

```markdown
- [ ] T001 创建 users 表 → 王五
- [ ] T002 创建 products 表 → 赵六
- [ ] T003 修改 app.js 注册两个路由 → 王五（最后统一做）
```

> **关键原则**：基础文件（路由注册、app.js 入口）让一个人统一做，各模块的文件各自负责。

---

## 四、企业级 AI 编程规范框架

> 目前没有统一的国际标准，以下是头部企业（腾讯、阿里、Anthropic等）的事实实践框架。

---

### 4.1 支柱一：开发流程规范（SDD 规格驱动）

```
企业级规范执行顺序：

第0步：constitution.md（项目宪法，所有人遵守）
第1步：spec.md（需求规格，AI可读格式）
第2步：plan.md（技术方案，架构决策记录）
第3步：tasks.md（任务分解，可分配给不同人）
第4步：implement（AI辅助编码）
第5步：review（人工+AI双审查）
```

> **企业级要求**：每一步都有审批门控，不能跳过。`constitution.md` 是团队强制契约。

---

### 4.2 支柱二：代码审查规范（AI代码必须100%审查）

| 审查层级       | 传统代码     | AI生成代码（企业规范）           |
| ---------- | -------- | ---------------------- |
| **IDE层**   | 语法检查     | 实时AI审查（<5秒反馈）          |
| **PR层**    | 人工review | 人工+AI双审，高风险必须资深工程师复核   |
| **CI/CD层** | 跑测试      | 强制SAST扫描+性能回归+安全门禁     |
| **合规层**    | 无或手动     | 不可篡改审计日志，满足SOX/SOC2/等保 |

> **核心原则**：AI 生成的代码视同**初级工程师**代码，每一行都必须有人工监督。

---

### 4.3 支柱三：安全与合规规范（企业红线）

| 风险项        | 规范要求                            |
| ---------- | ------------------------------- |
| **代码泄露**   | 禁止把企业代码粘贴到公网 AI（GPT/Claude网页版）  |
| **敏感信息**   | AI 生成代码必须过敏感信息扫描（密钥/Token/PII）  |
| **供应链安全**  | AI 引入的开源依赖必须过安全扫描               |
| **可追溯性**   | 每行 AI 生成代码必须能追溯到原始 prompt 和审查记录 |
| **等保/ISO** | 审计日志不可篡改，保留至少1年                 |

---

### 4.4 AI代码 Review 检查清单（给学生用）

```
# AI 生成代码 Review 检查清单

## 必须检查项（每一行AI代码都要过）
□ 逻辑是否正确？有没有幻觉（编造的API/参数）？
□ 有没有安全风险？（SQL注入、XSS、密钥泄露）
□ 有没有处理错误情况？（网络失败、数据为空）
□ 有没有违反 constitution.md 的规范？

## AI 常见错误（重点检查）
□ 幻觉：调用了不存在的库函数
□ 幻觉：编造了错误的API参数
□ 安全：直接拼接SQL字符串
□ 安全：把密钥写死在代码里
□ 性能：没有做分页/限流

## Review 结论
□ Approve（通过）
□ Request Changes（打回，注明原因）
```

---

## 五、课程安排建议（明天实训课）

### 5.1 明天课程时间安排（6小时）

| 时间段         | 内容                  | 时长    | 说明                |
| ----------- | ------------------- | ----- | ----------------- |
| 09:00-10:00 | 授课：API接口设计规范 + 现场演示 | 60min | 学生已有数据库设计，下一步定义接口 |
| 10:00-11:30 | 学生实操：写API接口文档       | 90min | 每个核心模块至少5个接口      |
| 11:30-12:00 | 分组互评API文档           | 30min | 交叉检查              |

```
（午休）
```

| 时间段         | 内容              | 时长     | 说明                  |
| ----------- | --------------- | ------ | ------------------- |
| 14:00-15:00 | 授课：AI辅助编码实战演示   | 60min  | 现场用CodeBuddy演示一个小模块 |
| 15:00-17:00 | 学生实操：搭建项目骨架+写代码 | 120min | 建表、第一个接口            |
| 17:00-18:00 | 答疑 + 今天进度检查     | 60min  | 检查交付物               |

---

### 5.2 明天需要产出的交付物

| 交付物          | 说明                        | 预计用时 |
| ------------ | ------------------------- | ---- |
| **API接口文档**  | 每个核心模块至少5个接口，定义URL/参数/返回值 | 1.5h |
| **技术选型确认文档** | 前端框架、后端框架、数据库，写清楚理由       | 0.5h |
| **开始写代码**    | 搭建项目骨架、数据库建表、写第一个接口       | 2h   |

---

### 5.3 明天授课内容详细大纲

**第一小时：API接口设计规范**

1. RESTful API 设计规范（15分钟）
2. 现场演示：用 spec-kit 生成 API 规格（15分钟）
3. 学生练习：为自己项目定义接口（30分钟）

**第二小时：AI辅助编码实战**

1. 演示：用 CodeBuddy 从0到1实现一个登录模块（30分钟）
2. 讲解：多人协作流程 + Git 基础操作（20分钟）
3. 答疑（10分钟）

---

## 六、参考资料

| 来源                                       | 类型         | 获取方式                               |
| ---------------------------------------- | ---------- | ---------------------------------- |
| **IEEE 830**                             | 需求规格标准     | 国际标准                               |
| **GB/T 8567**                            | 中国软件文档规范   | 国标                                 |
| **Spec-Kit 官方**                          | 规格驱动开发工具   | https://github.com/github/spec-kit |
| **Anthropic Agentic Coding Trends 2026** | AI编程企业实践报告 | 官网可下载PDF                           |
| **腾讯AICR**                               | AI代码审查企业实践 | 腾讯云开发者社区                           |

---

*文档结束*
