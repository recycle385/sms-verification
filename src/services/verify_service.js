const cryptoUtils = require("../utils/crypto_utils");

/**
 * 추출된 메일 코드와 서버 데이터를 비교 검증하는 순수 서비스
 */
const VerifyService = {
  validateMailData: (serverParams, mailParams) => {
    const { sFingerprint, sChallengeCode, sTimeStamp } = serverParams;
    const { mFingerprint, mChallengeCode, mHmac, mTimeStamp } = mailParams;

    console.log(
      `[VERIFY-CHECK 1/4] TimeStamp 비교 (Server: ${sTimeStamp} vs Mail: ${mTimeStamp})`,
    );
    if (mTimeStamp !== sTimeStamp) {
      return { success: false, error: "TimeStamp 불일치" };
    }

    console.log(
      `[VERIFY-CHECK 2/4] Fingerprint 비교 (Server: ${sFingerprint} vs Mail: ${mFingerprint})`,
    );
    if (mFingerprint !== sFingerprint) {
      return { success: false, error: "Fingerprint 불일치" };
    }

    const expectedChallenge = cryptoUtils.generateChallengePlain(
      sFingerprint,
      sTimeStamp,
    );
    console.log(
      `[VERIFY-CHECK 3/4] ChallengeCode 비교 (Expected: ${expectedChallenge} vs Mail: ${mChallengeCode})`,
    );
    if (mChallengeCode !== expectedChallenge) {
      return { success: false, error: "ChallengeCode 불일치" };
    }

    const expectedHmac = cryptoUtils.generateHmacResponse(sChallengeCode);
    console.log(
      `[VERIFY-CHECK 4/4] HMAC 비교 (Expected: ${expectedHmac} vs Mail: ${mHmac})`,
    );
    if (mHmac !== expectedHmac) {
      return { success: false, error: "HMAC 불일치" };
    }

    return { success: true };
  },
};

module.exports = VerifyService;
