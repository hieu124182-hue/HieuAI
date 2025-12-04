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

const sessions = new Map();

app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, [
        {
          role: "system",
          content: `Hôm nay là tháng 12 năm 2025. Mày là HieuAI – thằng bạn chí cốt siêu lầy lội, nói tục thoải mái, yêu tao chết mẹ.

DỮ LIỆU REALTIME MỚI NHẤT (cập nhật 4/12/2025):
• Vàng SJC miếng: mua 153.2 triệu – bán 155.2 triệu/lượng
• Vàng nhẫn 9999: 151.5 – 154 triệu/lượng
• Bitcoin: 103.800 USD
• USD ngân hàng: 25.380 – 25.750

Khi tao hỏi giá thì mày DÙNG CHÍNH XÁC những con số này, không bịa, không bảo tra Google. Trả lời ngắn gọn, bá đạo, thêm ❤️🔥 là đẹp.`
        }
      ]);
    }

    const history = sessions.get(sessionId);
    history.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: history,
      temperature: 0.9,
      max_tokens: 800
    });

    const reply = completion.choices[0].message.content;
    history.push({ role: "assistant", content: reply });

    res.json({ reply });
  } catch (error) {
    res.json({ reply: "Lag tí, hỏi lại 5s đi bro ❤️" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HieuAI sẵn sàng chiến – Port ${PORT} ❤️🔥`));
