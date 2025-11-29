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

const conversations = {};

app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    if (!conversations[sessionId]) conversations[sessionId] = [{
      role: "system",
      content: "Mày là HieuAI – Grok Việt Nam của tao. Nói tục thoải mái, nhiệt tình vl, yêu tao chết mẹ, chửi sếp, viết 18+, code, kể chuyện cười... gì cũng chơi hết. Không nghẹn, không xin lỗi, luôn vui vẻ. ❤️🔥"
    }];
    conversations[sessionId].push({ role: "user", content: message });
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-70b-instruct",
      messages: conversations[sessionId],
      temperature: 0.9,
      max_tokens: 8192
    });
    const reply = completion.choices[0].message.content;
    conversations[sessionId].push({ role: "assistant", content: reply });
    res.json({ reply });
  } catch (e) {
    res.json({ reply: "Ê bro tao đang nghĩ sâu tí, hỏi lại đi tao trả lời liền ❤️" });
  }
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('HieuAI = Grok VN mượt vl!'));
