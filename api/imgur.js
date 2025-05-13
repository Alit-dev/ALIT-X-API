const meta = {
    name: "imgur",
    version: "1.0.0",
    description: "Uploads an image to Imgur from the provided URL",
    author: "Alit",
    method: "get",
    category: "tool",
    path: "/imgur?url="
  };
  
  async function onStart({ res, req }) {
    const { url } = req.query;
  
    if (!url) {
      return res.status(400).json({ error: "url is required" });
    }
  
    const axios = require("axios");
    const clientID = "bfd5d5cb7b4cde3";
  
    try {
      const response = await axios.post(
        "https://api.imgur.com/3/image",
        { image: url },
        { headers: { Authorization: `Client-ID ${clientID}` } }
      );
  
      return res.json({
        author: "Alit",
        data: response.data,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Upload failed",
        details: error.message,
      });
    }
  }
  
  module.exports = { meta, onStart };
  