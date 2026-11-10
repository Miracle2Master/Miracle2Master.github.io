---
order: 2
---

## 一、Spring 核心与 IoC/DI

1. 说一下你对 Spring 的理解？

   Spring 的核心特性有四个。第一是 IoC 容器，对象的创建和对象间依赖关系的管理交给容器，开发者只定义 Bean 及其依赖；第二是 AOP，把事务、安全这类横切关注点从业务逻辑中抽出来模块化；第三是事务管理，提供一致的事务接口，支持声明式和编程式事务，不用关心具体事务 API；第四是 MVC 框架，基于 Servlet API 的 Web 框架，支持灵活的路由映射和多种视图技术。再补一句生态，Spring 通过 Boot、Cloud 覆盖了单体到微服务的完整链路，是 Java 企业开发的事实标准。

2. Spring 的核心思想说说你的理解？

   三大核心思想：IoC 解决对象创建与依赖管理的高耦合，靠容器管理 Bean 生命周期，典型场景是动态替换数据库实现、服务组装；DI 解决依赖关系硬编码的问题，靠构造器、Setter、字段注入，典型场景是 Service 依赖 DAO；AOP 解决横切逻辑分散在业务代码里的问题，靠动态代理和切面配置，典型场景是日志、事务、权限统一处理。三者配合让 Spring 做到轻量、高内聚低耦合。

3. Spring IoC 和 AOP 介绍一下？

   IoC 是控制反转，一种创建和获取对象的技术思想，依赖注入是实现它的方式。传统开发用 new 创建对象，IoC 方式下由容器帮我们实例化并注入依赖，大幅降低耦合。AOP 是面向切面编程，把与业务无关却被多个模块共同调用的逻辑封装起来，减少重复代码、降低耦合。Spring AOP 基于动态代理：目标对象实现了接口默认用 JDK Proxy，没实现接口用 CGLIB 生成子类。要注意 Spring Boot 2.0 起默认 `spring.aop.proxy-target-class=true`，无论有没有接口都优先 CGLIB，想切回 JDK 代理要手动设为 false。两者结合使用时，IoC 管依赖关系，AOP 把横切逻辑切入业务，比如 Service 层的事务和日志。

4. Spring 的 AOP 介绍一下？

   OOP 的最小单元是 Class 对象，AOP 的最小单元是切面，一个切面可以包含多种类型和对象并做模块化管理。AOP 把功能分成核心业务（登录、增删改查）和周边功能（日志、事务），两者独立开发再"编织"在一起。核心概念有九个：Aspect 切面，把切点和通知组织在一起；Join point 连接点，Spring AOP 只支持方法级别；Advice 通知，有 before、after、after-returning、after-throwing、around 五种；Pointcut 切点，决定通知作用在哪些方法上；Introduction 引介，为代理对象增加原本没实现的接口；Weaving 织入，把通知插入目标方法；AOP proxy 代理对象，有 JDK 和 CGLIB 两种；Target object 目标对象。要强调 Spring AOP 基于 JDK 动态代理和 CGLIB 字节码增强，属于运行期织入，不需要专用编译器，和 AspectJ 的编译期、类加载期织入不同。

5. IOC 和 AOP 是通过什么机制实现的？

   IoC 靠四样东西：反射，运行时动态加载类、创建实例、调用方法；依赖注入，通过构造器、属性、方法注入管理依赖关系；工厂模式，容器作为工厂负责实例化和生命周期管理；容器实现，BeanFactory 提供基础 IoC 能力，ApplicationContext 在其上扩展企业级功能。AOP 靠动态代理，在运行时生成代理对象而不改源码。两种实现：基于 JDK 动态代理，用 `java.lang.reflect.Proxy` 和 `InvocationHandler`，要求目标类实现接口；基于 CGLIB，生成被代理类的子类，不要求实现接口。

6. 怎么理解 Spring IoC？

   IoC 即控制反转，是一种设计思想。传统 Java SE 在对象内部用 new 主动创建依赖，Spring 里由专门的容器控制对象的创建、初始化、销毁：创建从 new 变成容器创建；初始化从自己调用构造器或 setter 赋值变成容器自动注入；销毁是容器关闭时调用销毁回调做资源清理，内存最终还是 JVM 回收。所以 IoC 解决了繁琐的生命周期操作并解耦代码。所谓"反转"反转的是对象创建和依赖组装的控制权，业务代码从"自己创建依赖"变成"声明依赖并接收容器提供的对象"。

7. 依赖倒置、依赖注入、控制反转分别是什么？

   三个层面不同。控制反转是设计思想，原来由业务对象自己创建和管理依赖，现在把控制权交给外部容器。依赖注入是实现 IoC 的方式，对象只声明需要什么，外部通过构造器、Setter、字段传进来，它和 IoC 是实现方式和设计思想的关系，并不是相反的；而且 DI 不一定要用 Spring，手动传构造器参数也是 DI。依赖倒置是设计原则，高层和低层都依赖抽象，抽象不依赖具体实现。举例：订单服务如果直接 new SmsSender 就和短信实现绑死，改成依赖 MessageSender 接口再构造器注入，依赖接口体现依赖倒置，构造器传参体现依赖注入，交给 Spring 创建组装体现控制反转。

8. 依赖注入了解吗？怎么实现的？

   传统编程在类内部 new 依赖对象，耦合度高；依赖注入把对象创建和依赖管理交给容器，类只声明依赖，容器运行时注入，降低耦合、提升可维护性和可测试性。Spring 有三种方式：构造器注入，通过构造函数传依赖，保证对象初始化时依赖已就绪，Spring 4.3 起单构造器不用写 @Autowired；Setter 注入，用 @Autowired 标在 setter 上，灵活性高但依赖可能没初始化完；字段注入，@Autowired 直接标字段，代码简洁但隐藏依赖关系，不推荐用在生产代码。

9. 为什么更推荐构造器注入？

   我一般把必需依赖放构造器，可选依赖才用 Setter。好处有四个：依赖明确，看构造方法就知道用了哪些组件，依赖太多也能直接暴露、方便判断是否该拆类；对象创建后就能用，不会出现对象已创建但依赖还是 null；方便测试，单测直接 new UserService(mockRepository)，不用启动容器也不用反射赋值；支持 final 字段，引用固定不会被随意替换，但 final 只保证引用不变，不代表依赖对象本身线程安全。还有一点，构造器注入遇到循环依赖会在启动时暴露问题，反而提醒我们检查设计，通常可以抽出公共逻辑或加一个上层服务协调。

10. @Autowired 和 @Resource 有什么区别？

    区别在来源和匹配方式。@Autowired 是 Spring 的，主要按类型匹配，多个同类型 Bean 时可用 @Qualifier 指定候选或用 @Primary 标默认，没有明确选择时还可能按字段名、参数名匹配 Bean 名，仍无法唯一确定就报错。@Resource 是 Java 标准注解，常用于字段和 Setter，显式写了 name 就按名称查找，没写 name 先按字段名或属性名找，找不到再按类型匹配；显式指定名称却找不到时不会再随便选一个同类型 Bean。比如有支付宝和微信两个实现，@Autowired 会有歧义，可以配 @Qualifier("wechatPaymentService")，也可以写 @Resource(name = "wechatPaymentService")。版本上 Spring Boot 2.x 是 javax.annotation.Resource，3.x 起是 jakarta.annotation.Resource。

11. 如果让你设计一个 Spring IoC，会从哪些方面考虑？

    我会拆成读取定义、创建对象、注入依赖、管理生命周期四步，再补作用域和扩展能力。Bean 定义管理，设计类似 BeanDefinition 的结构记录类型、作用域、构造参数、属性、初始化方法，XML、注解、Java 配置都转成统一描述，后面的创建逻辑就不关心配置来源。对象创建与依赖解析，按定义选构造器或工厂方法，递归查找依赖再注入，同类型多候选要支持按名称、限定符选择，无法确定时给出清晰异常。作用域和缓存，单例按 Bean 名缓存复用，prototype 每次创建，还要保证并发创建单例不会产生多个对外实例。生命周期，把实例化和初始化分开，提供初始化和销毁回调。循环依赖，记录正在创建的 Bean，能提前暴露实例的单例循环按规则处理，构造器循环等无解情况及时报错，不能无限递归。扩展点和代理，定义类似 BeanFactoryPostProcessor、BeanPostProcessor 的接口，让外部能改定义、处理实例或替换成代理。最小版本先做定义注册、单例创建、构造器注入，跑通依赖解析和错误处理，再逐步加生命周期、作用域和 AOP。

## 二、AOP 与动态代理

1. Spring AOP 主要想解决什么问题？

   解决横切逻辑重复、分散在各个业务类里的问题。比如订单、支付、用户这些 Service 都要记调用日志，每个方法手写会打断业务代码，以后改日志格式或加耗时统计还要到处改。这些 Service 职责不同，不能为了共享日志强行放进同一条继承关系；用组合封装日志组件，每个业务方法仍然要主动调用。AOP 把逻辑放进切面，用切点指定哪些方法需要增强，再由代理在方法执行时统一调用，业务方法只关注核心流程。所以它是对面向对象设计的补充，重点是抽出跨模块的共性行为，而不是弥补 Java 不支持多继承。

2. AOP 在 Spring 中的应用你知道哪些？

   最常见的是事务管理，声明式事务就是基于 AOP 实现的，标个 @Transactional，Spring 在方法执行前开启事务、执行后按异常决定提交还是回滚。然后是日志记录，用 @Before 取入参、@AfterReturning 取返回值、@Around 统计执行时间，业务方法里不掺杂日志代码，也方便统一修改。还有权限校验，用 @Before 检查登录状态或角色权限，不满足直接抛异常阻止方法执行，避免每个接口重复写判断。本质上都是用切面封装横切逻辑、用切点指定作用方法、在方法执行的不同阶段插入逻辑，实现无侵入增强。

3. 谈谈你对 Spring AOP 的了解程度？

   核心是一种不侵入业务代码的横切逻辑解决方案，把日志、事务、权限这些和业务无关又必须做的事抽出来统一处理。实现上是代理机制：没强制类代理时，有接口用 JDK 动态代理，没接口用 CGLIB；Spring Boot 2.x、3.x 的 AOP 自动配置默认倾向 CGLIB，还要结合项目配置判断。调用的是代理对象而不是原始对象，方法执行前后被织入额外逻辑。使用上是基于运行时代理的 AOP，不是 AspectJ 的编译期或类加载期织入，写 @Aspect、@Before、@After、@Around 就是在定义切面、切点、通知，容器启动时解析并准备好代理对象。执行时方法调用走一条拦截器链，@Around 本质是方法前后包一层，是否放行、是否执行原方法由 proceed() 控制，事务、日志底层就是一组 MethodInterceptor 按序执行。项目里主要用它做声明式事务、接口日志、统一异常处理、参数校验、轻量权限控制。边界有三个：只能作用在容器管理的 Bean 上，自己 new 的对象不生效；同类内部 this 调用不触发 AOP，绕过了代理；只能拦截方法级别，做不到字段或构造方法级别增强。整体我把它当成工程层面的工具，超出这个边界就考虑别的设计。

4. Spring AOP 的原理了解吗？

   核心是在目标对象外面包一层代理，把匹配到的通知组织成拦截器链。分三个过程：解析切面，解析 @Aspect 类里的切点和通知，转换成 Advisor，Advisor 可以理解为"在哪些方法上执行什么增强"；创建代理，自动代理创建器作为 Bean 后置处理器检查当前 Bean 是否匹配 Advisor，匹配就创建代理，一般在初始化后完成，遇到循环依赖时可能提前暴露代理引用；执行增强，外部通过代理调用方法时，代理找到适用的拦截器按序执行，拦截器可以在目标方法前后加逻辑，也能决定是否继续调用。比如事务增强的链路是：调用方 → 代理对象 → 事务拦截器 → 目标方法 → 提交或回滚。代理两种实现：JDK 动态代理生成实现目标接口的代理类，通过 InvocationHandler 处理调用，主要代理接口暴露的方法；CGLIB 生成目标类的子类，通过方法拦截增强，不要求实现接口，但因为依赖继承，final 类不能代理，final 方法和 private 方法也不能增强。没强制类代理时 Spring 有接口用 JDK、没接口用 CGLIB，Boot 2.x、3.x 默认 CGLIB，可以用 `spring.aop.proxy-target-class=false` 调整。最后注意代理生效的前提是调用经过代理对象，同类 this 调用直接进目标对象，这是事务、缓存注解经常失效的原因。

5. 动态代理是什么？

   Java 动态代理是运行时动态创建代理对象的机制，用于在不修改原始类的情况下拦截和增强方法调用。分两种：基于接口的 JDK 动态代理，要求目标对象至少实现一个接口，用 `java.lang.reflect.Proxy` 和 `InvocationHandler` 实现，代理类实现的是业务接口，增强逻辑由 handler 负责，每个代理对象关联一个 handler，调用代理方法时转发给 invoke() 方法；基于类的 CGLIB 动态代理，在运行时生成目标类的子类，通过继承创建代理，不需要实现接口，目标对象没实现任何接口时就用它。

6. 动态代理和静态代理的区别？

   代理模式的目的是为其他对象提供代理以控制访问、解耦两个类，代理类和委托类实现相同接口，因为代理真正调用的是委托类的方法。区别：静态代理由程序员手写或特定工具生成，编译时就确定代理哪个类，通常只代理一个类；动态代理在运行期由 JVM 根据目标对象自动生成代理类，不需要为每个被代理类手写。JDK 动态代理基于接口，要求目标对象实现接口；CGLIB 基于继承，生成目标类子类，不要求实现接口。

7. 能使用静态代理的方式实现 AOP 吗？

   可以，静态代理也能做方法增强，只是通用性和维护成本不同。比如手写一个 OrderServiceProxy，在调用真正的 OrderService 前后记录日志、统计耗时，就实现了最基本的横切逻辑。但业务接口和方法一多就麻烦：每个接口的每个方法都要写转发逻辑，很多方法前后做的事其实一样；接口新增方法或调整签名时，代理类也要同步改；想用切点表达式批量匹配方法还得自己实现匹配和分发机制。所以 Spring AOP 用运行时动态代理，把代理生成、方法匹配、通知执行统一交给框架。面试可以答：静态代理能做 AOP 的基本增强，动态代理更适合框架层面的大规模复用。

8. AOP 实现有哪些注解？

   七个常用：@Aspect 定义切面，标在切面类上；@Pointcut 定义切点，标在方法上指定连接点；@Before 方法执行前通知；@After 方法执行后通知，无论正常返回还是抛异常都执行；@Around 方法前后都执行，功能最强；@AfterReturning 正常返回结果后执行；@AfterThrowing 抛出异常后执行。

9. 什么是反射？有哪些使用场景？

   反射是程序运行状态下，对任意一个类都能获取它的所有属性和方法，对任意一个对象都能调用它的任意属性和方法，编译时不知道具体类也能操作。特性有四个：运行时类信息访问，拿到类名、包名、父类、接口、构造器、方法、字段；动态对象创建，用 `Constructor.newInstance()`，`Class.newInstance()` 从 Java 9 起已过时，推荐 `clazz.getDeclaredConstructor().newInstance()`；动态方法调用，用 `Method.invoke()`，包括私有方法；访问和修改字段值，用 `Field.get()` 和 `set()`，包括私有字段。Spring 里两处典型应用：一是依赖注入和 IoC，容器扫描配置或注解后用反射实例化 Bean 并自动装配，@Autowired 无需手写创建 DAO 的代码；二是动态代理，AOP 用 JDK 动态代理或 CGLIB 创建代理对象，在方法前后执行切面逻辑，全部在运行时通过反射动态构建执行。

## 三、循环依赖与三级缓存

1. Spring 是如何解决循环依赖的？

   循环依赖指两个类的属性互相依赖，A 有 B、B 有 A 形成闭环。分三种情况：构造器注入产生的循环依赖、setter 注入且多例模式下的、setter 或字段注入且单例模式下的。Spring 的早期引用机制主要解决第三种，前提是容器允许循环依赖且 Bean 能正确暴露早期引用；双方都通过构造器直接依赖、或者双方都是 prototype，这套机制解决不了。核心是 DefaultSingletonBeanRegistry 里的三级缓存：一级 singletonObjects 放完全初始化好、可用的 Bean；二级 earlySingletonObjects 放提前暴露的早期引用，可能是原始对象也可能是为 AOP 提前生成的代理，此时 Bean 已实例化但属性可能没填完、初始化可能没执行；三级 singletonFactories 放 ObjectFactory 工厂，是解决循环依赖和 AOP 协同的关键，getObject() 负责返回早期引用。以 A、B 互依赖为例：第一步实例化 A 后立刻把 A 的 ObjectFactory 放进三级缓存；第二步填充 A 属性时发现依赖 B，转去创建 B，同样把 B 的工厂放进三级缓存；第三步填充 B 属性时发现依赖 A，一级二级都未命中，在三级缓存定位到 A 的工厂，调用 getObject()，需要 AOP 就提前生成代理、不需要就返回原始对象，得到的早期引用放进二级缓存并从三级缓存清理该条目，注入给 B；第四步 B 拿到所有依赖后执行初始化，提升到一级缓存并清理二三级；第五步回溯完成 A 的属性注入和初始化，如果之前给 A 生成过早期代理就复用二级缓存里的代理，最终 A 也进一级缓存。精髓是三级工厂在实例化后立刻暴露生成能力兼顾提前生成代理，二级缓存暂存已确定的早期引用避免重复生成代理，一级缓存最终交付完整 Bean。还要注意，双方都用构造器互依赖时连第一个实例都创建不出来，会抛 BeanCurrentlyInCreationException，这不是线程死锁。Spring Boot 2.6 起默认禁止循环依赖，设 `spring.main.allow-circular-references=true` 只是允许容器尝试解决支持的循环依赖，不代表什么都能解决，实际项目优先拆分职责、抽公共组件，必要时用 @Lazy 或 ObjectProvider 延迟获取。

2. Spring 为什么用三级缓存解决循环依赖？用二级缓存不行吗？

   结论是：只解决普通对象的循环依赖，两个缓存也够；Spring 用三级主要是为了按需提供早期引用，并和 AOP 代理的创建流程配合。假设 A 依赖 B、B 依赖 A，且 A 需要事务代理。如果实例化 A 后直接把原始对象放进二级缓存，B 注入的就是原始 A；等 A 初始化后再创建代理，容器对外提供的是代理 A，B 却还拿着原始 A，通过 B 调 A 就绕过了事务增强。这里的问题是对外引用不一致，不是目标对象和代理对象不能共存，正常代理机制本来就会同时有这两者。三级缓存里的 ObjectFactory 不直接保存最终引用，而是保留一个获取早期引用的入口：A 实例化后先把工厂放进三级缓存，不急着生成早期代理；B 创建时确实需要 A，才调用工厂通过 `getEarlyBeanReference()` 拿到原始引用或早期代理；结果放进二级缓存后续复用不重复生成；A 初始化完成后把一致的对外引用放进一级缓存并清理二三级。那能不能实例化后就提前生成代理直接放二级缓存？理论上可以重新设计成两级方案，但会让没发生循环依赖的 Bean 也提前执行代理相关处理，改变 Spring 通常在初始化后包装 Bean 的流程。所以面试里不要简单说"没有三级缓存就一定无法解决循环依赖"，更准确的说法是：三级让早期引用按需生成，二级让生成后的引用可以复用，一级保存最终可用 Bean；这套配合能处理常见的自动代理场景，但自定义后置处理器如果只在初始化后包装对象、又不支持早期引用，仍然可能出问题。

3. Spring 三级缓存的数据结构是什么？

   三者都是 Map，但 value 类型不同。一级缓存 Map<String, Object>，存完全初始化好、可用的 Bean 实例，键是 Bean 名，对应 DefaultSingletonBeanRegistry 的 singletonObjects。二级缓存 Map<String, Object>，存早期 Bean 引用，即已实例化但未完全初始化的对象，可能是原始对象也可能是为解决 AOP 循环依赖提前生成的代理，对应 earlySingletonObjects。三级缓存 Map<String, ObjectFactory<?>>，value 不是 Bean 实例本身而是工厂函数，Bean 创建过程中被其他 Bean 依赖时调用它的 getObject() 生成早期引用，必要时提前生成代理，对应 singletonFactories。

## 四、设计模式与常用注解

1. Spring 框架中都用到了哪些设计模式？

   我结合具体组件举例。工厂模式，BeanFactory 把对象创建和获取统一起来，调用方只描述依赖；代理模式，AOP 用代理对象在目标方法前后加事务、日志增强；单例管理，默认 singleton 作用域通过容器缓存复用实例，范围是每个容器中的每个 Bean 定义；模板方法，AbstractApplicationContext 的 refresh() 定义容器刷新主流程、把具体工作交给子类和扩展点，JdbcTemplate 则是模板加回调，统一处理连接、异常、资源清理；策略模式，不同的 Resource 实现负责读取不同来源的资源，动态数据源也通过路由策略选择目标源；装饰器模式，TransactionAwareCacheDecorator 在普通缓存外面加事务处理能力而不改底层实现；观察者模式，通过 ApplicationEventPublisher 发布事件、监听器接收处理；适配器模式，Spring MVC 用 HandlerAdapter 适配不同类型的 Handler，让 DispatcherServlet 统一调度。重点要说明这个模式解决了什么问题，比如 MVC 适配器解决调用方式不统一，AOP 代理解决通用逻辑增强。

2. Spring 常用注解有哪些？

   按作用分。自动装配：@Autowired 按类型自动装配 Bean；@Resource 按名称优先装配。组件声明：@Component 通用组件；@Service 服务层；@Repository 数据访问层，加上后 Spring 会通过 PersistenceExceptionTranslationPostProcessor 把持久层异常统一翻译成 DataAccessException，忽略它会丢失这层能力；@Controller 控制层。配置类：@Configuration 标记配置类；@Bean 标记方法为工厂方法，返回对象注册为 Bean。这四个（@Service、@Repository、@Controller）都是 @Component 的特例，只是语义分层不同。

## 五、Spring 事务

1. Spring 的事务什么情况下会失效？

   我会从三个方向看：调用有没有经过代理、方法能不能被代理、事务和回滚规则有没有配对。以下都是默认代理模式下的情况。对象没交给 Spring 管理，自己 new 的 Service 没有事务代理，写了 @Transactional 也不会开启事务。同类内部调用，this.xxx() 绕过代理，被调方法上的事务配置不生效，尤其想用内部方法的 REQUIRES_NEW 开新事务时最容易踩坑。方法无法被代理，private 方法不能通过代理增强，CGLIB 不能增强 final 方法和 final 类，JDK 代理主要拦截接口暴露的 public 方法；但不能一概说非 public 都失效，Spring 6.0 起类代理默认还支持可代理的 protected 和包可见方法，为减少差异业务方法通常还是写成 public。异常不符合回滚规则，默认只对 RuntimeException 和 Error 回滚，受检异常不回滚，需要时配 rollbackFor = Exception.class。异常被当前方法吞掉，异常没传到事务拦截器、也没别处把事务标记成 rollback-only，代理会按正常返回提交。跨线程执行，JDBC 本地事务资源绑定在当前线程，方法里新建线程或提交异步任务不会继承外层事务。事务管理器或底层资源不匹配，多数据源场景选错管理器、SQL 用的连接不归当前管理器管、或数据库存储引擎不支持事务。传播行为不符合预期，NOT_SUPPORTED 以非事务方式执行，REQUIRES_NEW 独立提交、外层回滚也撤不掉它已提交的数据，这些是配置语义和预期不同，不是 Spring 没工作。还有个容易漏的点：在 @PostConstruct 里依赖当前 Bean 的事务代理不可靠，此时代理可能还没准备好，需要启动时执行业务事务就在容器准备好后通过另一个 Bean 的代理调用。

2. Spring 的事务，使用 this 调用是否生效？

   准确说，被调用方法上的 @Transactional 不会因为 this 调用而生效，但它里面的数据库操作可能仍处在外层已有的事务中。比如 createOrder() 标了 @Transactional，内部 this.saveLog() 调用标了 REQUIRES_NEW 的 saveLog()。外部通过代理调用 createOrder 时外层事务已开启，this.saveLog() 直接调目标对象，REQUIRES_NEW 不生效；如果日志操作使用同一事务管理器管理的数据源，它仍然参与外层事务，不会独立提交。如果 createOrder 本身也没有事务，这次内部调用就不会因为 saveLog 上的注解自动开启事务。原因是声明式事务默认通过 AOP 代理实现，只有经过代理的调用才进事务拦截器。常见处理是把需要独立事务的方法拆到另一个 Service 通过注入的 Bean 调用，或者在一个方法里用 TransactionTemplate 明确控制事务边界。

3. Spring 声明式事务的实现原理是什么？

   核心是 AOP 代理加事务拦截器加事务管理器，@Transactional 只描述规则，真正控制提交回滚的是事务管理器。以 JDBC 本地事务为例：调用方通过代理调用事务方法，进入 TransactionInterceptor；拦截器读取传播行为、隔离级别、超时、回滚规则，交给 PlatformTransactionManager 获取事务；事务管理器按传播行为决定新建、加入还是挂起，新建 JDBC 事务时获取连接、关闭自动提交，并把资源绑定到当前线程；执行业务方法，JdbcTemplate、MyBatis-Spring 能拿到当前事务绑定的连接，让相关 SQL 处于同一个事务；方法正常返回尝试提交，抛异常按回滚规则决定回滚还是提交，最后清理线程绑定资源并按需恢复被挂起的事务。所以要明确，Spring 负责协调事务，数据库负责执行底层提交回滚，一个普通本地事务不会自动把 HTTP 调用、Redis 写入和另一个数据库变成原子操作。

4. Spring 事务的传播行为有哪些？

   传播行为解决的是一个事务方法调用另一个事务方法时，后者怎么处理当前已存在的事务，它和数据库隔离级别不是一回事。七种：REQUIRED 有事务就加入、没有就新建，这是默认值；REQUIRES_NEW 挂起当前事务、新建独立事务；NESTED 在当前事务里建保存点形成嵌套事务，没有事务时像 REQUIRED 一样新建；SUPPORTS 有事务就加入、没有就以非事务方式执行；NOT_SUPPORTED 挂起当前事务、以非事务方式执行；MANDATORY 有事务就加入、没有就抛异常；NEVER 有事务就抛异常、没有就以非事务方式执行。重点一般在前三种，比如下单和扣库存要一起成败用 REQUIRED，希望业务回滚后失败日志还能保存，就通过另一个 Bean 的 REQUIRES_NEW 方法写日志。但传播行为生效仍然要经过事务代理，this 调用不会切换事务；是否支持挂起、保存点也要看具体事务管理器。

5. REQUIRES_NEW 和 NESTED 有什么区别？

   两者都能让内部操作在一定条件下单独回滚，但一个是独立物理事务，一个是同一物理事务里的保存点。REQUIRES_NEW 挂起外层事务开启新事务，内层一旦提交，外层之后回滚也不会撤销内层已提交的数据；JDBC 场景通常还要额外获取一条连接，要考虑连接池容量。NESTED 在外层事务里建保存点，内层失败可以回滚到保存点，外层捕获并处理异常后还能继续执行；但外层最终回滚时内层的修改也会一起回滚，内层成功不等于独立提交。比如批量导入某条记录失败后想跳过继续处理，可以在支持保存点的管理器下用 NESTED，外层最终失败整个批次仍可一起回滚。要注意不是所有事务管理器都支持 NESTED，它常见于支持 JDBC 保存点的场景，不能认为 JPA 或 JTA 也有完全相同行为。

6. 为什么捕获了异常，事务还是回滚了？

   通常和 rollback-only 标记有关，捕获异常不一定能把事务恢复成可提交状态。比如 A 的事务方法通过 B 的代理调用 B 的事务方法，两者都是默认 REQUIRED，实际共享同一个物理事务：B 抛运行时异常，异常经过 B 的事务拦截器，当前事务被标记为 rollback-only；A 捕获这个异常继续往下执行；A 正常返回后尝试提交，但事务已被标记为只能回滚，于是最终回滚，还可能抛 UnexpectedRollbackException。这和"在同一个事务方法内部捕获异常、异常从未经过事务拦截器"的情况不同。处理要看业务语义：内外操作必须一起成功就让错误向外传播；内层允许独立失败就通过另一个 Bean 使用独立事务，或在支持的场景用保存点，不能只靠加个 try-catch。

7. @Transactional 里的隔离级别和 readOnly 有什么作用？

   隔离级别控制并发事务之间能看到什么数据，Spring 支持 DEFAULT、READ_UNCOMMITTED、READ_COMMITTED、REPEATABLE_READ、SERIALIZABLE，默认 DEFAULT 即使用底层数据库的默认级别，Spring 不会统一把所有数据库改成某一种，具体能避免哪些并发问题要结合数据库实现。readOnly = true 是给事务管理器、JDBC 驱动或 ORM 的提示，用于可能的优化，它不等于所有情况下都禁止写入，是否强制只读取决于管理器和数据库配置，不能拿它当权限控制。还有一点，隔离级别等配置主要在新建事务时生效，REQUIRED 方法加入已有事务时通常沿用外层配置，不会因为内层写了另一个隔离级别就重新创建事务。

## 六、Bean 生命周期与容器

1. Bean 的生命周期说一下？

   我按实例化 → 属性填充 → 初始化 → 使用 → 销毁这条主线回答，再把扩展点放进去。实例化，根据 BeanDefinition 用构造器或工厂方法创建对象，此时只是对象有了，依赖还没注入。属性填充，解析依赖、设置属性，@Autowired 等注入在相关后置处理器参与下完成。Aware 回调，实现了 BeanNameAware、BeanFactoryAware 的 Bean 会收到 Bean 名、BeanFactory 等信息，ApplicationContextAware 由相应后置处理器处理。初始化前处理，调用已注册的 BeanPostProcessor 的 postProcessBeforeInitialization()，@PostConstruct 通常也由这一阶段的处理器调用。初始化方法，先执行 InitializingBean.afterPropertiesSet()，再执行配置的 init-method 或 @Bean(initMethod)。初始化后处理，调用 postProcessAfterInitialization()，常见的 AOP 代理就在这里创建，最终交给调用方的可能已经是代理对象。使用 Bean，单例通常进入单例缓存后续复用。销毁，容器正常关闭时执行单例 Bean 的销毁回调，依次是 @PreDestroy、DisposableBean.destroy()、自定义 destroy-method。容易说错的地方：不是当前 Bean 必须实现 BeanPostProcessor 才会执行前后处理，那是容器里单独注册的一组处理器，负责处理其他符合条件的 Bean。同一个 Bean 配了多种初始化回调时顺序是 @PostConstruct → afterPropertiesSet() → 自定义初始化方法。prototype Bean 创建时也执行初始化流程，但容器不管理它后续的销毁。以上是常规流程，循环依赖可能提前暴露引用，实例化前的某些后置处理器也可能直接返回代理，看源码会遇到提前返回的分支。

2. Bean 是否单例？

   Spring Bean 默认是单例，但范围是"同一个容器中的同一个 Bean 定义"，不是整个 JVM 只有一个实例。同一个类注册成两个不同的 Bean 定义，容器可以创建两个实例；不同 ApplicationContext 里也可以各有自己的实例，这和私有化构造器加静态字段的单例写法不同。设成 prototype 后每次向容器请求都会创建新对象，这里的"请求"指获取 Bean，不是每个 HTTP 请求自动创建一个。还要区分单例和线程安全：单例只保证实例复用，不保证并发访问安全。Service、DAO 通常能用单例，是因为它们一般不把每个请求的可变数据存在成员变量里；不可变对象也适合共享，需要独立状态的对象才要考虑其他作用域。

3. Bean 的单例和非单例，生命周期是否一样？

   创建和初始化的主流程相同，主要区别是创建时机和销毁管理。单例由 Spring 管理完整生命周期；prototype 创建并初始化后交给调用方，容器就不再自动跟踪销毁。这里的"非单例"特指 prototype，request、session 等作用域有各自的清理机制。具体差异：创建时机上单例在容器启动时创建（或首次请求，取决于配置），prototype 每次请求都创建新实例；初始化流程上两者都完整执行到初始化完成；销毁时单例在容器关闭时触发 DisposableBean 或 destroy-method，prototype 容器不管、需要调用方自行释放资源；内存上单例常驻内存效率高但要注意线程安全，prototype 开销大需要手动管理资源释放；场景上单例适合无状态服务如 Service、DAO，prototype 适合每次获取都需要独立状态的临时对象。

4. Spring Bean 的作用域有哪些？

   作用域定义了 Bean 的生命周期和可见性，决定容器如何创建、销毁实例，以及能否被多个用户共享。主要几种：Singleton 单例，默认作用域，同一个容器中的同一个 Bean 定义只创建一个共享实例；Prototype 原型，每次请求创建新实例，适用于需要独立状态的临时对象，不等同于每个 HTTP 请求一个实例；Request 请求，每个 HTTP 请求创建一个实例，仅 Web 应用有效；Session 会话，每个用户会话共享一个实例，仅 Web 应用有效；Application，当前 ServletContext 内只有一个实例，仅 Web 应用有效；WebSocket，每个 WebSocket 会话一个实例；Custom 自定义作用域，实现 Scope 接口自己定义。XML 里用 `<bean>` 的 scope 属性指定，Boot 或 Java 配置里用 @Scope 注解，比如 @Bean 加 @Scope("prototype")。

5. Spring 单例 Bean 是线程安全的吗？

   不一定，Spring 不会因为 Bean 是单例就自动给方法加锁。比如 Service 里有个成员变量 currentUserId，handle() 方法先给它赋值再使用，多个请求共享同一个 Service，线程 A 刚写入用户 1，线程 B 就可能改成用户 2，后续业务读到错误的用户信息。处理思路：请求数据放方法参数或局部变量里，避免存在单例 Bean 的可变成员变量中；确实需要共享状态时用合适的锁、原子类或并发容器，而且要考虑整个操作是否需要原子性，不能只看某一个字段；状态属于一次请求或会话时可以用 request、session 作用域，但同一个 session 也可能被多个请求并发访问，不等于天然线程安全。ThreadLocal 能隔离线程数据，但线程池会复用线程，用完要清理，也不能当成所有并发问题的通用解法。

6. 单例 Bean 里注入 prototype Bean，每次使用都会创建新对象吗？

   直接注入不会。单例 Bean 通常只创建一次，依赖也在创建时解析一次，所以它会一直持有当时注入的那个 prototype 对象。想每次使用都拿新实例，可以注入 ObjectProvider，需要时再向容器获取，每次 getObject() 都会重新解析这个 prototype Bean；也可以考虑 @Lookup 或作用域代理，但要理解它们具体的获取时机。如果对象占用了外部资源，使用完仍然需要自己清理。

7. Spring 容器里存的是什么？

   不只是 Bean 对象，还包括 Bean 的定义信息以及创建管理 Bean 所需的基础设施。BeanDefinition 描述 Bean 怎么创建，比如类型、作用域、构造参数、属性值、初始化方法，可以理解为对象的"生产说明书"；Bean 实例是已创建的单例对象，保存在单例缓存中，对外提供的可能是原始对象也可能是 AOP 代理，prototype 不会像单例一样长期缓存；此外还有相关元数据和扩展组件，比如 Bean 名与别名、后置处理器、依赖关系，以及 ApplicationContext 提供的事件、环境配置等能力。所以容器启动不是先把所有对象放进一个 Map 就完事，而是先整理 BeanDefinition，再按作用域、依赖关系和加载时机创建对象。

8. BeanFactory 和 ApplicationContext 有什么区别？

   BeanFactory 是 IoC 容器的基础接口，ApplicationContext 在它基础上提供更完整的应用上下文能力。BeanFactory 主要解决 Bean 的创建、获取和依赖管理；ApplicationContext 还提供事件发布、国际化、资源访问、环境配置，并在刷新上下文时自动发现、注册和执行相关后置处理器。创建时机也常被问：普通 BeanFactory 的 Bean 通常按需创建，ApplicationContext 刷新时通常提前实例化非懒加载的单例 Bean，让依赖或配置错误尽早暴露，但这不代表启动时创建所有 Bean，懒加载单例和 prototype 仍有不同的创建时机。实际业务开发通常用 ApplicationContext，Spring Boot 启动时创建的也是对应类型的上下文。

9. BeanFactory 和 FactoryBean 有什么区别？

   名字很像但职责完全不同：BeanFactory 是管理 Bean 的容器接口，FactoryBean 是让某个 Bean 负责生产另一个对象的扩展接口。FactoryBean 有三个方法：getObject() 返回它生产的对象；getObjectType() 告诉容器生产对象的类型；isSingleton() 描述生产对象是否按单例处理。比如 MyBatis 与 Spring 整合时，MapperFactoryBean 就负责生产 Mapper 接口的代理对象。容器里有个名为 userMapper 的 FactoryBean，getBean("userMapper") 默认拿到它生产的对象，getBean("&userMapper") 才拿到 FactoryBean 本身。还要注意 FactoryBean 自身的作用域和它生产对象的单例语义是两个层面，不能因为 FactoryBean 是单例就认为它每次生产的对象也一定是单例。

10. 在 Bean 加载/销毁前后想实现某些逻辑，可以怎么做？

   有四种方式。XML 里用 `<bean>` 的 init-method 和 destroy-method 属性指定初始化后和销毁前调用的方法；Bean 实现 InitializingBean 和 DisposableBean 接口，分别实现 afterPropertiesSet 和 destroy；用 @PostConstruct 和 @PreDestroy 注解，Spring Boot 3.x 起是 jakarta.annotation 包，2.x 常用 javax.annotation；Java 配置里用 @Bean(initMethod = "init", destroyMethod = "destroy") 属性。这些都能在生命周期的关键点插入代码。

11. BeanFactoryPostProcessor 和 BeanPostProcessor 有什么区别？

   区别是处理对象和介入时机。BeanFactoryPostProcessor 处理的是 Bean 的定义信息，在普通业务 Bean 实例化前介入，可以修改 BeanDefinition 里的属性、作用域等，需要新增 Bean 定义可以用子接口 BeanDefinitionRegistryPostProcessor。BeanPostProcessor 处理的是已经创建出来的 Bean 实例，在初始化前后执行，可以检查、调整甚至替换对象，AOP 自动代理创建器就是典型应用。比如想把某个 Bean 改成 prototype 就改 BeanDefinition，想在对象外面加代理就用 BeanPostProcessor。另外 @Autowired 字段注入需要更早在属性填充阶段介入，用的是 InstantiationAwareBeanPostProcessor 等扩展能力，不能把所有后置处理都理解成只发生在初始化之后。面试可以记：前者修改"怎么创建对象"，后者处理"已经创建的对象"。

12. Spring 给我们提供了很多扩展点，有了解吗？

   常用的有几类。BeanFactoryPostProcessor 在容器实例化 Bean 之前修改 Bean 定义，常用于改属性或作用域；BeanPostProcessor 在 Bean 实例化、配置、初始化之后做额外处理，常用于代理 Bean、修改属性；PropertySource 定义不同的属性源，比如文件、数据库；ImportSelector 和 ImportBeanDefinitionRegistrar 按条件动态注册 Bean 定义，实现配置类模块化；Spring MVC 的 HandlerInterceptor 拦截请求，在前后和处理中执行逻辑；ControllerAdvice 全局处理控制器异常、数据绑定和校验；Spring Boot 自动配置，通过自定义自动配置类实现对框架和第三方库的配置；自定义注解，实现权限控制、日志记录等约定。

## 七、SpringMVC

1. MVC 分层介绍一下？

   MVC 是 Model-View-Controller，一种把业务逻辑、数据、界面显示分离的设计典范，把业务逻辑聚到一个部件里，改进界面和交互时不用重写业务逻辑。视图 View 是用户界面，直接和用户交互；模型 Model 是存取数据的对象或 POJO，也可以带逻辑，分两类：数据承载 Bean 如 User 类专门承载业务数据，业务处理 Bean 如 Service、Dao 专门处理用户提交的请求；控制器 Controller 把用户请求转发给相应 Model 处理，再按计算结果返回响应，使视图和模型分离。流程是：用户通过表单、超链接、AJAX 等向服务端发起请求；Controller 解析请求、找到相应 Model 处理；结果交回 Controller，控制器起承上启下作用；再根据结果找到要响应的 View，渲染后发送给客户端。

2. 了解 SpringMVC 的处理流程吗？

   核心是 DispatcherServlet 统一接收请求，再交给合适的处理器执行。普通同步请求的流程：请求进入 DispatcherServlet，如果配了 Filter 会先经过过滤器链；DispatcherServlet 调 HandlerMapping，按 URL、请求方法找到 Handler 和包含拦截器的 HandlerExecutionChain，注解式 Controller 里 Handler 通常是 HandlerMethod；选择能执行的 HandlerAdapter，比如处理注解式 Controller 的 RequestMappingHandlerAdapter；按序调用拦截器的 preHandle()，返回 false 就中止后续处理；HandlerAdapter 借助参数解析器、类型转换器、消息转换器准备参数并完成校验，再调用 Controller 方法；处理返回值，返回逻辑视图名或 ModelAndView 就准备模型和视图，用 @ResponseBody、@RestController 或返回 ResponseEntity 就通过消息转换器写入响应体；正常完成后执行 postHandle()，有视图就解析渲染，最后执行 afterCompletion()。中途抛异常会交给 HandlerExceptionResolver 体系，@ExceptionHandler 和 @ControllerAdvice 就在这里发挥作用。前后端分离要补一句：返回 JSON 的请求不再走视图解析和渲染，而且响应体可能在 HandlerAdapter 执行期间就已写出，不能指望在 postHandle() 里统一改 JSON，适合的扩展点是 ResponseBodyAdvice。

3. @Controller 和 @RestController 有什么区别？

   @RestController 相当于 @Controller 加类级别的 @ResponseBody，区别主要是返回值怎么处理。普通 @Controller 方法返回 String 时通常当成逻辑视图名，比如返回 "index" 再由视图解析器找页面；给方法加 @ResponseBody 就把返回值交给消息转换器写入响应体。@RestController 默认对类里所有请求处理方法应用响应体语义，返回对象时常见的是由 Jackson 序列化成 JSON，但它不意味着所有返回值一定是 JSON，返回字符串、字节数组等由适用的消息转换器处理，还要结合媒体类型配置。所以返回页面用 @Controller，前后端分离的接口用 @RestController；需要同时控制状态码、响应头和响应体可以返回 ResponseEntity。

4. @RequestParam、@PathVariable 和 @RequestBody 有什么区别？

   区别是参数从哪里来。@RequestParam 读查询参数或表单参数，比如 /users?page=1 里的 page，可指定默认值和是否必填；@PathVariable 读 URL 路径中的变量，比如 /users/{id} 里的 id；@RequestBody 读 HTTP 请求体，由 HttpMessageConverter 按 Content-Type 转成 Java 对象，常用来接收 JSON。比如修改用户，id 从路径来、request 从 JSON 请求体来。注意 @RequestBody 不是专门对应 POST，关键是请求体和消息转换规则；另外绑定成功不等于校验通过，还要结合 @Valid 或 @Validated 和字段上的约束注解，Boot 项目用 Bean Validation 通常还要引入 validation starter。

5. SpringMVC 怎么统一处理异常？

   一般用 @RestControllerAdvice 配合 @ExceptionHandler，把 Controller 请求处理链路中的异常转成统一响应。单个 Controller 也可以定义自己的 @ExceptionHandler 只处理自己的请求，需要统一处理多个 Controller 时再用 Advice。底层是 HandlerExceptionResolver 体系在处理，不是一定要给每个 Controller 加 AOP 切面。实际项目通常还会区分参数校验异常、业务异常和未知异常，返回统一错误码并记录必要的排查信息。还要注意边界：普通 Filter 在进入 DispatcherServlet 前抛的异常不会直接被 ControllerAdvice 捕获，独立线程里的异常也不会自动进入当前请求的异常处理链，要在对应位置处理。

6. HandlerMapping 和 HandlerAdapter 有了解吗？

   分工是：HandlerMapping 负责找谁来处理，HandlerAdapter 负责怎么调用它。HandlerMapping 根据请求信息匹配 Handler 并返回带拦截器的执行链，比如 RequestMappingHandlerMapping 解析 @RequestMapping、@GetMapping 等映射，把请求匹配到具体 Controller 方法。HandlerAdapter 判断自己是否支持当前 Handler，支持就按相应方式执行，比如 RequestMappingHandlerAdapter 调用注解式 Controller 方法并处理参数解析、数据绑定和返回值。为什么要拆成两个组件？因为 Handler 不一定同一种类型，除了注解方法，还可以是实现 Controller、HttpRequestHandler 等接口的对象，适配器把不同调用方式统一起来，DispatcherServlet 就不用写一大堆类型判断。链路是：DispatcherServlet → HandlerMapping 找到 Handler → 选择支持它的 HandlerAdapter → 执行 Handler → 处理返回值。注意 HandlerAdapter 不负责按 URL 找 Controller，也不是所有 Handler 执行后都返回 ModelAndView，响应体也可以在执行过程中直接写出。

## 八、SpringBoot

1. 为什么使用 SpringBoot？

   三点。简化开发，提供一系列开箱即用的组件和自动配置，简化配置和开发过程，开发者可以专注业务逻辑。快速启动，通过内嵌 Tomcat、Jetty 或 Undertow 快速启动应用，无需额外部署步骤。自动化配置，根据依赖关系和约定规则配置应用，减少配置复杂性，让开发者更容易实现最佳实践。

2. SpringBoot 比 Spring 好在哪里？

   自动化配置，通过约定优于配置的原则，很多常用配置自动完成，开发者专注业务。快速的项目启动器，引入不同 Starter 就能集成常用框架和库，比如数据库、消息队列、Web 开发，大幅提高开发效率。支持内嵌 Web 服务器，常见的 Servlet Web starter 默认用 Tomcat，也可以按版本和依赖换其他实现，应用可以打包成可执行 JAR 直接运行。

3. SpringBoot 用到哪些设计模式？

   Boot 建立在 Spring 之上，IoC 的工厂、AOP 的代理、容器事件的观察者都会出现。问 Boot 的特点就重点举启动和扩展相关的：工厂模式，ServletWebServerFactory 根据实现创建对应内嵌 Web 服务器，应用不需要负责服务器完整创建过程；策略模式，Tomcat、Jetty 等服务器工厂提供不同实现，上层通过统一接口使用，具体支持哪些取决于 Boot 版本和依赖；观察者模式，启动过程会发布准备环境、上下文刷新完成、应用就绪等事件，监听器在不同阶段执行逻辑；模板方法模式，底层 ApplicationContext 的 refresh() 固定容器刷新主流程，Web 上下文通过扩展相应步骤接入服务器创建。另外 starter 和条件化自动配置是 Boot 的重要机制，但不能因为它们常用就把它们当成某一种经典设计模式。

4. 怎么理解 SpringBoot 中的约定大于配置？

   这是 Boot 的核心设计理念，通过预设合理的默认行为和项目规范，大幅减少手动配置步骤，提升开发效率和项目标准化程度。三个层面：自动化配置，分析项目依赖和环境自动配置应用行为，比如引入 spring-boot-starter-web 就自动配置内嵌 Tomcat 和 Spring MVC，不用手写 XML；默认配置，Boot 为连接数据库、设置 Web 服务器、处理日志等提供大量默认值，比如默认日志配置让应用快速输出日志，无需配置级别、格式、位置；约定的项目结构，主应用类置于根包，控制器、服务、数据访问类分别放对应子包，团队成员更容易理解结构，新成员也能快速定位代码。

5. SpringBoot 的项目结构是怎么样的？

   按《阿里巴巴 Java 开发手册》的指导意见分层：开放接口层，可把 Service 接口封装成 RPC 接口或通过 Web 封装成 HTTP 接口、网关控制层；终端显示层，各端模板渲染和显示，主要是 velocity、JS、JSP 渲染和移动端展示；Web 层，主要是访问控制转发、基本参数校验、不复用的简单业务处理；Service 层，相对具体的业务逻辑服务层；Manager 层，通用业务处理层，有三个特征，一是封装第三方平台、预处理返回结果和转换异常来适配上层接口，二是沉淀 Service 层的通用能力如缓存方案、中间件通用处理，三是和 DAO 层交互、组合复用多个 DAO；DAO 层，和底层 MySQL、Oracle、Hbase、OceanBase 等交互；第三方服务，其它部门的 RPC 接口、基础平台、其他公司的 HTTP 接口；外部接口，外部数据存储服务提供的接口，多见于数据迁移场景。拿到新项目按这个思路看代码基本都能理顺。

6. SpringBoot 自动装配原理是什么？

   自动装配可以理解为：根据项目引入的依赖、配置属性和已存在的 Bean，自动补齐一套常用配置。比如引入 JDBC 依赖、配了连接信息又没自己定义 DataSource，Boot 就通过数据源自动配置创建对应 Bean；它不是把依赖包里所有类都扫进容器，而是按约定发现自动配置类再通过条件判断是否生效。看 @SpringBootApplication，最关键的是三个注解：@SpringBootConfiguration 标识配置类，底层基于 @Configuration；@ComponentScan 从启动类所在包及子包扫描 @Component、@Service 等；@EnableAutoConfiguration 开启自动配置，是重点。再看 @EnableAutoConfiguration，两个关键部分：@AutoConfigurationPackage 记录自动配置默认使用的基础包，供 JPA 实体扫描等参考，它本身不负责扫描 @Component 也不是开启 @MapperScan；@Import(AutoConfigurationImportSelector.class) 通过导入选择器获取候选配置类并参与筛选导入。AutoConfigurationImportSelector 实现了 DeferredImportSelector，让自动配置导入延后处理，便于结合用户配置判断。过程分四步：读取候选配置，从类路径的自动配置元数据文件获取配置类全限定名；去重和排除，处理 exclude、excludeName、spring.autoconfigure.exclude；筛选和排序，通过导入过滤器做部分条件筛选，再按 before、after 关系确定顺序；解析配置并注册 Bean，评估类和 @Bean 方法上的条件，满足才注册 Bean 定义，之后由容器创建对象。注册方式要分版本：2.6 及以前是 META-INF/spring.factories 里的 org.springframework.boot.autoconfigure.EnableAutoConfiguration 条目；2.7 新增并推荐 META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports 同时兼容旧方式；3.x 起使用 AutoConfiguration.imports，不再通过上述 spring.factories 条目注册自动配置类。imports 文件每行一个配置类名，不需要写键，里面列的是 DataSourceAutoConfiguration 这类自动配置类，不是 RedisTemplate 这种普通 Bean 类；spring.factories 仍可用于其他扩展点，不能说整个废弃。为什么自定义 Bean 后自动配置会退让？因为大量使用了条件注解：@ConditionalOnClass 类路径存在指定类才生效，@ConditionalOnMissingBean 容器没有符合条件的 Bean 才生效，@ConditionalOnProperty 属性满足要求才生效，@ConditionalOnWebApplication 当前是指定类型 Web 应用才生效。比如数据源自动配置发现用户已有 DataSource 就跳过默认创建，通常是按类型等条件决定退让，不是简单同名 Bean 后者覆盖前者。面试顺着这条链路答：启动注解开启自动配置 → 导入选择器读候选类 → 排除筛选排序 → 条件注解控制注册 → 容器创建 Bean。

7. 说几个启动器（starter）？

   spring-boot-starter-web，最常用，包含 Spring MVC 和 Tomcat 内嵌服务器，快速构建 Web 应用。spring-boot-starter-security，提供 Spring Security 基本配置，快速实现认证授权。mybatis-spring-boot-starter，MyBatis 团队提供，自动配置 SqlSessionFactory、MapperScannerConfigurer 等，快速开始 MyBatis 数据库操作。spring-boot-starter-data-jpa 或 spring-boot-starter-jdbc，用 JPA 就选 data-jpa，包含 Hibernate、Spring Data JPA、HikariCP 连接池，注意它不包含具体数据库驱动，连 MySQL 还要引 mysql-connector-j 并配连接信息；倾向直接用 JDBC 不通过 JPA 就用 starter-jdbc。spring-boot-starter-data-redis，集成 Redis，客户端自 Boot 2.0 起默认是 Lettuce，基于 Netty、线程安全且支持响应式，要换 Jedis 得排除 lettuce-core 再引 jedis，同样需要配连接详情。spring-boot-starter-test，包含 JUnit、Spring Test、AssertJ 等单元和集成测试库，便于 TDD。

8. 写过 SpringBoot starter 吗？

   自定义 starter 的核心是把依赖、配置属性和自动配置封装好，使用方引入依赖后就能按约定使用。我一般拆成两部分：autoconfigure 模块放自动配置和配置属性，starter 模块聚合依赖，功能小也可以合成一个模块。以 2.7 及之后的写法为例，五步。第一步定义功能类，比如 MyService 放在 com.example.starter 包下，不加 @Service，后面通过自动配置的 @Bean 创建，避免依赖使用方的包扫描。第二步定义配置属性，用 @ConfigurationProperties(prefix = "my") 声明 name、enabled 等字段。第三步写自动配置类，用 @AutoConfiguration、@EnableConfigurationProperties(MyProperties.class)，加上 @ConditionalOnProperty 让使用方能关闭功能，@Bean 方法上再加 @ConditionalOnMissingBean 让使用方能提供自己的实现；封装可选第三方库还可以用 @ConditionalOnClass 检查依赖是否存在。第四步注册自动配置，在 META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports 里写入自动配置类全限定名；要兼容 2.6 及以前则结合对应版本用 @Configuration 和 spring.factories，不能直接照搬 @AutoConfiguration。第五步聚合依赖并使用，starter 引入 autoconfigure 模块和功能依赖，发布到 Maven 仓库后使用方只引 starter 再配属性就行。starter 本身不需要主启动类，也不一定要引 spring-boot-starter-web，除非功能确实依赖 Web。实际开发还要验证三个关键场景：默认配置能创建 Bean、关闭功能时不创建 Bean、使用方提供自定义 Bean 时自动配置能退让，这几个场景可以用 ApplicationContextRunner 验证。

9. SpringBoot 启动流程大致是什么？

   入口通常是 SpringApplication.run()，但核心是准备环境、创建并刷新容器、最后执行启动后任务。分六步：准备 SpringApplication，确定应用类型，准备初始化器和监听器等基础组件；准备 Environment，处理命令行参数、读取配置数据、确定激活的 Profile；创建 ApplicationContext，按应用类型创建对应上下文，Servlet Web 应用使用支持 Web 服务器的上下文；准备并刷新容器，注册启动类等 Bean 定义，执行后置处理器，解析组件扫描和自动配置，实例化非懒加载单例；启动 Web 服务器，Web 应用在上下文刷新过程中创建和启动内嵌服务器，不是等所有启动后回调结束才开始；执行启动任务，刷新完成后发布相关事件，调用 ApplicationRunner、CommandLineRunner，最后发布应用就绪事件。ApplicationRunner 接收解析后的 ApplicationArguments，CommandLineRunner 接收原始字符串参数，多个 Runner 可以用 @Order 安排顺序。启动失败时按异常所在阶段排查：配置没读到、Bean 创建失败、自动配置条件没满足、端口占用，还是 Runner 执行失败。

10. 自动配置没有生效，怎么排查？

    先确认自动配置类有没有被发现，再确认哪个条件没满足。看依赖和版本，starter 是否真在类路径、相关第三方类是否存在、Boot 与 starter 版本是否兼容。看注册方式，自定义自动配置是否写进了对应版本支持的元数据文件，路径和包名对不对。看条件，配置属性是否满足、是否已有同类型 Bean 导致 @ConditionalOnMissingBean 退让、当前应用类型是否符合要求。看排除配置，是否在启动注解或 spring.autoconfigure.exclude 里排除了。看条件评估报告，启动时加 --debug 查看哪些配置匹配、哪些没匹配及原因，启用了 Actuator 也可以通过 conditions 端点查看。比如引了数据源 starter 但 Bean 没按预期创建，可能是缺驱动或连接信息，也可能是用户定义的 DataSource 让默认配置退让，要根据报告定位，不能看到"自动"两个字就认为任何依赖都会立即生效。

11. @Value 和 @ConfigurationProperties 有什么区别？

    @Value 更适合注入零散配置值，@ConfigurationProperties 更适合把一组配置绑定到对象里。只取一个开关就用 @Value("${feature.enabled:false}")；一个组件有地址、超时、重试次数等多项配置，就定义一个配置属性类按同一前缀统一绑定。@Value 使用简单，支持占位符和 SpEL 表达式，但字段散落在不同类里不方便管理；@ConfigurationProperties 支持结构化绑定、嵌套对象、集合和宽松绑定，可以结合 @Validated 做配置校验，也方便生成 IDE 提示，它不会像 @Value 那样对属性值求值 SpEL。配置属性类也需要注册到容器，可以用 @EnableConfigurationProperties 或 @ConfigurationPropertiesScan，不是写个注解就一定被加载。

12. SpringBoot 配置文件的优先级是怎样的？

   Boot 可以从多个来源读配置，同一个属性同时出现在多个来源时由优先级高的覆盖。以 2.4 之后的常见默认配置为例，从高到低可以这样记：命令行参数 → Java 系统属性 → 操作系统环境变量 → 应用配置文件中的值。配置文件这一层在默认加载规则下通常是：包外的 Profile 配置 → 包外的普通配置 → 包内的 Profile 配置 → 包内的普通配置，Profile 配置指 application-prod.yml 这类只有对应 Profile 激活时才参与加载的文件。比如包内 application.yml 设端口 8080，环境变量设 SERVER_PORT=8081，启动参数又写 --server.port=8082，最终通常用 8082。上面只列了常见来源，测试属性、SPRING_APPLICATION_JSON、配置导入等还有各自的优先级，配了自定义 location 或 import 时也要按实际加载顺序判断，不能把这条简化顺序当成所有场景的完整规则。

13. SpringBoot 里有哪些重要的注解？配置相关的注解是哪个？

    常用注解：@SpringBootApplication 标注主应用类、标识启动入口并启用自动配置和组件扫描；@Controller 标识控制器处理 HTTP 请求；@RestController 结合 @Controller 和 @ResponseBody 返回 RESTful 数据；@Service 标识服务类；@Repository 标识数据访问组件；@Component 通用组件；@Autowired 自动装配；@Value 注入配置属性值；@RequestMapping 映射请求路径到处理方法；@GetMapping、@PostMapping、@PutMapping、@DeleteMapping 简化对应请求方式。配置相关的重要注解是：@Configuration 指定配置类，通常和 @Bean 配合定义 Bean；@ConfigurationProperties 把指定前缀的一组配置绑定到 Java 对象；@EnableConfigurationProperties 注册指定配置属性类并启用绑定；@ConfigurationPropertiesScan 扫描并注册配置属性类。

14. SpringBoot 怎么开启事务？

    已经配好受支持的数据源和对应事务管理器时，通常在 Spring 管理的服务方法上加 @Transactional 就能用声明式事务，调用还需要经过代理对象。比如 UserServiceImpl 的 saveUser 方法加 @Transactional，调用时 Spring 自动开启事务，成功自动提交，抛 RuntimeException 或 Error 自动回滚。注意默认只对 RuntimeException 和 Error 回滚，受检异常如 IOException 默认不回滚，需要配 @Transactional(rollbackFor = Exception.class)。在有合适事务管理器且自动配置条件满足时，Boot 通常会自动启用事务管理，不用手动加 @EnableTransactionManagement；但只引 JDBC 依赖而没配可用数据源，并不保证事务可用。事务依赖通常通过 spring-boot-starter-jdbc 或 spring-boot-starter-data-jpa 引入，它们会带入 PlatformTransactionManager。

15. SpringBoot 怎么做到导入就可以直接使用的？

    主要依赖自动配置、起步依赖和条件注解。起步依赖是特殊的 Maven 或 Gradle 依赖，把项目所需的一系列依赖打包在一起，比如 spring-boot-starter-web 就包含 Spring Web MVC、Tomcat 等核心依赖，引一个 starter 就会自动下载管理关联依赖，避免手动加一大堆。自动配置会根据类路径依赖和开发者配置自动创建配置所需 Bean，由 @EnableAutoConfiguration 启用，触发查找自动配置元数据文件，2.7 以前是 spring.factories，2.7 及以后是 AutoConfiguration.imports，Spring Boot 3.0 已彻底移除对 spring.factories 自动配置条目的支持；元数据文件里定义的自动配置类会按当前依赖选择加载，比如有 starter-web 就加载 WebMvcAutoConfiguration 自动配置 DispatcherServlet、视图解析器等。开发者可以通过自定义配置覆盖默认行为，在配置文件里定义特定配置或提供自动配置所检查类型的 Bean，相关自动配置通常就通过条件判断退让，不是靠同名 Bean 自动覆盖。条件注解控制 Bean 的创建和加载，自动配置类里广泛用 @ConditionalOnClass、@ConditionalOnMissingBean 等，比如 @ConditionalOnClass({ Servlet.class, DispatcherServlet.class, WebMvcConfigurer.class }) 表示类路径存在这些类才满足条件，实际是否生效还要继续检查 Web 应用类型、是否存在 WebMvcConfigurationSupport 等其他条件。

16. SpringBoot 过滤器和拦截器说一下？

    两者都能在请求前后执行逻辑，区别在所在层次和能拿到的信息。过滤器属于 Servlet 规范、由 Servlet 容器调度，作用在目标 Servlet 前后，范围取决于 URL、Servlet 和 dispatcher type 等映射配置，核心方法是 doFilter()，常见能力是处理编码、包装请求响应、通用日志、安全过滤链。拦截器属于 Spring MVC、由 MVC 执行链调度，作用在匹配 Handler 后围绕处理器执行，范围取决于 HandlerMapping 和拦截器路径配置，核心方法是 preHandle()、postHandle()、afterCompletion()，能拿到 HandlerMethod 信息、处理方法相关的检查和统计。依赖注入方面，Boot 中作为 Spring Bean 注册时两者都能注入依赖。Filter 在 doFilter() 里通过 chain.doFilter() 交给后面的过滤器或 Servlet，前后执行逻辑，不继续调用也可以直接在 Filter 里结束请求。拦截器三个方法：preHandle() 在 Handler 执行前调用，返回 false 中止后续处理；postHandle() 在 HandlerAdapter 正常完成后调用，传统视图场景下处于视图渲染之前，处理器抛异常时通常不执行；afterCompletion() 在请求处理完成后做清理，通常对 preHandle() 已返回 true 的拦截器执行。同步请求可以记成：Filter 前置 → DispatcherServlet → Interceptor 前置 → Controller → 返回值处理 → Interceptor 后置 → 视图渲染 → Interceptor 完成回调 → Filter 后置，多个 Filter 或拦截器的后置逻辑按进入顺序反方向执行，异步请求还有额外分派流程。两个误区：Filter 不一定无法注入 Spring Bean，关键看它怎么创建和注册；拦截器也不只作用于 Controller，MVC 管理的静态资源 Handler 匹配规则时也可能被拦截。安全认证授权通常优先用 Spring Security 的过滤器链，能覆盖更完整的请求边界，拦截器更适合依赖 MVC Handler 信息的逻辑。

## 九、MyBatis

1. 与传统的 JDBC 相比，MyBatis 的优点？

   基于 SQL 语句编程，相当灵活，不影响应用或数据库的现有设计，SQL 写在 XML 里解除与程序代码的耦合、便于统一管理，还提供 XML 标签支持动态 SQL 并可重用。封装了参数设置、结果集映射和资源管理等重复代码，独立使用时仍要正确关闭 SqlSession，与 Spring 整合后通常由相关组件管理会话和连接。和各种数据库兼容性好，因为用 JDBC 连数据库，JDBC 支持的它都支持。能和 Spring 很好集成，开发效率高。提供映射标签支持对象与数据库的 ORM 字段映射，也提供对象关系映射标签支持关联对象维护。

2. MyBatis 觉得在哪方面做得比较好？

   在 SQL 灵活性、动态 SQL、结果集映射和 Spring 整合几个方面比较实用，尤其适合重视 SQL 可控性的项目。SQL 与代码解耦、灵活可控，允许直接编写优化 SQL，相比 Hibernate 这类全自动 ORM，开发者明确知道每条 SQL 的执行逻辑，便于性能调优。动态 SQL 强大，用 `<if>`、`<choose>`、`<foreach>` 等标签动态生成 SQL，避免 Java 里繁琐的字符串拼接。自动映射与自定义映射结合，自动把查询字段名和对象属性名按驼峰等方式匹配，复杂关联用 resultMap 配 association、collection。插件扩展机制，可拦截 SQL 执行过程实现分页、性能监控、SQL 改写等通用逻辑，用 @Intercepts 配 @Signature 声明拦截点和参数。与 Spring 生态无缝集成，通过 @MapperScan 快速扫描 Mapper 接口，结合 Spring 事务管理，配置简洁高效。

3. 还记得 JDBC 连接数据库的步骤吗？

   主要是获取连接 → 创建语句 → 设置参数 → 执行 SQL → 处理结果 → 释放资源。准备驱动，引入数据库 JDBC 驱动，JDBC 4.0 起驱动通常通过 SPI 自动加载，一般不用手动 Class.forName()。获取连接，示例可以用 DriverManager，实际项目一般通过 DataSource 和连接池。创建语句并设参数，有外部参数时优先用 PreparedStatement，通过占位符传数据，不要把用户输入拼进 SQL。执行 SQL，查询用 executeQuery()，更新通常用 executeUpdate()。处理结果，通过 ResultSet 遍历读取字段。释放资源，用 try-with-resources，异常时也能关闭 ResultSet、Statement、Connection。需要手动管理事务还要关闭自动提交，成功 commit、失败 rollback；通过连接池获取的连接调用 close() 通常是归还连接池，在 Spring 管理的事务中则应通过数据访问组件配合管理连接。

4. 如果项目中要用到原生的 MyBatis 去查询，该怎样写？

   先区分在 Boot 里用 MyBatis 和脱离 Spring 独立使用，获取 Mapper 和管理 SqlSession 的方式不同。Boot 项目四步：引入与项目版本兼容的 mybatis-spring-boot-starter、数据库驱动并配置数据源；创建实体类和 Mapper 接口，用 @Mapper 或启动配置中的 @MapperScan 注册；编写 XML 映射，namespace 对应 Mapper 接口全限定名，SQL 的 id 对应接口方法名；配置 Mapper XML 位置，在 Service 里注入 Mapper 调用，比如 `mybatis.mapper-locations: classpath*:mapper/*.xml`。完全不用 Spring 时，要根据 mybatis-config.xml 创建 SqlSessionFactory，在配置里注册数据源和 Mapper，再自己打开和关闭 SqlSession：用 Resources 读配置、SqlSessionFactoryBuilder 构建工厂、openSession 拿会话、getMapper 拿代理。SqlSessionFactory 通常创建一次并复用，SqlSession 不能被多个线程共享；独立使用时写操作还要按配置提交或回滚，Spring 整合场景通常通过 Mapper 代理和 SqlSessionTemplate 管理会话并配合 Spring 事务。

5. MyBatis 里的 # 和 $ 的区别？

   核心区别是：#{} 是参数绑定，${} 是文本替换。#{} 在默认 PreparedStatement 执行方式下转成 ? 占位符，再通过 JDBC 设参数，用户输入作为数据传递，不会因为含 SQL 关键字就变成 SQL 结构，适合用户名、id、日期等参数值。${} 直接把内容拼进 SQL 文本，输入内容可能改变 SQL 结构，存在 SQL 注入风险，即使最终仍用 PreparedStatement 执行也消除不了文本拼接的风险。那为什么还需要 ${}？因为表名、列名、排序方向属于 SQL 结构，不能用 ? 当标识符，确实需要动态选择时应该用服务端白名单或 `<choose>` 限定允许的选项，不能直接把用户传入的字符串拼进去。面试可以补一句：#{} 不代表所有 SQL 一定更快，性能还和数据库、驱动、执行计划有关，它最关键的价值是正确参数绑定、降低注入风险。

6. MyBatis 的执行流程是什么？

   核心是把 Mapper 方法调用转成 SQL 执行，再把结果映射成 Java 对象。分两部分：启动时读取配置和 Mapper 映射，把每条 SQL 的信息封装成 MappedStatement 统一放在 Configuration 里，再创建 SqlSessionFactory；执行时获取 SqlSession 和 Mapper 代理，调接口方法时由 MapperProxy 找到对应 SQL 定义交给执行器执行。一次普通查询的主要链路是：Mapper 代理 → SqlSession → Executor → StatementHandler → JDBC → ResultSetHandler。其中 Executor 负责执行调度并处理一级缓存，开启二级缓存时还会有 CachingExecutor 包装；StatementHandler 准备和执行 JDBC Statement；ParameterHandler 设置 SQL 参数，结合 TypeHandler 完成 Java 类型和 JDBC 类型转换；ResultSetHandler 按 resultType 或 resultMap 把结果映射成对象。所以 Mapper 接口没有实现类也能调用，是因为运行时拿到的是代理对象，不是 MyBatis 替我们生成了一份手写风格的 DAO 源码。

7. MyBatis 的一级缓存和二级缓存有什么区别？

   一级缓存属于 SqlSession，二级缓存通常属于 Mapper 的 namespace。一级缓存默认启用，默认作用范围是 SESSION，同一个 SqlSession 内重复执行相同查询，缓存键一致且期间没触发清理就可以复用；缓存键不只是 SQL，还包括语句标识、参数、分页信息等；更新、提交、回滚、关闭会话或显式清理都会清本地缓存，也可以配 localCacheScope=STATEMENT 缩小复用范围。二级缓存需要满足全局缓存开关以及 Mapper 的 `<cache/>`、@CacheNamespace 等配置才参与查询，可以跨 SqlSession 共享，常见情况下在会话提交后发布缓存结果，具体关闭行为还取决于会话是否需要提交或回滚，回滚事务的修改不能当成已提交结果发布。开启后典型查询路径是二级缓存 → 一级缓存 → 数据库，前提是这条语句允许使用对应缓存。和 Spring 整合还要注意：Mapper 多次调用不一定用同一个底层 SqlSession，同一 Spring 事务内通常复用事务绑定的会话，没有事务时会话可能在每次调用后关闭，所以不能只看 Mapper 对象相同就认定一级缓存会命中。二级缓存也有一致性边界：一个 namespace 下的更新通常只清关联缓存，其他 Mapper 或外部程序改同一张表不一定让这里失效，所以更新频繁、跨表关联复杂的数据不能随意开启，更不能直接当成 Redis 那样的跨进程共享缓存。

8. resultType 和 resultMap 有什么区别？

   resultType 指定结果对象类型，resultMap 显式定义字段与对象属性之间的映射关系。字段名和属性名一致，或通过 SQL 别名、开启下划线转驼峰就能对应时，用 resultType 比较方便，MyBatis 会按自动映射规则填充属性，并不是不需要映射过程。字段与属性差异较大，或者涉及一对一、一对多等复杂结果时适合用 resultMap：id、result 定义普通字段映射，id 还能帮助识别结果对象；association 映射一个关联对象；collection 映射关联集合，比如用户的多个角色。同一个查询通常选 resultType 或 resultMap 其中一个，不同时配置。还要留意一对多的 N+1 问题：先查 N 个用户再给每个用户单独查角色，就可能执行 N+1 次查询，可以按场景用关联查询映射结果或批量查询后组装，开启延迟加载只会推迟查询时间，不一定减少最终查询次数。

9. MyBatisPlus 和 MyBatis 的区别？

   MyBatisPlus 是基于 MyBatis 的增强工具库，简化开发提高效率。主要区别：CRUD 操作，继承 BaseMapper 就有一系列内置快捷方法，不用写重复 SQL；代码生成器，可按数据库表结构自动生成实体类、Mapper 接口和 XML 映射；通用方法封装，封装了条件构造器、排序、分页查询等常用方法；分页插件，内置支持各种数据库的分页查询，传统 MyBatis 要自己实现分页逻辑；多租户支持，轻松实现多租户数据隔离；注解支持，引入更多注解配置实体与表映射关系，减少 XML 配置。

10. MyBatis 运用了哪些常见的设计模式？

    比较典型的有：建造者模式，SqlSessionFactoryBuilder、XMLConfigBuilder 负责解析配置逐步构建对象；工厂模式，SqlSessionFactory 创建 SqlSession，MapperProxyFactory 创建 Mapper 代理；代理模式，MapperProxy 用 JDK 动态代理把 Mapper 接口方法转成 SQL 执行，延迟加载也用代理；组合模式，动态 SQL 的 SqlNode 组合成树状结构统一处理 `<if>`、`<choose>` 等节点；模板方法模式，BaseExecutor 定义部分执行流程，由 SimpleExecutor、ReuseExecutor、BatchExecutor 提供具体行为；适配器模式，Log 接口把不同日志框架适配成统一调用方式；装饰器模式，缓存里 LruCache 等装饰器在基础缓存外增加淘汰能力，CachingExecutor 在执行器外增加二级缓存处理。还可以提 ErrorContext 通过 ThreadLocal 管理当前线程的错误上下文，不是整个 JVM 共享同一个可变对象。面试举两三个自己理解的例子比罗列一长串更容易应对追问。

## 十、SpringCloud

1. 了解 SpringCloud 吗，说一下它和 SpringBoot 的区别？

   Spring Boot 是构建单个 Spring 应用的框架，Spring Cloud 是构建分布式微服务架构的工具，提供服务注册与发现、负载均衡、断路器、网关等功能。两者结合使用：用 Boot 构建微服务应用，用 Cloud 实现微服务架构中的各种功能。一句话，Boot 解决"怎么快速写一个应用"，Cloud 解决"多个应用之间怎么协作治理"。

2. 用过哪些微服务组件？

   注册中心，微服务架构最核心的组件，对新节点注册与状态维护，解决"如何发现新节点以及检查各节点运行状态"的问题，节点启动时把服务名、IP、端口登记，注册中心定时检查状态，通常用心跳机制保证登记节点可用。负载均衡，解决"如何发现服务及负载均衡如何实现"，调用时先通过服务名在注册中心查询可用节点列表，这叫服务发现，调用方内置负载均衡器按策略选节点发起请求。服务通信，解决服务间消息通信，采用轻量级协议通常是 HTTP RESTful，因其过于灵活需要封装，Spring Cloud 提供 Feign 和 RestTemplate 屏蔽底层细节，开发者基于统一 SDK 开发。配置中心，解决"如何集中管理各节点配置文件"，把配置从服务中剥离集中转存，一般有 UI 界面方便大规模集群调整。集中式日志管理，解决"如何收集各节点日志并统一管理"，业内常见方案是 ELK、EFK。分布式链路追踪，解决"如何直观了解各节点间调用链路"，通过可视化链路图展现，帮助快速分析瓶颈和出错服务。服务保护，解决"如何对系统进行链路保护避免服务雪崩"，用组件实现高延迟服务的快速降级避免系统崩溃。SpringCloud Alibaba 的实现：Nacos 做注册中心，提供动态服务发现、服务配置、服务元数据及流量管理；早期复用 Ribbon 做客户端负载均衡，2020.x 起切换为 Spring Cloud LoadBalancer，并可结合 Nacos 的权重、健康状态元数据实现加权负载均衡，Nacos 主要承担注册和配置中心角色，真正负载均衡仍由客户端组件完成；服务通信用 Spring Cloud OpenFeign 或 Apache Dubbo 集成组件；网关用 Spring Cloud Gateway；配置中心用 Nacos 内置配置中心，可把配置存指定数据库；日志除 ELK 外可用阿里云日志服务；链路追踪较早用 Sleuth + Zipkin，Boot 3.x 及新一代生态主要转向 Micrometer Tracing，可结合 Zipkin 或 OpenTelemetry，不能把 Sleuth 当成所有版本通用组件；服务保护用 Sentinel 做流控、熔断降级。具体组合要匹配 Boot、Cloud、SpringCloud Alibaba 的版本。

3. 负载均衡有哪些算法？

   六种。简单轮询，按顺序分发，不关心服务器当前状态和性能负载；加权轮询，按性能设权重，按顺序和权重分发，让性能高的机器处理更多请求；简单随机，随机分发，请求越多各服务器接收越平均；加权随机，按性能设权重再按权重随机分发；一致性哈希，把节点和请求键映射到同一个哈希环上按位置选节点，通常配合虚拟节点改善分布，节点列表不变时同一个键落到同一个节点，节点增减时通常只迁移部分键，区别于直接按节点数量取模；最小活跃数，统计每台服务器当前正在处理的请求数，分发给活跃数最少的。

4. 如何实现一直均衡给一个用户？

   如果意思是让同一个用户的请求尽量落到同一台服务器，一般叫会话保持或粘性会话。可以用用户 id、会话标识等稳定的键做一致性哈希，把请求映射到哈希环上的节点，相比按服务器数量取模，一致性哈希在节点增减时通常只改变部分键的映射。但不能保证永远不变，节点下线、故障切换或路由规则变化时用户也可能被分配到其他节点；客户端 IP 也不一定适合作为用户标识，因为多个用户可能共享出口 IP，用户自己的网络还可能变化。如果这样做只是为了把登录状态保存在某一台机器上，我会优先考虑把服务做成无状态，用共享会话存储或令牌方案，减少对固定节点的依赖。

5. 介绍一下服务熔断？

   服务熔断是防止下游故障持续拖垮上游的保护机制，可以理解成调用链上的保险丝。比如 A 调 B、B 调 C，C 一直响应很慢，B 的线程、连接等资源可能被占满进而影响 A，这就是服务雪崩的一种形成过程。熔断器统计一段时间内的失败率、慢调用等指标，达到配置条件就暂时拒绝继续调用下游，让请求快速失败或进入降级逻辑。三个状态：关闭 Closed 正常放行并统计调用结果；打开 Open 达到阈值后拒绝请求，避免持续消耗资源；半开 Half-Open 等待一段时间后允许少量探测请求，成功达到条件就恢复关闭，失败则重新打开。这里的"关闭"是电路接通、"打开"是电路断开，别和中文"开服务、关服务"的习惯混淆。Spring Cloud 项目可以用 Spring Cloud CircuitBreaker 结合 Resilience4j，Spring Cloud Alibaba 常用 Sentinel；Hystrix 是较早的常见方案，已进入维护状态，不能把 Spring Cloud 的熔断等同于 Hystrix。最后，熔断通常不能替代超时控制和资源隔离，先设合理的调用超时，再结合隔离、熔断和降级，才能避免故障请求长时间占住上游资源。

6. 介绍一下服务降级？

   服务降级一般指服务器压力剧增时，根据实际业务和流量对一些服务和页面有策略地不处理或用简单方式处理，从而释放资源保证核心业务正常运行。服务器资源有限而请求无限，并发高峰期会影响整体性能，严重时宕机导致重要服务不可用，所以高峰期为了保证核心功能可用就要对某些服务降级，可以理解为舍小保大。它从整个系统的负荷情况出发，在内部暂时舍弃一些非核心接口和数据的请求，直接返回提前准备好的 fallback 错误处理信息，虽然提供的是有损服务，但保证了系统整体的稳定性和可用性。

7. 限流、熔断和降级有什么区别？

   三者解决的问题不同。限流控制进入系统的请求量，避免超过处理能力，比如接口每秒只允许一定数量请求，超出的直接拒绝或按策略等待；熔断发现下游服务异常时暂时切断调用，让请求快速失败，避免故障扩散；降级在资源紧张或依赖失败时提供简化结果，优先保住核心业务，比如推荐服务不可用就返回默认推荐列表。举个例子，商品详情页流量突然增大可以先限流，推荐服务持续超时可以熔断，页面仍然展示商品信息同时返回默认推荐这就是降级。熔断可以触发降级，但降级不一定由熔断触发，也可以因超时、异常、限流或主动关闭非核心功能而触发。对于扣款、下单这类关键操作，不能随便用降级结果伪装成操作成功。

8. 微服务调用失败后，能不能直接重试？

   不能无条件重试，要先判断失败原因、操作是否幂等、重试会不会放大故障。比如查询商品信息遇到短暂网络波动可以做有限重试；但创建订单、扣款等写操作，如果只是响应超时，请求可能已经在下游执行成功，再发一次就可能重复处理。要注意五点：设置超时和次数上限，重试要放在整体超时预算里，不能每次都无限等待；区分可重试的失败，短暂连接故障和参数错误处理方式不同，明确的业务校验失败通常不该重试；保证幂等，写操作可以用业务唯一键、幂等令牌，让重复请求不产生重复副作用；退避并增加随机间隔，避免大量请求同时立即重试进一步压垮下游；避免多层叠加重试，网关、调用客户端、业务代码如果都重试，最终请求次数可能成倍放大。所以重试是恢复短暂故障的手段，必须和超时、幂等、熔断一起设计，不能只因为"调用报错了"就认定下游没有执行。
