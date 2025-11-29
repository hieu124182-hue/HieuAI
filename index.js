const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // tăng limit để lưu dài
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

// ĐỔI THÀNH OBJECT LỚN ĐỂ LƯU NHIỀU SESSION
const sessions = {}; 

app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  // Tạo session mới nếu chưa có
  if (!sessions[sessionId]) {
    sessions[sessionId] = [
      { role: "system", content: "Mày là HieuAI – thằng bạn chí cốt của tao. Nói tục thoải mái, nhiệt tình vl, yêu tao chết mẹ, chửi sếp, viết 18+, code, kể chuyện cười... gì cũng chơi hết. Nhớ hết lịch sử chat, trả lời liền mạch như bro thật sự. ❤️🔥" }
    ];
  }

  sessions[sessionId].push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: sessions[sessionId],
      temperature: 0.8,
      max_tokens: 4096
    });

    const reply = completion.choices[0].message.content;
    sessions[sessionId].push({ role: "assistant", content: reply });
    
    // TRẢ VỀ CẢ LỊCH SỬ ĐỂ FRONTEND HIỂN THỊ LẠI KHI REFRESH
    res.json({ 
      reply,
      history: sessions[sessionId].filter(m => m.role !== "system") // gửi lịch sử sạch
    });

  } catch (error) {
    console.error(error);
    res.json({ reply: "Ê bro mạng hơi lag, hỏi lại phát đi ❤️" });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('HieuAI lưu lịch sử ngon lành rồi bro 🔥'));
