const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

// GOOGLE CSE (không scrape, dùng API hợp lệ)
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

async function googleSearch(query) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) return null;

  try {
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}`;
    const res = await axios.get(url);
    return res.data.items?.slice(0, 3).map(i => `${i.title}: ${i.snippet}`).join("\n") || null;
  } catch (err) {
    return null;
  }
}

const sessions = new Map();

app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    // REAlTIME TIME
    const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    // Nếu user hỏi về giá hay tin tức → search
    let searchData = null;
    const needSearch = /(tin tức|news|giá|giá vàng|bitcoin|tìm|search)/i.test(message);
    if (needSearch) {
      searchData = await googleSearch(message);
    }

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, [
        {
          role: "system",
          content:
`Hệ thống realtime:
• Thời gian hiện tại: ${now}

DỮ LIỆU TĨNH:
• Vàng SJC: mua 153.2 – bán 155.2 triệu/lượng
• Vàng nhẫn 9999: 151.5 – 154 triệu/lượng
• Bitcoin: 103.800 USD
• USD: 25.380 – 25.750`
        }
      ]);
    }

    const history = sessions.get(sessionId);

    // Nhét realtime vào từng request
    history.push({
      role: "user",
      content:
`[THỜI GIAN REALTIME: ${now}]
[SEARCH DATA: ${searchData || "Không có hoặc không cần tìm kiếm"}]
User hỏi: ${message}`
    });

    // Gọi model
    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: history,
      temperature: 0.6,
      max_tokens: 800
    });

    const reply = completion.choices[0].message.content;
    history.push({ role: "assistant", content: reply });

    res.json({ reply });
  } catch (err) {
    res.json({ reply: "Server hơi nghẽn, thử lại 5s nha." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Đang chạy trên port ${PORT}`));
