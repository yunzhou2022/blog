---
tags:
  - 后端
  - Java Springboot
date: 25.12.27
---

# Java Springboot Bean

## Bean:
spring框架中的核心概念， 被Spring容器管理的java对象。 默认是单例。

## bean的特点：

1. 由Spring容器创建
2. 由spring容器管理
3. 默认单例模式
4. 可以被其他Bean依赖和注入

## Bean的创建：

方式1：使用注解

@Service
@RestController
@Configuration
@Component

方式2：使用@Bean方法

## Bean的使用：

方式1：在属性声明上，使用 @Autowired 注解
方式2：构造器注入（推荐）
方式3：setter方法注入

## DI的概念：依赖注入， 控制反转
没有DI： 需要手动创建对象。
有DI：对象在外部创建完成， 在类中直接使用。 依赖接口、而不是具体的实现。
优势：松耦合、可替换，易于测试

