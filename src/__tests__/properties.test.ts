import { describe, test, expect } from "vitest";
import fc from "fast-check";
import {
  validateUsername,
  validatePassword,
  validatePasswordMatch,
  validateStreamTitle,
  validateProfileImage,
} from "@/lib/validation";
import {
  filterActivePublicStreams,
  sortByViewerCount,
  searchStreamsLocal,
} from "@/lib/stream-utils";

// Feature: ballbot-tv, Property 1: 아이디 유효성 검증
describe("Property 1: 아이디 유효성 검증", () => {
  test("유효한 아이디만 통과", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 30 }), (username) => {
        const result = validateUsername(username);
        const isValid = /^[a-zA-Z0-9]{4,20}$/.test(username);
        return result.success === isValid;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: ballbot-tv, Property 2: 비밀번호 유효성 검증
describe("Property 2: 비밀번호 유효성 검증", () => {
  test("유효한 비밀번호만 통과", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (password) => {
        const result = validatePassword(password);
        const isValid =
          password.length >= 8 &&
          /[a-zA-Z]/.test(password) &&
          /[0-9]/.test(password) &&
          /[^a-zA-Z0-9]/.test(password);
        return result.success === isValid;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: ballbot-tv, Property 3: 비밀번호 일치 검증
describe("Property 3: 비밀번호 일치 검증", () => {
  test("두 값이 다르면 반드시 오류", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (password, confirm) => {
        const result = validatePasswordMatch(password, confirm);
        return result.success === (password === confirm);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: ballbot-tv, Property 5: 프로필 사진 파일 형식 및 크기 검증
describe("Property 5: 프로필 사진 파일 형식 및 크기 검증", () => {
  test("허용된 형식·크기만 통과", () => {
    fc.assert(
      fc.property(
        fc.record({
          mimeType: fc.oneof(
            fc.constant("image/jpeg"),
            fc.constant("image/png"),
            fc.constant("image/webp"),
            fc.constant("application/pdf"),
            fc.constant("text/plain")
          ),
          size: fc.integer({ min: 1, max: 10 * 1024 * 1024 }),
        }),
        ({ mimeType, size }) => {
          const result = validateProfileImage(mimeType, size);
          const allowed = ["image/jpeg", "image/png", "image/webp"];
          const isValid = allowed.includes(mimeType) && size <= 5 * 1024 * 1024;
          return result.success === isValid;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: ballbot-tv, Property 6: 방송 목록에는 진행 중인 공개 스트림만 포함
describe("Property 6: 방송 목록에는 진행 중인 공개 스트림만 포함", () => {
  test("라이브·공개 스트림만 목록에 포함", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string(),
            status: fc.oneof(fc.constant("live"), fc.constant("ended")),
            isPublic: fc.boolean(),
          })
        ),
        (streams) => {
          const result = filterActivePublicStreams(streams);
          return result.every(
            (s) => s.status === "live" && s.isPublic === true
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: ballbot-tv, Property 7: 방송 목록 정렬 순서
describe("Property 7: 방송 목록 정렬 순서", () => {
  test("시청자 수 내림차순 정렬", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string(),
            viewerCount: fc.integer({ min: 0, max: 100000 }),
          })
        ),
        (streams) => {
          const sorted = sortByViewerCount(streams);
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].viewerCount < sorted[i + 1].viewerCount) return false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: ballbot-tv, Property 10: 방송 제목 검색 포함 여부
describe("Property 10: 방송 제목 검색 포함 여부", () => {
  test("검색어가 포함된 스트림만 결과에 포함", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(
          fc.record({
            id: fc.string(),
            title: fc.string(),
            description: fc.string(),
            status: fc.constant("live" as const),
            isPublic: fc.constant(true),
          })
        ),
        (query, streams) => {
          const result = searchStreamsLocal(query, streams);
          return result.every(
            (s) => s.title.includes(query) || s.description.includes(query)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: ballbot-tv, Property 12: 방송 제목 미입력 시 방송 시작 차단
describe("Property 12: 방송 제목 미입력 시 방송 시작 차단", () => {
  test("공백 제목으로 방송 시작 차단", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\s*$/), (title) => {
        const result = validateStreamTitle(title);
        return result.success === false;
      }),
      { numRuns: 100 }
    );
  });
});
