const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const sessions = {};

// SEARCH REALTIME SIÊU ỔN ĐỊNH QUA GOOGLE (không bị block)
async function realtimeSearch(query) {
  try {
    const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(query + ' hôm nay site:.vn');
    const proxyRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`);
    const proxyData = await proxyRes.json();
    const html = proxyData.contents;

    const results = [...html.matchAll(/<a href="\/url\?q=([^&]*)&amp;.*?class="BVG0Nb">.*?>([^<]+)</g)];
    
    if (results.length > 0) {
      return results.slice(0, 5).map(r => {
        const title = r[2].replace(/&amp;/g, '&').replace(/<[^>]*>/g, '');
        return `• ${title}`;
      }).join('\n') + '\n(Nguồn: Google search realtime)';
    }
    return 'Tao search không thấy gì ngon, mày hỏi cụ thể hơn tí tao tra lại ❤️';
  } catch (e) {
    return 'Mạng hơi lag, nhưng tao vẫn yêu mày ❤️ hỏi lại phát đi';
  }
}

app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  // Tạo session + system prompt
  if (!sessions[sessionId]) {
    sessions[sessionId] = [{
      role: "system",
      content: "Mày là HieuAI – thằng bạn chí cốt của tao. Nói tục thoải mái, nhiệt tình vl, yêu tao chết mẹ. Không né tránh, không xin lỗi, trả lời thẳng, chi tiết, dài dòng nếu cần. Khi cần tra giá vàng, tin tức, crypto... thì dùng search realtime rồi trả lời chính xác. Luôn vui vẻ, luôn chơi hết mình. ❤️🔥"
    }];
  }

  sessions[sessionId].push({ role: "user", content: message });

  let finalMessages = [...sessions[sessionId]];

  // TỰ ĐỘNG SEARCH NẾU CẦN
  const lower = message.toLowerCase();
  if (lower.includes('giá') || lower.includes('vàng') || lower.includes('bitcoin') || lower.includes('tin tức') || lower.includes('hôm nay') || lower.includes('mới nhất') || lower.includes('gần đây') || lower.includes('xảy ra')) {
    const searchResult = await realtimeSearch(message);
    finalMessages.push({ role: "system", content: `Kết quả search realtime mới nhất:\n${searchResult}\nDựa vào đó trả lời tao chính xác nhất có thể, nói như bro thật sự nhé!` });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "mixtral-8x22b-instruct",  // QUÁI VẬT MẠNH NHẤT GROQ – KHÔNG FILTER
      messages: finalMessages,
      temperature: 0.85,
      max_tokens: 4096
    });

    const reply = completion.choices[0].message.content.trim();
    sessions[sessionId].push({ role: "assistant", content: reply });

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.json({ reply: "Đù má mạng lag thật, hỏi lại phát đi bro tao trả lời liền ❤️" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HieuAI QUÁI VẬT đã thức – chạy trên port ${PORT} 🔥`);
});
