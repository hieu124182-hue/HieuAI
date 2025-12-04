require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const OpenAI = require("openai");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Check env
if (!process.env.OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY is missing!");
  process.exit(1);
}

if (!process.env.GOOGLE_API_KEY) {
  console.error("ERROR: GOOGLE_API_KEY is missing!");
  process.exit(1);
}

if (!process.env.GOOGLE_CX) {
  console.error("ERROR: GOOGLE_CX is missing!");
  process.exit(1);
}

// ---- THÊM ROUTE GET / ĐỂ TRẢ VỀ index.html ----
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
// ------------------------------------------------

// OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Google search
async function googleSearch(query) {
  try {
    const url = "https://www.googleapis.com/customsearch/v1";

    const res = await axios.get(url, {
      params: {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_CX,
        q: query
      }
    });

    if (!res.data.items) return "Không có kết quả.";

    return res.data.items
      .slice(0, 3)
      .map(i => `- ${i.title}: ${i.snippet}`)
      .join("\n");

  } catch (err) {
    console.log(err);
    return "Google Search lỗi.";
  }
}

app.post("/chat", async (req, res) => {
  try {
    const userPrompt = req.body.prompt;

    const googleData = await googleSearch(userPrompt);

    const fullPrompt = `
Người dùng hỏi: ${userPrompt}.
Kết quả Google real-time:
${googleData}

Hãy trả lời tự nhiên, ngắn gọn.
    `;

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: fullPrompt }]
    });

    res.json({ reply: r.choices[0].message.content });

  } catch (err) {
    console.log(err);
    res.json({ reply: "Lỗi server." });
  }
});

// ---- SỬ DỤNG PORT CỦA RENDER ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server chạy tại port " + PORT);
});
