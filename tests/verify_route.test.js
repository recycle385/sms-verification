const request = require("supertest");
const express = require("express");
const verifyRouter = require("../src/routes/verify");
const cryptoUtils = require("../src/utils/crypto_utils");
const redisClient = require("../src/utils/redis_client");

// 1. 가짜 Express 앱 생성 (라우터만 테스트하기 위함)
const app = express();
app.use(express.json());
app.use("/verify", verifyRouter);

// 2. 외부 서비스 모킹 (Redis 추가, EmailService 제거)
jest.mock("../src/utils/crypto_utils");

// Redis 클라이언트 모킹 (get, set, del)
jest.mock("../src/utils/redis_client", () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

describe("POST /verify/request 통합 테스트", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // 이전 테스트의 목 상태 초기화

    // RSA 복호화 성공 가정 (가짜 파싱 데이터)
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
  });

  it("유효한 인증 코드가 Redis에 있으면 200을 반환하고 데이터를 삭제해야 한다", async () => {
    // EmailService 대신 Redis에 인증 코드가 있다고 모킹
    redisClient.get.mockResolvedValue("가짜_메일_코드");

    const response = await request(app)
      .post("/verify/request")
      .send({ d: "가짜_암호화된_문자열" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("telephone_Verification_Success");

    // 검증이 끝난 후 Redis에서 del이 호출되었는지 확인 (재사용 방지)
    expect(redisClient.del).toHaveBeenCalled();
  });

  it("Redis에 인증 코드가 없으면 404를 반환해야 한다", async () => {
    // Redis에 아직 데이터가 들어오지 않았음 (null)을 가정
    redisClient.get.mockResolvedValue(null);

    const response = await request(app)
      .post("/verify/request")
      .send({ d: "가짜_암호화된_문자열" });

    expect(response.status).toBe(404);
    // 변경된 메시지 반영
    expect(response.body.message).toBe(
      "유효한 인증 코드가 없습니다 (잠시 후 다시 시도)",
    );
  });
});
