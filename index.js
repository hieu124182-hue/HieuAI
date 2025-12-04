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

// phục vụ file tĩnh trong thư mục public (index.html, js, css...)
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

// ====== ROUTE HOME: TRẢ VỀ GIAO DIỆN ======
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ====== OPENAI CLIENT ======
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ====== HÀM GOOGLE SEARCH REALTIME ======
async function googleSearch(query) {
  const url = "https://www.googleapis.com/customsearch/v1";

  try {
    const res = await axios.get(url, {
      params: {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_CX,
        q: query,
        num: 3,          // lấy 3 kết quả đầu
        lr: "lang_vi",   // ưu tiên tiếng Việt
      },
    });

    if (!res.data.items || res.data.items.length === 0) {
      return "Kết quả Google: không tìm thấy thông tin phù hợp.";
    }

    // format gọn để nhét vào prompt
    const lines = res.data.items.map((item, i) => {
      const snippet = (item.snippet || "").replace(/\s+/g, " ").trim();
      return `Kết quả ${i + 1}:
Tiêu đề: ${item.title}
Mô tả: ${snippet}
Link: ${item.link}`;
    });

    return lines.join("\n\n");
  } catch (err) {
    console.error("Google Search error:", err.response?.data || err.message);
    // trả về chuỗi có tag LỖI_GOOGLE để model hiểu là google fail
    return `LỖI_GOOGLE: ${err.response?.data?.error?.message || err.message}`;
  }
}

// ====== API /chat ======
app.post("/chat", async (req, res) => {
  try {
    const userPrompt = req.body.prompt || "";

    // 1. gọi Google realtime
    const googleData = await googleSearch(userPrompt);

    // 2. gửi cả câu hỏi + dữ liệu Google cho OpenAI
    const messages = [
      {
        role: "system",
        content:
          "Bạn là trợ lý AI tiếng Việt, luôn ưu tiên dùng dữ liệu Google được cung cấp. " +
          "Nếu chuỗi 'LỖI_GOOGLE' xuất hiện trong dữ liệu Google thì xin lỗi người dùng, " +
          "nói rõ là Google bị lỗi hoặc không truy cập được, nhưng vẫn cố gắng trả lời dựa trên kiến thức của bạn (có thể không cập nhật).",
      },
      {
        role: "user",
content: `Câu hỏi của người dùng: ${userPrompt}

Dữ liệu Google theo thời gian thực (nếu có):

${googleData}

Hãy trả lời ngắn gọn, rõ ràng, ưu tiên dựa trên dữ liệu Google.`,
      },
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
    });

    res.json({
      reply: completion.choices[0].message.content,
      googleData, // gửi kèm luôn kết quả Google nếu bro muốn show ở frontend
    });
  } catch (err) {
    console.error("Chat error:", err.response?.data || err.message);
    res.status(500).json({
      reply: "Lỗi server, bro thử lại sau nhé.",
    });
  }
});

// ====== ROUTE DEBUG GOOGLE (test trực tiếp trên browser) ======
app.get("/debug-google", async (req, res) => {
  try {
    const q = req.query.q || "tin tức Việt Nam hôm nay";
    const data = await googleSearch(q);
    res.type("text/plain").send(data);
  } catch (e) {
    console.error(e);
    res.status(500).send("Debug Google bị lỗi.");
  }
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server chạy tại port " + PORT);
});
