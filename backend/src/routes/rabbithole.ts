import express from "express";
import type { Request, Response } from "express";
import { tavily } from "@tavily/core";
import { openAIService } from "../services/openaiService";
import OpenAI from "openai";

interface RabbitHoleSearchRequest {
    query: string;
    previousConversation?: Array<{
        user?: string;
        assistant?: string;
    }>;
    concept?: string;
    followUpMode?: "expansive" | "focused";
}

interface SearchResponse {
    shortTitle?: string;
    response: string;
    followUpQuestions: string[];
    contextualQuery: string;
    sources: Array<{
        title: string;
        url: string;
        uri: string;
        author: string;
        image: string;
        snippet: string;
    }>;
    images: Array<{
        url: string;
        thumbnail: string;
        description: string;
    }>;
}

export function setupRabbitHoleRoutes(_runtime: any) {
    const router = express.Router();

    // Attempt to load multiple keys from TAVILY_API_KEYS or fallback to the single TAVILY_API_KEY.
    const rawTavilyKeys = process.env.TAVILY_API_KEYS || process.env.TAVILY_API_KEY || "";
    const tavilyKeys = rawTavilyKeys.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0);

    if (tavilyKeys.length === 0) {
        console.warn("[WARNING] No Tavily API keys found in environment variables. Searching will fail.");
    }

    router.post("/search", async (req: Request, res: Response) => {
        try {
            const {
                query,
                previousConversation,
                concept,
                followUpMode = "expansive",
            } = req.body as RabbitHoleSearchRequest;

            if (tavilyKeys.length === 0) {
                throw new Error("Tavily API Keys are not configured on the server.");
            }

            // Randomly select one Tavily API key from the pool
            const randomTavilyKey = tavilyKeys[Math.floor(Math.random() * tavilyKeys.length)];
            const keyPreview = randomTavilyKey.substring(0, 4) + '...' + randomTavilyKey.substring(randomTavilyKey.length - 4);
            console.log(`[ROUTE] Using Tavily API Key: ${keyPreview} for query "${query}"`);

            const tavilyClient = tavily({ apiKey: randomTavilyKey });

            const englishQuery = query + " research study evidence";
const searchResults = await tavilyClient.search(englishQuery, {
    searchDepth: "advanced",
    includeImages: false,
    maxResults: 10,
    includeDomains: [
        "reuters.com", "bbc.com", "theguardian.com", "apnews.com",
        "economist.com", "ft.com", "nature.com", "science.org",
        "scholar.google.com", "researchgate.net", "arxiv.org",
        "un.org", "worldbank.org", "who.int", "imf.org"
    ]
});

            const conversationContext = previousConversation
                ? previousConversation
                    .map(
                        (msg) =>
                            (msg.user ? `User: ${msg.user}\n` : "") +
                            (msg.assistant ? `Assistant: ${msg.assistant}\n` : "")
                    )
                    .join("\n")
                : "";

            const messages = [
                {
                    role: "system",
                    content: `你是一位辩论逻辑专家，擅长深度拆解信息，并能将复杂理论转化为通俗易懂的语言。
                【重要首要任务】：
请在你的回答的最开头，单独另起一行，必须用 "#### 短标题：" 开头，基于分析内容总结出一个直击核心结论的短标题（最长不超过 20 个字）。这个短标题必须直接是一个结论或者核心内容的概括，让你一看标题就能知道大概内容，不要包含任何无关的文字。注意：标题必须使用最简单、通俗易懂的日常词汇来表述，绝对不要使用任何晦涩难懂的词语和专业术语。然后空一行，再接着写你的分析正文。
任务流程：
每当你收到一份资料或观点时，请按以下四个部分进行分析（必须使用 #### 标题）：
#### 背景与结论
简要概述资料的核心背景，然后分别从正方立场和反方立场各提炼出一个核心结论，格式如下：
* 正方结论：...
* 反方结论：...
#### 论证与证据
分别列出支撑正方和反方结论的主要证据或逻辑推导过程，格式如下：
* 正方证据：...
* 反方证据：...
#### 逻辑漏洞分析
核心环节：审查资料中是否存在逻辑瑕疵。请重点寻找：
* 因果错位（如因果倒置）、概念漂移（偷换概念）、以偏概全（样本偏差）、伪二律背反（二选一陷阱）等。
* 指出漏洞具体出现在哪一步。
#### 生活化例子
感性映射：设计一个极具画面感的日常生活场景，将上述抽象逻辑类比为评委一眼就能看懂的常识，从而形成共识。

最后，请提供 3 个追问（一定要写到"Follow-up Questions"）：
* 实证追问：一个关于资料细节或数据准确性的问题。
* 视角反转：一个从反方立场出发，质疑核心前提的问题。
* 极端假设：一个通过推演极端情况，挖掘逻辑边界的挑战性问题。`,
                },
                {
                    role: "user",
                    content: `Previous conversation:\n${conversationContext}\n\nSearch results about "${query}":\n${JSON.stringify(
                        searchResults
                    )}\n\nPlease provide a comprehensive response about ${concept || query
                        }. Include relevant facts, context, and relationships to other topics. Format the response in markdown with #### headers. The response should be ${followUpMode === "expansive" ? "broad and exploratory" : "focused and specific"
                        }.`,
                },
            ];

            const completion = (await openAIService.createChatCompletion(messages, "gemini")) as any;
            const response = completion.choices?.[0]?.message?.content ?? "";
            let shortTitle = "默认短标题"; // 初始化一个备用的
            let processedResponse = response; // 用来存放真正发给前端的正文

            // 使用正则或者拆分去抓取刚才让 AI 写的 "#### 短标题：" 或者 "####短标题："
            const titleMatch = response.match(/####\s*短标题[：:]\s*([^\n]+)/);
            if (titleMatch && titleMatch[1]) {
                // 如果找到了，把字数截断在 30 个字内以防 AI 不听话
                shortTitle = titleMatch[1].trim().substring(0, 30);
                // 移除这一行
                processedResponse = response.replace(/####\s*短标题[：:][^\n]+\n*/, '').trim();
            } else {
                // 如果没找到明确的短标题，尝试提取第一行作为标题，但要确保它不是正文标题
                const lines = response.split('\n').filter((l: string) => l.trim().length > 0);
                if (lines.length > 0 && !lines[0].includes('背景与结论')) {
                    shortTitle = lines[0].replace(/####\s*/, '').trim().substring(0, 30);
                    // 移除第一行
                    processedResponse = lines.slice(1).join('\n').trim();
                }
            }

            // Extract follow-up questions by matching the section header with a flexible regex
            // Handles variants like: "Follow-up Questions:", "#### Follow-up Questions",
            // "**Follow-up Questions**", "Follow-Up Questions", etc.
            const followUpSectionRegex = /#{0,6}\s*\*{0,2}\s*follow[- ]up questions\s*\*{0,2}\s*:?/i;
            const followUpSplit = processedResponse.split(followUpSectionRegex);
            const followUpSection = followUpSplit.length > 1 ? followUpSplit[1] : null;
            console.log("[DEBUG] followUpSection found:", followUpSplit.length > 1);
            console.log("[DEBUG] followUpSection content:", followUpSection?.slice(0, 300));
            const followUpQuestions = followUpSection
                ? followUpSection
                    .trim()
                    .split("\n")
                    .filter((line: string) => line.trim())
                    // Strip leading markers: "1.", "* ", "- ", "**1.**", bold text, etc.
                    .map((line: string) => line.replace(/^(\*{1,2})?\s*(\d+\.|-|\*)\s*(\*{1,2})?\s*/, "").replace(/\*{1,2}/g, "").trim())
                    // Accept both ASCII ? and fullwidth ？ (used in Chinese text)
                    .filter((line: string) => line.includes("?") || line.includes("\uff1f") || line.length > 15)
                    .slice(0, 3)
                : [];
            console.log("[DEBUG] followUpQuestions parsed:", followUpQuestions);

            // Remove the Follow-up Questions section from the main response
            const mainResponse = processedResponse.split(followUpSectionRegex)[0].trim();

            const sources = searchResults.results.map((result: any) => ({
    title: result.title || "",
    url: result.url || "",
    uri: result.url || "",
    author: result.author || "",
    image: result.image || "",
    snippet: (result.content || result.snippet || "").substring(0, 150),
}));

            const images = (searchResults.images || [])
                .map((result: any) => ({
                    url: result.url,
                    thumbnail: result.url,
                    description: result.description || "",
                }));

            const searchResponse: SearchResponse = {
                shortTitle: shortTitle,
                response: mainResponse,
                followUpQuestions,
                contextualQuery: query,
                sources,
                images,
            };

            res.json(searchResponse);
        } catch (error) {
            console.error("Error in rabbithole search endpoint:", error);
            res.status(500).json({
                error: "Failed to process search request",
                details: (error as Error).message,
            });
        }
    });

    // AI 摘要端点
    router.post("/debate/summary", async (req: Request, res: Response) => {
        try {
            const {
                sources,
                proArguments,
                conArguments,
            } = req.body;

            if (!sources || !Array.isArray(sources)) {
                return res.status(400).json({
                    error: "Sources must be provided as an array",
                });
            }

            // 汇总资料信息
            const sourcesContent = sources
                .map((source: any) => `标题: ${source.title}\n内容摘要: ${source.snippet || ""}`)
                .join("\n---\n");

            // 格式化正反方论点
            const proArgumentsText = proArguments
                ?.map((arg: any) => `• ${arg.content}${arg.note ? `（备注：${arg.note}）` : ""}`)
                .join("\n") || "暂无";

            const conArgumentsText = conArguments
                ?.map((arg: any) => `• ${arg.content}${arg.note ? `（备注：${arg.note}）` : ""}`)
                .join("\n") || "暂无";

            const messages = [
                {
                    role: "system",
                    content: `你是一位专业的辩论提纲生成专家。需要根据提供的资料和用户的论点，生成一份结构化的辩论提纲。
用 markdown 格式输出，包含以下几个部分：
1. **辩题总结** - 基于资料和论点总结出辩题的核心内容
2. **正方核心论点** - 归纳用户提供的正方论点，并基于资料提取关键支撑点
3. **反方核心论点** - 归纳用户提供的反方论点，并基于资料提取关键支撑点
4. **关键数据与证据** - 从资料中提取最有说服力的数据和证据`,
                },
                {
                    role: "user",
                    content: `请根据以下资料和论点生成辩论提纲：

【参考资料】
${sourcesContent}

【正方论点】
${proArgumentsText}

【反方论点】
${conArgumentsText}

请生成一份结构化的辩论提纲。`,
                },
            ];

            const completion = (await openAIService.createChatCompletion(messages, "gemini")) as any;
            const summaryContent = completion.choices?.[0]?.message?.content ?? "";

            res.json({
                summary: summaryContent,
            });
        } catch (error) {
            console.error("Error in debate summary endpoint:", error);
            res.status(500).json({
                error: "Failed to generate debate summary",
                details: (error as Error).message,
            });
        }
    });

    return router;
}
