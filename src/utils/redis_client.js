const redis = require("redis");
const logger = require("./logger");

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: 6379,
  },
});

redisClient.on("error", (err) => logger.error(`[REDIS ERROR] ${err.message}`));
redisClient.on("connect", () => logger.info("[REDIS] 연결 성공!"));

redisClient
  .connect()
  .catch((err) => logger.error(`[REDIS-CONN] 실패: ${err.message}`));

module.exports = redisClient;
