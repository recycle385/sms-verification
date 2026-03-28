// src/utils/logger.js

// 로그 레벨 우선순위 정의
const levels = { error: 0, warn: 1, info: 2, debug: 3 };

// config를 직접 require하지 않고 환경변수를 바로 확인합니다.
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
