const responseTime = require('response-time');
const compression = require('compression');

const performanceMiddleware = (app) => {
  // Compress responses
  app.use(compression());

  // Track response time
  app.use(responseTime((req, res, time) => {
    console.log(`${req.method} ${req.url} - ${time.toFixed(2)}ms`);
    
    // Log slow requests
    if (time > 1000) {
      console.warn(`Slow request: ${req.method} ${req.url} - ${time.toFixed(2)}ms`);
    }
  }));

  // Add performance headers
  app.use((req, res, next) => {
    res.setHeader('X-Response-Time', Date.now() - req.startTime);
    next();
  });
};

module.exports = performanceMiddleware;