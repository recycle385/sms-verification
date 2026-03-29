if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const verifyRouter = require("./routes/verify");
const logger = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/verify", verifyRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Node.js API 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
