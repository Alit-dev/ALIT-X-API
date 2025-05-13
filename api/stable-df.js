const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const meta = {
  name: "stable-diffusion",
  version: "1.0.0",
  description: "Generate an image using stable-diffusion",
  author: "alit",
  method: "get",
  category: "image",
  path: "/stable-diffusion?prompt="
};

const fluxApiUrl = 'https://stable-diffusion.hello-kaiiddo.workers.dev/generate';

async function onStart({ req, res }) {
  try {
    const { prompt, model = 'sd-3.5-large' } = req.query;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // Call the new API
    const url = `${fluxApiUrl}?prompt=${encodeURIComponent(prompt)}&model=${encodeURIComponent(model)}`;

    const response = await axios.get(url);

    // Check if the response is valid
    if (response.data.status !== 'success') {
      return res.status(500).json({ success: false, error: 'Failed to generate image' });
    }

    // Get the image URL from the response
    const imageUrl = response.data.image_url;
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    const imageBuffer = Buffer.from(imageResponse.data, 'binary');

    const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}.png`;
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
