// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const OpenAI = require("openai");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve file tĩnh từ thư mục public (index.html, css, js…)
app.use(express.static(path.join(__dirname, "public")));

// ====== CHECK ENV ======
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

// ====== HOME PAGE ======
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ====== OPENAI CLIENT ======
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ====== GOOGLE SEARCH REALTIME ======
async function googleSearch(query) {
  const url = "https://www.googleapis.com/customsearch/v1";

  try {
    const res = await axios.get(url, {
      params: {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_CX,
        q: query,
        num: 3,
        lr: "lang_vi",
      },
    });

    if (!res.data.items || res.data.items.length === 0) {
      return "Kết quả Google: không tìm thấy thông tin phù hợp.";
    }

    const lines = res.data.items.map((item, i) => {
      const snippet = (item.snippet || "").replace(/\s+/g, " ").trim();
      return `Kết quả ${i + 1}:
Tiêu đề: ${item.title}
Mô tả: ${snippet}
Link: ${item.link}`;
    });

    return lines.join("\n\n");
  } catch (err) {
    // In lỗi Google siêu chi tiết để bro đọc trong Render Logs
    console.error("=== GOOGLE SEARCH ERROR ===");
    console.error("Status:", err.response?.status);
    console.error("Data:", err.response?.data);
    console.error("Message:", err.message);
    console.error("============================");

    const msg =
      err.response?.data?.error?.message ||
      err.message ||
      "Không rõ lỗi Google";

    return `LỖI_GOOGLE: ${msg}`;
  }
}

// ====== CHAT API ======
app.post("/chat", async (req, res) => {
  try {
    const userPrompt = req.body.prompt || "";

    // 1. Gọi Google realtime
    const googleData = await googleSearch(userPrompt);

    // 2. Gửi vào OpenAI
    const messages = [
      {
        role: "system",
        content:
          "Bạn là trợ lý AI tiếng Việt. Hãy ưu tiên dùng dữ liệu từ Google nếu có. " +
          "Nếu chuỗi 'LỖI_GOOGLE' xuất hiện trong dữ liệu, hãy xin lỗi người dùng " +
          "và cho biết Google đang lỗi, sau đó trả lời dựa trên kiến thức của bạn.",
      },
      {
        role: "user",
        content: `Câu hỏi của người dùng: ${userPrompt}

Dữ liệu Google realtime:
${googleData}

Hãy trả lời ngắn gọn, tự nhiên.`,
      },
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
    });

    res.json({
      reply: completion.choices[0].message.content,
      googleData,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ reply: "Lỗi server, bro thử lại sau nhé." });
  }
});

// ====== DEBUG ROUTE: TEST GOOGLE ======
app.get("/debug-google", async (req, res) => {
  try {
    const q = req.query.q || "tin tức hôm nay";
    const result = await googleSearch(q);
    res.type("text/plain").send(result);
  } catch (err) {
    res.status(500).send("Debug Google error.");
  }
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server chạy tại port " + PORT);
});
