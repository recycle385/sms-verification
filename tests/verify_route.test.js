const request = require("supertest");
const express = require("express");
const verifyRouter = require("../src/routes/verify");
const EmailService = require("../src/services/email_service");
const cryptoUtils = require("../src/utils/crypto_utils");

// 1. 가짜 Express 앱 생성 (라우터만 테스트하기 위함)
const app = express();
app.use(express.json());
app.use("/verify", verifyRouter);

// 2. 외부 서비스 모킹 (IMAP 접속 방지)
jest.mock("../src/services/email_service");
jest.mock("../src/utils/crypto_utils");

describe("POST /verify/request 통합 테스트", () => {
  beforeEach(() => {
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

  it("유효한 인증 코드가 이메일에 있으면 200을 반환해야 한다", async () => {
    // 핵심! EmailService가 무조건 "가짜_메일_코드"를 찾았다고 가정하게 만듦
    EmailService.fetchLatestCode.mockResolvedValue("가짜_메일_코드");

    const response = await request(app)
      .post("/verify/request")
      .send({ d: "가짜_암호화된_문자열" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("telephone_Verification_Success");
  });

  it("이메일에서 인증 코드를 찾지 못하면 404를 반환해야 한다", async () => {
    // EmailService가 메일 검색에 실패(null 반환)했다고 가정
    EmailService.fetchLatestCode.mockResolvedValue(null);

    const response = await request(app)
      .post("/verify/request")
      .send({ d: "가짜_암호화된_문자열" });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("유효한 인증 코드가 없습니다");
  });
});
