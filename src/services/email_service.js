const { google } = require("googleapis");
const config = require("../config");
const logger = require("../utils/logger");
const redisClient = require("../utils/redis_client");

const oauth2Client = new google.auth.OAuth2(
  config.GMAIL_CONFIG.clientId,
  config.GMAIL_CONFIG.clientSecret,
);
oauth2Client.setCredentials({
  refresh_token: config.GMAIL_CONFIG.refreshToken,
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

const EmailService = {
  fetchAndMatchMails: async (validSenders) => {
    try {
      // 1. 읽지 않은 메일 목록 조회 (q: query 사용)
      const res = await gmail.users.messages.list({
        userId: "me",
        q: "is:unread",
        maxResults: 10,
      });

      if (!res.data.messages) return;

      for (const msgInfo of res.data.messages) {
        // 2. 개별 메일 상세 내용 가져오기
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: msgInfo.id,
        });

        const headers = msg.data.payload.headers;
        const fromHeader = headers.find((h) => h.name === "From").value;
        const emailMatch = fromHeader.match(
          /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/,
        );
        const sender = emailMatch ? emailMatch[1] : null;

        if (sender && validSenders.includes(sender)) {
          // 3. 본문 데이터 추출 (Base64 디코딩)
          let body = "";
          if (msg.data.payload.parts) {
            body = Buffer.from(
              msg.data.payload.parts[0].body.data,
              "base64",
            ).toString();
          } else {
            body = Buffer.from(msg.data.payload.body.data, "base64").toString();
          }

          const extractedCode = body.split("====")[0].trim();

          if (extractedCode.length >= 60) {
            await redisClient.setEx(`verify:${sender}`, 300, extractedCode);
            await redisClient.del(`search:${sender}`);
            // 읽음 처리 (라벨 수정)
            await gmail.users.messages.batchModify({
              userId: "me",
              requestBody: { ids: [msgInfo.id], removeLabelIds: ["UNREAD"] },
            });
            logger.info(`[GMAIL-SUCCESS] 코드 획득: ${sender}`);
          }
        }
      }
    } catch (err) {
      logger.error(`[GMAIL-API] 오류: ${err.message}`);
    }
  },
};

module.exports = EmailService;
