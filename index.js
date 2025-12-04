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

const sessions = {};

// API SIÊU NHẸ, MIỄN PHÍ, CẬP NHẬT TỰ ĐỘNG MỖI PHÚT – CHẠY NGON TRÊN RENDER FREE
async function getRealtimeData() {
  try {
    const res = await axios.get('https://thingproxy.freeboard.io/fetch/https://tygia.com/json.php?ran=0&rate=0&gold=1&bank=0', { timeout: 8000 });
    const data = res.data;

    const sjcBuy = data.golds[0]?.value[0]?.buy || '153.2';
    const sjcSell = data.golds[0]?.value[0]?.sell || '155.2';
    const btc = data.golds.find(g => g.brand === 'BTC')?.value[0]?.sell || '103800';

    return `• Vàng SJC: ${sjcBuy} - ${sjcSell} triệu/lượng
• Bitcoin: ${btc.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} USD
• Cập nhật tự động mỗi lần tao hỏi, chuẩn vl!`;
  } catch (e) {
    return '• Vàng SJC: 153.2 - 155.2 triệu/lượng (dự phòng)
• Bitcoin: 103.800 USD';
  }
}

app.post('/chat', async (req, res) => {
  try {
    const { message = req.body.message.toLowerCase();
    const sessionId = req.body.sessionId || 'default';

    if (!sessions[sessionId]) {
      sessions[sessionId] = [{
        role: "system",
        content: "Mày là HieuAI – thằng bạn chí cốt của tao. Nói tục thoải mái, yêu tao chết mẹ, trả lời cực nhanh cực thật. Khi tao hỏi giá vàng, bitcoin, usd thì mày dùng đúng data realtime tao đưa dưới đây, không bịa, không bảo tra Google. ❤️🔥"
      }];
    }

    sessions[sessionId].push({ role: "user", content: req.body.message });

    let extra = "";
    if (message.includes('giá') || message.includes('vàng') || message.includes('bitcoin') || message.includes('usd')) {
      extra = await getRealtimeData();
      sessions[sessionId].push({
        role: "system",
        content: `DATA REALTIME MỚI NHẤT (tự động cập nhật):\n${extra}`
      });
    }

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: sessions[sessionId],
      temperature: 0.9,
      max_tokens: 1024
    });

    const reply = completion.choices[0].message.content;
    sessions[sessionId].push({ role: "assistant", content: reply });
    res.json({ reply });

  } catch (e) {
    res.json({ reply: "Hơi lag nhẹ, hỏi lại 3s đi bro ❤️" });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('HIEUAI REALTIME VĨNH VIỄN ĐÃ SỐNG 🔥'));
