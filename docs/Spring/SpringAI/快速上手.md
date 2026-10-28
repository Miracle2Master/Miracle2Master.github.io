---
order: 64
---

# Spring AI 快速上手笔记

> 基于 `heima-ai` 项目（Spring Boot 4.1.0 + Spring AI 2.0.0 + DeepSeek）

---

## 一、依赖引入

```xml
<!-- Spring AI BOM — 统一管理版本 -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>2.0.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<!-- WebMvc -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webmvc</artifactId>
</dependency>

<!-- DeepSeek 模型 starter -->
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-deepseek</artifactId>
</dependency>
```

---

## 二、application.yml 配置

```yaml
spring:
  application:
    name: heima-ai
  ai:
    deepseek:
      base-url: https://api.deepseek.com        # API 地址
      chat:
        model: deepseek-v4-flash                # 模型名称
      api-key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx  # API 密钥（勿泄露）
```

---

## 三、ChatClient Bean 配置

```java
@Configuration
public class CommonConfiguration {

    /**
     * 创建 ChatClient Bean，作为与 AI 模型交互的核心入口
     *
     * @param model DeepSeekChatModel — Spring AI 自动注入，
     *              由 application.yml 中的 spring.ai.deepseek 配置驱动
     */
    @Bean
    public ChatClient chatClient(DeepSeekChatModel model) {
        return ChatClient.builder(model)
                // 默认系统提示词：每次对话自动拼接到请求中，定义 AI 的基础行为
                .defaultSystem("每次回答我，称呼我为jack")
                // 日志顾问：在控制台打印每次请求/响应的详细日志，便于调试
                .defaultAdvisors(new SimpleLoggerAdvisor())
                .build();
    }
}
```

### 关键概念

| 组件 | 作用 |
|------|------|
| `DeepSeekChatModel` | DeepSeek 聊天模型的封装，由 Spring AI 自动配置 |
| `ChatClient` | 与 AI 模型交互的核心客户端，支持链式调用 |
| `defaultSystem()` | 设置默认的系统提示词（System Prompt），每次请求自动附带 |
| `defaultAdvisors()` | 添加"顾问"拦截器，用于日志、安全、记忆增强等 |

---

## 四、Controller — AI 对话接口

### 4.1 同步调用（阻塞式）

```java
@RequestMapping("/chat")
public String chat(String prompt) {
    return chatClient.prompt()
            .user(prompt)   // 用户消息
            .call()         // 同步调用，等待完整响应
            .content();     // 提取文本内容
}
```

### 4.2 流式调用（SSE / 逐字返回）

```java
@RequestMapping(value = "/chat", produces = "text/html;charset=utf-8")
public Flux<String> chat(String prompt) {
    return chatClient.prompt()
            .user(prompt)   // 用户消息
            .stream()       // 流式调用，逐 token 返回
            .content();     // 返回 Flux<String>
}
```

### 调用方式对比

| 方法 | 返回类型 | 适用场景 |
|------|---------|---------|
| `.call().content()` | `String` | 短回答、非实时场景 |
| `.stream().content()` | `Flux<String>` | 长回答、需要打字机效果 |

---

## 五、完整调用链路

```
用户请求 → ChatController
    → ChatClient.prompt().user(prompt)
        → 拼接 defaultSystem（系统提示词）
        → 经过 defaultAdvisors（SimpleLoggerAdvisor 打日志）
        → DeepSeekChatModel 调用 DeepSeek API
    → stream() / call()
→ 返回响应给用户
```

---

## 六、扩展方向

1. **多轮对话** — 使用 `MessageChatMemoryAdvisor` 实现上下文记忆
2. **RAG** — 结合 `spring-ai-starter-model-embedding` + 向量数据库
3. **函数调用** — 通过 `@Tool` 注解让 AI 调用本地方法
4. **多模型切换** — 同时引入 OpenAI / Ollama starter，按需注入不同的 ChatModel
