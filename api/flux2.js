const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const meta = {
  name: "flux schnell-v2",
  version: "1.0.0",
  description: "Generate an image using FLUX model from Flux Schnell API it more first then v1",
  author: "alit",
  method: "get",
  category: "image",
  path: "/fluxv2?prompt="
};

const fluxApiUrl = 'https://flux-schnell.hello-kaiiddo.workers.dev/img';

async function onStart({ req, res }) {
  try {
    const { prompt, model = 'flux-schnell', guidance = 8.5, strength = 1.4 } = req.query;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const url = `${fluxApiUrl}?prompt=${encodeURIComponent(prompt)}&model=${encodeURIComponent(model)}&guidance=${guidance}&strength=${strength}`;
    
    const response = await axios.get(url, { responseType: 'arraybuffer' });

    const imageBuffer = Buffer.from(response.data, 'binary');

    const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}.jpg`;
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
