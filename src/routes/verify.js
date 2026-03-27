const express = require("express");
const router = express.Router();
const config = require("../config");
const cryptoUtils = require("../utils/crypto_utils");
const EmailService = require("../services/email_service");
const VerifyService = require("../services/verify_service");

router.post("/request", async (req, res) => {
  try {
    console.log("전화번호 인증 시작");

    const encryptedData = req.body.d;
    if (!encryptedData) {
      console.log("암호화된 데이터 받지 못함");
      return res.status(400).json({ error: "No data provided" });
    }
    console.log("암호화된 데이터 받음");

    // 1. RSA 복호화
    const decrypted = cryptoUtils.decryptWithRsa(encryptedData);
    const [
      phoneNumber,
      carrier,
      sFingerprint,
      sChallengeCode,
      sHmac,
      sTimeStamp,
    ] = decrypted.split("|");

    if (!config.EMAIL_DOMAIN[carrier]) {
      console.log("도메인 인증 실패");
      return res.status(400).json({ error: "지원하지 않는 통신사입니다." });
    }
    console.log("도메인 인증 성공");

    const targetSender = `${phoneNumber}@${config.EMAIL_DOMAIN[carrier]}`;
    console.log("받은 이메일 주소", targetSender);

    // 2. 이메일(IMAP) 서비스 호출 (메일 코드 가져오기)
    const mailCode = await EmailService.fetchLatestCode(targetSender);

    if (!mailCode) {
      console.warn(
        "[VERIFY-FAIL] 실패: 조건에 맞는 메일에서 유효한 코드를 추출하지 못했습니다.",
      );
      return res.status(404).json({ message: "유효한 인증 코드가 없습니다" });
    }

    // 3. 메일 코드 디코딩
    console.log("[VERIFY] 메일 코드 디코딩 시작...");
    const decodedMailCode = cryptoUtils.decodeString(mailCode);
    console.log(`[VERIFY] 디코딩 결과 문자열: ${decodedMailCode}`);

    const [mFingerprint, mChallengeCode, mHmac, mTimeStamp] =
      decodedMailCode.split("|");
    console.log(
      `[VERIFY] 파싱 데이터 -> Fingerprint: ${mFingerprint}, ChallengeCode: ${mChallengeCode}, HMAC: ${mHmac}, TimeStamp: ${mTimeStamp}`,
    );

    // 4. 순수 검증 서비스 호출
    const validationResult = VerifyService.validateMailData(
      { sFingerprint, sChallengeCode, sTimeStamp },
      { mFingerprint, mChallengeCode, mHmac, mTimeStamp },
    );

    if (!validationResult.success) {
      console.warn(`[VERIFY-FAIL] ❌ ${validationResult.error}`);
      return res.status(400).json({ error: validationResult.error });
    }

    console.log("[VERIFY-SUCCESS] 🎉 모든 검증 통과 완료!");
    return res.status(200).json({ message: "telephone_Verification_Success" });
  } catch (err) {
    console.error("[ERROR] 🚨 인증 프로세스 중 치명적 오류 발생:");
    console.error(err.stack);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/key", (req, res) => {
  try {
    const challengeCode = req.body.d;
    console.log(challengeCode);
    if (!challengeCode)
      return res.status(400).json({ error: "No challenge code provided" });

    const hmacResponse = cryptoUtils.generateHmacResponse(challengeCode);
    return res.json({ hmac: hmacResponse });
  } catch (err) {
    console.error("HMAC 생성 오류:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
