import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { users } from "@/db/schema";
import type { Database } from "@/db/client";

const COOKIE_NAME = "session";

function getSecret(jwtSecret: string) {
  return new TextEncoder().encode(jwtSecret);
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, storedHash] = stored.split(":");
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const data = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex === storedHash;
}

export async function signUp(
  db: Database,
  kv: KVNamespace,
  resendApiKey: string,
  data: {
    username: string;
    password: string;
    channelName: string;
    email: string;
  }
) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, data.username))
    .limit(1);
  if (existing.length > 0) {
    return { success: false as const, error: "이미 사용 중인 아이디입니다" };
  }

  const existingEmail = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);
  if (existingEmail.length > 0) {
    return { success: false as const, error: "이미 사용 중인 이메일입니다" };
  }

  const id = ulid();
  const passwordHash = await hashPassword(data.password);

  await db.insert(users).values({
    id,
    username: data.username,
    passwordHash,
    channelName: data.channelName,
    email: data.email,
    isVerified: false,
    createdAt: new Date(),
  });

  const { sendVerificationCode, generateVerificationCode } = await import(
    "./email"
  );
  const code = generateVerificationCode();
  await kv.put(
    `email_verification:${id}`,
    JSON.stringify({ code, email: data.email }),
    { expirationTtl: 600 }
  );
  await sendVerificationCode(data.email, code, resendApiKey);

  return { success: true as const, data: { userId: id } };
}

export async function resendVerification(
  db: Database,
  kv: KVNamespace,
  resendApiKey: string,
  userId: string
) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (user.length === 0) {
    return { success: false as const, error: "사용자를 찾을 수 없습니다" };
  }

  const { sendVerificationCode, generateVerificationCode } = await import(
    "./email"
  );
  const code = generateVerificationCode();
  await kv.put(
    `email_verification:${userId}`,
    JSON.stringify({ code, email: user[0].email }),
    { expirationTtl: 600 }
  );
  await sendVerificationCode(user[0].email, code, resendApiKey);

  return { success: true as const };
}

export async function verifyEmail(
  db: Database,
  kv: KVNamespace,
  jwtSecret: string,
  userId: string,
  code: string
) {
  const stored = await kv.get(`email_verification:${userId}`);
  if (!stored) {
    return {
      success: false as const,
      error: "인증번호가 만료되었습니다. 다시 요청해주세요",
    };
  }

  const { code: storedCode } = JSON.parse(stored);
  if (storedCode !== code) {
    return { success: false as const, error: "인증번호가 올바르지 않습니다" };
  }

  await db
    .update(users)
    .set({ isVerified: true })
    .where(eq(users.id, userId));
  await kv.delete(`email_verification:${userId}`);

  const token = await createSessionToken(userId, jwtSecret);
  return { success: true as const, data: { token } };
}

export async function signIn(
  db: Database,
  jwtSecret: string,
  username: string,
  password: string
) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (user.length === 0) {
    return {
      success: false as const,
      error: "아이디 또는 비밀번호가 올바르지 않습니다",
    };
  }

  const valid = await verifyPassword(password, user[0].passwordHash);
  if (!valid) {
    return {
      success: false as const,
      error: "아이디 또는 비밀번호가 올바르지 않습니다",
    };
  }

  if (!user[0].isVerified) {
    return {
      success: false as const,
      error: "이메일 인증을 완료해주세요",
    };
  }

  const token = await createSessionToken(user[0].id, jwtSecret);
  return { success: true as const, data: { token, user: user[0] } };
}

async function createSessionToken(
  userId: string,
  jwtSecret: string
): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret(jwtSecret));
}

export async function getSession(
  db: Database,
  jwtSecret: string,
  cookieHeader: string | null
): Promise<{ userId: string; user: typeof users.$inferSelect } | null> {
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );

  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(jwtSecret));
    const userId = payload.sub as string;
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (user.length === 0) return null;
    return { userId, user: user[0] };
  } catch {
    return null;
  }
}

export function createSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
}

export function deleteSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
