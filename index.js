require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Google Search API
const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

async function googleSearch(query) {
  try {
    const url = "https://www.googleapis.com/customsearch/v1";

    const res = await axios.get(url, {
      params: {
        key: GOOGLE_KEY,
        cx: GOOGLE_CX,
        q: query
      }
    });

    if (!res.data.items || res.data.items.length === 0) {
      return "Không tìm thấy thông tin trên Google.";
    }

    // Lấy 3 kết quả đầu
    let snippets = res.data.items.slice(0, 3).map(item => {
      return `- ${item.title}: ${item.snippet}`;
    });

    return snippets.join("\n");
  } catch (err) {
    return "Lỗi khi truy vấn Google.";
  }
}

app.post("/chat", async (req, res) => {
  try {
    const userPrompt = req.body.prompt;

    // Google Search
    const googleData = await googleSearch(userPrompt);

    const fullPrompt = `
Người dùng hỏi: ${userPrompt}.
Dưới đây là dữ liệu Google real-time:
${googleData}

Hãy trả lời ngắn gọn, rõ ràng.
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: fullPrompt }
      ]
    });

    res.json({ reply: completion.choices[0].message.content });

  } catch (err) {
    console.log(err);
    res.json({ reply: "Lỗi hệ thống." });
  }
});

app.listen(3000, () => {
  console.log("Server đang chạy trên port 3000");
});
