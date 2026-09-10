# Spring Boot 集成 Redis（Jedis）

---

## 一、Maven 依赖

```xml
<!-- Redis -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
    <exclusions>
        <!-- 排除 Lettuce，使用 Jedis 作为 Redis 客户端 -->
        <exclusion>
            <groupId>io.lettuce</groupId>
            <artifactId>lettuce-core</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

### 依赖树

```
spring-boot-starter-data-redis:3.3.5
    └── spring-data-redis:3.3.5
            ↓
spring-ai-starter-vector-store-redis（如有）
    └── spring-ai-redis-store
        ├── jedis:5.0.2          ← Redis Java 客户端
        └── commons-pool2:2.12.0 ← 通用对象池（Jedis 连接池底层）
```

### 为什么排除 Lettuce

Spring Boot 默认使用 **Lettuce** 作为 Redis 客户端。如果项目已通过其他依赖引入 Jedis（如 `spring-ai-redis-store`），同时又有 Lettuce，classpath 上出现两个客户端会导致：

1. Spring Boot 自动配置偏向 Lettuce，Jedis 连接池配置会失效
2. 两个客户端共存浪费资源，且行为不可预期

排除 Lettuce 后只留 Jedis，保证客户端一致。

---

## 二、application.yml 配置

```yaml
spring:
  data:
    redis:
      host: localhost          # Redis 服务器地址
      port: 6379               # Redis 服务端口（默认 6379）
      password: mypassword     # 认证密码，未设置 requirepass 则留空
      database: 0              # 第几号数据库（0~15，共 16 个逻辑库，相互隔离）
      jedis:                   # 声明使用 Jedis 客户端
        pool:                  # Jedis 连接池配置
          max-active: 8        # 最大活跃连接数（含空闲 + 使用中）
          max-idle: 8          # 最大空闲连接数
          min-idle: 0          # 最小空闲连接数
```

### 参数详解

#### 连接层

| 参数 | 作用 |
|------|------|
| `host` | Redis 服务器地址，`localhost` 表示本机 |
| `port` | Redis 服务端口，默认 `6379` |
| `password` | 认证密码。Redis 若未通过 `requirepass` 设置密码，留空即可 |
| `database` | 选择第几号数据库。Redis 默认有 0~15 共 16 个逻辑数据库，数据相互隔离 |

#### Jedis 连接池层

| YAML 配置 | Pool2 实际方法 | 含义 |
|-----------|---------------|------|
| `max-active: 8` | `setMaxTotal(8)` | 池中最多同时存在 8 个 Jedis 实例（含空闲 + 借出中） |
| `max-idle: 8` | `setMaxIdle(8)` | 池中最多保留 8 个**空闲**的 Jedis 实例 |
| `min-idle: 0` | `setMinIdle(0)` | 池中至少保持 0 个空闲实例（允许全部回收） |

#### 配置策略：为什么是 8/8/0

| 参数 | 值 | 策略含义 |
|------|-----|---------|
| `max-active: 8` | 最大 8 个连接 | 常规业务并发不需要更多。单机 Redis 处理 8 个并发连接绰绰有余 |
| `max-idle: 8` | 等于 max-active | **高峰过后不缩容**。峰值时用过的连接全部留在池中复用，下次请求来无需 TCP 三次握手 |
| `min-idle: 0` | 不保留 | **闲时零开销**。没有请求时释放所有 TCP 连接，不占 Redis 服务端文件描述符 |

---

## 三、Jedis 是什么

Jedis 是 Redis 官方推荐的 Java 客户端，本质是一个**同步阻塞的 TCP 客户端**。每一行 `redisTemplate.opsForValue().set("key", "val")` 最终都会被 Jedis 翻译成 Redis 的 **RESP 协议**字节流，通过 Socket 发送给 Redis 服务端。

```
你的代码 → RedisTemplate → Jedis → Socket(TCP) → Redis Server
```

### Spring Boot 如何"认出" Jedis

Spring Boot 的 `RedisAutoConfiguration` 自动配置类决策逻辑：

```
classpath 上有 Lettuce 吗？ → 用 Lettuce
classpath 上只有 Jedis 吗？ → 用 Jedis
两者都有？                 → Lettuce 优先（Spring Boot 默认偏向）
```

排除 Lettuce 后，classpath 上只剩 `jedis-5.0.2.jar`，自动配置检测到后创建 `JedisConnectionFactory` Bean。

---

## 四、配置生效链路：从 YAML 到连接池实例

```
application.yml
    │
    ▼
@ConfigurationProperties(prefix = "spring.data.redis")
RedisProperties.java                          ← 绑定 host/port/password/database
    │
    ├── .getJedis().getPool()                 ← 绑定 jedis.pool.max-active 等
    │
    ▼
JedisConnectionConfiguration                  ← Spring Boot 内部配置类
    │
    ├── 用 RedisProperties 的值构建配置
    │
    ▼
JedisConnectionFactory                        ← 核心工厂 Bean
    │
    ├── 内部持有 JedisClientConfiguration
    │       │
    │       ▼
    │   JedisPoolConfig                       ← 来自 Apache Commons Pool2
    │       │
    │       ├── maxActive  → setMaxTotal(8)
    │       ├── maxIdle    → setMaxIdle(8)
    │       ├── minIdle    → setMinIdle(0)
    │       │
    │       ▼
    │   GenericObjectPool<Jedis>              ← 真正的连接池实例
    │
    ▼
RedisTemplate / StringRedisTemplate           ← 最终暴露给开发者使用的 Bean
```

关键点：`jedis.pool` 下的参数并非 Jedis 原生，而是映射到 **Apache Commons Pool2** 的 `GenericObjectPool` 配置。Jedis 的连接池实际上就是 Commons Pool2 的对象池。

---

## 五、连接池底层原理（GenericObjectPool）

Commons Pool2 的 `GenericObjectPool` 是一个通用"对象池"，不关心池子里装的是什么，只管**借出**和**归还**。Jedis 把 `Jedis` 实例（每个实例持有一个 TCP Socket 连接）放入这个池中管理。

### 借出流程（borrowObject）

```
请求 Redis 操作
    │
    ▼
GenericObjectPool.borrowObject()
    │
    ├── 池中有空闲对象？
    │   ├── 有 → 拿出一个 Jedis，验证连接是否存活
    │   │        ├── 存活 → 返回给调用方
    │   │        └── 断开 → 销毁，尝试下一个
    │   │
    │   └── 没有 → 当前 total < maxTotal(8)？
    │            ├── 是 → 创建新的 Jedis 实例（new Jedis(host, port) → TCP 三次握手）
    │            └── 否 → 阻塞等待，直到有人归还 或 超时
    │
    ▼
调用方拿到 Jedis，执行 Redis 命令，执行完后 returnObject() 归还
```

### 归还流程（returnObject）

```
GenericObjectPool.returnObject(jedis)
    │
    ├── 当前空闲数 < maxIdle(8)？
    │   ├── 是 → 放回池中，标记为空闲
    │   └── 否 → 不放入池，直接 close() Socket → TCP 四次挥手 → 对象被 GC
```

### 后台清理（Evictor 驱逐线程）

Pool2 内置一个**驱逐线程**，定期扫描空闲对象：

```
Evictor 线程每隔一段时间检查：
    ├── 当前空闲数 > minIdle(0)？
    │   └── 是 → 检查每个空闲 Jedis 是否超过"最大空闲时间"
    │            ├── 超时 → 关闭连接，销毁对象
    │            └── 未超时 → 保留
    │
    └── 当前空闲数 < minIdle(0)？
        └── 是 → 创建新连接补充到 minIdle ← 但 minIdle=0，所以不会补充
```

---

## 六、一个完整的 Redis 请求生命周期

```
1. 调用 stringRedisTemplate.opsForValue().set("user:1", "张三")

2. RedisTemplate 内部调用 JedisConnectionFactory.getConnection()

3. JedisConnectionFactory 向 GenericObjectPool 借一个 Jedis

4. GenericObjectPool 从空闲队列拿出一个 Jedis（或新建）

5. Jedis 通过已建立的 TCP Socket 发送 RESP 协议数据：
   *3\r\n$3\r\nSET\r\n$6\r\nuser:1\r\n$6\r\n张三\r\n

6. Redis Server 处理并回复：
   +OK\r\n

7. Jedis 解析回复，返回给 RedisTemplate

8. RedisTemplate 调用 GenericObjectPool.returnObject(jedis) 归还连接

9. 连接回到池中，等待下次复用
```

---

## 七、注入使用

```java
@Autowired
private StringRedisTemplate stringRedisTemplate;   // key/value 都是 String

@Autowired
private RedisTemplate<String, Object> redisTemplate; // 支持对象序列化
```

### 常用操作

```java
// String 操作
stringRedisTemplate.opsForValue().set("key", "value");
String value = stringRedisTemplate.opsForValue().get("key");

// Hash 操作
stringRedisTemplate.opsForHash().put("user:1", "name", "张三");
Object name = stringRedisTemplate.opsForHash().get("user:1", "name");

// 过期时间
stringRedisTemplate.expire("key", 30, TimeUnit.MINUTES);

// 删除
stringRedisTemplate.delete("key");
```

---

## 八、数据类型操作入口：opsForXxx() 设计原理

### 为什么是 `redis.opsForValue().get("key")` 而不是 `redis.get("key")`

Redis 有 5 种核心数据类型，每种类型的操作命令不同。Spring Data Redis 采用"一个 Template + 多个操作入口"的设计：

```
StringRedisTemplate（统一管理连接池）
    │
    ├── opsForValue()  → ValueOperations   → 操作 String  类型（SET / GET / INCR / SETEX）
    ├── opsForHash()   → HashOperations    → 操作 Hash    类型（HSET / HGET / HGETALL）
    ├── opsForList()   → ListOperations    → 操作 List    类型（LPUSH / RPOP / LRANGE）
    ├── opsForSet()    → SetOperations     → 操作 Set     类型（SADD / SMEMBERS / SINTER）
    └── opsForZSet()   → ZSetOperations    → 操作 ZSet    类型（ZADD / ZRANGE / ZSCORE）
```

**设计思想**：连接的管理（借出/归还/验证）由底层 Template 自动完成，开发者只需关心"操作哪种数据类型"，不需要关心"如何获取和释放连接"。

### key 级别的通用操作

有些操作不属于任何数据类型，直接挂在 Template 一级：

```java
redis.delete(key)        // DEL key（删除）
redis.expire(key, 30)   // EXPIRE key 30（设置过期）
redis.hasKey(key)       // EXISTS key（是否存在）
redis.type(key)          // TYPE key（数据类型）
```

---

## 九、String 类型操作

### 9.1 基础读写

String 是 Redis 最基础的类型，可存任意二进制数据，最大 512MB。

```java
// SET key value
redis.opsForValue().set("test:name", "张三");

// GET key
String value = redis.opsForValue().get("test:name");
```

**key 命名规范**：使用冒号 `:` 分隔层级，如 `业务模块:实体类型:唯一标识`。在 Redis GUI 工具中会按树形折叠展示。

### 9.2 带过期时间的写入（SETEX）

```java
// set(key, value, timeout, unit)
// 原子操作，设值 + 设过期一次完成，不会出现"设值成功但设过期失败"的中间状态
redis.opsForValue().set("test:temp", "临时数据", 1, TimeUnit.SECONDS);

// 立即获取 → 可以取到
String value = redis.opsForValue().get("test:temp");  // "临时数据"

Thread.sleep(1500);

// 1.5 秒后再获取 → null（已过期）
String expired = redis.opsForValue().get("test:temp");  // null
```

**Redis 的过期删除策略**：

- 惰性删除：访问 key 时发现过期 → 删除
- 定期删除：后台每 100ms 随机抽查一批 key，过期的删除

### 9.3 原子自增（INCR）

```java
redis.opsForValue().set("test:counter", "0");

Long v1 = redis.opsForValue().increment("test:counter");  // 0 → 1
Long v2 = redis.opsForValue().increment("test:counter");  // 1 → 2
Long v3 = redis.opsForValue().increment("test:counter");  // 2 → 3
```

**INCR 的原子性**：整个过程在 Redis 服务端单线程执行，100 个客户端同时 INCR 同一个 key，最终结果也是精确 +100，不会出现并发覆盖。

对比非原子操作：
```
线程A: GET 100 → 减10 → SET 90
线程B:        GET 100 → 减10 → SET 90
结果: 100 → 90（丢了一次减10，典型的"读-改-写"竞态条件）
```

---

## 十、Hash 类型操作

### 10.1 Hash 是什么

Hash 像一个"小字典"：一个 key 下面有多个 field-value 对。

```
key: "test:user:1"
  ├── field: "name"  → value: "张三"
  ├── field: "age"   → value: "25"
  └── field: "role"  → value: "管理员"
```

类比关系型数据库：Hash key = 表名，field = 列名，value = 单元格值。

### 10.2 基础操作

```java
// HSET：写入字段
redis.opsForHash().put("test:user:1", "name", "张三");
redis.opsForHash().put("test:user:1", "age", "25");
redis.opsForHash().put("test:user:1", "role", "管理员");

// HGET：读取单个字段
Object name = redis.opsForHash().get("test:user:1", "name");  // "张三"

// HDEL：删除某个字段
redis.opsForHash().delete("test:user:1", "age");
```

### 10.3 Hash vs String 的选择

| 存法 | 示例 | 优点 | 缺点 |
|------|------|------|------|
| Hash | `HSET user:1 name 张三` | 可单独读写字段、内存更省 | 不支持 TTL on field |
| String(JSON) | `SET user:1 '{"name":"张三","age":25}'` | 简单直观 | 改一个字段要整体序列化/反序列化 |

**选择原则**：需要按字段单独读写的 → Hash；整体读写多 → String 存 JSON。

---

## 十一、List 类型操作

### 11.1 List 是什么

Redis 的 List 是一个双向链表，可以从左右两端插入/弹出。底层实现是 QuickList（压缩列表节点组成的双向链表）。

### 11.2 队列模式（LPUSH + RPOP = FIFO 先进先出）

```
生产者（左端进）              消费者（右端出）
  LPUSH "C"                       │
  LPUSH "B"                       │
  LPUSH "A"                       ▼
  ┌─────────────────────────┐
  │  A  ←  B  ←  C         │
  └─────────────────────────┘
                              RPOP → "C"（最早进入的）
                              RPOP → "B"
                              RPOP → "A"
```

```java
// LPUSH：从左侧推入
redis.opsForList().leftPush("queue:orders", "C");  // [C]
redis.opsForList().leftPush("queue:orders", "B");  // [B, C]
redis.opsForList().leftPush("queue:orders", "A");  // [A, B, C]

// RPOP：从右侧弹出（最早进去的最先出来）
String first = redis.opsForList().rightPop("queue:orders");   // "C"
String second = redis.opsForList().rightPop("queue:orders");  // "B"
String third = redis.opsForList().rightPop("queue:orders");   // "A"
```

### 11.3 栈模式（LPUSH + LPOP = LIFO 后进先出）

```java
redis.opsForList().leftPush("stack:demo", "A");
redis.opsForList().leftPush("stack:demo", "B");
redis.opsForList().leftPush("stack:demo", "C");

// LPOP：从同侧弹出
redis.opsForList().leftPop("stack:demo");  // "C"（最后进的）
redis.opsForList().leftPop("stack:demo");  // "B"
redis.opsForList().leftPop("stack:demo");  // "A"（最早进的）
```

### 11.4 范围查询（LRANGE，不删除元素）

```java
redis.opsForList().rightPushAll("list:demo", "A", "B", "C", "D", "E");

// LRANGE key start stop（闭区间，包含两端）
List<String> all = redis.opsForList().range("list:demo", 0, -1);  // 全部
List<String> top3 = redis.opsForList().range("list:demo", 0, 2);  // 前 3 条

// LRANGE 不删除元素，原列表不变
Long size = redis.opsForList().size("list:demo");  // 5
```

### 11.5 阻塞弹出（BLPOP / BRPOP）

空列表时，不立即返回 null，而是等待新元素或超时。这是 Redis 实现"可靠消息队列"的基础。

```java
// 空列表非阻塞弹出 → 立即返回 null
String immediate = redis.opsForList().leftPop("queue:demo");  // null

// 阻塞弹出：等 1 秒，1 秒内如果有元素进来就返回，否则超时返回 null
String blocked = redis.opsForList().leftPop("queue:demo", 1, TimeUnit.SECONDS);
```

---

## 十二、Set 类型操作

### 12.1 Set 是什么

Set 是无序、不重复的字符串集合，类比 Java 的 `HashSet<String>`。

### 12.2 基础操作

```java
// SADD：添加成员。重复添加会被忽略，返回 0
Long add1 = redis.opsForSet().add("set:demo", "张三");  // 1（成功）
Long add2 = redis.opsForSet().add("set:demo", "张三");  // 0（重复，忽略）

// SMEMBERS：获取所有成员（无序）
Set<String> members = redis.opsForSet().members("set:demo");

// SISMEMBER：判断元素是否存在（O(1)）
Boolean exists = redis.opsForSet().isMember("set:demo", "张三");  // true

// SCARD：元素个数
Long size = redis.opsForSet().size("set:demo");

// SREM：删除指定成员
Long removed = redis.opsForSet().remove("set:demo", "张三");
```

### 12.3 交集（SINTER）—— 共同好友

```java
// 张三的好友集合
redis.opsForSet().add("user:friends:张三", "李四", "王五", "赵六");
// 王五的好友集合
redis.opsForSet().add("user:friends:王五", "李四", "王五", "张三");

// 取交集："既是张三的好友，也是王五的好友"
Set<String> common = redis.opsForSet().intersect(
    "user:friends:张三", "user:friends:王五");
// → {"李四", "王五"}
```

### 12.4 差集（SDIFF）—— 可能认识的人

```java
// 我的好友
redis.opsForSet().add("user:friends:我", "李四", "王五");
// 张三的好友
redis.opsForSet().add("user:friends:张三", "李四", "王五", "赵六");

// SDIFF A B = A 有但 B 没有的
Set<String> maybeKnow = redis.opsForSet().difference(
    "user:friends:张三", "user:friends:我");
// → {"赵六"}（张三认识但我不认识）
```

### 12.5 随机抽取（抽奖）

```java
// SRANDMEMBER：随机取 n 个，不删除（适合展示中奖号码）
List<String> lucky = redis.opsForSet().randomMembers("lottery:pool", 2);

// SPOP：随机弹出，取完就删（适合抽走就不能再中奖）
String winner = redis.opsForSet().pop("lottery:pool");
```

---

## 十三、ZSet（Sorted Set）类型操作

### 13.1 ZSet 是什么

ZSet = Set + 分数（score）。每个成员绑定一个 double 类型的分数，Redis 按分数自动排序。

底层实现：数据量小时用 ZipList（压缩列表），数据量大时用 **跳表（SkipList + 哈希表）**。跳表提供 O(logN) 的范围查询和排名，哈希表提供 O(1) 的成员查找。

### 13.2 排行榜（最常见应用）

```java
// ZADD：添加成员和分数
redis.opsForZSet().add("leaderboard", "玩家A", 100);
redis.opsForZSet().add("leaderboard", "玩家B", 250);
redis.opsForZSet().add("leaderboard", "玩家C", 80);
redis.opsForZSet().add("leaderboard", "玩家D", 300);

// ZREVRANGE：按分数降序（高分在前），取前 N 名
Set<String> top3 = redis.opsForZSet().reverseRange("leaderboard", 0, 2);
// → ["玩家D", "玩家B", "玩家A"]

// 带分数查询
Set<ZSetOperations.TypedTuple<String>> withScores =
    redis.opsForZSet().reverseRangeWithScores("leaderboard", 0, 2);
for (TypedTuple<String> item : withScores) {
    System.out.println(item.getValue() + " → " + item.getScore() + " 分");
}
```

### 13.3 查分数和排名

```java
// ZSCORE：查某个成员的分数
Double score = redis.opsForZSet().score("leaderboard", "玩家B");  // 250.0

// ZREVRANK：降序排名（0 = 第一名）
Long rank = redis.opsForZSet().reverseRank("leaderboard", "玩家D");  // 0

// ZRANK：升序排名（0 = 最后一名）
Long rankAsc = redis.opsForZSet().rank("leaderboard", "玩家D");  // 3
```

### 13.4 实时加分（ZINCRBY）

```java
// 初始分数
redis.opsForZSet().add("leaderboard", "玩家A", 100);

// 击杀 +50 分
Double newScore = redis.opsForZSet().incrementScore("leaderboard", "玩家A", 50);
// → 150.0

// 死亡扣分
redis.opsForZSet().incrementScore("leaderboard", "玩家A", -10); // → 140.0

// 新成员直接加分，不存在时自动创建
redis.opsForZSet().incrementScore("leaderboard", "新人", 200); // → 200.0
```

### 13.5 删除操作

```java
// ZREM：删除指定成员
redis.opsForZSet().remove("leaderboard", "作弊玩家");

// ZREMRANGEBYRANK：按排名删除（只保留前 100 名）
// 删除排名索引 100 及之后的
redis.opsForZSet().removeRange("leaderboard", 100, -1);
```

---

## 十四、WATCH 乐观锁

### 14.1 WATCH 是什么

WATCH 是 Redis 实现乐观锁（CAS：Compare And Swap）的核心命令，配合 MULTI/EXEC 事务使用。

```
执行流程：
  WATCH key          ← 1. 盯住 key，记录当前版本
  val = GET key      ← 2. 读取当前值
  MULTI              ← 3. 开启事务（后续命令入队，不执行）
  SET key newVal     ← 4. 命令入队
  EXEC               ← 5. 提交事务
                        ├── key 没被动过 → 所有入队命令原子执行
                        └── key 被动过了 → 事务取消，返回 null
```

**和数据库乐观锁的对比**：

| | 数据库乐观锁 | Redis WATCH |
|------|--------|------|
| 版本标识 | version 字段（整数） | 服务端内部 CAS 标记 |
| 检测时机 | UPDATE 时 `WHERE version = ?` | EXEC 时自动检测 |
| 冲突判断 | 受影响行数 = 0 | EXEC 返回 null |

### 14.2 为什么必须用 SessionCallback

WATCH / MULTI / EXEC 必须在**同一个 TCP 连接**上执行。普通 `redis.opsForValue()` 每次可能从连接池拿到不同的连接。`SessionCallback` 保证回调内的所有操作绑定到同一个连接。

### 14.3 正常流程（无冲突）

```java
List<Object> result = redis.execute(new SessionCallback<List<Object>>() {
    @Override
    public List<Object> execute(RedisOperations operations) throws DataAccessException {

        // ① WATCH：盯住 key
        operations.watch("stock");

        // ② 读取当前值
        String stock = (String) operations.opsForValue().get("stock");  // "100"

        // ③ MULTI：开启事务
        operations.multi();

        // ④ 入队 SET
        int newStock = Integer.parseInt(stock) - 1;
        operations.opsForValue().set("stock", String.valueOf(newStock));  // "99"

        // ⑤ EXEC：提交
        List<Object> execResult = operations.exec();
        return execResult;  // → [true]（成功）
    }
});
```

### 14.4 冲突流程（有人抢）

```
主线程                       干扰线程
  │                            │
① WATCH stock                  │
  │                            │
② GET → 100                   │
  │                            │
③ MULTI                       │
  │                            │
  ├──→ 干扰线程 SET stock=50 ←│ （抢先修改）
  │                            │
④ SET stock=99                 │
⑤ EXEC → null  ← 事务被取消    │

最终 stock 的值是 50（干扰线程的），不是 99（主线程的）
```

### 14.5 不加锁的后果

两个线程同时"读-改-写"，导致数据覆盖：

```
线程A: GET 100 → -10 → SET 90
线程B:        GET 100 → -10 → SET 90
结果: 100 → 90（丢了一次减10）
```

WATCH 能检测并阻止这种冲突，让后者 EXEC 失败后重试。

---

## 十五、多用户登录的 Key 设计模式

### 15.1 JWT + Redis 互补架构

无状态 JWT 的问题：token 一旦发出就无法主动撤销（除非到期）。

Redis 引入后可以解决：主动踢人、强制密码变更后旧 token 失效、退出登录时 token 立即作废。

### 15.2 四种 Key 设计模式

#### 模式一：Token → 用户信息（最常用）

```
Key:   "token:eyJhbGciOi..."     （token 值作为 key 的一部分）
Value: {"userId":1,"username":"张三","role":0}
TTL:   7200 秒（与 JWT 过期时间一致）
```

**用途**：拦截器校验 token 是否有效。想踢人时 `redis.delete("token:" + token)` 一步搞定。

#### 模式二：用户 → 持有的 Token（单设备登录 / 踢人）

```
Key:   "user:login:1"            （userId=1 当前持有的 token）
Value: "eyJhbGciOi..."          （token 值）
TTL:   7200 秒
```

**用途**：限制单设备登录（新登录时删掉旧 key）、按用户 ID 踢人。

#### 模式三：Refresh Token 存储

```
Key:   "refresh_token:xxx..."    （refresh token 值）
Value: "1"                        （userId）
TTL:   604800 秒（7 天）
```

**用途**：access token 过期后验证 refresh token 是否有效，被踢时一并删除。

#### 模式四：登出黑名单

```
Key:   "blacklist:token:xxx..."   （已被登出的 token）
Value: "1"
TTL:   剩余有效时长（token 本身过期后黑名单也没意义）
```

**用途**：用户点"退出登录"后，token 虽未过期但加入黑名单。

### 15.3 改造后的请求流程

```
不用 Redis（纯 JWT）：
  请求 → 解析 JWT 签名 → 没过期就放行 → 无法主动撤销

用 Redis 改造后：
  请求 → 解析 JWT 签名 → 查 Redis "token:xxx" 是否存在
         ├── 存在 → 放行，取出用户信息
         └── 不存在 → 401（被踢 / 登出 / 密码改过了）
```
