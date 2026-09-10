# Java HTTP 请求

---

## 一、概述

在 Java 中发起 HTTP 请求，主流有三种方式：

| 方式 | 来源 | 同步/异步 | 推荐场景 |
|------|------|-----------|---------|
| Java 原生 HttpClient | JDK 11+ 自带 | 两者都支持 | 无 Spring 环境、不想引入额外依赖 |
| RestTemplate | Spring 3.0 提供 | 同步 | 存量项目遗留代码（已进入维护模式） |
| RestClient | Spring Boot 3.2+ 提供 | 同步 | **新项目首选**，官方主推 |

本章测试使用的免费 API 是 JSONPlaceholder（`https://jsonplaceholder.typicode.com`），专门供开发测试，无需注册。

---

## 二、Java 原生 HttpClient（JDK 11+）

Java 原生 HttpClient 是 JDK 11 引入的，替代了老旧的 `HttpURLConnection`。核心类只有三个：

- `HttpClient`：客户端实例，线程安全，全局复用
- `HttpRequest`：请求对象（URL、方法、头、体）
- `HttpResponse`：响应对象（状态码、头、体）

### 2.1 GET 请求

```
请求流程：
  创建 HttpClient → 构建 HttpRequest → 发送请求 → 读取 HttpResponse → JSON 解析为 Java 对象
```

```java
@Test
void testJavaHttpClient_GET() throws Exception {
    // ① 创建 HttpClient 实例（线程安全，全局复用一个即可）
    HttpClient client = HttpClient.newBuilder().build();

    // ② 构建 HttpRequest
    //    uri()     → 请求地址
    //    header()  → 请求头
    //    GET()     → HTTP 方法
    HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://jsonplaceholder.typicode.com/posts/1"))
            .header("Accept", "application/json")
            .GET()
            .build();

    // ③ 发送请求并获取响应
    //    BodyHandlers.ofString()  → 响应体按字符串处理
    //    BodyHandlers.ofFile()    → 响应体存为文件
    //    BodyHandlers.discarding() → 丢弃响应体
    HttpResponse<String> response = client.send(
            request, HttpResponse.BodyHandlers.ofString());

    // ④ 检查状态码
    System.out.println("状态码: " + response.statusCode());  // 200

    // ⑤ JSON 字符串 → Java 对象（用 Jackson 的 ObjectMapper）
    Post post = objectMapper.readValue(response.body(), Post.class);
    System.out.println("id=" + post.id + ", title=" + post.title);
}
```

### 2.2 POST 请求

与 GET 的区别：

- 方法换成 `POST()`
- 设置请求体：`BodyPublishers.ofString(jsonBody)`
- 设置 Content-Type 请求头

```java
@Test
void testJavaHttpClient_POST() throws Exception {
    HttpClient client = HttpClient.newBuilder().build();

    // 构建 JSON 请求体：Map → Jackson 序列化 → JSON 字符串
    Map<String, Object> bodyMap = Map.of(
            "title", "Java HTTP 测试",
            "body", "这是一篇通过 Java 发送 HTTP POST 请求创建的文章",
            "userId", 1
    );
    String jsonBody = objectMapper.writeValueAsString(bodyMap);

    // POST 请求的关键：Content-Type + 请求体
    HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://jsonplaceholder.typicode.com/posts"))
            .header("Content-Type", "application/json")      // 告知服务端：发的是 JSON
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody)) // 请求体
            .build();

    HttpResponse<String> response = client.send(
            request, HttpResponse.BodyHandlers.ofString());

    // POST 创建成功通常返回 201
    System.out.println("状态码: " + response.statusCode());  // 201
}
```

### 2.3 优缺点

| 优点 | 缺点 |
|------|------|
| JDK 自带，零依赖 | 代码量大，步骤繁琐 |
| 支持 HTTP/2 和 WebSocket | 每次都要手动 JSON 解析 |
| 支持同步和异步 | 没有自动重试、熔断等高级功能 |

---

## 三、RestTemplate（Spring，已进入维护模式）

RestTemplate 是 Spring 早期（3.0）推出的 HTTP 客户端，Spring 官方已将其标记为"维护模式"，不再添加新功能。存量项目大量使用，必须能看懂，但新项目不推荐。

### 3.1 核心优势：一行代码完成请求+解析

对比原生 HttpClient 需要 5 步，RestTemplate 只需 1 步完成"发请求 + JSON 解析"：

```java
@Test
void testRestTemplate_GET() {
    // 需要手动 new（Spring Boot 未自动配置 RestTemplate Bean）
    RestTemplate restTemplate = new RestTemplate();

    // 一行代码：发请求 → 收响应 → JSON → Java 对象
    String url = "https://jsonplaceholder.typicode.com/posts/1";
    Post post = restTemplate.getForObject(url, Post.class);

    System.out.println("id=" + post.id + ", title=" + post.title);
}
```

### 3.2 不推荐的原因

- Spring 官方不再维护新功能
- API 设计老旧，不适合链式调用
- 不支持虚拟线程等现代特性

---

## 四、RestClient（Spring Boot 3.2+，推荐）

RestClient 是 Spring Framework 6.1 / Spring Boot 3.2 引入的，用于取代 RestTemplate。采用 Fluent API（链式调用），代码清晰易读。

### 4.1 GET 请求

```java
@Test
void testRestClient_GET() {
    RestClient restClient = RestClient.create();

    // 链式调用：get → uri → retrieve → body
    // 读起来像英文句子："用 restClient 发 GET 到 /posts/1，取回响应，转成 Post"
    Post post = restClient.get()
            .uri("https://jsonplaceholder.typicode.com/posts/1")
            .accept(MediaType.APPLICATION_JSON)
            .retrieve()           // 发送请求并获取响应
            .body(Post.class);    // 自动 JSON → Java 对象

    System.out.println("id=" + post.id + ", title=" + post.title);
}
```

**链式调用每一步的含义：**

```
restClient.get()                    ← 选择 HTTP 方法（GET）
    .uri(url)                       ← 设置请求地址
    .accept(MediaType.APPLICATION_JSON)  ← 设置 Accept 头
    .retrieve()                     ← 执行请求
    .body(Post.class)               ← 提取响应体并反序列化
```

### 4.2 POST 请求

```java
@Test
void testRestClient_POST() {
    RestClient restClient = RestClient.create();

    Map<String, Object> bodyMap = Map.of(
            "title", "RestClient POST 测试",
            "body", "请求体内容",
            "userId", 1
    );

    // post → uri → contentType → body → retrieve → body
    Post created = restClient.post()
            .uri("https://jsonplaceholder.typicode.com/posts")
            .contentType(MediaType.APPLICATION_JSON)  // 等价于 header("Content-Type", "application/json")
            .body(bodyMap)               // 自动 Java 对象 → JSON 字符串
            .retrieve()
            .body(Post.class);           // 自动 JSON 字符串 → Java 对象

    System.out.println("新帖 id = " + created.id);
}
```

### 4.3 获取列表（JSON 数组 → List）

当服务端返回 JSON 数组时，不能直接用 `Post.class`（那是单个对象）。Java 的泛型擦除导致 `List<Post>.class` 语法不存在。

解决办法：使用 Spring 的 `ParameterizedTypeReference`，在运行时保留泛型信息。

```java
@Test
void testRestClient_GetList() {
    RestClient restClient = RestClient.create();

    // new ParameterizedTypeReference<List<Post>>() {}
    // 末尾的 {} 是匿名内部类写法，用于在运行时捕获泛型类型信息
    List<Post> posts = restClient.get()
            .uri("https://jsonplaceholder.typicode.com/posts")
            .retrieve()
            .body(new ParameterizedTypeReference<List<Post>>() {});

    System.out.println("获取到 " + posts.size() + " 篇文章");
    // 可以正常遍历
    for (Post post : posts) {
        System.out.println("  - " + post.title);
    }
}
```

**为什么需要匿名内部类？**

```
Java 编译时：
  List<Post>  →  List   （泛型被擦除，运行时不知道里面是 Post）

ParameterizedTypeReference 的匿名子类：
  new ParameterizedTypeReference<List<Post>>() {}
  通过反射读取父类的泛型参数 → 运行时保留了 List<Post> 的完整类型
```

### 4.4 错误处理

默认情况下，收到 4xx 或 5xx 响应会直接抛异常。通过 `onStatus()` 可以按状态码定制处理逻辑：

```java
@Test
void testRestClient_ErrorHandling() {
    RestClient restClient = RestClient.create();

    try {
        // 故意请求一个不存在的帖子（404）
        int notFoundId = 99999;
        Post post = restClient.get()
                .uri("https://jsonplaceholder.typicode.com/posts/" + notFoundId)
                .retrieve()
                // onStatus 的参数：
                //   参数一：状态码匹配器（哪些状态码触发回调）
                //   参数二：回调函数（触发后执行什么逻辑）
                .onStatus(
                        HttpStatusCode::is4xxClientError,  // 匹配 400~499
                        (request, response) -> {
                            System.out.println("请求失败！状态码: "
                                    + response.getStatusCode());
                            // 这里可以抛自定义异常、记录日志、返回默认值等
                        }
                )
                .body(Post.class);
    } catch (Exception e) {
        System.out.println("捕获异常: " + e.getMessage());
    }
}
```

**常用状态码匹配器：**

| 匹配器 | 匹配范围 |
|--------|---------|
| `HttpStatusCode::is4xxClientError` | 400 ~ 499 |
| `HttpStatusCode::is5xxServerError` | 500 ~ 599 |
| `HttpStatusCode::isError` | 400 ~ 599 |
| `status -> status.value() == 404` | 精确匹配 404 |

### 4.5 DTO 的写法

对应 JSON 的 Java 类（DTO），需要几个 Jackson 注解：

```java
/**
 * @JsonIgnoreProperties(ignoreUnknown = true)
 *   如果 JSON 返回了不认识的字段 → 忽略而不报错
 *   强烈建议加上：你控制不了第三方 API 的返回字段
 */
@JsonIgnoreProperties(ignoreUnknown = true)
private static class Post {

    // @JsonProperty("userId")
    //   当 JSON 字段名和 Java 字段名不一致时，显式映射
    //   如果一致，这个注解可以省略
    @JsonProperty("userId")
    private Integer userId;

    @JsonProperty("id")
    private Integer id;

    @JsonProperty("title")
    private String title;

    @JsonProperty("body")
    private String body;

    @Override
    public String toString() {
        return "Post{userId=" + userId + ", id=" + id
                + ", title='" + title + "'}";
    }
}
```

---

## 五、方式对比总结

```
Java HttpClient（JDK 11+）
  优点: 零依赖、支持异步和 HTTP/2
  缺点: 代码量大、每次都手动 JSON 解析
  适用: 非 Spring 环境、轻量脚本、不想引入任何 jar

RestTemplate（Spring 3.0+）
  优点: 一行代码搞定请求+解析
  缺点: 官方已不维护、API 老旧、不支持虚拟线程
  适用: 存量项目遗留代码（看到要认得）

RestClient（Spring Boot 3.2+）
  优点: 链式 API 清晰、官方主推、支持现代特性
  缺点: 需要 Spring Boot 3.2+
  适用: 新项目首选
```

**选择原则**：

- 有 Spring Boot 3.2+ → **RestClient**（首选）
- 老 Spring Boot 项目 → RestTemplate（维持现状，不急着迁移）
- 纯 Java / 非 Spring → JDK HttpClient
