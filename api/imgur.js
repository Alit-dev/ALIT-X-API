const meta = {
  name: "imgdb",
  version: "1.0.0",
  description: "Uploads a base64 image to imgbb and returns the URL",
  author: "Your Name",
  method: "get",
  category: "tool",
  path: "/imgdb?url="
};

const axios = require("axios");
const FormData = require("form-data");

async function onStart({ req, res }) {
  const { url } = req.query;

  if (!image) {
    return res.status(400).json({
      status: false,
      error: "url (base64) parameter is required"
    });
  }

  try {
    const form = new FormData();
    form.append("image", image);

    const response = await axios.post(
      "https://api.imgbb.com/1/upload?expiration=600&key=19cbf5add8d504ff8adb2a77613bcf7f",
      form,
      { headers: form.getHeaders() }
    );

    const data = response.data;

    if (data && data.success) {
      return res.json({
        status: true,
        url: data.data.url,
        size: data.data.size,
        delete_url: data.data.delete_url,
        uploaded_at: data.data.timestamp
      });
    } else {
      return res.status(500).json({
        status: false,
        error: "Failed to upload image",
        response: data
      });
    }

  } catch (err) {
    return res.status(500).json({
      status: false,
      error: "Upload failed",
      details: err.message
    });
  }
}

module.exports = { meta, onStart };