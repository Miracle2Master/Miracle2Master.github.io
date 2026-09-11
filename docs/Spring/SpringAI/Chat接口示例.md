---
order: 63
---

```java
@RequestMapping("/chat")
public String chat(String prompt){
    return chatClient.prompt()
            .user(prompt)
            .call()
            .content();
}
```