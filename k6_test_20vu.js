import http from "k6/http";
import { check, sleep } from "k6";

// 1. 부하(Load) 옵션 설정
export let options = {
  stages: [
    { duration: "10s", target: 20 }, // 처음 10초 동안 가상 사용자 20명까지 서서히 증가
    { duration: "40s", target: 20 }, // 40초 동안 20명 유지 (본격적인 부하 구간)
    { duration: "10s", target: 0 }, // 마지막 10초 동안 서서히 0명으로 감소
  ],
};

export default function () {
  // 테스트할 로컬 서버 주소 (도커 환경에 맞게 포트 확인 필요)
  const url = "http://localhost:5000/verify/request";

  // [🚨 매우 중요 🚨]
  // 빈 문자열이나 아무 값이나 넣으면 RSA 복호화 단계에서 바로 에러(400)가 발생하여
  // 우리가 측정해야 할 IMAP 메일 검색 로직(병목 구간)까지 가지 않습니다.
  // 반드시 실제 앱(클라이언트)에서 생성된 "유효한 암호화 문자열(d)" 하나를 복사해서 넣어야 합니다.
  const payload = JSON.stringify({
    d: "nrN6u3g7YFjJQdb_DLGZIuJZS7vkdguS9QPE2utGx2Rd4eIPWD1JO0M8A99qy-ck4qxNTmYx4tINd2CSQVdf47x-BH8XUtU4GjbT4jEhnxeRtrnmpykaenwz8YsDCUUhiRck3AVO7D4TG8gdXzxXPsnOdj4eq3rypf-5o6b03Y6AXHgpabrCWj_bhMrPxP3EY5zADVl-FB1ALsIrLmJkCBxgiSQStZZcaMU7DgnKDMuJw6OVpoMmUeT_eKidOq8EocbmmPi5oRQwzdReBGAdgMh6xqOMbeOzaC9XprF52LCKqGE7ls12VE1KRPMTqMk3nhL11DtlJ-6_943F_zILBw==",
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  // API 서버로 POST 요청 전송
  let res = http.post(url, payload, params);

  // 응답 검증
  // 메일이 없어서 404가 뜨더라도, 서버 로직(IMAP 접속 -> 검색)은 끝까지 돌았으므로 성공으로 간주합니다.
  check(res, {
    "정상 처리됨 (상태코드 200 또는 404)": (r) =>
      r.status === 200 || r.status === 404,
    "응답 속도가 500ms 미만인가?": (r) => r.timings.duration < 500, // AS-IS에서는 실패 폭발, TO-BE에서는 100% 통과할 것입니다!
  });

  // 사용자가 다음 요청을 보내기 전 1초 대기 (실제 사용자 행동 모방)
  sleep(1);
}
