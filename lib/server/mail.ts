const resendEndpoint = "https://api.resend.com/emails";

const getSender = () => process.env.RESEND_FROM_EMAIL?.trim() || "Space of us <onboarding@resend.dev>";
const getApiKey = () => process.env.RESEND_API_KEY?.trim();

const ensureMailConfigured = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Mail service is not configured");
  }
  return apiKey;
};

const postEmail = async (payload: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}) => {
  const apiKey = ensureMailConfigured();
  const response = await fetch(resendEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getSender(),
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || "Email delivery failed");
  }
};

const emailShell = (title: string, content: string) => `
  <div style="background:#f8f6ef;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#344451;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid rgba(216,221,216,0.9);border-radius:18px;padding:28px;box-shadow:0 18px 48px rgba(52,68,81,0.08);">
      <div style="font-size:28px;font-weight:700;color:#273846;">Space of us</div>
      <div style="margin-top:8px;font-size:14px;color:#5a6670;">${title}</div>
      <div style="margin-top:24px;font-size:15px;line-height:1.8;color:#344451;">${content}</div>
      <div style="margin-top:24px;font-size:12px;color:#8b96a0;">如果这不是你本人操作，可以忽略这封邮件。</div>
    </div>
  </div>
`;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const textToHtml = (value: string) => escapeHtml(value).replaceAll("\n", "<br />");

export async function sendAdminFeedbackEmail({
  to,
  subject,
  username,
  displayName,
  email,
  category,
  message,
}: {
  to: string;
  subject: string;
  username: string;
  displayName: string;
  email?: string;
  category: string;
  message: string;
}) {
  const content = [
    `收到来自 <strong>${escapeHtml(displayName)}</strong>（${escapeHtml(username)}）的用户反馈。`,
    `类型：${escapeHtml(category)}`,
    `邮箱：${escapeHtml(email || "未绑定")}`,
    `内容：<br />${textToHtml(message)}`,
  ].join("<br /><br />");

  await postEmail({
    to,
    subject,
    html: emailShell("用户意见反馈", content),
    text: `收到来自 ${displayName} (${username}) 的用户反馈。\n类型：${category}\n邮箱：${email || "未绑定"}\n\n${message}`,
  });
}

export async function sendAdminCustomMail({
  to,
  subject,
  body,
}: {
  to: string[];
  subject: string;
  body: string;
}) {
  await postEmail({
    to,
    subject,
    html: emailShell(escapeHtml(subject), textToHtml(body)),
    text: body,
  });
}

export async function sendRegisterCodeEmail(email: string, code: string) {
  await postEmail({
    to: email,
    subject: "Space of us 注册验证码",
    html: emailShell(
      "注册验证码",
      `你正在注册 Space of us，邮箱验证码是 <strong style="font-size:28px;letter-spacing:4px;">${code}</strong>，10 分钟内有效。`,
    ),
    text: `你正在注册 Space of us，邮箱验证码是 ${code}，10 分钟内有效。`,
  });
}

export async function sendRecoverCodeEmail(email: string, code: string) {
  await postEmail({
    to: email,
    subject: "Space of us 找回密码验证码",
    html: emailShell(
      "找回密码验证码",
      `你正在进行找回密码操作，邮箱验证码是 <strong style="font-size:28px;letter-spacing:4px;">${code}</strong>，10 分钟内有效。`,
    ),
    text: `你正在找回 Space of us 密码，邮箱验证码是 ${code}，10 分钟内有效。`,
  });
}

export async function sendRebindCodeEmail(email: string, code: string) {
  await postEmail({
    to: email,
    subject: "Space of us 邮箱绑定验证码",
    html: emailShell(
      "绑定新邮箱",
      `你正在绑定或更换 Space of us 邮箱，验证码是 <strong style="font-size:28px;letter-spacing:4px;">${code}</strong>，10 分钟内有效。`,
    ),
    text: `你正在绑定或更换 Space of us 邮箱，验证码是 ${code}，10 分钟内有效。`,
  });
}
