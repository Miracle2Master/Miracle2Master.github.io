# JWT 认证体系中集成 Redis — 设计思路

## 一、是什么

在已有的 JWT 无状态认证体系上引入 Redis，为 token 增加"可主动失效"的能力。本质是在 JWT 的无状态优势之上，叠加一层有状态的控制面，用 Redis 的 key-value 存储来追踪 token 的生命周期状态。

## 二、为什么需要

纯粹 JWT 认证有三处缺陷：

| 痛点 | 说明 |
|------|------|
| **Token 无法主动失效** | 签发后直到过期前一直有效，改密码、被封禁后旧 token 照用不误 |
| **RefreshToken 形同虚设** | 后端生成了双令牌，但前端没存 RT，续期能力没有落地 |
| **无法控制多端登录** | 同一账号多设备登录时无法踢人，也无法限制同时在线数 |

引入 Redis 就是为了补上这三个缺口，让 JWT 从"全无状态"变成"核心路径无状态、控制面有状态"的混合架构。

## 三、核心方案

### 3.1 三个 Redis 切入场景

#### 场景一：Token 黑名单 — 精准标记"哪个 token 失效"

适合登出、改密场景。把要失效的 token 的唯一标识写入 Redis，TTL 设为 token 剩余过期时间（自动清理，不占永久内存）。

**两种实现路径**：

| 方案 | 做法 | 优点 | 缺点 |
|------|------|------|------|
| A — jti 黑名单 | Redis 存 `token:black:<jti>`，逐 token 标记失效 | 精准控制单个 token | 每个失效 token 一条 key，改密需全量标记 |
| B — 用户版本号 ★ | Redis 存 `user:version:<userId>` (整数)，token 中嵌入版本号，校验时比对 | 一次 INCR 踢掉该用户所有旧 token，极省空间 | 不能"只踢某个设备" |

**推荐方案 B**。版本号自增，永不回退：登出 → `INCR`，改密 → `INCR`。拦截器校验时拿 token 里的版本号与 Redis 当前版本号比对，不匹配就 401。

#### 场景二：RefreshToken 轮转 — Token 续期

AccessToken(AT) 短期 + RefreshToken(RT) 长期。RT 存入 Redis（`refresh:<userId>:<randomId>`）。AT 过期后前端用 RT 请求刷新，后端校验 RT → 删旧 RT → 签发新 AT + 新 RT。这就是 **RT 轮转**——每次刷新都换新的 RT，旧的立刻删。如果旧的 RT 被重复使用，大概率泄露了，触发全量清除。

#### 场景三：会话管理 — 多端登陆与踢人

Redis 存 `user_session:<userId>` → `Set<设备ID>`。登录时添加设备 ID，踢人时删除对应设备或清空 Set。拦截器校验当前请求的设备 ID 是否在 Set 中。同时可限制同一用户最多在线设备数，超出时拒绝新登录或踢最早设备。

### 3.2 第一步落地：用户版本号机制（最小改动、最大收益）

改动前的拦截器链路：

```
extractToken → validateToken（验签+过期） → parseToken → LoginUser.set → 放行
```

改动后的拦截器链路：

```
extractToken → validateToken → parseToken（取出 userId + ver）
  → 查 Redis "user:version:<userId>"
    → token.ver ≠ Redis.ver → 401（Token 已被注销）
    → Redis 挂了或 key 不存在 → 降级放行（信任 JWT 自身有效性）
  → LoginUser.set → 放行
```

**降级策略是关键**：Redis 不可用绝不能导致全站瘫痪。查 Redis 失败时走降级——信任 JWT 本身的签名和过期时间，不额外校验版本号。

**涉及改动的文件**：

| 文件 | 改动概要 |
|------|---------|
| JwtUtils | `generateAccessToken` 新增 version 参数，嵌入 JWT claims |
| AuthInterceptor | preHandle 中新增 Redis 版本号比对逻辑 |
| UsersServiceImpl.login | 调用 token 生成时传入版本号 |
| UsersServiceImpl.changePassword | 改密成功后 INCR 版本号 |
| 新增 AuthController | 加 `/api/auth/logout` 登出接口（目前后端没有） |
| 前端 user.js | logout 时先调后端登出接口，再清本地状态 |

**版本号初始化的处理方式**：首次登录时用 `SETNX` 确保 key 存在（不存在则初始化为 1），后续只有 INCR 操作。INCR 是原子操作，天然无并发问题。

### 3.3 设计原则总结

1. **不改 JWT 的无状态优势**：正常请求每个只查一次 Redis（拿版本号），不是每次请求都走黑名单校验
2. **Redis 不可用时降级放行**：不能让缓存故障导致整个系统不可用
3. **分步落地**：第一步做版本号，第二步做 RT 轮转，第三步做会话管理，每一步独立验证
4. **版本号永不自减**：只 INCR，不用 DECR，无回退风险

## 四、关键要点

- JWT jti（JWT ID）是标准字段，方案 A 用到 jti 做黑名单 key 的标识
- `SETNX` 保证首次初始化幂等，不会覆盖已有的版本号
- RT 轮转的核心价值不是"让用户不用重新登录"，而是"发现 RT 泄露时能立即止损"
- 拦截器校验顺序：验签 → 过期 → 版本号。签名不对的直接拦截，无需查 Redis
- Redis key 的 TTL 设计：版本号 key 不设 TTL（或设与 RT 同等长度的 TTL），黑名单 key 的 TTL 等于 token 剩余有效期（过期自动回收内存）
- 前端目前没存 refreshToken，要实现 RT 轮转必须先改前端 user store，让 login 方法同时存储 `token` 和 `refreshToken`

  1. 降级策略中说"Redis 挂了就信任 JWT 本身"，但如果 Redis 挂掉期间用户改了密码，攻击者拿着旧的、还没过期的 token
    仍然能正常访问，这个窗口期怎么缩小？
  2. 版本号方案一次 INCR 踢掉了该用户的所有设备。假如产品要求"改密时只踢其他设备，当前设备不受影响"，Redis 的 key 和
    value 结构要怎么重新设计？
  3. RT 轮转中每次刷新都生成新 RT、删除旧 RT，如果网络抖动前端没收到新
    RT，下次还用旧的请求会触发"疑似泄露"告警——这个问题怎么从协议层面优雅地解决？
