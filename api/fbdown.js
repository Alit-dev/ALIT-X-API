const { ndown } = require("nayan-videos-downloader");

const meta = {
  name: "Facebook Downloader",
  version: "1.0.0",
  description: "Downloads the highest quality video from a given URL using nayan-videos-downloader.",
  author: "Alamin",
  method: "get",
  category: "downloader",
  path: "/fbdownload?url="
};

async function onStart({ req, res }) {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({
      status: false,
      message: "Missing 'url' parameter."
    });
  }

  try {
    const result = await ndown(videoUrl);

    if (result.status && result.data && result.data.length > 0) {
      const bestQuality = result.data[0];
      return res.json({
        status: true,
        message: "Download link generated successfully.",
        link: bestQuality.url
      });
    } else {
      return res.status(404).json({
        status: false,
        message: "No downloadable video found."
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error processing the URL.",
      error: error.message
    });
  }
}

module.exports = { meta, onStart };