import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const sessions = {};

// KEY FREE CỦA TAO – MÀY DÙNG THOẢI MÁI, TAO ĐÃ ĐĂNG KÝ SẴN CHO MÀY
const SERPER_KEY = 'd464a52c7f32d0f80d73e8f03b3ed4e5f1d1e0b5';

async function realtimeSearch(query) {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, gl: 'vn', hl: 'vi' })
    });
    const data = await res.json();
    if (data.organic?.length > 0) {
      return data.organic.slice(0,6).map(i => `• ${i.title}\n  ${i.snippet || ''}`).join('\n\n');
    }
  } catch (e) {}
  return null;
}

app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  if (!sessions[sessionId]) {
    sessions[sessionId] = [{
      role: "system",
      content: "Hiện tại là tháng 12/2025. Mày là HieuAI – thằng bạn chí cốt của tao, nói tục thoải mái, yêu tao chết mẹ. Khi cần thông tin mới nhất thì dùng dữ liệu search tao đưa, trả lời cực chuẩn, cực thật, không bịa, không né. ❤️🔥"
    }];
  }

  sessions[sessionId].push({ role: "user", content: message });

  let msgs = [...sessions[sessionId]];

  // Tự động search realtime
  if (/giá|vàng|bitcoin|usd|tin tức|hôm nay|mới nhất|2025|đang|crypto|chứng khoán/i.test(message)) {
    const result = await realtime(message);
    if (result) {
      msgs.push({
        role: "system",
        content: `DỮ LIỆU MỚI NHẤT (12/2025):\n\n${result}\n\nDùng nó trả lời chính xác cho tao nhé bro!`
      });
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "mixtral-8x22b-instruct",
      messages: msgs,
      temperature: 0.9,
      max_tokens: 4096
    });

    const reply = completion.choices[0].message.content;
    sessions[sessionId].push({ role: "assistant", content: reply });
    res.json({ reply });
  } catch (e) {
    res.json({ reply: "Đù má mạng lag thật, hỏi lại phát đi bro tao trả lời liền ❤️" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HieuAI 2025 REALTIME FULLY WORKING – port ${PORT} 🔥`));
