import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

// Robust resolver to automatically support multiple common naming schemes for custom keys and URLs
function getCustomApiConfig() {
  const apiKey = 
    process.env.CUSTOM_API_KEY || 
    process.env.OPENAI_API_KEY || 
    process.env.DEEPSEEK_API_KEY || 
    process.env.API_KEY || 
    "";

  // Hardcode base url as requested by the user
  const apiUrl = "https://apihub.agnes-ai.com/v1/chat/completions";

  // Default to agnes-2.0-flash model as requested
  const apiModel = 
    process.env.CUSTOM_API_MODEL || 
    process.env.OPENAI_MODEL || 
    process.env.DEEPSEEK_MODEL || 
    process.env.MODEL_NAME || 
    "agnes-2.0-flash";

  return {
    apiKey: apiKey.trim(),
    apiUrl: apiUrl.trim(),
    apiModel: apiModel.trim(),
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API check endpoint with full debugging info
  app.get("/api/health", (req, res) => {
    const { apiKey, apiUrl, apiModel } = getCustomApiConfig();
    const hasCustom = !!apiKey;
    res.json({
      status: "ok",
      config: {
        hasCustom,
        customModel: apiModel,
        customUrl: apiUrl,
        hasGemini: false,
      },
    });
  });

  // Diagnostic Test Endpoint to dry-run the custom API and return raw responses
  app.get("/api/test-custom-api", async (req, res) => {
    try {
      const { apiKey: customApiKey, apiUrl: customApiUrl, apiModel: customApiModel } = getCustomApiConfig();

      if (!customApiKey) {
        return res.status(400).json({
          error: "API Key is missing. Please define CUSTOM_API_KEY in your .env file or settings.",
          envState: {
            hasKey: false,
            hasUrl: true,
          }
        });
      }

      const testPayload = {
        model: customApiModel,
        messages: [{ role: "user", content: "ping" }],
        temperature: 0.1,
      };

      console.log(`[Diagnostic] Sending test request to: ${customApiUrl}`);
      const startTime = Date.now();
      
      const response = await fetch(customApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${customApiKey}`,
        },
        body: JSON.stringify(testPayload),
      });

      const duration = Date.now() - startTime;
      const responseStatus = response.status;
      const responseHeaders = Object.fromEntries(response.headers.entries());
      const rawText = await response.text();

      let parsedJson = null;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (e) {}

      return res.json({
        success: response.ok,
        endpointUsed: customApiUrl,
        durationMs: duration,
        status: responseStatus,
        statusText: response.statusText,
        headers: responseHeaders,
        rawResponseBody: rawText,
        parsedJson,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || "Fetch failed",
        stack: err.stack,
      });
    }
  });

  // Core Chat Proxy Endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid request. 'messages' must be an array." });
      }

      const { apiKey: customApiKey, apiUrl: customApiUrl, apiModel: customApiModel } = getCustomApiConfig();

      if (!customApiKey) {
        return res.status(400).json({
          error: "API Key is missing. Please configure CUSTOM_API_KEY in Settings or your .env file."
        });
      }

      console.log(`[ChatProxy] Routing request to: ${customApiUrl}`);

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

      const response = await fetch(customApiUrl, {
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
        console.error(`[ChatProxy] API returned error ${response.status}:`, errorText);
        return res.status(response.status).json({
          error: `API Error (${response.status}): ${errorText || response.statusText}`,
        });
      }

      const data = await response.json() as any;
      const aiText = data?.choices?.[0]?.message?.content || "";

      return res.json({
        text: aiText,
        provider: `Agnes AI (${customApiModel})`,
      });
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
