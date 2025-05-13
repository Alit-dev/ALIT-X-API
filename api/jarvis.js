const axios = require("axios");
const fs = require("fs");
const path = require("path");

const meta = {
  name: "Jarvis",
  version: "1.0.1",
  description: "Convert text to voice, save in root caches, and auto delete",
  author: "Alamin",
  method: "get",
  category: "ai voice",
  path: "/jarvisvoice?text="
};

async function onStart({ res, req }) {
  const { text } = req.query;

  if (!text) {
    return res.status(400).json({
      error: "Missing 'text' query parameter"
    });
  }

  try {
    // Clean filename to avoid filesystem issues
    const cleanText = text.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50); // limit length
    const filename = `${cleanText}.mp3`;

    // ✅ Root folder er caches folder
    const cacheDir = path.join(process.cwd(), "caches");
    const filePath = path.join(cacheDir, filename);

    // Ensure the caches folder exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
    }

    // Fetch voice from external API
    const voiceUrl = `https://voice-assistance.hello-kaiiddo.workers.dev/${encodeURIComponent(text)}?model=openai-audio&voice=onyx`;
    const response = await axios.get(voiceUrl, { responseType: "arraybuffer" });

    // Save audio to file
    fs.writeFileSync(filePath, response.data);

    // Schedule auto delete after 10 seconds
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filename}`);
      }
    }, 10000); // 10 seconds

    // Create file URL
    const fileUrl = `${req.protocol}://${req.get("host")}/upload/${filename}`;

    return res.json({
      message: "Voice generated successfully",
      audio_url: fileUrl,
      expires_in: "10 seconds"
    });

  } catch (err) {
    console.error("Voice generation error:", err.message);
    return res.status(500).json({ error: "Failed to generate voice" });
  }
}

module.exports = { meta, onStart };
