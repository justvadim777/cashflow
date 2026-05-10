import crypto from "crypto";

export function forgeInitData(
  botToken: string,
  user: { id: number; first_name: string; last_name?: string; username?: string },
  startParam?: string
): string {
  const authDate = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  params.set("auth_date", String(authDate));
  params.set("query_id", "AAH" + crypto.randomBytes(8).toString("base64url"));
  params.set("user", JSON.stringify(user));
  if (startParam) params.set("start_param", startParam);

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  params.set("hash", hash);
  return params.toString();
}
