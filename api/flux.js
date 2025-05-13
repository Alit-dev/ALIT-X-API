const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const meta = {
  name: "flux schnell-v1",
  version: "1.0.0",
  description: "Generate an image using FLUX model from Together AI and return a temporary link",
  author: "alit",
  method: "get",
  category: "image",
  path: "/flux?prompt="
};

// 🔁 All API keys (rotate in loop)
const apiKeys = [
  '33df466ad5ff7d5df942ce53de2fe5747aa891e898c0e410a2fd782f154c5c2b',
  '11b40ccdd40183d32091d45e7fa8b39fc342f715b742278c7cd787ca3cd460d6',
  '2805562f9310e716e5ce9c3ddad8838aa1c3ea0d34806c596b246d94845f5484',
  '1d656f6f282fc0ac7a67bf2af85d2c0ebce17145d19e7d7e3faf6ea3dc864b07',
  'eab31294aff2e352a97f25112af6336d30e3734b0503b6e35806b60caef6265d',
  '685dcc6c37b27254f6c7182efe38f68664f3df8e4397d7667864706571bb5be2',
  'af8cb009449d72bd4795e4fd04ef88b06795de5dfba41cb32019b3e92a0fa478'
];
let currentKeyIndex = 0;

function getNextApiKey() {
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
}

const togetherApiUrl = 'https://api.together.xyz/v1/images/generations';

async function onStart({ req, res }) {
  try {
    const { prompt } = req.query;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const response = await axios.post(togetherApiUrl, {
      model: 'black-forest-labs/FLUX.1-schnell-Free',
      prompt: prompt,
      width: 1024,
      height: 768,
      response_format: 'b64_json'
    }, {
      headers: {
        'Authorization': `Bearer ${getNextApiKey()}`,
        'Content-Type': 'application/json'
      }
    });

    const base64Image = response.data.data[0].b64_json;
    const imageBuffer = Buffer.from(base64Image, 'base64');

    const uniqueFilename = `${crypto.randomBytes(5).toString('hex')}.jpg`;
    const rootDir = path.join(__dirname, ".."); // root folder
    const cachesDir = path.join(rootDir, "caches");

    if (!fs.existsSync(cachesDir)) fs.mkdirSync(cachesDir, { recursive: true });

    const imgPath = path.join(cachesDir, uniqueFilename);
    fs.writeFileSync(imgPath, imageBuffer);

    const fullImageUrl = `${req.protocol}://${req.get('host')}/upload/${uniqueFilename}`;

    // Delete after 3 minutes
    setTimeout(() => {
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
        console.log(`Deleted image: ${imgPath}`);
      }
    }, 180000); // 3 minutes = 180000 ms

    res.json({
      success: true,
      url: fullImageUrl,
      message: "Image generated successfully, it will be deleted after 3 minutes."
    });

  } catch (error) {
    console.error('❌ Flux generation error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to generate image' });
  }
}

module.exports = { meta, onStart };
