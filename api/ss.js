const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const meta = {
  name: "screenshot",
  version: "1.0.0",
  description: "Takes a screenshot of any given website URL",
  author: "Your Name",
  method: "get",
  category: "utility",
  path: "/screenshot?url="
};

async function onStart({ req, res }) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, error: "Missing 'url' query parameter" });
    }

    // Validate url basic (optional: improve with better validation)
    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).json({ success: false, error: "URL must start with http:// or https://" });
    }

    const uniqueFilename = `${crypto.randomBytes(6).toString("hex")}.jpg`;

    const rootDir = path.join(__dirname, ".."); // root folder
    const cachesDir = path.join(rootDir, "caches");
    if (!fs.existsSync(cachesDir)) fs.mkdirSync(cachesDir, { recursive: true });

    const imgPath = path.join(cachesDir, uniqueFilename);

    // Launch Puppeteer and take screenshot
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    await page.screenshot({ path: imgPath, type: "jpeg", quality: 80, fullPage: true });

    await browser.close();

    // Construct public url assuming /upload/ route serves from cachesDir
    const fullImageUrl = `${req.protocol}://${req.get("host")}/upload/${uniqueFilename}`;

    // Schedule image deletion after 3 minutes
    setTimeout(() => {
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
        console.log(`Deleted image: ${imgPath}`);
      }
    }, 180000);

    return res.json({
      success: true,
      url: fullImageUrl,
      message: "Image generated successfully, it will be deleted after 3 minutes."
    });
  } catch (error) {
    console.error("❌ Screenshot generation error:", error.message);
    return res.status(500).json({ success: false, error: "Failed to generate image" });
  }
}

module.exports = { meta, onStart };
