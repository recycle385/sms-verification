require("dotenv").config();
const os = require("os");

const config = {
  // 기본 인증 정보
  EMAIL_ACCOUNT: process.env.EMAIL_USER,
  PASSWORD: process.env.EMAIL_PASSWORD,
  HMAC_KEY: process.env.HMAC_KEY,
  P_K_CONTENT: process.env.P_K_CONTENT,

  // 암호화/해시 설정값
  HMAC_SLICE_START: parseInt(process.env.HMAC_SLICE_START || "25"),
  HMAC_SLICE_END: parseInt(process.env.HMAC_SLICE_END || "30"),
  CHALLENGE_SLICE_START: parseInt(process.env.CHALLENGE_SLICE_START || "20"),
  CHALLENGE_SLICE_END: parseInt(process.env.CHALLENGE_SLICE_END || "28"),
  MAX_DECRYPT_SIZE: parseInt(process.env.MAX_DECRYPT_SIZE || "8192"),

  EMAIL_DOMAIN: {
    KT: process.env.KT_EMAIL,
    LG: process.env.LG_EMAIL,
    SKT: process.env.SKT_EMAIL,
  },

  // 로깅 레벨
  LOG_LEVEL: process.env.LOG_LEVEL || "info",

  // RSA 키 크기 제한
  MAX_RSA_KEY_SIZE: parseInt(process.env.MAX_RSA_KEY_SIZE || "4096"),

  // IMAP 서버 설정
  IMAP_CONFIG: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    authTimeout: 5000,
  },
};

const validateConfig = () => {
  const errors = [];
  const requiredVars = [
    "EMAIL_USER",
    "EMAIL_PASSWORD",
    "HMAC_KEY",
    "P_K_CONTENT",
  ];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      errors.push(`필수 환경변수 '${varName}'가 설정되지 않았습니다.`);
    }
  });

  if (config.HMAC_SLICE_START >= config.HMAC_SLICE_END) {
    errors.push("HMAC_SLICE_START는 HMAC_SLICE_END보다 작아야 합니다.");
  }

  if (errors.length > 0) {
    throw new Error("설정 오류:\n" + errors.join("\n"));
  }
  return true;
};

// 초기화 시 검증
validateConfig();

module.exports = config;
