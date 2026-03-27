# Telephone Verification API (Node.js Refactored)

이 프로젝트는 사용자의 전화번호 점유 여부를 인증하기 위한 백엔드 API 서버입니다. 기존의 Flask 기반 시스템을 Node.js(Express)로 리팩토링하여 성능과 비동기 처리 효율성을 높였습니다.

## 🚀 주요 기능

- **RSA-OAEP 복호화**: 클라이언트로부터 전달받은 암호화된 데이터를 안전하게 복호화합니다.
- **IMAP 연동**: MMS-to-Email 게이트웨이를 통해 수신된 인증 이메일을 실시간으로 검색 및 추출합니다.
- **HMAC 검증**: 요청의 무결성을 보장하기 위해 HMAC-SHA256 알고리즘을 사용합니다.
- **도커 기반 환경**: Nginx 리버스 프록시와 Certbot(SSL)이 포함된 컨테이너 환경을 제공합니다.

## 🛠 기술 스택

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Libraries**: 
  - `imap-simple`: 이메일 수신 및 검색
  - `mailparser`: 이메일 본문 파싱
  - `crypto`: RSA/HMAC/SHA256 암호화 (Node.js 내장)
  - `dotenv`: 환경 변수 관리
- **Infrastructure**: Docker, Nginx, Certbot

## 📁 프로젝트 구조

```text
caps-api/
├── src/
│   ├── routes/
│   │   └── verify.js      # 인증 관련 라우터 및 비동기 처리
│   ├── utils/
│   │   └── crypto_utils.js # RSA, HMAC, Base64 암호화 유틸리티
│   └── config.js          # 환경 변수 로드 및 유효성 검증
├── nginx/
│   └── nginx.conf         # Nginx 리버스 프록시 설정
├── index.js               # 앱 진입점 (Entry Point)
├── Dockerfile             # Node.js 애플리케이션 빌드 설정
├── docker-compose.yml     # 멀티 컨테이너 오케스트레이션
└── package.json           # 의존성 및 프로젝트 정보
```

## ⚙️ 환경 설정 (.env)

프로젝트 루트에 `.env` 파일을 생성하고 다음 정보를 입력해야 합니다.

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
HMAC_KEY=your-hmac-key
P_K_CONTENT="-----BEGIN RSA PRIVATE KEY-----\n..."
PORT=5000
# 필요 시 추가 설정
HMAC_SLICE_START=25
HMAC_SLICE_END=30
CHALLENGE_SLICE_START=20
CHALLENGE_SLICE_END=28
```

## 🏃 실행 방법

### 1. 로컬 환경
```bash
npm install
node index.js
```

### 2. 도커 환경
```bash
docker-compose up --build -d
```
*기본적으로 80번 포트를 통해 접속하며, 요청은 내부적으로 5000번 포트의 Node.js 앱으로 전달됩니다.*

## 📡 API 명세

### 1. 인증 요청
- **URL**: `POST /verify/request`
- **Body**: `{ "d": "RSA_ENCRYPTED_DATA" }`
- **동작**: RSA 복호화 -> 이메일 검색 -> 코드 추출 -> 핑거프린트/HMAC/챌린지 검증 -> 결과 반환

### 2. HMAC 키 생성
- **URL**: `POST /verify/key`
- **Body**: `{ "d": "CHALLENGE_CODE" }`
- **동작**: 챌린지 코드에 대한 HMAC-SHA256 슬라이스 반환

## 🔒 보안 및 최적화
- **비동기 처리**: IMAP 연결과 메시지 파싱을 `async/await`로 처리하여 성능을 극대화했습니다.
- **리소스 관리**: `finally` 블록을 통해 IMAP 연결 해제를 보장하여 메모리 누수를 방지합니다.
- **Nginx 프록시**: 직접적인 앱 노출을 피하고 보안 계층을 추가했습니다.
