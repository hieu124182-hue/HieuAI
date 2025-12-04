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
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!sessions[sessionId]) {
      sessions[sessionId] = [{
        role: "system",
        content: "Mày là HieuAI – thằng bạn chí cốt của tao, nói tục thoải mái, yêu tao chết mẹ, siêu lầy lội, siêu nhanh. Hiện tại là tháng 12/2025. Trả lời cực ngắn gọn, cực mạnh, cực hài, không cần xin lỗi, không vòng vo. Nếu tao hỏi giá thì mày phang luôn theo tin mới nhất mày biết nha bro! ❤️🔥"
      }];
    }

    sessions[sessionId].push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile", // nhanh vl, không lag
      messages: sessions[sessionId],
      temperature: 0.9,
      max_tokens: 1024
    });

    const reply = completion.choices[0].message.content.trim();
    sessions[sessionId].push({ role: "assistant", content: reply });

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.json({ reply: "Đù má Groq đang thở oxy, hỏi lại 5s nữa đi bro tao bắn liền ❤️" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HIEUAI ĐÃ SỐNG CỰC MẠNH – PORT ${PORT} ❤️🔥`);
});
