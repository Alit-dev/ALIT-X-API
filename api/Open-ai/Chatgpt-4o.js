const axios = require('axios');

const meta = {
  name: "gpt-3.5-turbo",
  version: "1.0.0",
  description: "Uses model: provider-4/gpt-4o. This API enables lightweight and fast AI chat completion, suitable for Q&A, small text generation, and quick responses.",
  author: "Alamin",
  method: "get",
  category: "open-ai",
  path: "/gpt-3.5-t?text="
};

const API_KEY = "ddc-temp-free-e3b73cd814cc4f3ea79b5d4437912663";
const BASE_URL = "https://api.devsdocode.com/v1";

async function onStart({ req, res }) {
  const text = req.query.text;
  if (!text) {
    return res.status(400).json({ status: false, error: 'text query is required' });
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/chat/completions`,
      {
        model: "provider-1/gpt-3.5-turbo-202201",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: text }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim();

    if (reply) {
      res.json({ status: true, text: reply });
    } else {
      res.status(500).json({ status: false, error: "No response from model" });
    }
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ status: false, error: "Something went wrong!" });
  }
}

module.exports = { meta, onStart };