const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_K26ahCwGAJFX@ep-autumn-mud-a155fijm-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
});

const localFilePath = path.join(__dirname, "..", "short-links.json");

// Ensure table exists
async function initTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS short_urls (
      id SERIAL PRIMARY KEY,
      shortcode VARCHAR(10) UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Save to local JSON
function saveToLocal(shortcode, original_url) {
  let data = {};
  if (fs.existsSync(localFilePath)) {
    data = JSON.parse(fs.readFileSync(localFilePath, "utf-8"));
  }
  data[shortcode] = { original_url };
  fs.writeFileSync(localFilePath, JSON.stringify(data, null, 2));
}

const meta = {
  name: "short",
  version: "1.0.0",
  description: "Shorten a long URL (online + local)",
  author: "Your Name",
  method: "get",
  category: "tools",
  path: "/short?url="
};

async function onStart({ req, res }) {
  await initTable();

  const { url } = req.query;
  if (!url) return res.json({ error: "Missing 'url' parameter." });

  const shortcode = nanoid(6);
  const shortUrl = `${req.protocol}://${req.get("host")}/link/${shortcode}`;

  // Save to PostgreSQL
  await pool.query(
    "INSERT INTO short_urls (shortcode, original_url) VALUES ($1, $2)",
    [shortcode, url]
  );

  // Save to local JSON
  saveToLocal(shortcode, url, shortUrl);

  return res.json({
    original_url: url,
    short_url: shortUrl,
    powered_by: "Wataru API"
  });
}

module.exports = { meta, onStart };