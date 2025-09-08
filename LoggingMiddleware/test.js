const { log } = require('./loggingMiddleware');

(async () => {
    try {
        await log({
            stack: 'backend',
            level: 'info',
            package: 'middleware',
            message: 'Test log from script',
            method: 'TEST',
            url: '/test'
        });
        console.log('Log sent successfully');
    } catch (e) {
        console.error('Failed to send log:', e);
        process.exit(1);
    }
})();


