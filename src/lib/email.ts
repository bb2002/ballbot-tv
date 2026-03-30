export async function sendVerificationCode(
  email: string,
  code: string,
  resendApiKey: string
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "ballbot-tv <noreply@cosmonote.ballbot.dev>",
      to: [email],
      subject: "[ballbot-tv] 이메일 인증번호",
      html: `<p>인증번호: <strong>${code}</strong></p><p>이 인증번호는 10분간 유효합니다.</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend API error:", res.status, body);
    throw new Error(`이메일 발송에 실패했습니다: ${body}`);
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
