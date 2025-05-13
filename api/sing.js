const meta = {
  name: "sing",
  version: "1.0.0",
  description: "A simple API to fetch YouTube video info and its audio URL",
  author: "alamin", 
  method: "get",
  category: "tool",
  path: "/singmp3?prompt="
};

const fs = require('fs');
const path = require('path');
const ytSearch = require('yt-search');
const { default: YTDlpWrap } = require('yt-dlp-wrap');

// Path to cookies.txt file
const cookiesFilePath = path.join(__dirname, 'cookies.txt');

// yt-dlp instance
const ytDlpWrap = new YTDlpWrap('yt-dlp');

// Function to refresh cookies automatically
function refreshCookies() {
  // Check if cookies.txt exists
  if (fs.existsSync(cookiesFilePath)) {
    // Logic to refresh cookies (this can be customized as per your requirements)
    console.log('Cookies are up-to-date or refreshed.');
  } else {
    console.log('cookies.txt file not found.');
  }
}

// Function to fetch video info and audio URL
async function fetchVideoInfoAndAudio(videoUrl, res) {
  try {
    console.time('VideoInfoFetch');

    // Refresh cookies before using them
    refreshCookies();

    // Execute yt-dlp command to fetch video info
    const output = await ytDlpWrap.execPromise([
      videoUrl,
      '--skip-download',
      '--dump-single-json',
      '--no-playlist',
      '--no-check-certificates',
      '--force-ipv4',
      '--format', 'bestaudio[ext=m4a]',
      '--no-warnings',
      '--ignore-errors',
      '--cookies', cookiesFilePath // Use cookies.txt for both Windows/Linux
    ]);

    console.timeEnd('VideoInfoFetch');
    const videoInfo = JSON.parse(output);

    const audioUrl = videoInfo.url || (videoInfo.formats?.find(f => f.ext === 'm4a')?.url);

    if (!audioUrl) throw new Error('No audio URL found');

    // Return video info and audio URL as JSON response
    return res.json({
      title: videoInfo.title,
      duration: videoInfo.duration,
      thumbnail: videoInfo.thumbnail,
      audio: audioUrl
    });

  } catch (err) {
    console.error('Fast fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch video', message: err.message });
  }
}

async function onStart({ res, req }) {
  const { prompt } = req.query;

  // Check if prompt query is provided
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt parameter is required' });
  }

  try {
    // Perform YouTube search
    const results = await ytSearch(prompt);

    if (!results?.videos?.length) {
      return res.status(404).json({ error: 'No videos found' });
    }

    const video = results.videos[0];
    const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

    // Fetch video info and audio URL
    await fetchVideoInfoAndAudio(videoUrl, res);

  } catch (err) {
    console.error('Search error:', err.message);
    return res.status(500).json({ error: 'Search failed', message: err.message });
  }
}

module.exports = { meta, onStart };
