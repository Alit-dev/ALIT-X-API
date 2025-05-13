const axios = require('axios');

const meta = {
  name: "deepseek",
  version: "0.0.1",
  description: "An API endpoint that fetches chat completions from siliconflow based on a required query parameter",
  author: "alit",
  method: "get",
  category: "ai",
  path: "/deepseek?query="
};

async function onStart({ res, req }) {
  // Extract the required 'query' parameter from the query string
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ status: false, error: 'query is required' });
  }

  // Use the 'query' parameter as the content for the user message.
  const messages = [{ role: 'user', content: query }];

  // Optional: extract additional parameters from the query string, with default fallbacks.
  const stream = req.query.stream ? req.query.stream === 'true' : false;
  const model = req.query.model || 'Pro/deepseek-ai/DeepSeek-R1';
  const temperature = req.query.temperature ? parseFloat(req.query.temperature) : 0.8;
  const presence_penalty = req.query.presence_penalty ? parseFloat(req.query.presence_penalty) : 0.6;
  const frequency_penalty = req.query.frequency_penalty ? parseFloat(req.query.frequency_penalty) : 0.4;
  const top_p = req.query.top_p ? parseFloat(req.query.top_p) : 0.9;

  // Construct the payload for the siliconflow API call
  const payload = JSON.stringify({
    messages,
    stream,
    model,
    temperature,
    presence_penalty,
    frequency_penalty,
    top_p,
  });

  const config = {
    method: 'post',
    url: 'https://gpt.tiptopuni.com/api/siliconflow/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Origin': 'https://gpt.tiptopuni.com',
      'Referer': 'https://gpt.tiptopuni.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    },
    data: payload
  };

  try {
    const response = await axios(config);
    // Extract the actual AI response only from the returned data.
    // This assumes the API returns a structure similar to OpenAI's Chat Completion API.
    const aiResponse = response.data.choices?.[0]?.message?.content;
    if (!aiResponse) {
      return res.status(500).json({ status: false, error: 'AI response not found in API response.' });
    }
    res.json({ response: aiResponse });
  } catch (error) {
    console.error("Error during API call:", error);
    res.status(500).json({ status: false, error: 'An error occurred while fetching completions.' });
  }
}

module.exports = { meta, onStart };
