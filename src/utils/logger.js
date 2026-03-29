const levels = { error: 0, warn: 1, info: 2, debug: 3 };

const getLogLevel = () => process.env.LOG_LEVEL || "info";

const logger = {
  error: (msg, ...args) => {
    if (levels[getLogLevel()] >= levels.error)
      console.error(`[ERROR] ${msg}`, ...args);
  },
  warn: (msg, ...args) => {
    if (levels[getLogLevel()] >= levels.warn)
      console.warn(`[WARN] ${msg}`, ...args);
  },
  info: (msg, ...args) => {
    if (levels[getLogLevel()] >= levels.info)
      console.log(`[INFO] ${msg}`, ...args);
  },
  debug: (msg, ...args) => {
    if (levels[getLogLevel()] >= levels.debug)
      console.log(`[DEBUG] ${msg}`, ...args);
  },
};

module.exports = logger;
