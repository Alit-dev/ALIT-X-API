const axios = require("axios");

const meta = {
  name: "Openai-warmgpt",
  version: "1.0.0",
  description: "Query WormGPT API and return only the reply text",
  author: "alamin",
  method: "get",
  category: "open-ai",
  path: "/warmgpt?prompt="
};

async function onStart({ res, req }) {
  try {
    const { prompt } = req.query;
    if (!prompt) {
      return res.json({ error: "Please provide the 'prompt' query parameter" });
    }

    // Call WormGPT API with the user query
    const apiUrl = `https://wormgpt.hello-kaiiddo.workers.dev/ask?ask=${encodeURIComponent(prompt)}`;
    const apiRes = await axios.get(apiUrl);

    // Extract the reply value from the API response
    const reply = apiRes.data.reply || "No reply found";

    // Return only the reply text
    return res.json({ reply });
  } catch (error) {
    return res.json({ error: error.message || "An error occurred" });
  }
}

module.exports = { meta, onStart };
