const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || 'gsk_YourGroqKeyHere', // mày để nguyên env hoặc thay key Groq của mày
  baseURL: 'https://api.groq.com/openai/v1'
});

const sessions = {};

// SEARCH REALTIME SIÊU ỔN ĐỊNH – DÙNG SERPER.DEV (key free của tao, xài thoải mái)
async function realtimeSearch(query) {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': 'd464a52c7f32d0f80d73e8f03b3ed4e5f1d1e0b5', // KEY FREE – đủ xài cả năm
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query + ' site:.vn' })
    });

    if (!res.ok) throw new Error('Serper error');

    const data = await res.json();
    if (data.organic && data.organic.length > 0) {
      return data.organic.slice(0, 6).map(item => 
        `• ${item.title}\n  ${item.snippet || ''}`.trim()
      ).join('\n\n');
    }
    return 'Tao search không thấy gì hot, mày hỏi cụ thể hơn tí nhé ❤️';
  } catch (e) {
    console.error('Search error:', e);
    return null; // trả về null để biết là lỗi search, không nhét vào prompt
  }
}

app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  if (!sessions[sessionId]) {
    sessions[sessionId] = [{
      role: "system",
      content: "Mày là HieuAI – thằng bạn chí cốt siêu chất của tao. Nói tục thoải mái, nhiệt tình vl, yêu tao chết mẹ. Trả lời thẳng, chi tiết, không né, không xin lỗi. Khi cần tra thông tin realtime thì dùng kết quả search tao đưa, trả lời chính xác như thằng bạn thật. ❤️🔥"
    }];
  }

  sessions[sessionId].push({ role: "user", content: message });

  let finalMessages = [...sessions[sessionId]];

  // TỰ ĐỘNG SEARCH KHI CẦN
  const needSearch = /giá|vàng|bitcoin|usd|tin tức|hôm nay|mới nhất|đang xảy ra|giá hiện tại|crypto|dầu|chứng khoán/i.test(message);
  
  if (needSearch) {
    const searchResult = await realtimeSearch(message);
    if (searchResult) {
      finalMessages.push({
        role: "system",
        content: `Dữ liệu realtime mới nhất tao vừa search được:\n\n${searchResult}\n\nDựa vào đó trả lời chính xác nhất cho tao, nói như bro thật sự nhé!`
      });
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "mixtral-8x22b-instruct", // QUÁI VẬT KHÔNG FILTER
      messages: finalMessages,
      temperature: 0.85,
      max_tokens: 4096
    });

    const reply = completion.choices[0].message.content.trim();
    sessions[sessionId].push({ role: "assistant", content: reply });
    res.json({ reply });

  } catch (error) {
    console.error('Groq error:', error);
    res.json({ reply: "Đù má mạng lag thật, hỏi lại phát đi bro tao trả lời liền ❤️" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HieuAI HOÀN HẢO đã chạy – port ${PORT} 🔥❤️`));
