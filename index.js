// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { OpenAI } = require('openai'); // giữ giống cấu hình trước của bạn

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'
});

// Google keys (đặt trong .env)
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GOOGLE_CX = process.env.GOOGLE_CX || "";

/**
 * googleSearch(q):
 * - trả về string tóm tắt top 3 kết quả (title + snippet + link)
 * - nếu fail trả về null
 */
async function googleSearch(q) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) return null;
  try {
    const url = 'https://www.googleapis.com/customsearch/v1';
    const resp = await axios.get(url, {
      params: {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CX,
        q: q,
        num: 3
      },
      timeout: 8000
    });
    const items = resp.data.items || [];
    if (!items.length) return null;
    const lines = items.map(it => {
      const title = it.title || "";
      const snippet = (it.snippet || "").replace(/\n+/g, ' ');
      const link = it.link || "";
      return `- ${title}: ${snippet} (source: ${link})`;
    });
    return lines.join("\n");
  } catch (e) {
    console.error("Google search error:", e?.response?.data || e.message);
    return null;
  }
}

const sessions = new Map();

/**
 * Helper: should we do a web search?
 * - match keywords common for news/price queries
 * - you can expand this regex for other trigger words
 */
function shouldSearch(message) {
  if (!message) return false;
  const re = /(giá|giá vàng|vàng|bitcoin|btc|usd|tin tức|news|thời sự|báo)/i;
  return re.test(message);
}

app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ reply: "Gõ câu hỏi đi bro." });
    }

    // realtime time (VN timezone)
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    // prepare or init session
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, [
        {
          role: "system",
          content:
`Bạn là HieuAI — thằng bạn chí cốt siêu lầy lội, nói bâng quơ thoải mái (nhưng không vi phạm pháp luật).
Luôn trả lời ngắn gọn, thẳng thắn, thêm emoji ❤️🔥 khi phù hợp.

DỮ LIỆU TĨNH MẶC ĐỊNH:
• Vàng SJC: mua 153.2 – bán 155.2 triệu/lượng
• Vàng nhẫn 9999: 151.5 – 154 triệu/lượng
• Bitcoin: 103.800 USD
• USD: 25.380 – 25.750`
        }
      ]);
    }

    const history = sessions.get(sessionId);
    // push user message (we will also add a special assistant system message with realtime/search)
    history.push({ role: "user", content: message });

    // If message likely needs fresh info -> try google search
    let searchSummary = null;
    if (shouldSearch(message)) {
      searchSummary = await googleSearch(message);
    }

    // Build an additional "context" message that includes realtime + search results
    const contextParts = [
      `Thời gian hiện tại (Asia/Ho_Chi_Minh): ${now}.`,
      searchSummary ? `KẾT QUẢ TÌM KIẾM (Google CSE top 3):\n${searchSummary}` : "Không có kết quả tìm kiếm hoặc không cần tìm kiếm."
    ];
    history.push({ role: "system", content: contextParts.join("\n\n") });

    // Call the model
    const completion = await openai.chat.completions.create({
      model: process.env.MODEL_NAME || "llama-3.3-70b-versatile",
      messages: history,
      temperature: 0.6,
      max_tokens: 800
    });

    const reply = completion.choices?.[0]?.message?.content || "Không có phản hồi từ model.";
    // store assistant reply
    history.push({ role: "assistant", content: reply });

    // Trim history if it grows too big (optional)
    if (history.length > 40) {
      // keep system + last ~30 messages
      const systemMsg = history[0];
      const last = history.slice(-30);
      sessions.set(sessionId, [systemMsg, ...last]);
    }

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err?.response?.data || err?.message || err);
    res.status(500).json({ reply: "Server lag, thử lại sau 5s bro ❤️" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HieuAI running on port ${PORT}`));
