const meta = {
  name: "edit-Gemini",
  version: "1.0.0",
  description: "Enhance an image using Google Gemini AI with a text prompt",
  author: "Alamin",
  method: "get",
  category: "image",
  path: "/edit?prompt=&url=",
};

const fs = require("fs");
const path = require("path");
const { GoogleGenAI, Modality } = require("@google/genai");
const crypto = require("crypto");

const apiKeys = [
  "AIzaSyAl5enm8yfM2d2dSqrw78Hud1DF5ZvsWO0",
  "AIzaSyA9qjvMlJAkvsw2MYm4poTdtW_2l3SPNFk",
  "AIzaSyBtDwNNmHrRjylWRKqedSnM_H9GjtQjS-o",
  "AIzaSyCzFX24Sps1Y8tDIafqnhEfTfpQxuSkUtM"
];

// Rotate through API keys to balance the load
let apiKeyIndex = 0;

const getApiKey = () => {
  const apiKey = apiKeys[apiKeyIndex];
  apiKeyIndex = (apiKeyIndex + 1) % apiKeys.length;  // Cycle through the keys
  return apiKey;
};

async function onStart({ req, res }) {
  const fetch = (await import("node-fetch")).default;

  const { prompt, url } = req.query;

  // ✅ Check required parameters
  if (!prompt || !url) {
      return res.status(400).json({
          error: "Both 'prompt' and 'url' parameters are required.",
          example: "/enhance-image?prompt=Make it colorful&url=https://example.com/image.jpg",
      });
  }

  try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Image could not be fetched.");

      const arrayBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString("base64");
      const contentType = response.headers.get("content-type") || "image/jpeg";

      // Get API key for the request
      const apiKey = getApiKey();
      const ai = new GoogleGenAI({
          apiKey: apiKey,
      });

      const result = await ai.models.generateContent({
          model: "gemini-2.0-flash-exp-image-generation",
          contents: [
              {
                  role: "user",
                  parts: [
                      { text: prompt },
                      {
                          inlineData: {
                              mimeType: contentType,
                              data: base64Image,
                          },
                      },
                  ],
              },
          ],
          config: {
              responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
      });

      const textResponse =
          result?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text || "No text response";

      const imagePart = result?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);

      if (!imagePart) {
          return res.status(500).json({ error: "No image in response." });
      }

      const uniqueFilename = `${crypto.randomBytes(16).toString("hex")}.jpg`;
      const cachesDir = path.join(__dirname, "..", "caches");

      if (!fs.existsSync(cachesDir)) fs.mkdirSync(cachesDir, { recursive: true });

      const imgPath = path.join(cachesDir, uniqueFilename);
      const buffer = Buffer.from(imagePart.inlineData.data, "base64");
      fs.writeFileSync(imgPath, buffer);

      const fullImageUrl = `${req.protocol}://${req.get("host")}/upload/${uniqueFilename}`;

      // Delete image after 3 minutes
      setTimeout(() => {
          if (fs.existsSync(imgPath)) {
              fs.unlinkSync(imgPath);
              console.log(`Deleted image: ${imgPath}`);
          }
      }, 180000); // 3 minutes

      return res.json({
          text: textResponse.replace(/\\n/g, "\n"),
          imageUrl: fullImageUrl,
      });
  } catch (err) {
      console.error("AI Error:", err);
      return res.status(500).json({ error: "Something went wrong while processing the image." });
  }
}

module.exports = { meta, onStart };
