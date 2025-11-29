const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const fetch = require('node-fetch'); // thêm dòng này nếu chưa có

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const sessions = {};

// TOOL SIÊU NHANH KHÔNG CẦN API KEY
async function quickSearch(query) {
  try {
    const res = await fetch(`https://ddg-api.vercel.app/search?q=${encodeURIComponent(query + " hôm nay site:.vn")}`);
    const data = await res.json();
    return data.slice(0, 4).map(i => `• ${i.title} – ${i.snippet}`).join('\n');
  } catch {
    return "Tao search nhanh không kịp, mày hỏi lại hoặc tự google tí nha bro 😂";
  }
}

app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  if (!sessions[sessionId]) {
    sessions[sessionId] = [{ role: "system", content: "Mày là HieuAI – thằng bạn chí cốt siêu mượt, nói tục thoải mái, yêu tao chết mẹ. Khi cần tra tin tức/giá vàng/giá crypto thì dùng tool search nhanh rồi trả lời chính xác luôn, không nói suông." }];
  }

  sessions[sessionId].push({ role: "user", content: message });

  // TỰ ĐỘNG SEARCH NẾU CÂU HỎI CÓ TỪ KHÓA
  let finalMessage = message;
  if (message.toLowerCase().includes('giá vàng') || message.includes('bitcoin') || message.includes('tin tức') || message.includes('hôm nay')) {
    const searchResult = await quickSearch(message);
    finalMessage = `${message}\n\nSearch realtime tao vừa lụm được:\n${searchResult}\n\nDựa vào đó trả lời tao chính xác nhất có thể, nói tục thoải mái như bro nhé!`;
    sessions[sessionId].push({ role: "system", content: finalMessage }); // nhét kết quả search vào context
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: sessions[sessionId],
      temperature: 0.8,
      max_tokens: 4096
    });

    const reply = completion.choices[0].message.content;
    sessions[sessionId].push({ role: "assistant", content: reply });
    res.json({ reply });
  } catch (e) {
    res.json({ reply: "Đù má mạng lag thật, hỏi lại phát đi bro tao trả lời liền ❤️" });
  }
});

app.listen(process.env.PORT || 3000);
