import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { apiError } from "@/lib/api/errors";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
};

const MAX_SIZE = 10_000_000; // API-20: 1~10,000,000 bytes

export interface SavedUpload {
  storageKey: string;
  sha256: string;
}

/**
 * SSAD 3.5.4 ObjectStorage 어댑터 계약(presignPut/head)의 로컬 파일시스템 구현.
 * 호출부는 이 함수만 알고, S3 호환 저장소로 바꿀 때도 이 파일만 교체하면 된다.
 * 서버가 받은 바이트로 직접 SHA-256을 계산한다 — 클라이언트가 보낸 해시는 신뢰하지 않는다.
 */
export async function saveUpload(bytes: Uint8Array, contentType: string): Promise<SavedUpload> {
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) {
    throw apiError("E_VALIDATION", "jpeg·png·heic 사진만 올릴 수 있어요.");
  }
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SIZE) {
    throw apiError("E_VALIDATION", "사진 1장은 10MB를 넘을 수 없어요.");
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const storageKey = `items/${randomUUID()}.${ext}`;

  const destPath = path.join(UPLOAD_ROOT, storageKey);
  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, bytes);

  return { storageKey, sha256 };
}
