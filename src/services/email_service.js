const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");
const config = require("../config");

const EmailService = {
  /**
   * 이메일 본문에서 인증 코드 추출
   */
  extractEmailCode: async (message) => {
    try {
      const all = message.parts.find(
        (part) => part.which === "TEXT" || part.which === "",
      );
      const id = message.attributes.uid;
      const idHeader = "Imap-Id: " + id + "\r\n";

      const mail = await simpleParser(idHeader + all.body);
      const body = mail.text || "";

      const extractedCode = body.split("====")[0].trim();
      if (extractedCode.length >= 60 && extractedCode.length <= 100) {
        console.log("코드 추출 성공", extractedCode);
        return extractedCode;
      }
      return null;
    } catch (err) {
      console.error("이메일 코드 추출 실패:", err);
      return null;
    }
  },

  /**
   * IMAP에 연결하여 최근 메일에서 인증 코드를 가져옴
   */
  fetchLatestCode: async (targetSender) => {
    let connection;
    try {
      console.log("[IMAP] 연결 시도 중...");
      connection = await imaps.connect({ imap: config.IMAP_CONFIG });
      await connection.openBox("INBOX");
      console.log("[IMAP] INBOX 열기 성공. 연결 완료.");

      const delay = 5 * 60 * 1000; // 5분
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setTime(Date.now() - delay);

      console.log(
        `[IMAP] 검색 조건: '${targetSender}' 로부터, ${fiveMinutesAgo.toISOString()} 이후 수신된 메일`,
      );

      const searchCriteria = [
        ["FROM", targetSender],
        ["SINCE", fiveMinutesAgo.toISOString()],
      ];
      const fetchOptions = { bodies: ["HEADER", "TEXT"], struct: true };

      console.log("[IMAP] 조건에 맞는 이메일 검색 중...");
      const messages = await connection.search(searchCriteria, fetchOptions);
      console.log(`[IMAP] 검색된 메일 총 개수: ${messages.length}개`);

      // 최근 3개 이메일만 확인 (뒤에서부터 3개)
      const targetMessages = messages.slice(-3).reverse();
      console.log(
        `[IMAP] 검사할 메일 개수(최근 최대 3개): ${targetMessages.length}개`,
      );

      for (let i = 0; i < targetMessages.length; i++) {
        const msg = targetMessages[i];
        console.log(`[IMAP] 메일 #${i + 1} 본문에서 인증 코드 추출 시도...`);
        const extracted = await EmailService.extractEmailCode(msg);

        if (extracted) {
          console.log(
            `[IMAP] ✅ 유효한 코드 발견 성공 (길이: ${extracted.length}자)`,
          );
          return extracted;
        } else {
          console.log(`[IMAP] ❌ 메일 #${i + 1}에서 코드를 찾지 못함.`);
        }
      }

      return null;
    } finally {
      if (connection) {
        console.log("[IMAP] 정상 종료 처리 중...");
        connection.end();
        console.log("[IMAP] 연결 종료 완료.");
      }
    }
  },
};

module.exports = EmailService;
