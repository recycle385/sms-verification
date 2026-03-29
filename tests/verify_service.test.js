const VerifyService = require("../src/services/verify_service");
const cryptoUtils = require("../src/utils/crypto_utils");

// 외부 의존성(cryptoUtils)을 가짜(Mock)로 만듭니다.
jest.mock("../src/utils/crypto_utils");

describe("VerifyService.validateMailData 테스트", () => {
  let serverParams;
  let mailParams;

  beforeEach(() => {
    serverParams = {
      sFingerprint: "finger_123",
      sChallengeCode: "challenge_123",
      sTimeStamp: "20231024120000",
    };

    mailParams = {
      mFingerprint: "finger_123",
      mChallengeCode: "hashed_challenge_123", // 예상되는 챌린지 해시값
      mHmac: "hmac_123", // 예상되는 HMAC 값
      mTimeStamp: "20231024120000",
    };

    // 모킹된 함수들이 반환할 '정답' 값을 세팅합니다.
    cryptoUtils.generateChallengePlain.mockReturnValue("hashed_challenge_123");
    cryptoUtils.generateHmacResponse.mockReturnValue("hmac_123");
  });

  it("1. 모든 데이터가 일치하면 success: true를 반환해야 한다", () => {
    const result = VerifyService.validateMailData(serverParams, mailParams);
    expect(result.success).toBe(true);
  });

  it("2. TimeStamp가 다르면 실패해야 한다", () => {
    mailParams.mTimeStamp = "20239999999999"; // 틀린 값 주입
    const result = VerifyService.validateMailData(serverParams, mailParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe("TimeStamp 불일치");
  });

  it("3. Fingerprint가 다르면 실패해야 한다", () => {
    mailParams.mFingerprint = "wrong_finger";
    const result = VerifyService.validateMailData(serverParams, mailParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Fingerprint 불일치");
  });

  it("4. ChallengeCode가 다르면 실패해야 한다", () => {
    mailParams.mChallengeCode = "wrong_challenge";
    const result = VerifyService.validateMailData(serverParams, mailParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe("ChallengeCode 불일치");
  });

  it("5. HMAC이 다르면 실패해야 한다", () => {
    mailParams.mHmac = "wrong_hmac"; // 틀린 HMAC 주입
    const result = VerifyService.validateMailData(serverParams, mailParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe("HMAC 불일치");
  });
});
