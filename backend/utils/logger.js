// utils/logger.js - COMPLETE FIXED VERSION
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// ==================== LOG LEVELS ====================
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  silly: 5
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  silly: 'cyan'
};

// Add colors to winston
winston.addColors(colors);

// ==================== CREATE LOGS DIRECTORY ====================
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ==================== CUSTOM FORMATS ====================
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const log = {
      timestamp,
      level,
      message,
      ...meta
    };
    
    if (stack) {
      log.stack = stack;
    }
    
    // Remove undefined values
    Object.keys(log).forEach(key => log[key] === undefined && delete log[key]);
    
    return JSON.stringify(log, null, 0);
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// ==================== TRANSPORTS ====================

// Daily rotate file for all logs
const dailyRotateFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
  level: process.env.LOG_LEVEL || 'info'
});

// Error log separate file
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat,
  level: 'error'
});

// HTTP request log separate file
const httpFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'http-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  format: logFormat,
  level: 'http'
});

// Console transport for development
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

// ==================== CREATE LOGGER ====================
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    dailyRotateFileTransport,
    errorFileTransport,
    httpFileTransport
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(consoleTransport);
}

// ==================== STREAM FOR MORGAN ====================
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// ==================== HELPER FUNCTIONS ====================

// Log with additional context
logger.logWithContext = (level, message, context = {}) => {
  logger.log(level, message, {
    ...context,
    timestamp: new Date().toISOString()
  });
};

// Log API request
logger.logRequest = (req, res, responseTime) => {
  logger.http(`${req.method} ${req.url} - ${responseTime}ms`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?._id,
    userAgent: req.get('user-agent'),
    responseTime,
    statusCode: res.statusCode
  });
};

// Log API response
logger.logResponse = (req, res, data) => {
  logger.debug(`Response sent for ${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseSize: JSON.stringify(data).length
  });
};

// Log database query
logger.logQuery = (query, duration) => {
  logger.debug(`Database query executed in ${duration}ms`, {
    query: query.getFilter ? query.getFilter() : query,
    duration
  });
};

// Log external API call
logger.logExternalAPI = (service, method, url, duration, status) => {
  logger.info(`External API call to ${service}`, {
    service,
    method,
    url,
    duration,
    status
  });
};

// Log security event
logger.logSecurity = (event, userId, ip, details = {}) => {
  logger.warn(`Security event: ${event}`, {
    event,
    userId,
    ip,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Log business event
logger.logBusiness = (event, userId, details = {}) => {
  logger.info(`Business event: ${event}`, {
    event,
    userId,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// ==================== CLEANUP OLD LOGS ====================
logger.cleanup = async (daysToKeep = 30) => {
  try {
    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    let deletedCount = 0;

    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

      if (fileAge > daysToKeep) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });

    logger.info(`Cleaned up ${deletedCount} old log files`);
    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning up logs:', error);
    return 0;
  }
};

// ==================== GET LOGS ====================
logger.getLogs = (date, level = 'info') => {
  try {
    const logFile = path.join(logsDir, `${level}-${date}.log`);
    
    if (!fs.existsSync(logFile)) {
      return [];
    }

    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
  } catch (error) {
    logger.error('Error reading logs:', error);
    return [];
  }
};

// ==================== EXPORTS ====================
module.exports = logger;