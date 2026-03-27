FROM node:18-alpine

WORKDIR /usr/src/app

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm install --production

# 소스 코드 복사
COPY . .

# 앱 실행 (기본 포트 5000)
EXPOSE 5000

CMD ["node", "index.js"]
