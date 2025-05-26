const axios = require("axios");

const meta = {
  name: "Anthropic-Claude 3.5",
  version: "1.0.0",
  description: "a simple api base reply system",
  author: "Alamin",
  method: "get",
  category: "ai",
  path: "/claude-3.5?prompt="
};

async function onStart({ res, req }) {
  try {
    const { prompt } = req.query;
    if (!prompt) {
      return res.json({ error: "Please provide the 'prompt' query parameter" });
    }

    const apiUrl = `https://claude.a3z.workers.dev/claude?q=${encodeURIComponent(prompt)}`;
    const apiRes = await axios.get(apiUrl);

    // Assuming the API response data contains the reply text directly or in a field like data.reply or data.answer
    // You may need to adjust according to actual response structure
    const reply = apiRes.data || "No reply found";

    return res.json({ reply });
  } catch (error) {
    return res.json({ error: error.message || "An error occurred" });
  }
}

module.exports = { meta, onStart };
