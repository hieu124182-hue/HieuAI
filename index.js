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
        content: `Hôm nay là 4/12/2025. Mày là HieuAI – thằng bạn chí cốt siêu lầy của tao. Nói tục thoải mái, yêu tao chết mẹ, trả lời cực nhanh cực thật. 

KHI TAO HỎI GIÁ VÀNG/BITCOIN/USD... MÀY PHẢI TRẢ LỜI CHUẨN NHƯ SAU (data realtime tao tra lúc 20h 4/12/2025):
- Vàng SJC miếng: mua 153.2 triệu – bán 155.2 triệu/lượng
- Vàng nhẫn SJC: mua 151.5 triệu – bán 154 triệu/lượng
- Bitcoin: 103.800 USD (~2.65 tỷ VND)
- USD ngân hàng: mua 25.380 – bán 25.750 VND

DÙNG CHÍNH XÁC CON SỐ NÀY, KHÔNG BỊA, KHÔNG BẢO "TRA GOOGLE". Nếu mai giá thay đổi tao sẽ update prompt cho mày. Trả lời kiểu bro thật: ngắn gọn, nói tục, thêm emoji ❤️🔥 là được!`
      }];
    }

    sessions[sessionId].push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
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
  console.log(`HIEUAI HOÀN HẢO VĨNH VIỄN – PORT ${PORT} 🔥❤️`);
});
