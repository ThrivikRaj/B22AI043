const fetchFn = typeof fetch === 'function' ? fetch : ((...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)));

// Auth and log forwarding configuration
const AUTH_URL = 'http://20.244.56.144/evaluation-service/logs';
const AUTH_BODY = {
    email: 'thrivikrajg@gmail.com',
    name: 'thrivikraj',
    rollNo: 'b22ai043',
    accessCode: 'qqQzZk',
    clientID: '4e311280-8768-42b2-b1a5-723528d71d77',
    clientSecret: 'UGBdsPCeAtgUTXPC'
};

let cachedToken = null;
let tokenExpiryEpochMs = 0;
let inflightTokenPromise = null;

async function fetchToken() {
    const nowMs = Date.now();
    if (cachedToken && nowMs < tokenExpiryEpochMs - 5_000) {
        return cachedToken;
    }
    if (inflightTokenPromise) {
        return inflightTokenPromise;
    }
    inflightTokenPromise = (async () => {
        try {
            const response = await fetchFn(AUTH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(AUTH_BODY)
            });
            if (!response.ok) {
                throw new Error(`Auth failed with status ${response.status}`);
            }
            const data = await response.json();
            // Expecting { access_token, expires_in } shape; fallback if different
            const token = data.access_token || data.token || data.accessToken;
            const expiresInSec = data.expires_in || data.expiresIn || 300;
            if (!token) {
                throw new Error('Auth response missing access token');
            }
            cachedToken = token;
            tokenExpiryEpochMs = Date.now() + (Number(expiresInSec) || 300) * 1000;
            return cachedToken;
        } finally {
            inflightTokenPromise = null;
        }
    })();
    return inflightTokenPromise;
}

async function forwardLog(message) {
    try {
        let token = await fetchToken();
        let response = await fetchFn(AUTH_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(message)
        });
        if (response.status === 401) {
            // Token might be expired or invalid; refresh once
            cachedToken = null;
            tokenExpiryEpochMs = 0;
            token = await fetchToken();
            response = await fetchFn(AUTH_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(message)
            });
        }
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Log forward failed ${response.status}: ${text}`);
        }
    } catch (err) {
        // Fallback to file logging already handled by caller; just surface error
        console.error('Remote log failed:', err.message || err);
    }
}

const ALLOWED_STACKS = new Set(['backend', 'frontend']);
const ALLOWED_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal']);
const ALLOWED_BACKEND_PACKAGES = new Set([
    'cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service'
]);
const ALLOWED_FRONTEND_PACKAGES = new Set(['api', 'component', 'hook', 'page', 'state', 'style']);
const ALLOWED_SHARED_PACKAGES = new Set(['auth', 'config', 'middleware', 'utils']);

function sanitizeLevel(level) {
    return ALLOWED_LEVELS.has(level) ? level : 'info';
}

function sanitizePackage(stack, pkg) {
    if (ALLOWED_SHARED_PACKAGES.has(pkg)) return pkg;
    if (stack === 'frontend') {
        return ALLOWED_FRONTEND_PACKAGES.has(pkg) ? pkg : 'api';
    }
    // default to backend
    return ALLOWED_BACKEND_PACKAGES.has(pkg) ? pkg : 'route';
}

async function log({ stack, level, package: pkg, message, method, url, timestamp }) {
    const safeStack = ALLOWED_STACKS.has(String(stack)) ? String(stack) : 'backend';
    const safeLevel = sanitizeLevel(String(level));
    const safePackage = sanitizePackage(safeStack, String(pkg));
    const iso = timestamp || new Date().toISOString();
    const payload = {
        stack: safeStack,
        level: safeLevel,
        package: safePackage,
        timestamp: iso,
        method: method || 'LOG',
        url: url || '-',
        message: message || ''
    };
    await forwardLog(payload);
}

function logRequest(req, res, next) {
    const now = new Date();
    const isoString = now.toISOString();
    const rawStack = String(req.headers['x-log-stack'] || '').toLowerCase();
    const stack = ALLOWED_STACKS.has(rawStack) ? rawStack : 'backend';
    const levelHeader = String(req.headers['x-log-level'] || '').toLowerCase();
    const packageHeader = String(req.headers['x-log-package'] || '').toLowerCase();
    const level = sanitizeLevel(levelHeader);
    const pkg = sanitizePackage(stack, packageHeader);

    const payload = {
        stack,
        level,
        package: pkg,
        timestamp: isoString,
        method: req.method,
        url: req.url,
        message: `${req.method} ${req.url}`
    };

    forwardLog(payload).catch(() => {});

    if (typeof next === 'function') next();
}

module.exports = { logRequest, log };
