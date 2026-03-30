import { z } from "zod";

export const usernameSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]{4,20}$/, "아이디는 영문·숫자 조합 4자 이상 20자 이하여야 합니다");

export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다")
  .refine((val) => /[a-zA-Z]/.test(val), "비밀번호에 영문을 포함해야 합니다")
  .refine((val) => /[0-9]/.test(val), "비밀번호에 숫자를 포함해야 합니다")
  .refine(
    (val) => /[^a-zA-Z0-9]/.test(val),
    "비밀번호에 특수문자를 포함해야 합니다"
  );

export const signUpSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
    channelName: z.string().min(1, "채널이름을 입력해주세요"),
    email: z.string().email("올바른 이메일 형식이 아닙니다"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["passwordConfirm"],
  });

export const signInSchema = z.object({
  username: z.string().min(1, "아이디를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export const streamTitleSchema = z
  .string()
  .refine((val) => val.trim().length > 0, "방송 제목을 입력해주세요");

export function validateUsername(username: string) {
  const result = usernameSchema.safeParse(username);
  return { success: result.success, error: result.error?.message };
}

export function validatePassword(password: string) {
  const result = passwordSchema.safeParse(password);
  return { success: result.success, error: result.error?.message };
}

export function validatePasswordMatch(password: string, confirm: string) {
  return { success: password === confirm };
}

export function validateStreamTitle(title: string) {
  const result = streamTitleSchema.safeParse(title);
  return { success: result.success, error: result.error?.message };
}

export function validateProfileImage(mimeType: string, size: number) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024;
  const isValid = allowedTypes.includes(mimeType) && size <= maxSize;
  return {
    success: isValid,
    error: isValid
      ? undefined
      : "지원하지 않는 파일 형식이거나 파일 크기가 초과되었습니다",
  };
}
