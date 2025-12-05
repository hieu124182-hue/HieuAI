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

// ====== HÀM QUYẾT ĐỊNH CÓ CẦN GOOGLE KHÔNG (CHO HỌC TẬP) ======
function shouldUseGoogle(prompt) {
  const p = (prompt || "").toLowerCase();

  // user yêu cầu rõ ràng
  if (
    p.includes("tìm trên google") ||
    p.includes("tra google") ||
    p.includes("search trên google") ||
    p.includes("tra cứu giúp") ||
    p.includes("tra cứu hộ")
  ) {
    return true;
  }
  if (p.includes("đừng dùng google") || p.includes("không cần google")) {
    return false;
  }

  // các câu mang tính giải trí / tâm sự -> không cần google
  const chitChatKeywords = [
    "kể chuyện cười",
    "kể chuyện vui",
    "tâm sự",
    "nói chuyện",
    "tán dóc",
    "kể chuyện ma",
    "kể một câu chuyện",
  ];
  if (chitChatKeywords.some((k) => p.includes(k))) return false;

  // từ khoá kiểu học tập, kiến thức
  const studyKeywords = [
    "là gì",
    "tại sao",
    "giải thích",
    "so sánh",
    "phân tích",
    "tóm tắt",
    "trình bày",
    "nêu ý nghĩa",
    "dấu hiệu nhận biết",
    "công thức",
    "định nghĩa",
    "ví dụ",
    "bài tập",
    "luyện tập",
    "ôn tập",
    "kiểm tra",
    "đề thi",
    "trắc nghiệm",
    "tự luận",
    "môn toán",
    "toán",
    "vật lý",
    "lý",
    "hoá",
    "hóa",
    "sinh",
    "ngữ văn",
    "văn",
    "lịch sử",
    "sử",
    "địa lý",
    "địa",
    "tiếng anh",
    "english",
    "tin học",
    "công nghệ thông tin",
    "lập trình",
    "python",
    "java",
    "c++",
    "pascal",
  ];

  // nếu là câu hỏi (có dấu ? hoặc mấy từ khóa trên) thì coi như cần kiến thức -> gọi google
  if (p.includes("?") || studyKeywords.some((k) => p.includes(k))) {
    return true;
  }

  // mặc định: không dùng google
  return false;
}

// ====== GOOGLE SEARCH REALTIME (trả về object) ======
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
      // gọi được nhưng không có kết quả
      return {
        status: "empty",
        text:
          "Google đã được gọi thành công nhưng không tìm thấy kết quả phù hợp cho câu hỏi này.",
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
    const useGoogle = shouldUseGoogle(userPrompt);

    // ===== Không cần Google: trợ lý học tập nói chuyện bình thường =====
    if (!useGoogle) {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Bạn là TRỢ LÝ HỌC TẬP bằng tiếng Việt cho học sinh cấp 2, cấp 3. " +
              "Hãy giải thích dễ hiểu, từng bước, khuyến khích học sinh tự suy nghĩ, " +
              "hạn chế làm hộ toàn bộ bài. Có thể nói chuyện thoải mái, thân thiện.",
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
      });

      return res.json({
        reply: completion.choices[0].message.content,
        googleStatus: "skip",
      });
    }

    // ===== Cần Google: gọi Google + trộn dữ liệu =====
    const googleResult = await googleSearch(userPrompt);

    let systemContent =
      "Bạn là TRỢ LÝ HỌC TẬP bằng tiếng Việt cho học sinh. " +
      "Bạn giúp học sinh hiểu bài, giải thích khái niệm, gợi ý cách làm, không làm hộ toàn bộ. " +
      "Bạn có quyền sử dụng dữ liệu Google được cung cấp:\n" +
      "- Nếu status = 'ok' thì ưu tiên dùng thông tin trong kết quả Google, trích ý chính, không copy nguyên xi.\n" +
"- Nếu status = 'empty' thì nói rõ là Google không có kết quả phù hợp, NHƯNG không được nói Google bị lỗi.\n" +
      "- Nếu status = 'error' thì mới được nói Google đang gặp lỗi, sau đó trả lời dựa trên kiến thức sẵn có.\n";

    let userContent = `Câu hỏi của học sinh: ${userPrompt}\n\n`;

    if (googleResult.status === "ok") {
      userContent +=
        "Status Google: ok\n" +
        "Dưới đây là các kết quả Google realtime, hãy dùng làm nguồn chính để giải thích và hướng dẫn học sinh:\n\n" +
        googleResult.text;
    } else if (googleResult.status === "empty") {
      userContent +=
        "Status Google: empty\n" +
        "Thông tin: Google đã được gọi thành công nhưng không tìm thấy kết quả phù hợp.\n" +
        "Hãy nói rõ điều này một câu ngắn gọn, rồi giải thích / hướng dẫn dựa trên kiến thức của bạn.";
    } else {
      userContent +=
        "Status Google: error\n" +
        "Thông báo lỗi kỹ thuật từ Google: " +
        googleResult.text +
        "\n" +
        "Hãy xin lỗi vì lỗi kỹ thuật này, nhưng vẫn cố gắng giúp học sinh dựa trên kiến thức của bạn (có thể không cập nhật).";
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
      googleStatus: googleResult.status,
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
    const q = req.query.q || "định nghĩa vật lý";
    const result = await googleSearch(q);
    res.type("text/plain").send(`Status: ${result.status}\n\n${result.text}`);
  } catch (err) {
    res.status(500).send("Debug Google error.");
  }
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server chạy tại port " + PORT);
});
