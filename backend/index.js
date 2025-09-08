const express = require('express');
const bodyParser = require('body-parser');
const { logRequest } = require('../LoggingMiddleware/loggingMiddleware');
const { nanoid } = require('nanoid');
const path = require('path');

const app = express();
const port = 3000;

const urlDatabase = {};

app.use(bodyParser.json());
app.use(logRequest);
app.use(express.static(path.join(__dirname, '../frontend/dist')));


app.post('/shorturls', (req, res) => {
    const { url, validity, shortcode } = req.body;
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    let id;
    if (shortcode) {
        if (typeof shortcode !== 'string' || !/^[a-zA-Z0-9_-]{3,30}$/.test(shortcode)) {
            return res.status(400).json({ error: 'Invalid custom short URL.' });
        }
        if (urlDatabase[shortcode]) {
            return res.status(409).json({ error: 'Custom short URL already exists.' });
        }
        id = shortcode;
    } else {
        do {
            id = nanoid(7);
        } while (urlDatabase[id]);
    }

    let expiry = null;
    if (validity && typeof validity === 'number' && validity > 0) {
        expiry = Date.now() + validity * 60 * 1000;
    }

    urlDatabase[id] = { url, expiry };

    const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
    const shortLink = `${baseUrl}/u/${id}`;
    const expiryIso = expiry ? new Date(expiry).toISOString() : null;
    const expiryHuman = expiry ? new Date(expiry).toLocaleString() : null;
    res.json({
        shortLink,
        expiryIso,
        expiryHuman
    });
});

app.post('/shorturls/batch', (req, res) => {
    const items = req.body;
    if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Request body must be an array' });
    }
    if (items.length === 0 || items.length > 5) {
        return res.status(400).json({ error: 'Provide between 1 and 5 items' });
    }

    const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));

    const results = items.map((item, index) => {
        const { url, validity, shortcode } = item || {};
        if (!url || typeof url !== 'string') {
            return { index, error: 'Invalid URL', status: 400 };
        }

        let id;
        if (shortcode) {
            if (typeof shortcode !== 'string' || !/^[a-zA-Z0-9_-]{3,30}$/.test(shortcode)) {
                return { index, error: 'Invalid custom short URL.', status: 400 };
            }
            if (urlDatabase[shortcode]) {
                return { index, error: 'Custom short URL already exists.', status: 409 };
            }
            id = shortcode;
        } else {
            do {
                id = nanoid(7);
            } while (urlDatabase[id]);
        }

        let expiry = null;
        if (validity && typeof validity === 'number' && validity > 0) {
            expiry = Date.now() + validity * 60 * 1000;
        }

        urlDatabase[id] = { url, expiry };
        const shortLink = `${baseUrl}/u/${id}`;
        const expiryIso = expiry ? new Date(expiry).toISOString() : null;
        const expiryHuman = expiry ? new Date(expiry).toLocaleString() : null;
        return {
            index,
            shortLink,
            expiryIso,
            expiryHuman
        };
    });

    res.json(results);
});

app.get('/u/:id', (req, res) => {
    const now = new Date();
    const isoString = now.toISOString();
    const logEntry = `[${isoString}] GET /u/${req.params.id}\n`;
    const fs = require('fs');
    const path = require('path');
    const logFilePath = path.join(__dirname, '../LoggingMiddleware/logs.txt');
    fs.appendFile(logFilePath, logEntry, err => {
        if (err) {
            console.error('Failed to write log:', err);
        }
    });

    const { id } = req.params;
    const entry = urlDatabase[id];
    if (entry) {
        if (entry.expiry && Date.now() > entry.expiry) {
            delete urlDatabase[id];
            return res.status(410).json({ error: 'Short URL expired' });
        }
        res.redirect(entry.url);
    } else {
        res.status(404).json({ error: 'URL not found' });
    }
});

app.listen(port, () => {
    logRequest({ method: 'INIT', url: `Server started on port ${port}` }, {}, () => {});
});

module.exports = app;
