import express from "express";
import type { Request, Response } from "express";
import { openAIService } from "../services/openaiService";

export function setupChatRoutes() {
    const router = express.Router();

    router.post("/chat", async (req: Request, res: Response) => {
        try {
            const { messages, systemPrompt } = req.body;

            if (!messages || !Array.isArray(messages)) {
                return res.status(400).json({ error: "Messages array is required" });
            }

            const chatMessages = messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content,
            }));

            // If a system prompt is provided, prepend it to the messages
            if (systemPrompt) {
                chatMessages.unshift({
                    role: "system",
                    content: systemPrompt
                });
            }

            // Using the existing openAIService which is configured with SiliconFlow (Gemini/DeepSeek)
            const completion = (await openAIService.createChatCompletion(chatMessages, "gemini")) as any;
            const content = completion.choices?.[0]?.message?.content ?? "No response from AI";

            res.json({ content });
        } catch (error) {
            console.error("Error in chat endpoint:", error);
            res.status(500).json({
                error: "Failed to process chat request",
                details: (error as Error).message,
            });
        }
    });

    return router;
}
