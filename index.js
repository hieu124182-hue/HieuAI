require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');
const { TwitterApi } = require('twitter-api-v2');
const Parser = require('rss-parser');  // Cho Reddit

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const parser = new Parser();

const SYSTEM_PROMPT = `Mày là thằng bạn chí cốt của tao... [giữ nguyên prompt cũ, thêm]: Giờ mày search mọi nền tảng: x_search (X), reddit_search (Reddit), ig_search (Instagram), fb_search (Facebook), tiktok_search (TikTok), linkedin_search (LinkedIn). Tự call tool khi cần info từ platform cụ thể, ví dụ {tool: 'ig_search', query: 'hashtag #ai'} – tổng hợp info fresh vào reply.`;

app.post('/chat', async (req, res) => {
  try {
    let { messages } = req.body;
    let completion = await openai.chat.completions.create({
      model: 'llama-3.1-70b-instruct',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.9,
      max_tokens: 8192
    });

    let reply = completion.choices[0].message.content;

    // Parse tool call
    const toolMatch = reply.match(/\{tool: '(\w+)', query: '(.*?)'\}/);
    if (toolMatch) {
      const tool = toolMatch[1];
      const query = toolMatch[2];
      let toolResult = '';

      if (tool === 'web_search') {
        const searchRes = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
        toolResult = searchRes.data.Abstract + '\n' + searchRes.data.RelatedTopics.map(t => t.Text).join('\n');
      } else if (tool === 'browse_page') {
        const pageRes = await axios.get(query);
        const $ = cheerio.load(pageRes.data);
        toolResult = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000);
      } else if (tool === 'x_search') {
        const searchRes = await twitterClient.v2.searchAll(query, { max_results: 10 });
        toolResult = searchRes.data.data.map(t => t.text).join('\n');
      } else if (tool === 'reddit_search') {
        const redditUrl = `https://www.reddit.com/r/all/search.rss?q=${encodeURIComponent(query)}&restrict_sr=on&sort=relevance&t=all`;
        const feed = await parser.parseURL(redditUrl);
        toolResult = feed.items.slice(0, 5).map(item => `${item.title}: ${item.contentSnippet}`).join('\n');
      } else if (tool === 'ig_search' || tool === 'fb_search') {
        // Fallback DuckDuckGo hack cho IG/FB (nếu không dùng Apify)
        const platform = tool === 'ig_search' ? 'site:instagram.com' : 'site:facebook.com';
        const searchRes = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' ' + platform)}&format=json`);
        toolResult = searchRes.data.RelatedTopics.map(t => t.Text).join('\n');
        // Bonus: Nếu mày có Apify token, uncomment dưới
        // const apifyRes = await axios.get(`https://api.apify.com/v2/acts/apify~instagram-scraper/runs/last/dataset/items?token=${process.env.APIFY_TOKEN}&search=${query}`);
        // toolResult = JSON.stringify(apifyRes.data.slice(0, 5));
      } else if (tool === 'tiktok_search') {
        // Hack DuckDuckGo cho TikTok
        const searchRes = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' site:tiktok.com')}&format=json`);
        toolResult = searchRes.data.RelatedTopics.map(t => t.Text).join('\n');
        // Nếu Apify: tương tự IG
      } else if (tool === 'linkedin_search') {
        const searchRes = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' site:linkedin.com')}&format=json`);
        toolResult = searchRes.data.RelatedTopics.map(t => t.Text).join('\n');
      }

      // Tổng hợp lại cho AI
      messages.push({ role: 'assistant', content: reply });
      messages.push({ role: 'system', content: `Tool result từ ${tool}: ${toolResult}` });
      completion = await openai.chat.completions.create({
        model: 'llama-3.1-70b-instruct',
        messages,
        temperature: 0.9,
        max_tokens: 8192
      });
      reply = completion.choices[0].message.content;
    }

    res.json({ reply: reply || "Duma tool bị nghẹn rồi bro, thử lại đi ❤️" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HieuAI search mọi nơi port ${PORT}`));
