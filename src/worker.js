require("dotenv").config();
const redisClient = require("./utils/redis_client");
const logger = require("./utils/logger");
const EmailService = require("./services/email_service");

async function startWorker() {
  logger.info("[WORKER] Gmail API 온디맨드 감시 모드 가동!");

  setInterval(async () => {
    try {
      // 1. 신호 수집
      const keys = await redisClient.keys("search:*");
      if (keys.length === 0) return;

      // 2. 배치 조회
      const values = await redisClient.mGet(keys);
      const nowSec = Math.floor(Date.now() / 1000);

      // 3. 교집합 필터링 (5초 대기 끝난 유저만)
      const validSenders = keys
        .filter((key, i) => values[i] && nowSec >= Number(values[i]))
        .map((key) => key.replace("search:", ""));

      // 4. 중앙 제어: Gmail API 호출
      if (validSenders.length > 0) {
        logger.debug(`[GMAIL-FETCH] ${validSenders.length}명 탐색 중...`);
        await EmailService.fetchAndMatchMails(validSenders);
      }
    } catch (err) {
      logger.error(`[WORKER-LOOP] 오류: ${err.message}`);
    }
  }, 3000); // 3초 주기
}

startWorker();
