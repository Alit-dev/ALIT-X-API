const axios = require("axios");
const fs = require("fs");
const path = require("path");

const meta = {
  name: "Openai-Voice",
  version: "1.0.2",
  description: "open ai response with voice character nova, alloy, echo, fable, onyx, shimmer, coral, verse, ballad, ash, sage, amuch, dan voice",
  author: "Alamin",
  method: "get",
  category: "ai voice",
  path: "/voice?character=&text="
};

async function onStart({ req, res }) {
  const { text, character } = req.query;

  if (!text) {
    return res.status(400).json({
      error: "Missing 'text' query parameter"
    });
  }

  const allowedVoices = [
    "nova", "alloy", "echo", "fable", "onyx", "shimmer",
    "coral", "verse", "ballad", "ash", "sage", "amuch", "dan"
  ];

  const voice = (character || "nova").toLowerCase();

  if (!allowedVoices.includes(voice)) {
    return res.status(400).json({
      error: `'${character}' is not a supported voice character`,
      available_voices: allowedVoices
    });
  }

  try {
    const cleanText = text.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
    const filename = `${cleanText}_${voice}.mp3`;

    const cacheDir = path.join(process.cwd(), "caches");
    const filePath = path.join(cacheDir, filename);

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
    }

    const voiceUrl = `https://voice-assistance.hello-kaiiddo.workers.dev/${encodeURIComponent(text)}?model=openai-audio&voice=${voice}`;
    const response = await axios.get(voiceUrl, { responseType: "arraybuffer" });

    fs.writeFileSync(filePath, response.data);

    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Auto-deleted: ${filename}`);
      }
    }, 10000);

    const fileUrl = `${req.protocol}://${req.get("host")}/upload/${filename}`;

    return res.json({
      message: "Voice generated successfully",
      voice: voice,
      audio_url: fileUrl,
      expires_in: "10 seconds"
    });

  } catch (err) {
    console.error("Voice generation failed:", err.message);
    return res.status(500).json({
      error: "Failed to generate voice",
      details: err.message
    });
  }
}

module.exports = { meta, onStart };