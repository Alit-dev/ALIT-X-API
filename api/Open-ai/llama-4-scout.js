const axios = require('axios');

const meta = {
  name: "llama-4-scout",
  version: "1.0.0",
  description: "Uses model: provider-4/llama-4-maverick. This API enhances language capabilities for advanced tasks like conversation, content generation, and more.",
  author: "Alamin",
  method: "get",
  category: "ai",
  path: "/llama-4-maverick?text="
};

const API_KEY = "ddc-free-8e5171eeac9148ed89969cc31002d99d";
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
        model: "provider-2/llama-4-scout",
        messages: [
          { role: "system", content: "You are an advanced language assistant." },
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