---
order: 67
---

# AgentScope 笔记

## 1.Massage

`Msg`（消息）是 Agent 交互的基本单位——传给 Agent 或由 Agent 产出的每条消息都是 `Msg`。一条消息由 `role`（角色）、`name`（说话人标签）和一组 `ContentBlock`（内容块）构成；具体类型有 `UserMessage`（用户）、`AssistantMessage`（助手）、`SystemMessage`（系统）、`ToolResultMessage`（工具结果），分别对应 `USER` / `ASSISTANT` / `SYSTEM` / `TOOL` 四个角色。

### 1.1 massage的常用API及功能

`Msg` 是消息的统一接口，无论用户、系统、助手消息都能用下面这些方法读取内容：

| API | 功能 |
|-----|------|
| `getTextContent()` | 取消息里所有文本块拼接的纯文本（最常用） |
| `getRole()` | 取消息角色（`USER` / `ASSISTANT` / `SYSTEM` / `TOOL`） |
| `getName()` | 取说话人标签（如 `"user"`、`"alice"`） |
| `getContent()` / `getContentBlocks(Class)` | 取全部内容块 / 按类型过滤内容块 |
| `hasContentBlocks(Class)` | 判断是否含某类型的内容块 |
| `hasStructuredData()` / `getStructuredData(Class)` | 判断 / 读取结构化输出（元数据里 `_structured_output` 键） |
| `getMetadata()` | 取元数据（结构化输出、generateReason 等都放这里） |
| `getTimestamp()` / `getId()` | 取时间戳 / 消息 ID |

`getTextContent()` 只返回 `content` 列表里的 `TextBlock` 文本，与 name 无关。

### 1.2 massage的创建

**方式一：构造器（常用）**

```java
UserMessage user = new UserMessage("user", "这张图片里有什么？");
SystemMessage sys = new SystemMessage("system", "你是一个有用的助手。");
AssistantMessage asst = new AssistantMessage("agent", "讲个笑话");
// 单参构造：不带 name
UserMessage simple = new UserMessage("你好");
```

- 第一个字符串参数是 **name（说话人标签）**，随便写（`"user"`、`"alice"` 都行）
- role 由类决定：`UserMessage` 一定是 `USER`，与 name 无关
- 多模态用内容块数组：`new UserMessage("user", TextBlock, DataBlock...)`

**方式二：Builder**

```java
UserMessage msg = UserMessage.builder()
        .name("alice")
        .textContent("你好")
        .build();
```

Builder 可设置 name / role / content / metadata / timestamp 等全部字段。

**内容块（ContentBlock）类型**

| 块 | 作用 |
|----|------|
| `TextBlock` | 纯文本（`getTextContent()` 只读它） |
| `DataBlock` | 多模态数据（图片/音频/视频），配 `Base64Source`（data+mediaType）或 `URLSource`（url） |
| `HintBlock` | 提示块（id + hint，用于给模型附加说明） |

### 消息的三种类型

| 类 | 固定 role | 含义 | 类比 |
|----|-----------|------|------|
| `UserMessage` | `USER` | 用户提问 | 你 |
| `SystemMessage` | `SYSTEM` | 系统规则，用户不可见 | 后台管理员 |
| `AssistantMessage` | `ASSISTANT` | AI（助手）回复 | AI 自己 |

### user / agent / system 是什么

它们不是角色（role），而是消息的 **name（说话人标签）**。

```java
new UserMessage("user", "这张图片里有什么？")          // name = user
new SystemMessage("system", "你是一个有用的助手。")    // name = system
new AssistantMessage("agent", "讲个笑话")              // name = agent
```

- 构造器第一个字符串参数 → 存进 `Msg.name`，标签随便写（`alice`、`张三` 都行）
- role 由构造的类决定，与 name 无关：用 `UserMessage` 一定是 `USER`

### 使用要点

- 向 agent 发起任务用 `UserMessage`，模型回复是自动生成的 `AssistantMessage`
- `SystemMessage` 用来注入系统提示词
- `AssistantMessage` 只在手动拼接历史对话时用，别用它给 agent 下指令
- `getTextContent()` 只返回 content 里的文本块，与 name 无关
