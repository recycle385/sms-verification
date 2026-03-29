const request = require("supertest");
const express = require("express");
const verifyRouter = require("../src/routes/verify");
const cryptoUtils = require("../src/utils/crypto_utils");
const redisClient = require("../src/utils/redis_client");

// 1. 가짜 Express 앱 생성
const app = express();
app.use(express.json());
app.use("/verify", verifyRouter);

// 2. 외부 서비스 및 미들웨어 모킹
jest.mock("../src/utils/crypto_utils");

// 테스트 환경이 환경변수에 의존하지 않도록 Config 모킹
jest.mock("../src/config", () => ({
  EMAIL_DOMAIN: {
    SKT: "skt.com",
    KT: "kt.com",
    LG: "lg.com",
  },
}));

// 테스트 중 콘솔 로그가 찍히지 않도록 Logger 모킹
jest.mock("../src/utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Rate Limiter 미들웨어 모킹 (유닛 테스트에서는 그대로 통과)
jest.mock("../src/utils/rate_limiter", () => ({
  keyLimiter: (req, res, next) => next(),
  requestLimiter: (req, res, next) => next(),
  targetLimiter: (req, res, next) => next(),
}));

// Redis 클라이언트 모킹 (rate limit용 incr, expire 추가)
jest.mock("../src/utils/redis_client", () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
}));

describe("verify 라우터 통합 테스트", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // RSA 복호화 성공 가정 (새로운 포맷: 번호|통신사|finger|challenge|hmac|time)
    cryptoUtils.decryptWithRsa.mockReturnValue(
      "01012345678|SKT|finger|challenge|hmac|time",
    );

    // 이메일 디코딩 성공 가정
    cryptoUtils.decodeString.mockReturnValue(
      "finger|challenge_hash|hmac_hash|time",
    );

    // 기타 암호화 로직 모킹
    cryptoUtils.generateChallengePlain.mockReturnValue("challenge_hash");
    cryptoUtils.generateHmacResponse.mockReturnValue("hmac_hash");

    // Rate Limit 방어 로직 통과를 위한 기본값 설정
    redisClient.incr.mockResolvedValue(1);
  });

  describe("POST /verify/request (인증 확인 요청)", () => {
    it("유효한 인증 코드가 Redis에 있으면 200을 반환하고 데이터를 삭제해야 한다", async () => {
      redisClient.get.mockResolvedValue("가짜_메일_코드");

      const response = await request(app)
        .post("/verify/request")
        .send({ d: "가짜_암호화된_문자열" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("telephone_Verification_Success");

      // 검증이 끝난 후 Redis에서 del이 호출되었는지 확인 (재사용 방지)
      expect(redisClient.del).toHaveBeenCalledWith(
        "verify:01012345678@skt.com",
      );
    });

    it("단일 대상 요청이 10회를 초과하면 429(Rate Limit)를 반환해야 한다", async () => {
      // 10회 초과 상황 모킹
      redisClient.incr.mockResolvedValue(11);

      const response = await request(app)
        .post("/verify/request")
        .send({ d: "가짜_암호화된_문자열" });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe("잠시 후 다시 시도해주세요.");
    });

    it("Redis에 인증 코드가 없으면 404를 반환해야 한다", async () => {
      redisClient.get.mockResolvedValue(null);

      const response = await request(app)
        .post("/verify/request")
        .send({ d: "가짜_암호화된_문자열" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(
        "유효한 인증 코드가 없습니다 (잠시 후 다시 시도)",
      );
    });
  });

  describe("POST /verify/key (인증번호 발송 요청)", () => {
    it("정상적인 요청 시 Redis에 탐색 예약을 하고 HMAC을 반환해야 한다", async () => {
      const response = await request(app)
        .post("/verify/key")
        .send({ d: "challenge_code", p: "01012345678", c: "SKT" });

      expect(response.status).toBe(200);
      expect(response.body.hmac).toBe("hmac_hash");

      // 기존 인증 데이터 삭제 및 새로운 탐색(search) 키 등록 확인
      expect(redisClient.del).toHaveBeenCalledWith(
        "verify:01012345678@skt.com",
      );
      expect(redisClient.set).toHaveBeenCalledWith(
        "search:01012345678@skt.com",
        expect.any(String),
        { EX: 40 },
      );
    });

    it("필수 데이터가 누락되면 400을 반환해야 한다", async () => {
      const response = await request(app)
        .post("/verify/key")
        .send({ d: "challenge_code" }); // p(번호), c(통신사) 누락

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("필수 데이터 누락");
    });

    it("지원하지 않는 통신사면 400을 반환해야 한다", async () => {
      const response = await request(app)
        .post("/verify/key")
        .send({ d: "challenge_code", p: "01012345678", c: "UNKNOWN" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("지원하지 않는 통신사");
    });
  });
});
