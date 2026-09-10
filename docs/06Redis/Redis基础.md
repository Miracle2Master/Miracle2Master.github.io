# Redis 基础

---

## 一、Redis 概述

### 1.1 什么是 Redis

Redis（**RE**mote **DI**ctionary **S**erver）是一个使用 ANSI C 编写的开源、高性能、基于内存的键值对（Key-Value）NoSQL 数据库。由 Salvatore Sanfilippo（网名 antirez）于 2009 年创建，目前由 Redis Labs 维护。

### 1.2 Redis 与其他数据库对比

| 对比维度 | Redis | Memcached | MySQL |
|---------|-------|-----------|-------|
| 存储位置 | 内存 + 磁盘持久化 | 纯内存 | 磁盘 |
| 数据结构 | 丰富（10+ 种） | 仅 String | 关系型表 |
| 持久化 | 支持 | 不支持 | 天然支持 |
| 事务 | 支持（弱事务） | 不支持 | 完整 ACID |
| 集群 | 原生支持 | 客户端分片 | 主从/分库分表 |
| 单线程 | 是（6.0 前核心） | 是（多线程扩展） | 否 |
| 读写速度 | 10w+ QPS | 10w+ QPS | 千级别 QPS |

### 1.3 发展历史

| 版本 | 发布时间 | 重要特性 |
|------|---------|---------|
| 1.0 | 2009 | 基础 KV 存储 |
| 2.0 | 2010 | 持久化、事务、发布订阅 |
| 2.6 | 2012 | Lua 脚本支持 |
| 2.8 | 2013 | Sentinel 哨兵高可用 |
| 3.0 | 2015 | Redis Cluster 正式版 |
| 4.0 | 2017 | 混合持久化、模块系统、LFU 淘汰 |
| 5.0 | 2018 | Stream 数据类型 |
| 6.0 | 2020 | 多线程 IO（网络读写）、ACL 权限控制、RESP3 协议 |
| 7.0 | 2022 | Redis Functions、ACL v2、Sharded Pub/Sub |

---

## 二、核心特性

### 2.1 基于内存

- 所有数据存放在**内存**中，读写速度极快
- 官方 benchmark：读 11w+ QPS，写 8w+ QPS（单机）
- 时间复杂度通常为 O(1) 或 O(log N)

### 2.2 单线程模型

**6.0 之前**：网络 IO 和命令执行都是单线程

**为什么单线程还这么快？**
1. 纯内存操作，CPU 不是瓶颈
2. 非阻塞 IO 多路复用（epoll/kqueue/select）
3. 单线程避免上下文切换和锁竞争

**6.0 之后**：引入多线程 IO
- 网络读写交给 IO 线程池处理
- 命令执行仍然保持单线程
- 提升了大包/高并发场景下的网络吞吐量

### 2.3 持久化

支持三种持久化方式（详见第六章）：
- **RDB（Redis Database）**：定时快照
- **AOF（Append Only File）**：写操作日志
- **混合持久化**（4.0+）：RDB + AOF 结合

### 2.4 高可用与扩展

- **主从复制**（Replication）：读写分离、数据冗余
- **哨兵 Sentinel**：自动故障检测与转移
- **集群 Cluster**：数据分片、水平扩展

### 2.5 原子性

Redis 的每个命令都是原子操作，多个命令可通过事务（MULTI/EXEC）或 Lua 脚本保证原子性。

### 2.6 丰富的功能

- 发布/订阅（Pub/Sub）
- Lua 脚本
- 事务
- 管道（Pipeline）
- 过期策略
- 内存淘汰策略
- 慢查询日志
- 键空间通知

---





## 三、五种基础数据类型（含底层数据结构）

### 3.1 String（字符串）

#### 基本介绍

String 是 Redis 最基本、最简单的数据类型，value 最大可存储 **512MB**。

虽然叫 String，但它能存储三种类型的值：
- 普通字符串
- 整数
- 浮点数

#### 底层数据结构：SDS（Simple Dynamic String）

与 C 语言的字符串 `char*` 不同，SDS 有以下优势：
- **O(1) 获取长度**：`len` 字段预存长度
- **杜绝缓冲区溢出**：自动检查并扩展空间
- **减少内存重分配**：预分配（len < 1MB 时翻倍扩容）和惰性空间释放
- **二进制安全**：不依赖 `\0` 判断结束，可安全存储图片、音频等二进制数据

```c
struct sdshdr {
    int len;    // 已使用的字节数
    int free;   // 未使用的字节数
    char buf[]; // 字节数组（柔性数组）
};
```

#### 编码方式

| 编码 | 条件 | 说明 |
|------|------|------|
| **int** | 整数且能用 long 表示 | 直接存储整数值，节省空间 |
| **embstr** | ≤ 44 字节（3.2+） | 一次内存分配，只读 |
| **raw** | > 44 字节 | 两次内存分配，可修改 |

> `embstr` 与 `raw` 的转换：对 embstr 执行任何修改命令（如 APPEND）会自动转为 raw。

#### 常用命令

```bash
# 进入redis
docker exec -it redis redis-cli -a 123456 --raw

# 基本操作
SET key value [EX seconds] [PX milliseconds] [NX|XX]
GET key
SETEX key seconds value           # 设置值并指定过期时间(秒)
SETNX key value                   # key 不存在时才设置
MSET key1 v1 key2 v2 ...          # 批量设置
MGET key1 key2 ...                # 批量获取
GETSET key value                  # 返回旧值并设置新值

# 自增/自减（原子操作）
INCR key                          # 递增 1
INCRBY key increment              # 递增指定值
DECR key                          # 递减 1
DECRBY key decrement              # 递减指定值
INCRBYFLOAT key increment         # 浮点数递增

# 字符串操作
APPEND key value                  # 追加字符串
STRLEN key                        # 获取字符串长度
GETRANGE key start end            # 截取子串
SETRANGE key offset value         # 替换指定位置内容
```

#### 应用场景

| 场景 | 说明 | 示例 |
|------|------|------|
| **缓存对象** | 将对象 JSON 序列化后存储 | 用户信息、商品详情 |
| **分布式锁** | SETNX + 过期时间 | 防止重复提交、秒杀 |
| **计数器** | INCR 原子操作 | 点赞数、阅读量、库存 |
| **分布式 ID** | INCR 生成唯一递增 ID | 订单号、流水号 |
| **限流** | INCR + EXPIRE | 接口调用频率限制 |
| **Session 共享** | 集中存储 Session | 分布式系统统一登录态 |

---

### 3.2 List（列表）

#### 基本介绍

Redis List 是一个**双向链表**，最多可存储 2³² - 1（约 40 亿）个元素。

**特点**：
- 插入有序，可重复
- 支持从两端 push/pop
- 底层有多种编码实现，按数据量自动切换

#### 底层数据结构

**3.2 版本之前**：
- **ziplist（压缩列表）**：元素少且小的时候使用
- **linkedlist（双向链表）**：元素多或大的时候使用

**3.2 版本之后**：统一使用 **quicklist**（快速列表）

```
quicklist = linkedlist of ziplist

quicklist
  ┌─────┐    ┌─────┐    ┌─────┐
  │ node│ -> │ node│ -> │ node│
  │ziplist│  │ziplist│  │ziplist│
  └─────┘    └─────┘    └─────┘
```

- 每个 quicklist 节点内部是一个 ziplist
- `list-max-ziplist-size`：控制每个 ziplist 的最大长度（默认 -2 = 8KB）
- `list-compress-depth`：控制中间节点压缩深度，两端不压缩（提升访问速度）

> quicklist 结合了 linkedlist 的灵活性和 ziplist 的内存效率。

#### 常用命令

```bash
# 入队操作
LPUSH key v1 v2 ...              # 从左侧推入
RPUSH key v1 v2 ...              # 从右侧推入
LPUSHX key value                 # key 存在时左侧推入
RPUSHX key value                 # key 存在时右侧推入

# 出队操作
LPOP key [count]                 # 从左侧弹出
RPOP key [count]                 # 从右侧弹出
BLPOP key timeout                # 阻塞式左侧弹出
BRPOP key timeout                # 阻塞式右侧弹出
RPOPLPUSH source dest            # 原子地从 source 弹出并推入 dest
BRPOPLPUSH source dest timeout   # 阻塞版 RPOPLPUSH

# 查询操作
LRANGE key start stop            # 范围查询（0 -1 查全部）
LINDEX key index                 # 按下标获取
LLEN key                         # 获取长度

# 修改操作
LSET key index value             # 修改指定位置元素
LREM key count value             # 删除指定元素
LTRIM key start stop             # 修剪列表（只保留指定范围）
LINSERT key BEFORE|AFTER pivot value  # 在指定元素前后插入
```

#### 应用场景

| 场景 | 说明 | 命令组合 |
|------|------|---------|
| **消息队列** | LPUSH + RPOP / BRPOP | 简单队列 |
| **可靠消息队列** | RPOPLPUSH 备份队列 | 消费失败可追溯 |
| **最新列表** | LPUSH + LTRIM | 最新 N 条微博/文章 |
| **栈** | LPUSH + LPOP | 后进先出 |
| **时间线/Timeline** | 按时间排序的 Feed 流 | 社交动态 |

---

### 3.3 Set（集合）

#### 基本介绍

Redis Set 是**无序且不重复**的字符串集合，最多 2³² - 1 个元素。

**特点**：
- 元素不可重复
- 支持集合间的交集、并集、差集操作
- O(1) 的添加、删除、查找

#### 底层数据结构

| 编码 | 条件 | 说明 |
|------|------|------|
| **intset（整数集合）** | 所有元素都是整数 且 数量 ≤ 512 | 连续内存，二分查找 O(log N) |
| **hashtable（哈希表）** | 不满足 intset 条件 | dict 字典结构，O(1) |

`set-max-intset-entries` 控制 intset 转 hashtable 的阈值（默认 512）。

```c
// intset 结构
typedef struct intset {
    uint32_t encoding;  // 编码方式（16/32/64位）
    uint32_t length;    // 元素个数
    int8_t contents[];  // 实际数据数组（柔性数组）
} intset;
```

> intset 会随元素类型自动升级编码（16 → 32 → 64 位），但**不会降级**（删除大元素后仍保持高位编码）。

#### 常用命令

```bash
# 基本操作
SADD key member1 member2 ...    # 添加
SREM key member1 member2 ...    # 删除
SISMEMBER key member            # 判断是否存在
SMEMBERS key                    # 获取所有成员（慎用，大数据量会阻塞）
SCARD key                       # 获取成员数量
SPOP key [count]                # 随机弹出
SRANDMEMBER key [count]         # 随机获取（不删除）
SMOVE source dest member        # 移动元素到另一个集合

# 集合运算
SINTER key1 key2 ...            # 交集
SUNION key1 key2 ...            # 并集
SDIFF key1 key2 ...             # 差集（key1 有而 key2 没有的）

# 集合运算 -> 存储结果
SINTERSTORE dest key1 key2 ...  # 交集结果存入 dest
SUNIONSTORE dest key1 key2 ...  # 并集结果存入 dest
SDIFFSTORE dest key1 key2 ...   # 差集结果存入 dest
```

#### 应用场景

| 场景 | 说明 | 命令 |
|------|------|------|
| **标签系统** | 给用户/文章打标签 | SADD / SREM |
| **共同好友** | 取两个用户好友集合的交集 | SINTER |
| **推荐好友** | A 的好友减去 B 的好友（差集） | SDIFF |
| **抽奖系统** | 随机取/弹出元素 | SRANDMEMBER / SPOP |
| **独立访问统计** | IP/用户去重 | SADD（自动去重） |
| **点赞列表** | 记录点赞用户 ID | SADD / SREM / SISMEMBER |

---

### 3.4 Sorted Set（有序集合 / ZSet）

#### 基本介绍

Sorted Set 与 Set 类似，但每个元素关联一个 **score（分值）**，元素按 score 从小到大排序。

**特点**：
- 元素唯一，score 可重复
- 自动按 score 排序
- 支持范围查询和分页
- 查找成员 O(1)，范围查询 O(log N + M)

#### 底层数据结构

| 编码 | 条件 | 说明 |
|------|------|------|
| **ziplist（压缩列表）** | 元素少且元素小 | 连续内存 |
| **skiplist + hashtable** | 不满足 ziplist 条件 | 跳表 + 哈希表 |

`zset-max-ziplist-entries`（默认 128）和 `zset-max-ziplist-value`（默认 64 字节）控制编码切换。

#### 跳表（Skip List）原理

```
Level 3:  1 ──────────────────→ 9 ────────────────→ 15
Level 2:  1 ──────→ 5 ────────→ 9 ──────→ 12 ────→ 15
Level 1:  1 → 3 → 5 → 7 → 9 → 10 → 12 → 13 → 15
```

- 多层有序链表，上层是下层的"快速通道"
- 查找复杂度 O(log N)（相当于二分查找）
- 插入时随机决定层数（类似抛硬币策略）
- 比红黑树实现简单，更适合范围查询

**为什么同时使用 skiplist + hashtable？**
- skiplist：实现按 score 范围查询
- hashTable：实现按 member 做 O(1) 查找其 score

#### 常用命令

```bash
# 基本操作
ZADD key score member [score member ...]       # 添加
ZREM key member1 member2 ...                   # 删除
ZSCORE key member                              # 获取分值
ZCARD key                                      # 获取数量
ZRANK key member                               # 升序排名（从 0 开始）
ZREVRANK key member                            # 降序排名
ZINCRBY key increment member                   # 增加分值
ZCOUNT key min max                             # 统计分值范围内成员数

# 范围查询（升序）
ZRANGE key start stop [WITHSCORES]             # 按索引范围
ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT] # 按分值范围

# 范围查询（降序）
ZREVRANGE key start stop [WITHSCORES]
ZREVRANGEBYSCORE key max min [WITHSCORES] [LIMIT]

# 集合运算（5.0+）
ZINTERSTORE dest numkeys key [key...] [WEIGHTS w] [AGGREGATE SUM|MIN|MAX]
ZUNIONSTORE dest numkeys key [key...] [WEIGHTS w] [AGGREGATE SUM|MIN|MAX]

# 删除
ZREMRANGEBYRANK key start stop                 # 按排名删除
ZREMRANGEBYSCORE key min max                   # 按分值删除
```

#### 应用场景

| 场景 | 说明 |
|------|------|
| **排行榜** | 游戏积分排行、热搜排行、销量排行 |
| **延迟队列** | score = 执行时间戳，定时轮询到期任务 |
| **带权重的集合** | 权重越高 score 越大 |
| **时间线排序** | score = 发布时间戳 |
| **范围查找** | 价格区间筛选、年龄段筛选 |

---

### 3.5 Hash（哈希）

#### 基本介绍

Hash 是一个 **field → value** 的映射表，特别适合存储对象。

一个 Hash 最多可存储 2³² - 1 个 field-value 对。

#### 底层数据结构

| 编码 | 条件 | 说明 |
|------|------|------|
| **ziplist（压缩列表）** | field 数量少且 value 短 | 连续内存存储 |
| **hashtable（哈希表）** | 不满足 ziplist 条件 | dict 字典结构 |

`hash-max-ziplist-entries`（默认 512）和 `hash-max-ziplist-value`（默认 64 字节）控制编码切换。

#### 哈希表（Dict）原理与渐进式 Rehash

Redis 的 dict 采用**拉链法**解决哈希冲突，使用 **MurmurHash2** 哈希算法。

**渐进式 rehash（核心设计）**：

```
步骤：
1. 分配新的、更大的 ht[1]（通常为 ht[0] 已用空间的 2 倍）
2. 设置 rehashidx = 0（标记开始 rehash）
3. 每次对字典的增删改查操作时，顺带将 ht[0] 在 rehashidx 位置上的桶迁移到 ht[1]
4. rehashidx 递增，直到 ht[0] 全部迁移完成
5. 释放 ht[0]，将 ht[1] 设置为 ht[0]，重置 rehashidx = -1
```

> **优势**：一次性大量数据迁移不会阻塞服务，将迁移成本分摊到多次操作中。

#### 常用命令

```bash
# 基本操作
HSET key field value [field value ...]   # 设置
HGET key field                           # 获取
HDEL key field1 field2 ...               # 删除
HEXISTS key field                        # 判断是否存在

# 批量操作
HMSET key field value [field value ...]  # 批量设置（4.0 后与 HSET 统一）
HMGET key field1 field2 ...              # 批量获取
HGETALL key                              # 获取所有 field-value（慎用，大数据量会阻塞）
HKEYS key                                # 获取所有 field
HVALS key                                # 获取所有 value

# 计数操作
HINCRBY key field increment             # 整数递增
HINCRBYFLOAT key field increment        # 浮点数递增

# 其他
HLEN key                                 # 获取 field 数量
HSTRLEN key field                        # 获取 value 长度
HSCAN key cursor [MATCH pattern] [COUNT] # 渐进遍历（大数据量安全）
```

#### 应用场景

| 场景 | 说明 |
|------|------|
| **存储对象** | 用户信息、商品详情（比 String JSON 更灵活，可部分更新） |
| **购物车** | 用户 ID 作为 key → {商品ID: 数量} |
| **计数器分组** | 文章阅读量、点赞数（按文章 ID 分组） |
| **配置信息** | 系统配置 key-value 对 |

---

### 3.6 压缩列表（ziplist）— 共用的底层结构

ziplist 是 List、Hash、ZSet 在数据量较小时共用的底层编码。

```
<zlbytes> <zltail> <zllen> <entry1> <entry2> ... <zlend>

zlbytes: 整个 ziplist 的字节数（4 字节）
zltail:   最后一个元素的偏移量（4 字节）
zllen:    元素个数（2 字节）
entry:    元素内容（变长）
zlend:    结束标志 0xFF（1 字节）
```

**优点**：连续内存，无指针开销，内存效率高  
**缺点**：插入/删除可能触发连锁更新（每个 entry 都存了前一个 entry 的长度）

---

## 四、高级数据结构

### 4.1 Bitmaps（位图）

#### 基本介绍

Bitmaps 不是一种新数据类型，而是基于 **String** 的位操作，字符串的每个位（bit）可以独立操作。

**最大长度**：2³² 位 = 512MB

#### 常用命令

```bash
SETBIT key offset value              # 设置指定偏移量的位值
GETBIT key offset                    # 获取指定偏移量的位值
BITCOUNT key [start end]             # 统计值为 1 的位数
BITPOS key bit [start] [end]         # 查找第一个值为 bit 的位置
BITOP AND|OR|XOR|NOT dest key1 [key2...]  # 位运算
BITFIELD key GET|SET|INCRBY         # 操作多个连续位
```

#### 应用场景

| 场景 | 说明 |
|------|------|
| **签到统计** | 每天 1 bit，一个用户全年签到记录仅需 46 字节 |
| **在线状态** | 用户在线/离线标记 |
| **用户行为统计** | 每天是否登录 |
| **布隆过滤器基础** | 大位图判断元素是否存在 |

**示例 — 签到统计**：

```bash
# 用户 1001 在 2024-01-01 签到（第 0 天）
SETBIT sign:1001:202401 0 1
# 用户 1001 在 2024-01-02 签到（第 1 天）
SETBIT sign:1001:202401 1 1
# 统计 1 月份签到天数
BITCOUNT sign:1001:202401
# 查看第一天是否签到
GETBIT sign:1001:202401 0
```

---

### 4.2 HyperLogLog

#### 基本介绍

**概率性数据结构**，用于基数统计（统计集合中不重复元素的个数）。

**核心特点**：
- 每个 HyperLogLog 只占用 **12KB** 固定内存
- 标准误差 **0.81%**
- 无法获取具体元素内容，只能统计基数

#### 常用命令

```bash
PFADD key element [element ...]                     # 添加元素
PFCOUNT key [key ...]                               # 统计基数
PFMERGE destkey sourcekey [sourcekey ...]           # 合并
```

#### 应用场景

| 场景 | 说明 |
|------|------|
| **UV 统计** | 页面独立访客数 |
| **去重搜索关键词** | 每天不同的搜索词数量 |
| **全站 DAU** | 日活跃用户数 |

---

### 4.3 Geospatial（地理位置）

#### 基本介绍

基于 Sorted Set 实现的地理位置索引，使用 **GeoHash 编码**将经纬度转换为 score。

#### 常用命令

```bash
GEOADD key longitude latitude member [...]   # 添加位置
GEOPOS key member [member ...]               # 获取坐标
GEODIST key m1 m2 [m|km|ft|mi]              # 计算两点距离
GEORADIUS key lng lat radius m|km|ft|mi     # 以某点为中心找半径内成员（6.2 废弃）
GEOSEARCH key [FROMMEMBER m | FROMLONLAT lng lat] BYRADIUS radius unit  # 范围搜索（6.2+）
GEOSEARCHSTORE dest src ...                  # 存储搜索结果
GEOHASH key member [member ...]             # 获取 GeoHash 值
```

#### 应用场景

| 场景 | 说明 |
|------|------|
| **附近的人** | 查找附近的用户 |
| **附近商家** | 附近餐厅/加油站/药店 |
| **配送范围** | 判断地址是否在配送范围内 |

---

### 4.4 Stream（流）— 5.0+

#### 基本介绍

Redis 5.0 引入的**持久化消息队列**，支持消费者组，弥补了 List 和 Pub/Sub 的不足。

**核心特点**：
- 消息持久化（重启后消息不丢失）
- 消费者组（同一组内消息只被一个消费者处理）
- 消息确认机制（ACK）
- 支持从头开始/从指定 ID 开始消费

#### 核心概念

```
Stream 结构：
┌──────────────────────────────────┐
│ msgId1: {field1: val1, field2}   │
│ msgId2: {field1: val1, field2}   │
│ msgId3: {field1: val1, field2}   │
│ ...                              │
└──────────────────────────────────┘

消费者组：
┌──────────┐    ┌──────────┐
│ Group A  │    │ Group B  │
│ ┌──────┐ │    │ ┌──────┐ │
│ │C1│C2│ │    │ │C3│C4│ │
│ └──────┘ │    │ └──────┘ │
└──────────┘    └──────────┘
```

#### 常用命令

```bash
# 消息操作
XADD key [MAXLEN ~ N] * field value ...     # 添加消息（* = 自动生成 ID）
XREAD [COUNT n] [BLOCK ms] STREAMS key id   # 读取消息（$ = 只读新消息，0 = 从头）
XRANGE key start end [COUNT n]              # 范围查询
XREVRANGE key end start [COUNT n]           # 逆向范围查询
XLEN key                                     # 长度
XDEL key id [id ...]                         # 删除消息
XTRIM key MAXLEN ~ N                         # 修剪长度

# 消费者组
XGROUP CREATE key group id [$|0]            # 创建消费者组
XREADGROUP GROUP group consumer [COUNT n] STREAMS key >  # 消费（> = 未分发的消息）
XACK key group id [id ...]                   # 确认消息
XPENDING key group [start end count]         # 挂起消息列表
```

#### 与 List、Pub/Sub 对比

| 特性 | List | Pub/Sub | Stream |
|------|------|---------|--------|
| 持久化 | 是 | 否 | 是 |
| 消费者组 | 否 | 否 | 是 |
| 消息确认（ACK） | 否 | 否 | 是 |
| 消费历史消息 | 是 | 否 | 是 |
| 一对多消费 | RPOPLPUSH | 原生支持 | 消费者组 |
| 复杂度 | 简单 | 简单 | 较复杂 |
| 可靠性 | 低 | 最低 | 高 |

---

### 4.5 Bloom Filter（布隆过滤器 / RedisBloom 模块）

Redis 官方没有内发布隆过滤器，需要通过 **RedisBloom** 插件模块实现。

**功能**：判断一个元素"一定不存在"或"可能存在"。

**核心特点**：
- **有误判率**（可配置，默认约 1%），但**绝不会漏判**（说"不存在"一定不存在）
- 空间效率极高（比 HashSet 小 90% 以上）
- 只能添加，不能删除（如需删除可用布谷鸟过滤器）

#### 常用命令（RedisBloom）

```bash
BF.RESERVE key error_rate capacity        # 创建（指定误判率和容量）
BF.ADD key item                            # 添加
BF.MADD key item [item ...]                # 批量添加
BF.EXISTS key item                         # 判断存在
BF.MEXISTS key item [item ...]             # 批量判断
```

#### 应用场景

| 场景 | 说明 |
|------|------|
| **缓存穿透防护** | 不存在的数据直接返回，不查数据库 |
| **爬虫 URL 去重** | 已抓取的 URL 不再抓取 |
| **垃圾邮件过滤** | 已知垃圾邮件地址 |
| **推荐去重** | 已推荐过的内容不再推荐 |

---

## 五、缓存读写策略

### 5.1 Cache Aside（旁路缓存）— 最常用

```
读操作：
1. 读缓存 → 命中则直接返回
2. 未命中 → 读数据库
3. 将结果写入缓存，返回数据

写操作：
1. 更新数据库
2. 删除缓存（而不是更新缓存！）
```

**为什么是删除缓存而不是更新缓存？**
- 并发写可能导致缓存与数据库不一致
- 更新成本高（缓存可能要经过复杂计算）
- 缓存的数据可能根本不会被读（惰性加载更高效）

**顺序问题**：

| 方案 | 先删缓存再更新数据库 | 先更新数据库再删缓存 |
|------|---------------------|----------------------|
| 异常几率 | 较高 | 较低 |
| 风险 | 更新 DB 前，其他请求可能把旧数据写回缓存 | DB 更新后删除缓存失败，脏数据一直存在 |
| 推荐 | ❌ | ✅（配合重试机制） |

### 5.2 Read/Write Through（读穿/写穿）

```
读操作：
应用 → 缓存（未命中） → 缓存负责查 DB 并更新自己 → 返回给应用

写操作：
应用 → 缓存 → 缓存同步写 DB → 返回
```

缓存层承担了数据库的代理角色，应用只与缓存交互。

### 5.3 Write Behind / Write Back（写回）

```
应用 → 缓存 → 异步批量写数据库
```

- 写入延迟极低（只写缓存）
- 存在数据丢失风险（缓存故障时未刷入 DB 的数据丢失）
- 适合写入密集场景（如秒杀扣库存后批量入库）

---

## 六、持久化机制

### 6.1 RDB（Redis Database）

#### 原理

将某个时间点的内存数据生成一个**压缩的二进制快照文件**（dump.rdb）保存到磁盘。

#### 触发方式

**1. 手动触发**：
```bash
SAVE           # 主线程执行，阻塞所有客户端请求（生产环境禁用！）
BGSAVE         # fork 子进程执行，不阻塞主线程（推荐）
```

**2. 自动触发（配置）**：
```bash
# redis.conf
save 900 1        # 900 秒内至少 1 个 key 变更 → 自动触发 BGSAVE
save 300 10       # 300 秒内至少 10 个 key 变更 → 自动触发 BGSAVE
save 60 10000     # 60 秒内至少 10000 个 key 变更 → 自动触发 BGSAVE
```

**3. 其他触发场景**：
- 主从复制时，从节点全量复制触发主节点 BGSAVE
- 执行 `SHUTDOWN` 命令（未开启 AOF 时）
- 执行 `FLUSHALL` 命令（生成空 RDB，需谨慎）

#### RDB 执行流程

```
1. 执行 BGSAVE
      │
2. 父进程 fork 子进程（利用了 Copy-on-Write 机制）
      │
3. 父进程继续处理客户端请求（不阻塞）
  子进程将内存数据写入临时 RDB 文件
      │
4. 子进程写入完毕，原子替换旧的 dump.rdb
      │
5. 子进程退出，通知父进程
```

> **fork 阻塞**：fork 时会短暂阻塞父进程（毫秒级），阻塞时间与内存大小相关。

#### 优点与缺点

**优点**：
- 文件紧凑，适合备份和灾难恢复
- 恢复大数据集速度快（直接加载，不需要逐条重放）
- 对性能影响极小（子进程处理）

**缺点**：
- **数据可能丢失**：最后一次 save 到故障之间的数据全部丢失
- fork 子进程耗时（内存越大，fork 越慢）
- 如果数据集大，fork 可能导致客户端短暂暂停

---

### 6.2 AOF（Append Only File）

#### 原理

以**追加写命令**的方式记录每次写操作，Redis 重启时逐条重放 AOF 中的命令恢复数据。

#### AOF 配置

```bash
# redis.conf
appendonly yes                          # 开启 AOF
appendfilename "appendonly.aof"         # AOF 文件名

# fsync 策略（核心性能/安全权衡）
appendfsync always    # 每条写命令都 fsync，最安全但最慢
appendfsync everysec  # 每秒 fsync 一次（推荐！），最多丢失 1 秒数据
appendfsync no        # 由操作系统决定何时 fsync，最快但最不安全
```

#### AOF 重写（Rewrite）

AOF 文件会越来越大，需要**重写（压缩）**，将多条变更合并为最终状态：

```
原始 AOF 记录：
SET count 1 → SET count 2 → SET count 3 → SET count 4

重写后：
SET count 4  （只保留最终状态，去除中间过程）
```

**触发方式**：

```bash
# 手动触发
BGREWRITEAOF

# 自动触发（redis.conf 配置）
auto-aof-rewrite-percentage 100   # AOF 文件比上次重写后增长 100%
auto-aof-rewrite-min-size 64mb    # AOF 文件至少 64MB
```

**重写流程**：

```
1. fork 子进程
2. 子进程根据当前内存数据，写入新的 AOF 文件
3. 期间新写入的命令同时追加到「AOF 重写缓冲区」
4. 子进程完成后，父进程将缓冲区中的命令追加到新 AOF
5. 原子替换旧 AOF 文件
```

#### 优点与缺点

**优点**：
- 数据安全性更高（everysec 最多丢 1 秒数据）
- 文件可读（文本格式）
- 误操作时可手动编辑 AOF 恢复数据

**缺点**：
- 文件比 RDB 大
- 恢复速度比 RDB 慢（逐条重放命令）
- fsync 策略影响写入性能

---

### 6.3 混合持久化（4.0+）

#### 原理

在 AOF 重写时，生成的文件前部分是 RDB 格式（全量数据），后部分是 AOF 格式（增量日志）。

#### 配置

```bash
aof-use-rdb-preamble yes   # 默认开启
```

#### 文件结构

```
┌────────────────────┐
│   RDB 格式数据      │  ← 重写时刻的内存快照（全量）
├────────────────────┤
│   AOF 格式命令      │  ← 重写完成后新写入的增量命令
└────────────────────┘
```

#### 优势

综合了 RDB 和 AOF 的优点：
- **恢复速度快**（大部分是 RDB 格式，直接加载）
- **数据更安全**（重写后的增量用 AOF 追加，最多丢 1 秒）

---

### 6.4 持久化方案选择

| 方案 | 适用场景 |
|------|---------|
| **仅 RDB** | 对数据完整性要求不高，能容忍数分钟数据丢失 |
| **仅 AOF** | 数据安全性要求高，everysec 是平衡选择 |
| **RDB + AOF** | 生产环境推荐，Redis 重启优先用 AOF 恢复 |
| **混合持久化** | 官方推荐的生产环境方案（4.0+） |
| **不持久化** | 纯缓存场景，数据可从数据库重建 |

---

## 七、过期删除策略

### 7.1 设置过期时间

```bash
EXPIRE key seconds                    # 多少秒后过期
PEXPIRE key milliseconds              # 多少毫秒后过期
EXPIREAT key timestamp                # Unix 时间戳（秒）时过期
PEXPIREAT key milliseconds-timestamp  # Unix 时间戳（毫秒）时过期
TTL key             # 查询剩余时间（秒），-1=永不过期，-2=已过期/不存在
PTTL key            # 查询剩余时间（毫秒）
PERSIST key         # 移除过期时间，变为永久
```

### 7.2 过期键的存储

Redis 内部使用一个独立的 **expires 字典** 来记录每个设置了过期时间的 key 以及对应的过期时间戳。

### 7.3 过期删除策略（双重策略）

Redis 同时使用**惰性删除 + 定期删除**：

#### 惰性删除（Lazy Deletion）

每次访问 key 时先检查是否过期，如果过期则删除并返回空。

**优点**：CPU 友好（只在访问时检查，无额外开销）  
**缺点**：内存不友好（过期 key 如果一直不被访问，会一直占用内存）

#### 定期删除（Periodic Deletion）

每隔 **100ms**（默认配置 `hz=10`，即每秒 10 次），随机抽取一批 key 检查并删除过期的。

```
执行流程：
1. 从 expires 字典随机取 20 个 key
2. 删除其中已过期的
3. 如果本次过期比例 > 25%，重复步骤 1
   （最多循环 16 次，防止执行时间过长阻塞主线程）
```

**优点**：平衡 CPU 和内存  
**缺点**：不能保证所有过期 key 都被及时发现和删除

> ⚠️ **重要**：Redis 的过期策略无法保证每个过期 key 都会被立即删除。过期 key 可能在一段时间内仍然占用内存。

---

## 八、内存淘汰策略

### 8.1 概述

当 Redis 内存使用达到 `maxmemory` 限制时，根据配置的淘汰策略决定如何处理新写入请求。

### 8.2 配置

```bash
# redis.conf
maxmemory <bytes>              # 最大内存限制
maxmemory-policy <strategy>    # 淘汰策略
maxmemory-samples 5            # LRU/LFU 的采样数量
```

### 8.3 八种淘汰策略

#### 不淘汰

| 策略 | 行为 |
|------|------|
| **noeviction** | 拒绝所有写入，只允许读和删除。返回错误 `OOM command not allowed when used memory > 'maxmemory'` |

#### 针对所有 key 的淘汰

| 策略 | 行为 |
|------|------|
| **allkeys-lru** | 在所有 key 中淘汰**最近最少使用**的（LRU 算法） |
| **allkeys-lfu** | 在所有 key 中淘汰**使用频率最低**的（LFU 算法，4.0+） |
| **allkeys-random** | 在所有 key 中随机淘汰 |

#### 针对设置了过期时间的 key 的淘汰

| 策略 | 行为 |
|------|------|
| **volatile-lru** | 在过期 key 中淘汰 LRU |
| **volatile-lfu** | 在过期 key 中淘汰 LFU（4.0+） |
| **volatile-random** | 在过期 key 中随机淘汰 |
| **volatile-ttl** | 淘汰**最快过期**的 key |

### 8.4 LRU vs LFU 对比

#### 近似 LRU

Redis 不实现精确 LRU（需要额外双向链表，内存开销大），而是**近似 LRU**：

```
1. 随机采样 maxmemory-samples 个 key（默认 5）
2. 淘汰其中 idle time 最大的（最久未被访问的）
```

- `maxmemory-samples` 越大，越接近精确 LRU（官方推荐 10）
- 默认值 5 已在大多数场景下足够好

#### LFU（4.0+）

解决 LRU 的"偶发性问题"——新 key 可能在 LRU 中被错误淘汰。

LFU 核心参数：
```bash
# redis.conf
lfu-log-factor 10    # 计数器增长对数因子（越大增速越慢，更好区分冷热）
lfu-decay-time 1      # 衰减周期（分钟），counter 每过 N 分钟衰减一次
```

```
热度 = counter 值（对数递增） × 时间衰减因子
```

#### 策略选择建议

| 策略 | 适用场景 |
|------|---------|
| **allkeys-lru** | 热点数据明确，如新闻资讯（推荐） |
| **allkeys-lfu** | 热点与访问频率强相关，如视频推荐 |
| **volatile-ttl** | 需要基于时间自动过期，如短信验证码 |
| **volatile-lru** | 缓存 + 持久化的混合场景 |
| **noeviction** | 数据绝对不能丢失的场景 |

---

## 九、事务

### 9.1 基本概念

Redis 事务提供了一种将多个命令打包，然后**一次性、按顺序**执行的机制。

> **关键认知**：Redis 事务 ≠ 关系数据库事务，**不支持回滚**，不是真正的 ACID 事务。

### 9.2 核心命令

```bash
MULTI              # 开启事务（标记事务开始）
SET k1 v1
SET k2 v2
INCR counter
EXEC               # 执行事务块中的所有命令
DISCARD            # 取消事务
WATCH key          # 乐观锁：监视 key，如果 key 在 EXEC 前被修改，事务不执行
UNWATCH            # 取消监视
```

### 9.3 事务特性

#### 执行流程

```
MULTI  →  命令入队  →  命令入队  →  ...  →  EXEC（一次性顺序执行）
          ↑                    ↑
     不会立即执行         放入队列中等待
```

#### 三种异常处理

| 异常类型 | 发生阶段 | Redis 行为 |
|---------|---------|-----------|
| **命令语法错误**（不存在的命令） | 入队时（编译期） | 所有命令都不执行 |
| **命令类型错误**（对 String 执行 LPUSH） | 执行时（运行期） | 错误命令报错，**其他命令正常执行，不回滚** |
| **WATCH 冲突**（监视的 key 被修改） | EXEC 时 | 返回 nil，不执行任何命令 |

> ⚠️ **关键**：Redis 不支持事务回滚！执行时的错误不会回滚已执行的命令。

### 9.4 乐观锁实现（CAS）

使用 **WATCH + MULTI + EXEC** 实现乐观锁：

```bash
# 基于 CAS（Compare-And-Swap）的乐观锁
WATCH mykey
val = GET mykey
val = val + 1
MULTI
SET mykey val
EXEC

# 如果在 WATCH 之后、EXEC 之前，其他客户端修改了 mykey，
# 则 EXEC 返回 nil，事务不执行。
# 客户端应检查返回值，若为 nil 则重试。
```

### 9.5 事务 vs Lua 脚本

| 特性 | MULTI/EXEC | Lua 脚本 |
|------|-----------|----------|
| 原子性 | 是（执行时不被打断） | 是（整个脚本原子执行） |
| 条件判断 | 不支持（入队时取不到中间值） | 支持（服务端执行计算逻辑） |
| 回滚 | 无 | 无 |
| 复杂度 | 简单 | 可编写复杂逻辑 |
| 阻塞 | EXEC 一次性执行 | 脚本执行期间阻塞其他请求 |

---

## 十、管道（Pipeline）

### 10.1 什么是管道

将多个命令打包，**一次性发送**到服务器，**一次性返回**所有结果，减少 RTT（往返时间）。

```
普通模式（n 个命令 = n 次 RTT）：
Client ──── 命令1 ────→ Server
Client ←─── 结果1 ──── Server
Client ──── 命令2 ────→ Server
Client ←─── 结果2 ──── Server
Client ──── 命令3 ────→ Server
Client ←─── 结果3 ──── Server

Pipeline 模式（n 个命令 = 1 次 RTT）：
Client ── 命令1, 命令2, 命令3 ──→ Server
Client ←─ 结果1, 结果2, 结果3 ── Server
```

### 10.2 Pipeline 与事务/批量命令对比

| 特性 | Pipeline | 事务（MULTI/EXEC） | MGET/MSET |
|------|----------|-------------------|-----------|
| 原子性 | ❌（命令之间可插入其他客户端命令） | ✅ | ✅ |
| 批量发送 | ✅ | ✅ | ✅ |
| 中间结果 | 可逐步获取 | 只能等 EXEC 后一次获取 | 一次获取 |
| 混合命令 | ✅（可包含各种操作） | ✅ | ❌（单一类型） |
| 用途 | 减少 RTT，提升吞吐 | 保证原子性 | 批量读/写 String |

---

## 十一、发布/订阅（Pub/Sub）

### 11.1 基本概念

消息发布者（Publisher）将消息发布到频道（Channel），所有订阅了该频道的订阅者（Subscriber）都会收到消息。

```
Publisher1 ──→ Channel A ←── Subscriber1
Publisher2 ──→ Channel A ←── Subscriber2
Publisher3 ──→ Channel B ←── Subscriber3
```

### 11.2 核心命令

```bash
# 频道订阅
SUBSCRIBE channel [channel ...]           # 订阅频道
UNSUBSCRIBE [channel ...]                # 退订
PUBLISH channel message                   # 发布消息

# 模式订阅（支持通配符）
PSUBSCRIBE pattern [pattern ...]          # 按模式订阅（如 news.*）
PUNSUBSCRIBE [pattern ...]               # 退订模式

# 查看状态
PUBSUB CHANNELS [pattern]                 # 查看活跃频道
PUBSUB NUMSUB [channel ...]               # 查看订阅者数量
PUBSUB NUMPAT                            # 查看模式订阅数量
```

### 11.3 核心缺点

| 问题 | 说明 |
|------|------|
| **消息不持久化** | 断线重连后，断线期间的消息永久丢失 |
| **无 ACK 机制** | 无法确认消费者是否成功处理消息 |
| **无积压能力** | 发布时没有消费者则消息直接丢弃 |
| **消费者速度慢会导致消息丢失** | output buffer 满后主动断开连接 |

> 如果需要可靠消息队列，推荐使用 **Stream**（5.0+）而不是 Pub/Sub。

### 11.4 Sharded Pub/Sub（7.0+）

解决传统 Pub/Sub 消息会广播到集群所有节点的问题：

```bash
SSUBSCRIBE channel [channel ...]    # 分片订阅
SUNSUBSCRIBE [channel ...]
SPUBLISH channel message            # 分片发布
```

- 按 channel 的 slot 分发到特定分片节点
- 大幅减少集群内部的消息传播开销

---

## 十二、Lua 脚本

### 12.1 为什么使用 Lua

- **原子性**：整个脚本作为一个整体执行，不会被其他命令插队
- **减少 RTT**：多次操作合并为一次网络往返
- **服务端计算**：复杂逻辑在服务端执行，减少数据传输
- **复用**：脚本可通过 SCRIPT LOAD 缓存，后续用 EVALSHA 高效调用

### 12.2 核心命令

```bash
EVAL script numkeys key [key ...] arg [arg ...]       # 执行脚本
EVALSHA sha1 numkeys key [key ...] arg [arg ...]      # 通过 SHA1 执行已缓存的脚本
SCRIPT LOAD script                                     # 缓存脚本，返回 SHA1
SCRIPT FLUSH                                           # 清除所有脚本缓存
SCRIPT EXISTS sha1 [sha1 ...]                         # 检查脚本是否已缓存
SCRIPT KILL                                            # 终止正在运行的脚本
```

### 12.3 示例：分布式限流（滑动窗口）

```lua
-- 调用方式：EVAL "脚本内容" 1 rate_limit_key max_requests window_seconds

local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local now = redis.call('TIME')[1]  -- 秒级时间戳
-- 删除窗口外的过期记录
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

local count = redis.call('ZCARD', key)  -- 窗口内的请求数

if count < limit then
    redis.call('ZADD', key, now, now)   -- 记录本次请求
    redis.call('EXPIRE', key, window)   -- 续期
    return 1  -- 通过
else
    return 0  -- 拒绝（限流）
end
```

### 12.4 注意事项

| 注意点 | 说明 |
|--------|------|
| **原子阻塞** | 脚本执行期间阻塞所有其他请求，必须保持简短 |
| **不要产生随机 key** | 集群模式下所有 key 必须在同一个 slot |
| **显式声明 key** | EVAL 的 numkeys 必须正确，否则集群模式可能报错 |
| **尽量用 SCRIPT LOAD + EVALSHA** | 减少每次传输脚本内容的网络开销 |

---

## 十三、高可用架构

### 13.1 主从复制（Replication）

#### 原理

一个 Master 可以有多个 Slave，Slave 自动同步 Master 的数据，实现读写分离。

```
         ┌──────┐
         │Master│   负责写操作
         └──┬───┘
    ┌───────┼───────┐
    ▼       ▼       ▼
┌──────┐ ┌──────┐ ┌──────┐
│Slave1│ │Slave2│ │Slave3│  负责读操作
└──────┘ └──────┘ └──────┘
```

#### 复制过程

```
1. Slave 连接到 Master，发送 PSYNC 命令
2. 如果是首次连接 → 全量复制（RDB）
   - Master fork 子进程生成 RDB
   - Master 将 RDB 发送给 Slave
   - Slave 清空旧数据，加载 RDB
   - Master 将复制缓冲区中的积压写命令发送给 Slave
3. 如果是断线重连 → 增量复制（部分同步）
   - 通过 repl_backlog_buffer 找到断开期间的差量命令
   - 只传输差量部分
```

#### 配置

```bash
# Slave 节点配置
replicaof <masterip> <masterport>
replica-read-only yes                # 从节点只读
replica-serve-stale-data yes         # 同步未完成时是否响应读请求

# Master 节点配置
repl-backlog-size 1mb                # 复制积压缓冲区大小
repl-backlog-ttl 3600                # 缓冲区存活时间（秒）
```

#### 缺点

- 手动故障转移（Master 挂了需人工介入）
- Master 故障后，写入完全不可用

---

### 13.2 哨兵（Sentinel）

#### 原理

Sentinel 是一个**独立的进程**，用于**监控、通知、自动故障转移**。

```
         ┌──────────┐
         │ Sentinel │ 集群（至少 3 个节点，奇数个）
         └┬──┬──┬───┘
          │  │  │
    ┌─────┼──┼──────┐
    ▼     ▼  ▼      ▼
┌──────┐  ┌──────┐  ┌──────┐
│Master│  │Slave1│  │Slave2│
└──────┘  └──────┘  └──────┘
```

#### 哨兵功能

| 功能 | 说明 |
|------|------|
| **监控** | 定期 PING 所有节点，判断是否存活 |
| **通知** | 节点异常时通知管理员或其他程序 |
| **自动故障转移** | Master 宕机后，自动选举新 Master |
| **配置提供者** | 客户端通过询问 Sentinel 获取当前 Master 地址 |

#### 故障转移流程

```
1. 主观下线（SDOWN）：单个 Sentinel 判断 Master 不可达
2. 客观下线（ODOWN）：多个 Sentinel（≥ quorum）确认 Master 下线
3. Sentinel Leader 选举：通过 Raft 算法选出执行者
4. Leader 执行故障转移：
   a. 选择一个健康的 Slave 作为新 Master
   b. 其他 Slave 切换复制目标到新 Master
   c. 通知客户端新 Master 地址
   d. 旧 Master 恢复后自动变为 Slave
```

#### 核心配置

```bash
# sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2    # 监控 Master，quorum = 2
sentinel down-after-milliseconds mymaster 30000  # 30s 无响应 → SDOWN
sentinel parallel-syncs mymaster 1              # 故障转移后允许同时同步的 Slave 数
sentinel failover-timeout mymaster 180000       # 故障转移超时时间（ms）
```

---

### 13.3 集群（Cluster）

#### 原理

数据按**哈希槽**分片（Sharding），每个节点只存储部分数据，实现水平扩展。

#### 哈希槽（Hash Slot）

```
共 16384 个哈希槽（slot）

计算方式：CRC16(key) % 16384 = slot 编号

节点分配示例：
Node A: slot 0 - 5460
Node B: slot 5461 - 10922
Node C: slot 10923 - 16383
```

#### 集群架构

```
每个节点互相通过 Gossip 协议通信

┌─────┐   ┌─────┐   ┌─────┐
│NodeA│◄─►│NodeB│◄─►│NodeC│
│Master│  │Master│  │Master│
└──┬──┘  └──┬──┘  └──┬──┘
   │        │        │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│Slave│ │Slave│ │Slave│
└─────┘ └─────┘ └─────┘
```

#### 核心特点

| 特点 | 说明 |
|------|------|
| **自动分片** | 数据按 slot 自动分布到各节点 |
| **部分可用** | 只要某个分片的 Master+Slave 存活，该分片数据可用 |
| **水平扩展** | 动态增加/删除节点，slot 可在线迁移 |
| **客户端重定向** | MOVED（永久重定向）和 ASK（临时重定向）机制 |
| **Gossip 协议** | 节点间通过 Gossip 交换状态信息 |

#### 核心限制

| 限制 | 说明 |
|------|------|
| **批量操作限制** | MGET/MSET 要求所有 key 在同一 slot；可用 **Hash Tag** `{user}:1` `{user}:2` 强制同 slot |
| **事务限制** | MULTI/EXEC 中的 key 必须在同一节点 |
| **Lua 脚本限制** | 脚本操作的 key 必须在同一 slot |
| **不支持多数据库** | 只能使用 db0 |
| **跨 slot 集合运算** | 不支持直接的跨节点集合运算 |

#### 核心配置

```bash
# redis.conf
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 15000             # 节点超时时间（ms）
cluster-require-full-coverage yes      # 是否要求所有 slot 都有节点负责
cluster-migration-barrier 1            # Slave 迁移前最少有几个健康的 Slave
```

---

## 十四、常见问题与解决方案

### 14.1 缓存穿透

**问题**：查询一个**数据库中根本不存在**的数据，缓存层和数据库都没有，请求穿透缓存直接打到数据库。

```
客户端 → Redis（不存在） → DB（也不存在） → 返回空值
              ↑
         大量此类恶意/异常请求 → DB 压力暴增
```

**解决方案**：

| 方案 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| **缓存空对象** | 不存在的数据也设缓存（value = null），短 TTL | 简单易实现 | 可能产生大量无用 key |
| **布隆过滤器** | 先判断 key 是否可能存在 | 内存高效 | 有误判率、实现复杂 |
| **参数校验** | 对非法参数（如负数 ID）直接拒绝 | 最基础 | 只能拦截明显的无效请求 |
| **限流** | 对疑似攻击的 IP 限流 | 保护 DB | 可能误伤正常用户 |

### 14.2 缓存击穿

**问题**：某个**热点 key** 在过期瞬间，大量并发请求同时打到数据库。

```
热点 key 过期 → 瞬间大量并发请求同时查 DB → DB 压力暴增（可能宕机）
```

**解决方案**：

| 方案 | 说明 |
|------|------|
| **互斥锁（Mutex Lock）** | 第一个请求查 DB 并获取锁，其他请求等待锁释放后读缓存 |
| **永不过期** | 热点数据不设 TTL，通过后台异步任务更新值 |
| **逻辑过期** | 缓存不设物理 TTL，value 中存一个逻辑过期时间，后台异步刷新 |

### 14.3 缓存雪崩

**问题**：大量 key **同时过期**，或 Redis 宕机，导致大量请求瞬间打到数据库。

**解决方案**：

| 方案 | 说明 |
|------|------|
| **过期时间加随机值** | `TTL = base + random(0, 300s)`，避免集中在同一时刻过期 |
| **多级缓存** | 本地缓存（Caffeine/Guava）+ Redis，减少对 Redis 的依赖 |
| **高可用架构** | 主从 + Sentinel + Cluster，确保 Redis 不宕机 |
| **限流降级** | 数据库前端加限流，超限则直接返回降级响应 |
| **热点数据永不过期** | 最高频的 key 不设 TTL |

### 14.4 缓存与数据库一致性

**问题**：数据库更新后，缓存可能还是旧数据，导致数据不一致。

**常见方案**：

| 方案 | 说明 | 一致性级别 |
|------|------|-----------|
| **先更新 DB 再删缓存** | Cache Aside 标准方案 | 最终一致（存在短暂不一致窗口） |
| **延迟双删** | 先删缓存 → 更新 DB → 延迟（如 1s）→ 再删缓存 | 最终一致 |
| **MQ 异步删除** | DB 更新后，通过 MQ 异步通知删除缓存 | 最终一致 |
| **Canal + binlog** | 监听 MySQL binlog → 解析 → 更新/删除缓存 | 最终一致 |
| **分布式事务** | 2PC / Seata 等 | 强一致（代价高） |

> 在 **CAP 理论** 约束下，大部分业务场景选择**最终一致性**，Cache Aside + MQ 重试机制即可满足需求。

### 14.5 大 Key / 热 Key 问题

#### 大 Key

**定义**：单个 key 的 value 过大（String > 10KB 或集合元素 > 1 万个）

**危害**：
- 读取时占用带宽，阻塞单线程
- 删除时阻塞（DEL 是 O(N) 操作）
- 迁移/复制困难

**排查工具**：
```bash
redis-cli --bigkeys        # 统计每种数据类型中最大的 key
redis-cli --memkeys        # 按内存消耗排序
```

**解决方案**：
- **拆分**：大 Hash → 多个小 Hash；大 List → 分段 List
- **异步删除**：使用 `UNLINK` 代替 `DEL`（4.0+）
- **压缩**：序列化时使用压缩算法

#### 热 Key

**定义**：某个 key 的 QPS 特别高（如明星微博、热门商品）

**解决方案**：
- **本地缓存**：增加一级 Caffeine/Guava 本地缓存
- **多副本**：同一个数据存多个 key（加随机后缀），分散到不同节点
- **读写分离**：读请求全部走 Slave

---

## 十五、性能优化指南

### 15.1 连接优化

```bash
# 尽量使用长连接（连接池）
# 批量命令减少 RTT（Pipeline、MGET/MSET）
# 避免单个命令处理大量数据（用 SCAN 代替 KEYS）
```

### 15.2 慢查询日志

```bash
# redis.conf
slowlog-log-slower-than 10000     # 执行时间 > 10000 微秒（10ms）的记录
slowlog-max-len 128                # 最多保存 128 条慢查询记录

# 查看命令
SLOWLOG GET 10                     # 最近 10 条慢查询
SLOWLOG LEN                        # 慢查询条数
SLOWLOG RESET                      # 清空记录
```

### 15.3 键名设计规范

| 规范 | 示例 |
|------|------|
| **可读性** | `user:1001:profile` |
| **使用冒号分隔层级** | `order:202401:detail` |
| **避免过长的 key** | 建议不超过 30 字符 |
| **避免过短无意义的 key** | 不用 `u:1`，用 `user:1` |
| **统一命名风格** | 全小写 + 冒号分隔 |

### 15.4 生产环境配置建议

```bash
# === 内存 ===
maxmemory 2gb                        # 设置最大内存限制
maxmemory-policy allkeys-lru         # 缓存场景推荐策略

# === 持久化 ===
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes             # 混合持久化

# === 安全 ===
requirepass strong_password          # 设置密码（生产环境必须！）
rename-command FLUSHDB ""            # 禁用危险命令
rename-command FLUSHALL ""
rename-command CONFIG "CONFIG_abc"   # 重命名危险命令
bind 127.0.0.1                       # 绑定内网 IP（禁止外网访问）

# === 慢查询 ===
slowlog-log-slower-than 10000
slowlog-max-len 128

# === 连接 ===
timeout 300                          # 空闲连接超时（秒）
maxclients 10000                     # 最大客户端连接数
tcp-keepalive 300                    # TCP KeepAlive 间隔（秒）

# === 延迟监控 ===
latency-monitor-threshold 100        # 超过 100ms 的操作记录
```

---

## 十六、客户端使用建议（Java / Spring Boot）

### 16.1 Java 常用客户端

| 客户端 | 特点 | 推荐程度 |
|--------|------|---------|
| **Jedis** | 老牌客户端，API 与 Redis 命令一一对应，简单直接 | ⭐⭐⭐ |
| **Lettuce** | 基于 Netty 的异步/响应式客户端，线程安全，Spring Boot 2.x 默认 | ⭐⭐⭐⭐⭐ |
| **Redisson** | 分布式锁、分布式集合等高级功能丰富 | ⭐⭐⭐⭐⭐ |

### 16.2 Spring Boot 集成配置

```yaml
# application.yml
spring:
  redis:
    host: localhost
    port: 6379
    password: your_password
    timeout: 3000ms
    lettuce:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 0
        max-wait: -1ms
```

### 16.3 常用操作示例

```java
// String — 缓存
redisTemplate.opsForValue().set("key", "value", 10, TimeUnit.MINUTES);
String value = redisTemplate.opsForValue().get("key");

// Hash — 对象存储
redisTemplate.opsForHash().put("user:1001", "name", "Jack");
Object name = redisTemplate.opsForHash().get("user:1001", "name");

// List — 消息队列
redisTemplate.opsForList().leftPush("queue", "task1");
String task = (String) redisTemplate.opsForList().rightPop("queue");

// Set — 标签
redisTemplate.opsForSet().add("tags:article:1", "Redis", "NoSQL");

// ZSet — 排行榜
redisTemplate.opsForZSet().add("rank", "player1", 100);
Set<ZSetOperations.TypedTuple<String>> top10 =
    redisTemplate.opsForZSet().reverseRangeWithScores("rank", 0, 9);

// 分布式锁（Redisson）
RLock lock = redissonClient.getLock("lock:order:1001");
if (lock.tryLock(10, 30, TimeUnit.SECONDS)) {
    try {
        // 业务逻辑
    } finally {
        lock.unlock();
    }
}
```

---

## 快速参考

### 数据类型选择速查

| 需求 | 推荐类型 |
|------|---------|
| 简单缓存、计数器、分布式锁 | **String** |
| 消息队列、时间线 | **List** |
| 去重标签、共同好友 | **Set** |
| 排行榜、延迟队列 | **ZSet** |
| 对象存储、购物车 | **Hash** |
| 签到统计 | **Bitmap** |
| UV / DAU 统计 | **HyperLogLog** |
| 附近的人 | **Geo** |
| 可靠消息队列 | **Stream** |

### 常用 Key 操作命令速查

```bash
# Key 管理
KEYS pattern              # 查找 key（生产禁止！用 SCAN）
SCAN cursor MATCH pattern  # 渐进式遍历（安全）
TYPE key                  # 查看类型
EXISTS key                # 判断存在
DEL key                   # 删除（大 key 用 UNLINK）
UNLINK key                # 异步删除（4.0+，不阻塞）
EXPIRE key seconds        # 设置过期时间
TTL key                   # 查看剩余时间
RENAME key newkey         # 重命名

# 服务器信息
INFO [section]            # 查看服务器信息（memory/cpu/clients/stats/replication 等）
DBSIZE                    # 当前 DB 的 key 总数
MONITOR                   # 实时监控所有命令（调试用，生产禁用！）
CLIENT LIST               # 客户端连接列表
CONFIG GET parameter      # 获取运行时配置
CONFIG SET parameter val  # 动态修改配置
FLUSHDB                   # 清空当前 DB（生产禁用！）
FLUSHALL                  # 清空所有 DB（生产禁用！）
```

---

> **参考资源**：
> - 官方文档：https://redis.io/docs/latest/
> - 源码仓库：https://github.com/redis/redis
> - 命令参考：https://redis.io/commands/
> - Redis 设计与实现（黄健宏）：http://redisbook.com/
