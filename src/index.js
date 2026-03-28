process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const express = require("express");
const verifyRouter = require("./routes/verify");

const app = express();
const PORT = process.env.PORT || 5000;

// JSON 및 URL-encoded 바디 파싱
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우터 등록
app.use("/verify", verifyRouter);

// 404 처리
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Node.js API 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
