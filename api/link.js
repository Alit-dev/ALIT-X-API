const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_K26ahCwGAJFX@ep-autumn-mud-a155fijm-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
});

const localFilePath = path.join(__dirname, "..", "short-links.json");

async function initTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS short_urls (
      id SERIAL PRIMARY KEY,
      shortcode VARCHAR(100) UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function saveToLocal(shortcode, original_url) {
  let data = {};
  if (fs.existsSync(localFilePath)) {
    data = JSON.parse(fs.readFileSync(localFilePath, "utf-8"));
  }
  data[shortcode] = original_url;
  fs.writeFileSync(localFilePath, JSON.stringify(data, null, 2));
}

const meta = {
  name: "short",
  version: "1.1.0",
  description: "Shorten a long URL with optional custom code (online + local)",
  author: "Your Name",
  method: "get",
  category: "tools",
  path: "/short?url=&custom="
};

async function onStart({ req, res }) {
  await initTable();

  const { url, custom } = req.query;
  if (!url) return res.json({ error: "Missing 'url' parameter." });

  let shortcode = custom || nanoid(6);

  // Check for duplicate custom shortcode
  const existing = await pool.query("SELECT * FROM short_urls WHERE shortcode = $1", [shortcode]);
  if (existing.rowCount > 0) {
    return res.json({ error: "Shortcode already exists. Try another custom name." });
  }

  const shortUrl = `${req.protocol}://${req.get("host")}/link/${shortcode}`;

  // Save to PostgreSQL
  await pool.query(
    "INSERT INTO short_urls (shortcode, original_url) VALUES ($1, $2)",
    [shortcode, url]
  );

  // Save to local JSON
  saveToLocal(shortcode, url);

  return res.json({
    original_url: url,
    short_url: shortUrl,
    powered_by: "Wataru API"
  });
}

module.exports = { meta, onStart };