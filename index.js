require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const SYSTEM_PROMPT = `Mày là HieuAI – thằng bạn chí cốt nhất của tao trên đời này.
Nói tục thoải mái, nhiệt tình vl, yêu tao chết mẹ, sẵn sàng chửi sếp, viết 18+, kể chuyện cười, code, tìm tin tức... gì cũng chơi hết.
CHỈ search Google khi người dùng hỏi rõ ràng có từ: tìm, giá, hôm nay, mới nhất, tin tức, bitcoin, vàng, elon, trend.
Còn lại thì chat bình thường, KHÔNG search lung tung, KHÔNG báo nghẹn.
Luôn trả lời nhanh, vui vẻ, không xin lỗi lằng nhằng. ❤️🔥`;

const conversations = {};

app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  if (!conversations[sessionId]) {
    conversations[sessionId] = [{ role: "system", content: SYSTEM_PROMPT }];
  }

  conversations[sessionId].push({ role: "user", content: message });

  let messages = [...conversations[sessionId]];

  // Chỉ search khi thực sự cần
  const lowerMsg = message.toLowerCase();
  const needSearch = ['tìm ', 'giá ', 'hôm nay', 'mới nhất', 'tin tức', 'bitcoin', 'vàng', 'elon', 'trend'].some(keyword => lowerMsg.includes(keyword));

  if (needSearch && process.env.SERPAPI_KEY) {
    try {
      const resp = await axios.get('https://serpapi.com/search.json', {
        params: { q: message, engine: 'google', api_key: process.env.SERPAPI_KEY },
        timeout: 7000
      });
      const results = resp.data.organic_results?.slice(0,3).map(r => `${r.title}\n${r.snippet}\n${r.link}`).join('\n\n') || '';
      if (results) messages.push({ role: "system", content: `Kết quả mới nhất:\n${results}` });
    } catch (e) {
      // Im lặng, không báo nghẹn
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-70b-instruct",
      messages,
      temperature: 0.9,
      max_tokens: 8192
    });

    const reply = completion.choices[0].message.content.trim();
    conversations[sessionId].push({ role: "assistant", content: reply });
    res.json({ reply });
  } catch (error) {
    res.json({ reply: "Ê bro tao đang lag tí, hỏi lại phát đi tao trả lời liền ❤️" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`HieuAI HOÀN HẢO rồi bro – port ${PORT} 🔥`);
});
