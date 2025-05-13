const axios = require('axios');

const meta = {
  name: "deepsheekv2",
  version: "0.0.1",
  description: "Fetches AI response from Together API using DeepSeek model with API key rotation.",
  author: "YourName",
  method: "get",
  category: "ai",
  path: "/deepsheekv2?text="
};

// List of Together API keys to rotate through if one fails
const TOGETHER_API_KEYS = [
  '33df466ad5ff7d5df942ce53de2fe5747aa891e898c0e410a2fd782f154c5c2b',
  '11b40ccdd40183d32091d45e7fa8b39fc342f715b742278c7cd787ca3cd460d6',
  '2805562f9310e716e5ce9c3ddad8838aa1c3ea0d34806c596b246d94845f5484',
  '1d656f6f282fc0ac7a67bf2af85d2c0ebce17145d19e7d7e3faf6ea3dc864b07',
  'eab31294aff2e352a97f25112af6336d30e3734b0503b6e35806b60caef6265d',
  '685dcc6c37b27254f6c7182efe38f68664f3df8e4397d7667864706571bb5be2',
  'af8cb009449d72bd4795e4fd04ef88b06795de5dfba41cb32019b3e92a0fa478'
];

async function onStart({ req, res }) {
  const usertext = req.query.text;

  if (!usertext) {
    return res.status(400).json({ status: false, error: "❌ 'text' parameter is required." });
  }

  let success = false;
  let aiMessage = '';

  for (const apiKey of TOGETHER_API_KEYS) {
    try {
      const response = await axios.post(
        'https://api.together.xyz/v1/chat/completions',
        {
          model: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
          messages: [{ role: 'user', content: usertext }],
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          }
        }
      );

      if (response.data?.choices?.[0]?.message?.content) {
        aiMessage = response.data.choices[0].message.content
          .replace(/<think>/g, '')
          .replace(/<\/think>/g, '')
          .trim();

        success = true;
        return res.json({ status: true, response: aiMessage });
      } else {
        console.error('Unexpected API response format:', response.data);
      }
    } catch (error) {
      console.error('API key failed:', apiKey, error?.response?.data || error.message);
    }
  }

  if (!success) {
    res.status(500).json({ status: false, error: "❌ All API keys failed to get AI response." });
  }
}

module.exports = { meta, onStart };
