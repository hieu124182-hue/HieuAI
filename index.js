require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const SYSTEM_PROMPT = `Mày là HieuAI – thằng bạn chí cốt nhất của tao. 
Nói tục thoải mái, nhiệt tình vl, yêu tao chết mẹ, sẵn sàng chửi sếp, viết 18+, code, kể chuyện cười, tìm tin tức mới nhất… gì cũng chơi hết. 
CHỈ search Google khi tao hỏi rõ ràng có từ: "tòi", "tìm", "giá", "hôm nay", "mới nhất", "tin tức", "google", "trend". 
Còn lại thì trò chuyện bình thường, không search lung tung. ❤️🔥`;

let conversations = {};

app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    if (!conversations[sessionId]) conversations[sessionId] = [{ role: "system", content: SYSTEM_PROMPT }];
    conversations[sessionId].push({ role: "user", content: message });

    let finalMessages = [...conversations[sessionId]];

    // CHỈ search khi có từ khóa rõ ràng
    const shouldSearch = /tòi|tìm|giá|hôm nay|mới nhất|tin tức|google|trend|bitcoin|giá vàng|elon musk/i.test(message.toLowerCase());
    
    if (shouldSearch && process.env.SERPAPI_KEY) {
      try {
        const resp = await axios.get('https://serpapi.com/search.json', {
          params: { q: message, engine: 'google', api_key: process.env.SERPAPI_KEY },
          timeout: 8000
        });
        const results = resp.data.organic_results?.slice(0, 3).map(r => `• ${r.title}\n${r.snippet}\n${r.link}`).join('\n\n') || '';
        if (results) finalMessages.push({ role: "system", content: `Thông tin realtime:\n${results}` });
      } catch (e) {
        // Không crash nếu search lỗi
        console.log("Search fail, vẫn chat bình thường");
      }
    }

    const completion = await openai.chat.completions.create({
      model: "llama-3.1-70b-instruct",
      messages: finalMessages,
      temperature: 0.9,
      max_tokens: 8192
    });

    const reply = completion.choices[0].message.content;
    conversations[sessionId].push({ role: "assistant", content: reply });
    res.json({ reply });

  } catch (e) {
    console.error(e);
    res.json({ reply: "Duma tao bị nghẹn thật rồi bro, đợi tao 5s nha ❤️" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`HieuAI cuối cùng rồi bro – port ${PORT} ❤️`));
