const meta = {
    name: "gemini-2",
    version: "1.0.0",
    description: "Generates text based on the given prompt using Google GenAI",
    author: "alamin",
    method: "get",
    category: "ai",
    path: "/gemini2.00text?text="
  };
  
  async function onStart({ res, req }) {
    const { text } = req.query;
  
    if (!text) {
      return res.status(400).json({ error: "text is required." });
    }
  
    const { GoogleGenAI, Modality } = require("@google/genai");
    const ai = new GoogleGenAI({
      apiKey: "AIzaSyAl5enm8yfM2d2dSqrw78Hud1DF5ZvsWO0",
    });
  
    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp-image-generation",
        contents: [
          {
            role: "user",
            parts: [{ text: text || "" }],
          },
        ],
        config: {
          responseModalities: [Modality.TEXT],
        },
      });
  
      const textResponse =
        result?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text ||
        "No text response";
  
      return res.json({
        text: textResponse.replace(/\\n/g, "\n"), // Only return text response
      });
    } catch (err) {
      console.error("Text Error:", err);
      return res.status(500).json({ error: "Something went wrong." });
    }
  }
  
  module.exports = { meta, onStart };
  