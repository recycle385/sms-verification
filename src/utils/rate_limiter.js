const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redisClient = require("./redis_client");
const logger = require("./logger");

const createRedisStore = (prefix) => {
  return new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: prefix,
  });
};

/**
 * 1. /verify/key (인증번호 발송 요청) 제한
 */
const keyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("rl:key:"),
  handler: (req, res) => {
    logger.warn(`[RATE-LIMIT] /key API 호출 초과: ${req.ip}`);
    res
      .status(429)
      .json({ error: "인증 요청이 너무 많습니다. 1분 후 다시 시도해주세요." });
  },
});

/**
 * 2. /verify/request (인증 확인 요청) 제한
 */
const requestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("rl:req:"),
  handler: (req, res) => {
    logger.warn(`[RATE-LIMIT] /request API 호출 초과: ${req.ip}`);
    res
      .status(429)
      .json({ error: "검증 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
  },
});

const targetLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: false,
  legacyHeaders: false,
  store: createRedisStore("limiter:target:"),
  keyGenerator: (req) =>
    req.body?.p ? `phone:${req.body.p}` : ipKeyGenerator(req),
  handler: (req, res) => {
    res.status(429).json({ error: "인증 한도를 초과했습니다." });
  },
});

module.exports = { keyLimiter, requestLimiter, targetLimiter };
