---
order: 68
---

# Spring AOP 与 Spring Bean 学习笔记

---

## 一、Spring Bean 是什么？

### 1.1 定义

**Spring Bean** 是由 Spring IoC（控制反转）容器管理的**对象实例**。它的生命周期（创建、装配、销毁）完全由 Spring 容器控制，而不是开发者手动 `new` 出来的。

### 1.2 核心思想

```java
// ❌ 不用 Spring — 手动管理依赖
UserService userService = new UserService(new UserRepository());

// ✅ 用 Spring — 容器自动注入
@Autowired
private UserService userService;
```

### 1.3 Bean 的生命周期

```
实例化 → 属性赋值(依赖注入) → 初始化(@PostConstruct) → 使用 → 销毁(@PreDestroy)
```

### 1.4 声明 Bean 的三种方式

| 方式 | 示例 | 适用场景 |
|------|------|---------|
| **注解声明** | `@Component`, `@Service`, `@Repository` | 自己写的类，最常用 |
| **@Bean 方法** | `@Bean` 在 `@Configuration` 类中 | 第三方类、需要自定义创建逻辑 |
| **XML 配置** | `<bean id="..." class="..."/>` | 传统项目 |

```java
// 方式1：注解声明
@Service
public class UserService { }

// 方式2：@Bean（用于第三方类）
@Configuration
public class AppConfig {
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
```

### 1.5 Bean 的 Scope（作用域）

| Scope | 说明 |
|-------|------|
| **singleton**（默认） | 整个容器只有一个实例，每次获取都是同一个 |
| **prototype** | 每次获取都创建一个新实例 |
| **request** | 每个 HTTP 请求一个实例（Web 环境） |
| **session** | 每个 HTTP 会话一个实例（Web 环境） |

### 1.6 一句话总结

> **Spring Bean = 交给 Spring 容器管理的对象。你不用 `new`，Spring 帮你 `new`；你不用手动传依赖，Spring 帮你注入。**

---

## 二、Spring AOP 是什么？

### 2.1 定义

**AOP (Aspect-Oriented Programming，面向切面编程)** 是 Spring 框架的核心模块之一，它将**横切关注点**（日志、事务、安全等）从业务逻辑中分离出来，通过**不修改源码**的方式给方法"加壳"来插入额外逻辑。

### 2.2 为什么要用 AOP？

**问题：** 日志、事务等代码在每个方法中重复出现，和业务逻辑搅在一起。

```java
// ❌ 没有 AOP — 每个方法都写重复代码
public User getUser(Long id) {
    log("开始查询");           // 重复
    User user = 查数据库(id);   // 业务
    log("查询结束");           // 重复
    return user;
}

public User updateUser(User u) {
    log("开始更新");           // 重复
    更新数据库(u);             // 业务
    log("更新结束");           // 重复
    return u;
}
```

**解决：** AOP 把重复代码抽到一个地方，自动贴在所有需要的方法上。

```java
// ✅ 业务方法只写业务逻辑
public User getUser(Long id) {
    return 查数据库(id);  // 干净！
}

// 日志逻辑写在切面里，一个地方统一管理
@Aspect
@Component
public class LogAspect {
    @Around("execution(* UserService.*(..))")
    public Object log(ProceedingJoinPoint pjp) throws Throwable {
        System.out.println(">>> 开始调用");
        Object result = pjp.proceed();
        System.out.println(">>> 调用结束");
        return result;
    }
}
```

### 2.3 AOP 核心概念

| 概念 | 说明 |
|------|------|
| **Aspect（切面）** | 横切关注点的模块化封装，如日志、事务。标注 `@Aspect` |
| **Join Point（连接点）** | 程序执行点。Spring AOP 中**只能是方法** |
| **Advice（通知）** | 在特定连接点执行的动作 |
| **Pointcut（切点）** | 表达式，决定通知在哪些方法上执行 |
| **Weaving（织入）** | 将切面应用到目标对象并创建代理的过程。Spring AOP 在**运行时**完成 |
| **Target Object（目标对象）** | 被代理的原始对象 |

### 2.4 五种通知类型

| 注解 | 执行时机 |
|------|---------|
| `@Before` | 目标方法执行**前** |
| `@After` | 目标方法执行**后**（无论成功/异常） |
| `@AfterReturning` | 目标方法**正常返回**后 |
| `@AfterThrowing` | 目标方法**抛出异常**后 |
| `@Around` | **环绕**通知，可控制方法是否执行、修改参数和返回值（最强大） |

### 2.5 典型应用场景

- **事务管理** — `@Transactional` 就是基于 AOP
- **日志记录** — 统一记录方法调用
- **权限校验** — 方法执行前验证权限
- **性能监控** — 统计方法执行时间
- **缓存** — `@Cacheable` 等

### 2.6 一句话总结

> **AOP = 把"每个方法都要写的重复代码"抽到一个地方，Spring 自动帮你贴在方法前后。就像一个拦截器，调用方法时先经过切面，再到达真正的业务逻辑。**

---

## 三、AOP 代理机制

### 3.1 两种代理

| 代理方式 | 条件 | 实现 |
|---------|------|------|
| **JDK 动态代理** | 目标类必须实现接口 | `java.lang.reflect.Proxy` |
| **CGLIB 代理** | 可以代理没有接口的类 | 字节码生成子类 |

Spring Boot 2.x 开始默认使用 CGLIB。

### 3.2 运行时，容器里有几个对象？

```
有 AOP 切 UserService 时：

┌──────────────────────────────────────────────┐
│  ApplicationContext                           │
│                                               │
│   userService（Bean名）                        │
│       │                                       │
│       ▼                                       │
│   ┌──────────────┐     内部持有      ┌──────┐ │
│   │  CGLIB 代理   │ ───────────────▶ │ 原始  │ │
│   │  (替身)       │                  │ 对象  │ │
│   │  对外的Bean   │  调用前/后执行切面 │ 真正的│ │
│   └──────────────┘                  │ 业务  │ │
│        ▲                             └──────┘ │
│        │                                       │
│   @Autowired 拿到的就是这个代理                  │
└──────────────────────────────────────────────┘
```

### 3.3 不同场景下对象的数量

| 场景 | 容器里几个对象 | 原因 |
|------|:---:|------|
| 普通 `@Service`，无 AOP | **1** | 直接就是原始对象 |
| 普通 `@Service`，有 AOP 切它 | **2** | CGLIB 代理 + 原始对象 |
| `UserMapper`（MyBatis 接口） | **1** | MyBatis 的 JDK 动态代理，没有原始实现类 |
| `UserMapper` + AOP 再切它 | **2** | Spring AOP 代理包着 MyBatis MapperProxy |

> **关键：** 对 `@Service` 来说，有 AOP 时容器里确实有两个对象（代理 + 原始），但**对外暴露的只有代理**，原始对象藏在代理后面，开发者拿不到。

---

## 四、@Bean 注解是 AOP 吗？

### 结论：不是

| 注解 | 解决的问题 | 所属机制 |
|------|-----------|---------|
| `@Bean` | **对象交给 Spring 管理**（创建和管理 Bean） | **IoC 容器** |
| `@Aspect`, `@Around` 等 | **给已有方法自动贴额外逻辑**（增强方法） | **AOP** |

### 打个比方

```
@Bean = 招人
  告诉 HR："这个人是员工，归公司管" → HR 登记、发工牌

AOP = 公司制度
  所有员工进出公司 → 自动打卡（不用每个员工自己记考勤）
```

### 可能会混淆的地方

`@Configuration` 类也会被 CGLIB 代理，但那是为了**保证 Bean 的单例性**（同一个 `@Bean` 方法不会被多次调用），**不是为了 AOP 增强**。

```java
@Configuration
public class AppConfig {

    @Bean
    public UserRepository userRepository() {
        return new UserRepository();
    }

    @Bean
    public UserService userService() {
        // 这里调用 userRepository()，CGLIB 代理拦截后
        // 返回的是容器里已有的那个单例，不会真的 new 两次
        return new UserService(userRepository());
    }
}
```

---

## 五、Spring 两大核心总结

```
IoC 容器  ← @Bean, @Component, @Autowired 属于这个
  管的是：对象谁来创建？谁持有？

AOP      ← @Aspect, @Around, @Before 属于这个
  管的是：方法调用时，自动加什么额外逻辑？

两者用了类似的底层技术（动态代理），但解决的是不同层面的问题。
@Bean 是"注册声明"，AOP 是"拦截增强"。
```

---

## 六、一句话串联所有概念

> **`@Bean` 告诉 Spring "这个对象归你管" → Spring 放入 IoC 容器 → 如果这个 Bean 被 AOP 切面切到了 → Spring 给原始对象包一层代理 → 你 `@Autowired` 拿到的是代理 → 每次调方法时代理先执行切面逻辑（日志/事务），再调到原始对象干活。**
