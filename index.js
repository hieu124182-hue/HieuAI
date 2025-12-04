// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const OpenAI = require("openai");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// serve giao diện + file tĩnh
app.use(express.static(path.join(__dirname, "public")));

// ====== CHECK ENV ======
if (!process.env.OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY is missing!");
  process.exit(1);
}
if (!process.env.GOOGLE_API_KEY) {
  console.error("ERROR: GOOGLE_API_KEY is missing!");
  process.exit(1);
}
if (!process.env.GOOGLE_CX) {
  console.error("ERROR: GOOGLE_CX is missing!");
  process.exit(1);
}

// home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ====== OPENAI CLIENT ======
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ====== GOOGLE SEARCH REALTIME (TRẢ VỀ OBJECT) ======
async function googleSearch(query) {
  const url = "https://www.googleapis.com/customsearch/v1";

  try {
    const res = await axios.get(url, {
      params: {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_CX,
        q: query,
        num: 3,
        lr: "lang_vi",
      },
    });

    if (!res.data.items || res.data.items.length === 0) {
      // gọi được Google nhưng không có kết quả phù hợp
      return {
        status: "empty",
        text: "Google đã được gọi thành công nhưng không tìm thấy kết quả phù hợp cho câu hỏi này.",
      };
    }

    const lines = res.data.items.map((item, i) => {
      const snippet = (item.snippet || "").replace(/\s+/g, " ").trim();
      return `Kết quả ${i + 1}:
Tiêu đề: ${item.title}
Mô tả: ${snippet}
Link: ${item.link}`;
    });

    return {
      status: "ok",
      text: lines.join("\n\n"),
    };
  } catch (err) {
    console.error("=== GOOGLE SEARCH ERROR ===");
    console.error("Status:", err.response?.status);
    console.error("Data:", err.response?.data);
    console.error("Message:", err.message);
    console.error("============================");

    const msg =
      err.response?.data?.error?.message ||
      err.message ||
      "Không rõ lỗi Google";

    // lỗi kỹ thuật thật sự
    return {
      status: "error",
      text: msg,
    };
  }
}

// ====== CHAT API ======
app.post("/chat", async (req, res) => {
  try {
    const userPrompt = req.body.prompt || req.body.message || "";

    const googleResult = await googleSearch(userPrompt);

    let systemContent =
      "Bạn là HieuAI. Bạn LUÔN cố gắng sử dụng dữ liệu Google nếu có.\n" +
      "- Nếu status = 'ok' thì phải ưu tiên dùng thông tin trong các kết quả Google, cố gắng trích số liệu, ngày tháng, chi tiết.\n" +
"- Nếu status = 'empty' thì nói rõ là Google không tìm thấy kết quả phù hợp, nhưng KHÔNG được nói Google bị lỗi, rồi trả lời dựa trên kiến thức của bạn (có thể không cập nhật).\n" +
      "- Nếu status = 'error' thì mới được nói rằng Google đang gặp lỗi kỹ thuật, sau đó trả lời dựa trên kiến thức của bạn.\n" +
      "Tuyệt đối KHÔNG nói Google lỗi nếu status khác 'error'.";

    let userContent = `Câu hỏi của người dùng: ${userPrompt}\n\n`;

    if (googleResult.status === "ok") {
      userContent +=
        "Status Google: ok\n" +
        "Dưới đây là các kết quả Google realtime, hãy dùng làm nguồn chính để trả lời:\n\n" +
        googleResult.text;
    } else if (googleResult.status === "empty") {
      userContent +=
        "Status Google: empty\n" +
        "Thông tin: Google đã được gọi thành công nhưng không tìm thấy kết quả phù hợp.\n" +
        "Hãy giải thích cho người dùng, sau đó trả lời dựa trên hiểu biết của bạn.";
    } else {
      // error
      userContent +=
        "Status Google: error\n" +
        "Thông báo lỗi kỹ thuật từ Google: " +
        googleResult.text +
        "\n" +
        "Hãy xin lỗi vì lỗi kỹ thuật này và trả lời dựa trên kiến thức sẵn có của bạn (không cần realtime).";
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
    });

    res.json({
      reply: completion.choices[0].message.content,
      googleStatus: googleResult.status, // cho frontend debug nếu thích
      googleText: googleResult.text,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ reply: "Lỗi server, bro thử lại sau nhé." });
  }
});

// ====== DEBUG GOOGLE ======
app.get("/debug-google", async (req, res) => {
  try {
    const q = req.query.q || "tin tức hôm nay";
    const result = await googleSearch(q);
    res.type("text/plain").send(
      `Status: ${result.status}\n\n` +
        result.text
    );
  } catch (err) {
    res.status(500).send("Debug Google error.");
  }
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server chạy tại port " + PORT);
});
