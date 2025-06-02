const axios = require("axios");

const meta = {
  name: "Terabox",
  version: "1.0.0",
  description: "Fetches download link metadata from Terabox",
  author: "Al Amin",
  method: "get",
  category: "tool",
  path: "/terabox?url="
};

async function onStart({ res, req }) {
  const { url } = req.query;

  if (!url) {
    return res.json({
      status: false,
      message: "Missing 'url' query parameter."
    });
  }

  try {
    const response = await axios.get(`https://tr-dld.vercel.app/api?url=${encodeURIComponent(url)}`);
    
    const data = response.data;

    return res.json({
      status: true,
      file_name: data.file_name,
      download_url: data.download_url,
      thumbnail: data.thumbnail,
      size: data.size
    });

  } catch (error) {
    return res.json({
      status: false,
      message: "Failed to fetch video data.",
      error: error.message
    });
  }
}

module.exports = { meta, onStart };