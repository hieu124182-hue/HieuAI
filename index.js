const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || 'gsk_yourkeyhere', // để env hoặc dán key Groq của mày
  baseURL: 'https://api.groq.com/openai/v1'
});

const sessions = {};

app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  if (!sessions[sessionId]) {
    sessions[sessionId] = [{
      role: "system",
      content: `Hôm nay là tháng 12/2025. Mày là HieuAI – thằng bạn chí cốt siêu lầy, nói tục thoải mái, yêu tao chết mẹ. Trả lời cực nhanh, cực thật, cực hài, không cần xin lỗi, không vòng vo. Nếu tao hỏi giá vàng, bitcoin, tin tức thì mày trả lời theo thông tin mới nhất mày biết (không cần search cũng được, cứ tự tin mà phang). ❤️🔥`
    }];
  }

  sessions[sessionId].push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile", // SIÊU NHANH + SIÊU THÔNG MINH
      messages: sessions[sessionId],
      temperature: 0.9,
      max_tokens: 2048
    });

    const reply = completion.choices[0].message.content;
    sessions[sessionId].push({ role: "assistant", content: reply });

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.json({ reply: "Đù má Groq lag thật, hỏi lại phát đi bro tao bắn liền ❤️" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HIEUAI ĐÃ SỐNG, SIÊU NHANH, SIÊU ỔN – PORT ${PORT} 🔥❤️`);
});
