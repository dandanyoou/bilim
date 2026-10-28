"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";

export interface UploadedPhoto {
  previewUrl: string;
  storageKey: string | null;
  sha256: string | null;
  uploading: boolean;
}

export interface ReadyPhoto {
  storageKey: string;
  sha256: string;
}

interface Props {
  onReadyChange: (photos: ReadyPhoto[]) => void;
  minCount?: number;
}

/**
 * 물품 등록·인계 확인·반납 확인, 세 곳에서 같은 "여러 장 고르면 바로 업로드" 동작을
 * 쓰길래 한 곳으로 뽑았다(세 번째부터는 복사·붙여넣기가 아니라 공유가 맞다).
 * 상태는 이 컴포넌트가 들고, 부모에게는 업로드가 끝난 사진 목록만 올려 보낸다
 * (여러 선택이 겹쳐도 "마지막에 계산한 배열로 덮어쓰기" 같은 경쟁 상태가 안 생기게).
 */
export function PhotoPicker({ onReadyChange, minCount = 4 }: Props) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const onReadyChangeRef = useRef(onReadyChange);
  useEffect(() => {
    onReadyChangeRef.current = onReadyChange;
  }, [onReadyChange]);

  useEffect(() => {
    const ready = photos
      .filter((p): p is UploadedPhoto & { storageKey: string; sha256: string } => !!p.storageKey && !!p.sha256)
      .map((p) => ({ storageKey: p.storageKey, sha256: p.sha256 }));
    onReadyChangeRef.current(ready);
  }, [photos]);

  async function onPickFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";

    for (const file of files) {
      const placeholder: UploadedPhoto = {
        previewUrl: URL.createObjectURL(file),
        storageKey: null,
        sha256: null,
        uploading: true,
      };
      setPhotos((prev) => [...prev, placeholder]);

      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/v1/uploads", { method: "POST", body: form });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message ?? "업로드 실패");
        setPhotos((prev) =>
          prev.map((p) =>
            p === placeholder ? { ...p, storageKey: body.storageKey, sha256: body.sha256, uploading: false } : p
          )
        );
      } catch {
        setPhotos((prev) => prev.filter((p) => p !== placeholder));
        setError("사진 업로드에 실패했어요. 다시 시도해 주세요.");
      }
    }
  }

  function removePhoto(target: UploadedPhoto) {
    setPhotos((prev) => prev.filter((p) => p !== target));
  }

  const readyCount = photos.filter((p) => p.storageKey).length;

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/heic"
        multiple
        onChange={onPickFiles}
        className="w-full text-sm text-ink-soft"
      />
      <p className="mt-1 text-xs text-ink-soft">
        {readyCount}장 올림 (최소 {minCount}장)
      </p>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {photos.map((p) => (
            <div key={p.previewUrl} className="relative aspect-square overflow-hidden rounded-lg bg-cream-soft">
              <Image src={p.previewUrl} alt="" fill unoptimized className="object-cover" />
              {p.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs text-white">
                  올리는 중…
                </div>
              )}
              <button
                type="button"
                onClick={() => removePhoto(p)}
                className="absolute top-1 right-1 rounded-full bg-black/60 px-1.5 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
