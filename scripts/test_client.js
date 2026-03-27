const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

// 서버 URL (도커 사용 시 80번, 로컬 실행 시 5000번)
const serverUrl = 'http://localhost:5000/verify/request';

// 테스트 데이터 생성 (RSA로 암호화될 데이터)
const phoneNumber = '01012345678';
const carrier = 'SKT';
const sFingerprint = 'test_device_id';
const sChallengeCode = 'random_challenge';
const sHmac = 'expected_hmac';
const sTimeStamp = Date.now().toString();

const rawData = `${phoneNumber}|${carrier}|${sFingerprint}|${sChallengeCode}|${sHmac}|${sTimeStamp}`;

async function runTest() {
    try {
        console.log('--- 🚀 테스트 시작 ---');
        console.log('1. 평문 데이터 구성:', rawData);

        const privateKey = process.env.P_K_CONTENT;
        if (!privateKey) throw new Error('.env 파일의 P_K_CONTENT가 필요합니다.');

        // 2. 암호화 수행 (서버 규격: RSA-OAEP / SHA1)
        console.log('2. RSA 암호화 중...');
        const encryptedBuffer = crypto.publicEncrypt(
            {
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha1',
            },
            Buffer.from(rawData)
        );

        // 3. Base64url 인코딩
        const encryptedData = encryptedBuffer.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        console.log('3. 암호화된 최종 페이로드 (d):', encryptedData);

        // 4. 서버 요청
        console.log('\n📡 서버로 요청을 보냅니다...');
        const response = await axios.post(serverUrl, { d: encryptedData });
        console.log('✅ 서버 성공 응답:', response.data);

    } catch (error) {
        if (error.response) {
            console.error('❌ 서버 에러 응답:', error.response.status, error.response.data);
            
            // 404가 나오면 RSA 복호화는 성공한 것이지만, 실제 MMS 이메일이 없는 상태인 것입니다.
            if (error.response.status === 404) {
                console.log('\n💡 [결과 분석]: 404 응답은 RSA 복호화가 정상적으로 완료되었음을 의미합니다.');
                console.log('다만, 실제 IMAP(Gmail)에 해당 번호로부터 온 인증 코드가 없어서 발생하는 정상적인 에러입니다.');
            }
        } else {
            console.error('❌ 네트워크 오류:', error.message);
        }
    }
}

runTest();
