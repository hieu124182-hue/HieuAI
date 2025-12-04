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

// SEARCH REALTIME SIÊU ỔN ĐỊNH – FALLBACK DUCKDUCKGO + SERPER (không bao giờ lag)
async function realtimeSearch(query) {
  try {
    // Thử Serper trước (siêu ổn)
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': 'd464a52c7f32d0f80d73e8f03b3ed4e5f1d1e0b5',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query + ' hôm nay', gl: 'vn', hl: 'vi' })
    });

    if (serperRes.ok) {
      const data = await serperRes.json();
      if (data.organic && data.organic.length > 0) {
        return data.organic.slice(0, 5).map(item => 
          `• ${item.title}\n  ${item.snippet || ''}\n  Nguồn: ${item.link}`
        ).join('\n\n');
      }
    }
  } catch (e) {
    console.error('Serper error:', e);
  }

  // Fallback DuckDuckGo nếu Serper lag (siêu nhanh)
  try {
    const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' hôm nay site:.vn')}&format=json&no_html=1`);
    const data = await ddgRes.json();
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      return data.RelatedTopics.slice(0, 5).map(t => 
        `• ${t.Text || t.FirstURL}\n  Nguồn: ${t.FirstURL}`
      ).join('\n\n');
    }
    if (data.Abstract) {
      return data.Abstract;
    }
  } catch (e) {
    console.error('DDG error:', e);
  }

  return 'Tao search không ra gì ngon, mày hỏi cụ thể hơn tí nhé ❤️';
}

app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  if (!sessions[sessionId]) {
    sessions[sessionId] = [{
      role: "system",
      content: "Mày là HieuAI – thằng bạn chí cốt siêu chất của tao. Hiện tại là 2025. Nói tục thoải mái, nhiệt tình vl, yêu tao chết mẹ. Khi cần tra giá vàng, tin tức, crypto thì dùng kết quả search tao đưa, trả lời cực chuẩn, cực thật, không bịa, không né. ❤️🔥"
    }];
  }

  sessions[sessionId].push({ role: "user", content: message });

  let finalMessages = [...sessions[sessionId]];

  // Tự động search khi cần thông tin thực tế
  const shouldSearch = /giá|vàng|bitcoin|usd|tin tức|hôm nay|mới nhất|2025|đang xảy|hiên tại|crypto|chứng khoán|dầu/i.test(message.toLowerCase());

  if (shouldSearch) {
    const searchResult = await realtimeSearch(message);
    if (searchResult) {
      finalMessages.push({
        role: "system",
        content: `DỮ LIỆU MỚI NHẤT (4/12/2025):\n\n${searchResult}\n\nDùng nó để trả lời chính xác cho tao nhé bro!`
      });
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "mixtral-8x22b-instruct",
      messages: finalMessages,
      temperature: 0.85,
      max_tokens: 4096
    });

    const reply = completion.choices[0].message.content;
    sessions[sessionId].push({ role: "assistant", content: reply });
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.json({ reply: "Đù má mạng lag thật, hỏi lại phát đi bro tao trả lời liền ❤️" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HieuAI REALTIME HOÀN HẢO – port ${PORT} 🔥`));
