require("dotenv").config();
const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");
const config = require("./config");
const redisClient = require("./utils/redis_client");

// config.js에 등록된 허용된 통신사 도메인 목록 추출
const ALLOWED_DOMAINS = Object.values(config.EMAIL_DOMAIN);

// 이메일 본문에서 인증 코드 추출하는 함수
async function extractEmailCode(message) {
  try {
    const all = message.parts.find(
      (part) => part.which === "TEXT" || part.which === "",
    );
    const id = message.attributes.uid;
    const mail = await simpleParser(`Imap-Id: ${id}\r\n${all.body}`);
    const body = mail.text || "";

    const extractedCode = body.split("====")[0].trim();

    // 유효한 길이인지 확인 (기존 60~100자 조건 반영)
    if (extractedCode.length >= 60 && extractedCode.length <= 100) {
      return extractedCode;
    }
    return null;
  } catch (err) {
    console.error("[WORKER] 이메일 코드 추출 실패:", err);
    return null;
  }
}

// 지속적으로 새 메일을 확인하고 Redis에 저장하는 함수
async function startWorker() {
  let connection;
  let pollingInterval; // 강제 확인용 타이머 변수

  try {
    console.log("[WORKER] 구글 IMAP 서버 접속 시도 중...");
    connection = await imaps.connect({ imap: config.IMAP_CONFIG });
    await connection.openBox("INBOX");
    console.log("[WORKER] IMAP 연결 성공! 새 메일 감시를 시작합니다.");

    // 새 메일을 가져와 처리하는 핵심 로직
    const fetchNewMails = async () => {
      try {
        const searchCriteria = ["UNSEEN"];
        const fetchOptions = {
          bodies: ["HEADER", "TEXT"],
          struct: true,
          markSeen: true,
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        for (const msg of messages) {
          // 1. 보낸 사람 이메일 헤더 추출
          const headerPart = msg.parts.find((p) => p.which === "HEADER");
          const fromHeader = headerPart.body.from[0];

          // 정규식을 통해 순수 이메일 주소 포맷만 정확하게 추출
          const emailMatch = fromHeader.match(
            /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/,
          );
          const senderEmail = emailMatch ? emailMatch[1] : null;

          if (!senderEmail) continue;

          // 2. config.js에 등록된 통신사 도메인과 일치하는지 검증 (헤더 검증)
          const isAllowedSender = ALLOWED_DOMAINS.some((domain) =>
            senderEmail.endsWith(domain),
          );

          if (!isAllowedSender) {
            console.log(
              `[WORKER] ⚠️ 헤더 검증 실패 (허용되지 않은 도메인): ${senderEmail}`,
            );
            continue; // 통신사 도메인이 아니면 무시
          }

          // 3. 헤더 검증을 통과한 메일만 본문에서 코드 추출 후 Redis 저장
          const code = await extractEmailCode(msg);

          if (code) {
            // Redis에 이메일을 키로 하여 5분(300초) 동안 코드 저장
            await redisClient.setEx(`verify:${senderEmail}`, 300, code);
            console.log(
              `[WORKER] ✅ 헤더 검증 통과 및 Redis 저장 완료: ${senderEmail}`,
            );
          } else {
            console.log(
              `[WORKER] ❌ ${senderEmail} 메일에서 유효한 코드를 찾지 못함.`,
            );
          }
        }
      } catch (err) {
        console.error("[WORKER FETCH ERROR]", err.message);
      }
    };

    // [트랙 1] IMAP 이벤트 기반 감지 (최우선 순위, 빠름)
    connection.imap.on("mail", (numNewMsgs) => {
      console.log(`[WORKER] 📧 이벤트 감지: 새 메일 도착!`);
      fetchNewMails();
    });

    // [트랙 2] 강제 폴링 (안전장치: 구글 서버가 이벤트를 씹었을 때를 대비해 10초마다 확인)
    pollingInterval = setInterval(() => {
      fetchNewMails();
    }, 10000);

    connection.on("error", (err) => {
      console.error("[WORKER ERROR]", err);
    });

    connection.on("end", () => {
      console.log(
        "[WORKER] IMAP 연결이 끊어졌습니다. 타이머를 멈추고 재연결합니다...",
      );
      clearInterval(pollingInterval); // 기존 타이머 정리
      setTimeout(startWorker, 5000);
    });
  } catch (err) {
    console.error("[WORKER FATAL ERROR]", err);
    if (pollingInterval) clearInterval(pollingInterval);
    setTimeout(startWorker, 5000);
  }
}

// 워커 실행
startWorker();
