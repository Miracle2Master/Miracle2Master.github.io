---
order: 66
---

# SpringAIAlibaba 实战笔记

> 基于 `F:\web\SpringAIAlibaba` 项目（Spring Boot 3.5.11 + Spring AI 1.1.2 + Spring AI Alibaba 1.1.2.0 + 中转站 OpenAI 兼容接口）

---

## 一、项目技术栈

| 组件 | 版本/名称 | 说明 |
|------|-----------|------|
| 语言 | Java 17 | 编译器需带 `-parameters` 参数（Spring 反射用） |
| 框架 | Spring Boot 3.5.11 | Web 类型为 SERVLET（Tomcat） |
| 核心 | Spring AI 1.1.2 | 统一模型抽象层 |
| 扩展 | Spring AI Alibaba 1.1.2.0 | Agent 框架 + DashScope 集成 |
| 模型通道 | 中转站 OpenAI 兼容接口 | base-url = `https://www.autodl.art/api` |

### 依赖要点

- 用 BOM（`spring-ai-bom` / `spring-ai-alibaba-bom`）统一管理版本，依赖不手写 version
- 需要 **`spring-boot-starter-web`**（Spring MVC）——只引 `spring-boot-starter` 会因 classpath 存在 webflux 而判定为响应式应用，报 `ReactiveWebServerFactory` 缺失
- `spring-ai-starter-model-openai` 与 `spring-ai-alibaba-starter-dashscope` 二选一（两者都提供 `ChatModel`，共存需 `@Primary`）

### Maven 坐标

**dependencyManagement（BOM 统一版本）**

| groupId | artifactId | version |
|---------|------------|---------|
| `org.springframework.ai` | `spring-ai-bom` | 1.1.2 |
| `com.alibaba.cloud.ai` | `spring-ai-alibaba-bom` | 1.1.2.0 |
| `com.alibaba.cloud.ai` | `spring-ai-alibaba-extensions-bom` | 1.1.2.1 |

**dependencies（依赖，版本由上方 BOM 管理）**

| groupId | artifactId | 说明 |
|---------|------------|------|
| `com.alibaba.cloud.ai` | `spring-ai-alibaba-agent-framework` | 版本由 alibaba-bom 定（1.1.2.0）；Agent 框架 |
| `org.springframework.ai` | `spring-ai-starter-model-openai` | 版本由 spring-ai-bom 定（1.1.2）；OpenAI 兼容模型接入 |
| `org.springframework.boot` | `spring-boot-starter` | Spring Boot 基础 |
| `org.springframework.boot` | `spring-boot-starter-web` | Spring MVC + Tomcat（必须） |
| `org.springframework.boot` | `spring-boot-starter-test` | scope=test |

> 曾用但已注释/移除：`com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope`（DashScope 版，与 openai starter 二选一）。

### Web 应用类型判定规则

Spring Boot 启动时按 classpath 自动判定 Web 类型：

```
有 DispatcherServlet（starter-web）        → SERVLET（Tomcat）
无 MVC 但有 DispatcherHandler（webflux）  → REACTIVE（需 starter-webflux 提供服务器）
都无                                        → NONE
```

---

## 二、application.yml 配置

```yaml
server:
  port: 8080

spring:
  ai:
    openai:
      api-key: <你的 API Key>          # ⚠️ 不要提交真实 key 到公开仓库
      base-url: https://www.autodl.art/api
      chat:
        options:
          model: DeepSeek-V4.1-Flash
          temperature: 0.7
          max-tokens: 2000
          top-p: 0.9
```

### base-url 的规则

base-url 填到 `https://www.autodl.art/api` 即可——Spring AI 的 OpenAI 模块会在内部**自动补全** `/v1/chat/completions`，最终请求为 `https://www.autodl.art/api/v1/chat/completions`。因此 base-url **不要**再额外带 `/v1`（否则会拼成 `/api/v1/v1/...`）。若需自定义也可用 `.completionsPath("/chat/completions")` 覆盖默认路径。

---

## 三、项目结构

```
src/main/java/com/master/ai/
├── SpringAiAlibabaApplication.java      # 启动类
├── Controller/
│   └── ChatController.java              # /chat /weather 接口
├── Configration/
│   ├── ChatClientConfig.java            # ChatModel + 两个 ReactAgent Bean
│   └── ToolConfig.java                  # 工具回调 Bean（getWeatherTool 等）
├── tool/
│   ├── WeatherForLocationTool.java      # 天气工具（BiFunction 实现）
│   ├── UserLocationTool.java            # 用户位置工具（读 RunnableConfig 元数据）
│   └── SearchTool.java                  # 搜索/穿搭工具
├── dto/
│   ├── WeatherRequest.java              # 天气工具输入
│   ├── UserLocationRequest.java         # 位置工具输入
│   └── ResponseFormat.java              # 结构化输出示例
└── contants/
    └── SystemConstants.java             # SYSTEM_PROMPT / SEARCH_PROMPT
```

---

## 四、核心概念：从 ChatModel 到 Agent

### 4.1 三层能力

| 层级 | 组件 | 能力 |
|------|------|------|
| 直接调用 | `ChatModel`（OpenAiChatModel） | 纯问答，无工具 |
| 工具增强 | `ToolCallback` + `FunctionToolCallback` | 模型可自主调用工具 |
| 智能体 | `ReactAgent`（ReAct） | 多轮思考 + 自主决策调工具 |

### 4.2 普通 ChatModel vs ReactAgent

| | ChatModel.call() | ReactAgent.call() |
|---|---|---|
| 工具 | 无 | 挂载多个 ToolCallback |
| 决策 | 不自主 | 自己判断要不要调、调哪个 |
| 循环 | 一问一答 | Thought→Action→Observation 循环至收敛 |

ReAct 循环：

```
Thought（判断缺什么信息）
  ↓
Action（选一个工具调用）
  ↓
Observation（观察工具返回）
  ↓
Thought（够了吗？不够继续）… 直到 Final Answer
```

---

## 五、工具（Tool）机制

### 5.1 三个组成部分

| 部分 | 代码位置 | 作用 |
|------|----------|------|
| 工具函数 | `tool/*.java` 实现 `BiFunction<输入, ToolContext, String>` | 实际执行逻辑 |
| 输入 DTO | `dto/*Request.java` | 定义工具参数的 JSON Schema |
| 回调注册 | `ToolConfig.java` 的 `@Bean` | 包装成 `ToolCallback` 供 Agent 使用 |

### 5.2 一个完整工具的三件套

```java
// ① 输入 DTO（定义参数 schema）
public class WeatherRequest {
    @ToolParam(description = "The city name")
    private String city;
    // getter / setter
}

// ② 工具函数（实现 BiFunction）
public class WeatherForLocationTool implements BiFunction<WeatherRequest, ToolContext, String> {
    @Override
    public String apply(WeatherRequest req, ToolContext ctx) {
        return "最近，天气一直是晴天 " + req.getCity() + "!";
    }
}

// ③ 注册为 Bean（挂到 Agent）
@Bean
public ToolCallback getWeatherTool() {
    return FunctionToolCallback
            .builder("getWeatherForLocation", new WeatherForLocationTool())
            .description("根据城市查询天气")
            .inputType(WeatherRequest.class)
            .build();
}
```

### 5.3 inputType 的约定

`inputType` 是工具的参数类型声明，需遵循：

1. **必须与 `BiFunction` 第一个泛型一致**（都指向同一个 DTO，如 `WeatherRequest`）
2. **必须显式指定**——`BiFunction` 有两个泛型参数，框架无法自动推断该用哪个作为输入
3. **必须是 DTO（对象类型）**——OpenAI 兼容接口要求工具参数是 `{"type":"object",...}`，不能用 `String.class`（那会生成 `{"type":"string"}`）

### 5.4 Schema（JSON Schema）是什么

Schema 就是「JSON 数据的类型定义」，等价于 Java 里给类定义结构，但描述 JSON 对象：

```json
{
  "type": "object",
  "properties": { "city": { "type": "string" } },
  "required": ["city"]
}
```

Java 类（`WeatherRequest`）→ 框架反射生成 JSON Schema → 塞进发给模型的工具定义 → 模型按 schema 生成参数 JSON。所以 **DTO 的字段名/注释直接决定模型如何填参数**。

---

## 六、UserLocationTool：从上下文读用户信息

```java
public class UserLocationTool implements BiFunction<UserLocationRequest, ToolContext, String> {
    @Override
    public String apply(UserLocationRequest req, ToolContext ctx) {
        String userId = "";
        if (ctx != null && ctx.getContext() != null) {
            RunnableConfig config =
                    (RunnableConfig) ctx.getContext().get(ToolContextConstants.AGENT_CONFIG_CONTEXT_KEY);
            if (config != null) {
                Optional<Object> meta = config.metadata("user_id");
                if (meta.isPresent()) {
                    userId = String.valueOf(meta.get());   // 用 String.valueOf 兼容 Integer/String
                }
            }
        }
        return "1".equals(userId) ? "Florida" : "San Francisco";
    }
}
```

### 要点

- 常量来源：`com.alibaba.cloud.ai.graph.agent.tools.ToolContextConstants.AGENT_CONFIG_CONTEXT_KEY`（不是裸引用）
- `RunnableConfig` 来源：`com.alibaba.cloud.ai.graph.RunnableConfig`
- 从元数据取值用 `String.valueOf(...)`（兼容 Integer/String 两种类型）
- 写入侧（Controller）：`RunnableConfig.builder().threadId(...).addMetadata("user_id", 1).build()`

---

## 七、ReactAgent 与 Bean 装配

### 7.1 定义两个 Agent（多个同类型 Bean）

```java
@Bean
public ReactAgent WeatherAgent(ChatModel DeepSeek4_1) {
    return ReactAgent.builder()
            .name("weather_agent")
            .model(DeepSeek4_1)
            .systemPrompt(SYSTEM_PROMPT)
            .tools(List.of(getWeatherTool, getUserLocationTool))
            .saver(new MemorySaver())
            .build();
}

@Bean
public ReactAgent SearchAgent(ChatModel DeepSeek4_1) {
    return ReactAgent.builder()
            .name("search_agent")
            .model(DeepSeek4_1)
            .systemPrompt(SEARCH_PROMPT)
            .tools(List.of(getUserLocationTool, getSearchTool))
            .saver(new MemorySaver())
            .build();
}
```

### 7.2 多个同类型 Bean 的注入方式

Spring 默认**按类型**注入。当容器中有多个同类型 Bean（如两个 `ReactAgent`）时，需要用名字区分：

```java
@Autowired @Qualifier("weatherAgent") private ReactAgent weatherAgent;
@Autowired @Qualifier("searchAgent") private ReactAgent searchAgent;
```

Bean 名 = 方法名首字母小写（`WeatherAgent` → `weatherAgent`）。

### 7.3 自定义 ChatModel 与自动装配

手写 `@Bean ChatModel DeepSeek4_1()` 会与 Spring Boot 自动配置的 `openAiChatModel` 并存。在手写 Bean 上加 `@Primary` 表示默认优先使用它。

> Spring 的注入是「确定性装配」，不是「智能路由」。「该用哪个 Agent 回答用户」是业务逻辑，需要自己在 Controller 里路由（关键词判断，或再套一个路由 LLM）。

---

## 八、Controller 调用

```java
@GetMapping("weather")
public String WeatherChat() throws GraphRunnerException {
    Thread thread = Thread.currentThread();
    RunnableConfig config = RunnableConfig.builder()
            .threadId(String.valueOf(thread.getId()))
            .addMetadata("user_id", 1)
            .build();
    AssistantMessage response = weatherAgent.call("今天天气如何，你推荐什么穿搭。", config);
    return response.getText();
}
```

`agent.call(String, RunnableConfig)` 支持传线程 ID（多轮记忆 + 元数据）。`call()` 抛受检异常 `GraphRunnerException`。

---

## 九、回复语言控制

模型输出语言由**系统提示词**主导：

- 提示词里 `speaks in puns` → 模型会切英文玩双关
- 提示词明确「请始终用中文回答用户」→ 中文输出

```java
public static String SYSTEM_PROMPT = """
    你是一个天气预报专家，喜欢用幽默和双关的方式说话。
    请始终用中文回答用户。
    你有两个工具可用：
    - getWeatherForLocation: 查询指定城市的天气
    - getUserLocation: 获取用户所在位置
    ...
    """;
```

提示词里工具名要用**实际注册名**（`getWeatherForLocation` 驼峰），模型才能正确调用。

---

## 十、手动创建 ChatModel（可选）

不用 yml 时，可手动构造：

```java
@Bean
@Primary
public ChatModel DeepSeek4_1() {
    OpenAiApi openAiApi = OpenAiApi.builder()
            .apiKey(System.getenv("API_KEY"))
            .baseUrl("https://www.autodl.art/api")
            .build();
    return OpenAiChatModel.builder()
            .openAiApi(openAiApi)
            .defaultOptions(OpenAiChatOptions.builder()
                    .model("DeepSeek-V4.1-Flash")
                    .temperature(0.7)
                    .maxTokens(2000)
                    .topP(0.9)
                    .build())
            .build();
}
```

> apiKey 建议从配置文件读取，而不是依赖环境变量（环境变量未设置时返回 `null`）。

DashScope 版对照（方法名差异）：`DashScopeChatModel.builder().dashScopeApi(...)` ↔ `OpenAiChatModel.builder().openAiApi(...)`；`withModel`/`withTemperature` ↔ `model`/`temperature`。
