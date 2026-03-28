const redis = require("redis");

// Redis 클라이언트 생성 (Docker-compose 설정에 맞춰 호스트명은 'redis')
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: 6379,
  },
});

redisClient.on("error", (err) => console.error("[REDIS ERROR]", err));
redisClient.on("connect", () => console.log("[REDIS] 연결 성공!"));

// 서버 구동 시 즉시 연결
redisClient.connect().catch(console.error);

module.exports = redisClient;
