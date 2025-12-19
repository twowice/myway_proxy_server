FROM node:20-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 복사
COPY . .

# TypeScript 빌드
RUN npm run build

# Fly가 사용하는 포트
EXPOSE 3000

# ⚠️ JS 파일 실행
CMD ["node", "dist/server.js"]