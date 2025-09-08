const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, 'logs.txt');

function logRequest(req, res, next) {
    const now = new Date();
    const isoString = now.toISOString();
    const logEntry = `[${isoString}] ${req.method} ${req.url}\n`;
    fs.appendFile(logFilePath, logEntry, err => {
        if (err) {
            console.error('Failed to write log:', err);
        }
    });
    if (typeof next === 'function') next();
}

module.exports = { logRequest };
