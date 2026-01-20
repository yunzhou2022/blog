---
category: AI
date: 26.1.20
---

# AI Agent开发

## 什么是AI Agent

AI Agent是指构建能够自主完成特定任务、具备一定推理和决策能力的人工智能代理程序。这类Agent通常结合大模型（如GPT）和外部工具（如搜索引擎、数据库、插件系统等），通过不断地感知环境、规划行动、执行任务，并根据反馈进行自我优化，从而智能迭代和完成复杂目标。

简单来说，就是让AI具备“自己思考、拆解步骤、主动执行和自我修正”的能力，而不仅仅是按要求返回答案。

典型应用场景包括流程自动化、数据分析、代码生成、内容创作、智能客服等。

## 开发一个简单的AI Agent示例

下面用 Node.js 实现一个最简版 AI Agent 命令行工具示例：它能读取用户输入，调用大模型（用 OpenAI API 伪模拟），自动调用搜索等外部工具，根据反馈迭代并输出结果。

### 示例代码（假设已安装 `node-fetch` 和 `readline-sync`，并有 OpenAI API Key）：

```js
const fetch = require('node-fetch');
const readline = require('readline-sync');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // 请提前设置 API Key

// 简易工具：网页搜索（这里用 duckduckgo 结果摘要 API 作为示意）
async function searchWeb(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  return data.AbstractText || '未找到直接答案，建议更换关键词。';
}

// Agent step: 调用大语言模型
async function callLLM(prompt, context = '') {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENAI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: context },
        { role: 'user', content: prompt }
      ],
      max_tokens: 512
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// Agent主循环
async function runAgent() {
  console.log("AI Agent 命令行 (输入 'exit' 退出)");
  while (true) {
    const input = readline.question('请输入任务/问题: ');
    if (input.trim() === 'exit') break;

    // 1. 理解用户需求
    const plan = await callLLM(
      `分解任务: ${input}。需要用到哪些工具？只返回工具和步骤，不要解释。可用工具: 搜索`,
      "你是一个自动化AI Agent。"
    );
    console.log('[规划]', plan);

    // 2. 如果需搜索则调用外部工具
    let toolResult = '';
    if (plan.includes('搜索')) {
      console.log('[工具] 正在搜索…');
      toolResult = await searchWeb(input);
      console.log('[搜索结果]', toolResult);
    }

    // 3. 再次调用大模型做最终决策
    const finalAnswer = await callLLM(
      `${input}\n工具结果: ${toolResult}\n 请根据上述工具结果直接输出答案。`,
      "你是一个多步推理AI助手。"
    );
    console.log('[AI Agent]', finalAnswer);
  }
}

runAgent();
```

> 该例核心思路：**感知用户问题→智能规划（任务拆解/选工具）→自主用工具→自我总结优化并输出**。可逐步对每个环节细化规则、支持更多类型的外部工具，实现更复杂的 Agent 能力。