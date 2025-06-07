const express = require('express');
const fs = require('fs');
const path = require('path');
const { logEvent } = require('./log');
const runTracker = require('./tracker');
const { trackSnapshots } = require('./historicalTracker');
const runBatch = require('./batchRunner');
const logDir = path.resolve(__dirname, 'logs');

const app = express();
const PORT = process.env.PORT || 4000;

// Optional: Run batch on startup
//runBatch();

//setInterval(() => {
//  runBatch();
//}, 3 * 60 * 1000); // every 3 minutes

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// --- Express Setup (future API or debug routes if needed) ---
app.get('/', (req, res) => {
  res.send('Moonshot Trader is running.');
});

app.get('/active', (req, res) => {
  const activeTrades = JSON.parse(fs.readFileSync('activeTrades.json', 'utf-8'));
  res.render('active', { activeTrades });
});

app.get('/completed', (req, res) => {
  const completedTrades = JSON.parse(fs.readFileSync('completedTrades.json', 'utf-8'));
  res.render('completed', { completedTrades });
});

// Route: Show watchlist
app.get('/watchlist', (req, res) => {
  const watchlistPath = path.join(__dirname, 'watchlist.json');
  const raw = fs.readFileSync(watchlistPath);
  const tokens = Object.values(JSON.parse(raw)).sort((a, b) =>
    new Date(b.first_seen) - new Date(a.first_seen)
  );
  res.render('watchlist', { tokens });
});

// Route: Run batch now
app.post('/run-batch', async (req, res) => {
  await runBatch();
  res.redirect('/watchlist');
});

app.get('/download-watchlist', (req, res) => {
  const filePath = path.join(__dirname, 'watchlist.json');
  res.download(filePath, 'watchlist.json');
});

app.get('/logs', (req, res) => {
  fs.readdir(logDir, (err, files) => {
    if (err) {
      return res.status(500).send('Failed to read log directory.');
    }

    const logs = files
      .filter(file => file.endsWith('.log'))
      .map(file => ({
        name: file,
        viewPath: `/logs/view/${file}`,
        downloadPath: `/logs/download/${file}`,
      }))
      .sort((a, b) => b.name.localeCompare(a.name)); // newest first

    res.render('logs', {
      logs,
      currentLogPath: '/logs/view/system.log',
    });
  });
});

app.get('/logs/view/:filename', (req, res) => {
  const filePath = path.join(logDir, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Log file not found.');
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  res.render('log-view', {
    title: req.params.filename,
    content,
  });
});

app.get('/logs/download/:filename', (req, res) => {
  const filePath = path.join(logDir, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Log file not found.');
  }

  res.download(filePath);
});

// Start Server
app.listen(PORT, () => {
  logEvent('SYSTEM', `🚀 Server listening on port ${PORT}`);
  console.log(`🚀 Server listening on port ${PORT}`);
});