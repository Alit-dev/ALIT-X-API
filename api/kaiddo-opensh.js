const axios = require("axios");

const meta = {
  name: "openai-search",
  version: "1.0.0",
  description: "Search using Openai API and return only response text",
  author: "alit",
  method: "get",
  category: "search",
  path: "/openai-sr?qustion="
};

async function onStart({ res, req }) {
  try {
    const { qustion } = req.query;

    if (!qustion) {
      return res.json({ error: "Please provide the 'qustion' query parameter" });
    }

    const apiUrl = `https://search.hello-kaiiddo.workers.dev/search?q=${encodeURIComponent(qustion)}`;

    const apiRes = await axios.get(apiUrl, { timeout: 8000 });
    const data = apiRes.data;

    if (data.status === "ok" && data.response) {
      // শুধু response এর value রিটার্ন করবো
      return res.json({ reply: data.response });
    } else {
      return res.json({ error: "Invalid response from Kiddo API" });
    }

  } catch (error) {
    let message = "An error occurred";
    if (error.response) {
      message = `API error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.code === "ECONNABORTED") {
      message = "Request timed out";
    } else if (error.message) {
      message = error.message;
    }
    return res.json({ error: message });
  }
}

module.exports = { meta, onStart };