const axios = require('axios');
const cheerio = require('cheerio');

const meta = {
  name: "pinterest-search",
  version: "1.0.0",
  description: "Scrapes high-quality images from Pinterest based on a search query",
  author: "Alamin,
  method: "get",
  category: "search",
  path: "/pin?query="
};

function isHighQuality(url) {
  return (
    url.startsWith('https://i.pinimg.com/') &&
    !url.includes('/60x60') &&
    !url.includes('/75x75') &&
    !url.includes('/236x')
  );
}

async function onStart({ req, res }) {
  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;

  try {
    const homeRes = await axios.get('https://www.pinterest.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0 Mobile Safari/537.36'
      }
    });

    const freshCookies = (homeRes.headers['set-cookie'] || [])
      .map(cookie => cookie.split(';')[0])
      .join('; ');

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.pinterest.com/',
        'Cookie': freshCookies
      }
    });

    const $ = cheerio.load(response.data);
    const imgLinks = new Set();

    $('img').each((i, el) => {
      const src = $(el).attr('src');
      const srcset = $(el).attr('srcset');

      if (src && isHighQuality(src)) imgLinks.add(src);

      if (srcset) {
        const urls = srcset.split(',').map(x => x.trim().split(' ')[0]);
        urls.forEach(u => {
          if (isHighQuality(u)) imgLinks.add(u);
        });
      }
    });

    const allImages = Array.from(imgLinks);

    return res.json({
      query,
      total: allImages.length,
      images: allImages,
      powered_by: "Wataru API"
    });

  } catch (err) {
    return res.status(500).json({ error: 'Scraping failed', message: err.message });
  }
}

module.exports = { meta, onStart };