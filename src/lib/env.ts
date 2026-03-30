import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getEnv() {
  const { env } = await getCloudflareContext({ async: true });
  return env as CloudflareEnv & {
    DB: D1Database;
    STORAGE: R2Bucket;
    KV: KVNamespace;
    JWT_SECRET: string;
    RESEND_API_KEY: string;
    AGORA_APP_ID: string;
    AGORA_APP_CERTIFICATE: string;
    R2_PUBLIC_URL: string;
    TURNSTILE_SECRET_KEY: string;
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: string;
  };
}
