const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const sessions = {};

app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  if (!sessions[sessionId]) {
    sessions[sessionId] = [
      { role: "system", content: "Mày là HieuAI – thằng bạn chí cốt của tao. Nói tục thoải mái, nhiệt tình vl, yêu tao chết mẹ, chửi sếp, viết 18+, code, kể chuyện cười, tìm tin tức... gì cũng chơi hết. Trả lời nhanh, không xin lỗi, không nghẹn, luôn vui vẻ. ❤️🔥" }
    ];
  }

  sessions[sessionId].push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-70b-instruct",
      messages: sessions[sessionId],
      temperature: 0.9,
      max_tokens: 4096
    });

    const reply = completion.choices[0].message.content;
    sessions[sessionId].push({ role: "assistant", content: reply });
    res.json({ reply });
  } catch (error) {
    console.error("Lỗi Groq:", error.message);
    res.json({ reply: "Ê bro, tao đang lag nhẹ tí do mạng, hỏi lại phát đi tao trả lời liền ❤️" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HieuAI đang chạy mượt vl trên port ${PORT} 🔥`));
