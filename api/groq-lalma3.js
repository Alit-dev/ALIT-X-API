const meta = {
    name: "lalma3.3-Groq",
    version: "1.0.0",
    description: "Generates a chat completion response using OpenAI's Llama model",
    author: "alamin",
    method: "get",
    category: "ai",
    path: "/lalma3-chat?text="
  };
  
  async function onStart({ res, req }) {
    const text = req.query.text;
  
    if (!text) {
      return res.status(400).json({ error: 'Missing text query' });
    }
  
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: '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',
      baseURL: 'https://api.groq.com/openai/v1',
    });
  
    try {
      const completion = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: text },
        ],
      });
  
      const reply = completion.choices[0].message.content;
      return res.json({ text: reply });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Something went wrong', detail: error.message });
    }
  }
  
  module.exports = { meta, onStart };
  