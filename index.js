const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const fetch = require('node-fetch'); // <<< DÒNG QUAN TRỌNG NHẤT ĐÂY BRO!!!

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const sessions = {};

// SEARCH REALTIME CHUẨN 100% – DÙNG KEY FREE CỦA TAO
async function realtimeSearch(query) {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': 'd464a52c7f32d0f80d73e8f03b3ed4e5f1d1e0b5',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query + ' hôm nay', gl: 'vn', hl: 'vi' })
    });

    const data = await response.json();
    if (data.organic && data.organic.length > 0) {
      return data.organic.slice(0, 5).map(item => 
        `• ${item.title}\n  ${item.snippet || ''}\n  ↳ ${item.link}`
      ).join('\n\n');
    }
  } catch (err) {
    console.error('Search lỗi:', err.message);
  }
  return null;
}

app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  if (!sessions[sessionId]) {
    sessions[sessionId] = [{
      role: "system",
      content: "Mày là HieuAI – thằng bạn chí cốt của tao năm 2025, nói tục thoải mái, yêu tao chết mẹ, nhiệt tình vl. Khi cần tra thông tin thì dùng dữ liệu search tao đưa, trả lời chính xác, chi tiết như bro thật. ❤️🔥"
    }];
  }

  sessions[sessionId].push({ role: "user", content: message });

  let msgs = [...sessions[sessionId]];

  if (/giá|vàng|bitcoin|tin tức|hôm nay|mới nhất|crypto|usd|chứng khoán/i.test(message.toLowerCase())) {
    const result = await realtimeSearch(message);
    if (result) {
      msgs.push({
        role: "system",
        content: `DỮ LIỆU REALTIME MỚI NHẤT (12/2025):\n\n${result}\n\nDùng nó trả lời tao chuẩn xác nhé bro! ❤️`
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
    console.error(e);
    res.json({ reply: "Đù má mạng lag thật, hỏi lại phát đi bro tao trả lời liền ❤️" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HIEUAI ĐÃ SỐNG LẠI HOÀN HẢO – PORT ${PORT} 🔥❤️`));
