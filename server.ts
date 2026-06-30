import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Lazy initialization of the Gemini client to prevent crash on startup if GEMINI_API_KEY is not defined.
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not defined in the environment. Please configure your API Key in Settings > Secrets or the .env file."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API check endpoint
  app.get("/api/health", (req, res) => {
    const hasCustom = !!(process.env.CUSTOM_API_KEY && process.env.CUSTOM_API_URL);
    const hasGemini = !!process.env.GEMINI_API_KEY;
    res.json({
      status: "ok",
      config: {
        hasCustom,
        customModel: process.env.CUSTOM_API_MODEL || "none",
        hasGemini,
      },
    });
  });

  // Core Chat Proxy Endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid request. 'messages' must be an array." });
      }

      const customApiKey = process.env.CUSTOM_API_KEY;
      const customApiUrl = process.env.CUSTOM_API_URL;
      const customApiModel = process.env.CUSTOM_API_MODEL || "gpt-4o-mini";

      // If custom API is configured, proxy to it (e.g. OpenAI, DeepSeek, etc.)
      if (customApiKey && customApiUrl) {
        // Automatically handle cases where the user supplies a base URL instead of the full chat completions endpoint
        let resolvedApiUrl = customApiUrl.trim();
        if (!resolvedApiUrl.endsWith("/chat/completions")) {
          if (resolvedApiUrl.endsWith("/")) {
            resolvedApiUrl += "chat/completions";
          } else {
            resolvedApiUrl += "/chat/completions";
          }
        }

        console.log(`[ChatProxy] Routing request to custom API: ${resolvedApiUrl}`);

        const openaiMessages = [];
        if (systemInstruction) {
          openaiMessages.push({ role: "system", content: systemInstruction });
        }

        for (const msg of messages) {
          openaiMessages.push({
            role: msg.role === "model" ? "assistant" : msg.role,
            content: msg.content,
          });
        }

        const response = await fetch(resolvedApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${customApiKey}`,
          },
          body: JSON.stringify({
            model: customApiModel,
            messages: openaiMessages,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[ChatProxy] Custom API returned error ${response.status}:`, errorText);
          return res.status(response.status).json({
            error: `Custom API Error (${response.status}): ${errorText || response.statusText}`,
          });
        }

        const data = await response.json() as any;
        const aiText = data?.choices?.[0]?.message?.content || "";

        return res.json({
          text: aiText,
          provider: `Custom API (${customApiModel})`,
        });
      } else {
        // Default: Use standard Gemini API via @google/genai SDK
        console.log("[ChatProxy] Routing request to standard Gemini API (gemini-3.5-flash)");

        const geminiClient = getGeminiClient();

        // Convert messages to Gemini format: { role: 'user' | 'model', parts: [{ text: string }] }
        const contents = messages.map((msg) => ({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.content }],
        }));

        const response = await geminiClient.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction:
              systemInstruction ||
              "You are a helpful, professional, and friendly AI chatbot assistant. Provide clear and styled answers.",
            temperature: 0.7,
          },
        });

        const aiText = response.text || "";
        return res.json({
          text: aiText,
          provider: "Gemini 3.5 Flash",
        });
      }
    } catch (error: any) {
      console.error("[ChatProxy] Error in /api/chat endpoint:", error);
      return res.status(500).json({
        error: error.message || "An unexpected error occurred on the server.",
      });
    }
  });

  // Vite middleware for dev or Static asset serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://localhost:${PORT} under ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
