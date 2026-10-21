
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(helmet());
app.use(express.json({ limit: "10kb" }));

app.use("/chat", rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get("/", (req, res) => {
  res.json({ status: "online", app: "Mian Mithu AI" });
});

app.post("/chat", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Backend API key configure nahi hai."
      });
    }

    const message = req.body.message;

    if (typeof message !== "string" ||
        !message.trim() ||
        message.length > 4000) {
      return res.status(400).json({
        error: "Message khali hai ya bohat lamba hai."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: "Tum Mian Mithu AI ho, ek helpful personal AI assistant. User Roman Urdu mein baat kare to Roman Urdu mein jawab do. Jawab friendly, clear aur useful rakho."
            }]
          },
          contents: [{
            role: "user",
            parts: [{ text: message.trim() }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800
          }
        }),
        signal: AbortSignal.timeout(30000)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API status:", response.status);

      return res.status(502).json({
        error: "Gemini se jawab nahi mila. API key, model aur quota check karo."
      });
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return res.status(502).json({
        error: "AI ne khali jawab diya. Dobara try karo."
      });
    }

    res.json({ reply });

  } catch (error) {
    console.error("Chat request failed:", error.message);

    res.status(502).json({
      error: "Server se jawab nahi mila. Dobara try karo."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Mian Mithu AI backend running on port " + PORT);
});
