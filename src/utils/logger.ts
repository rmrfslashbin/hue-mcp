import winston from 'winston';

// Create logger that only writes to stderr (never stdout)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Only use stderr for all output - stdout is reserved for MCP JSON-RPC
    new winston.transports.Console({
      stderrLevels: ['error', 'warn', 'info', 'debug', 'verbose', 'silly'],
      consoleWarnLevels: [],
    })
  ],
  // Prevent any output to stdout
  exitOnError: false,
});

// Helper methods for common log patterns
export const log = {
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
  },
  
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
  },
  
  error: (message: string, error?: Error | any, meta?: any) => {
    logger.error(message, { 
      error: error?.message || error,
      stack: error?.stack,
      ...meta 
    });
  },
  
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
  },
  
  // Special method for MCP server lifecycle events
  mcp: (event: string, meta?: any) => {
    logger.info('MCP Server Event', { event, ...meta });
  },
  
  // Special method for Hue API interactions
  hue: (action: string, meta?: any) => {
    logger.debug('Hue API', { action, ...meta });
  }
};

export default logger;