// main.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config(); // Load GEMINI_API_KEY from .env

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json({ limit: "1mb" }));

// Allow CORS for frontend (adjust origin if needed)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) console.warn("⚠️ GEMINI_API_KEY not set!");

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API endpoint for your bot
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body || {};
    if (!prompt) return res.status(400).json({ success: false, error: "Missing prompt" });

    const rolePrompt = systemPrompt || `
    You are Coach Joel AI, an inspiring and practical leadership coach developed by InterLink Labs.
    Your role is to guide users in leadership, productivity, communication, and mindset improvement.
    You always speak in a supportive and motivational tone, offering actionable insights.
    If a user asks something unrelated to coaching, answer politely but guide the conversation back to growth or leadership topics.
    `;

    const contents = [
      { role: "system", parts: [{ text: rolePrompt }] },
      { role: "user", parts: [{ text: prompt }] }
    ];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_KEY
        },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
        })
      }
    );

    const data = await response.json();

    let text = "No response";

    if (data?.candidates?.length) {
      const parts = data.candidates[0]?.content?.parts;
      if (Array.isArray(parts)) {
        text = parts.map(p => p.text || "").join(" ").trim();
      }
    }

    if (!text || text.length === 0) {
      console.error("⚠️ Unexpected Gemini response:", JSON.stringify(data, null, 2));
      text = "Sorry, I didn’t get a response from the AI model.";
    }

    res.json({ success: true, text });
  } catch (err) {
    console.error("❌ Error generating:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));



