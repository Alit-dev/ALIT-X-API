const express = require('express');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

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
        operator: (settings.apiSettings && settings.apiSettings.operator) || "Created Using  Alit UI",
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
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'portal.html'));
});



app.get('/link', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'link.html'));
});

app.get('/link/:link', (req, res) => {
  const linkCode = req.params.link;
  const jsonPath = path.join(__dirname, 'short-links.json');

  fs.readFile(jsonPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading short-links.json:', err.message);
      return res.status(500).send('Server error');
    }

    let links;
    try {
      links = JSON.parse(data);
    } catch (e) {
      return res.status(500).send('Invalid JSON format');
    }

    const found = links[linkCode];
    if (found && found.original_url) {
      console.log(`Redirecting to: ${found.original_url}`);
      return res.redirect(found.original_url);
    } else {
      console.log(`Not found: ${linkCode}`);
      return res.status(404).send('Link not found');
    }
  });
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'docs.html'));
});

app.use('/upload', express.static(path.join(__dirname, 'caches')));

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

// Start the server
app.listen(PORT, () => {
  console.log(chalk.bgHex('#90EE90').hex('#333').bold(`Server is running on port ${PORT}`));
});




module.exports = app;