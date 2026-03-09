require('dotenv').config();
const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files — serve Angular build
const angularDist = path.join(__dirname, 'frontend', 'dist', 'frontend', 'browser');
app.use(express.static(angularDist));

// API routes
app.use('/api', apiRoutes);

// Angular SPA fallback — all non-API routes serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(angularDist, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🐔 AKOHO server running on http://localhost:${PORT}`);
});
