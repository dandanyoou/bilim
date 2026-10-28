"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CATEGORY_LABEL, ENABLED_CATEGORIES, type Category } from "@/lib/categories";
import { Button } from "@/components/ui/Button";

interface Photo {
  file: File;
  previewUrl: string;
  storageKey: string | null;
  uploading: boolean;
}

export function ItemForm() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>(ENABLED_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dailyFee, setDailyFee] = useState(10000);
  const [deposit, setDeposit] = useState(50000);
  const [buyoutPrice, setBuyoutPrice] = useState(200000);
  const [pickupPlace, setPickupPlace] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPickFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const newPhotos: Photo[] = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      storageKey: null,
      uploading: true,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);

    for (const photo of newPhotos) {
      try {
        const form = new FormData();
        form.append("file", photo.file);
        const res = await fetch("/api/v1/uploads", { method: "POST", body: form });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message ?? "업로드 실패");
        setPhotos((prev) =>
          prev.map((p) => (p === photo ? { ...p, storageKey: body.storageKey, uploading: false } : p))
        );
      } catch {
        setPhotos((prev) => prev.filter((p) => p !== photo));
        setError("사진 업로드에 실패했어요. 다시 시도해 주세요.");
      }
    }
  }

  function removePhoto(target: Photo) {
    setPhotos((prev) => prev.filter((p) => p !== target));
  }

  const readyPhotoKeys = photos.filter((p) => p.storageKey).map((p) => p.storageKey as string);
  const stillUploading = photos.some((p) => p.uploading);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (readyPhotoKeys.length < 4) {
      setError("사진을 4장 이상 올려주세요.");
      return;
    }
    if (deposit > buyoutPrice) {
      setError("보증금은 인수가보다 클 수 없어요.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/v1/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title,
          description,
          dailyFee,
          deposit,
          buyoutPrice,
          pickupPlace,
          photoKeys: readyPhotoKeys,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "등록에 실패했어요.");
      router.push(`/items/${body.itemId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Field label="카테고리">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
        >
          {ENABLED_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="제목(2~80자)">
        <input
          required
          minLength={2}
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
        />
      </Field>

      <Field label="설명">
        <textarea
          maxLength={2000}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="일 요금(원)">
          <NumberInput value={dailyFee} onChange={setDailyFee} min={1000} max={500000} />
        </Field>
        <Field label="보증금(원)">
          <NumberInput value={deposit} onChange={setDeposit} min={0} max={3000000} />
        </Field>
        <Field label="인수가(원)">
          <NumberInput value={buyoutPrice} onChange={setBuyoutPrice} min={1000} max={3000000} />
        </Field>
      </div>

      <Field label="인계 장소(2~100자)">
        <input
          required
          minLength={2}
          maxLength={100}
          placeholder="정문 앞"
          value={pickupPlace}
          onChange={(e) => setPickupPlace(e.target.value)}
          className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
        />
      </Field>

      <Field label={`사진(4장 이상, 지금 ${readyPhotoKeys.length}장)`}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/heic"
          multiple
          onChange={onPickFiles}
          className="w-full text-sm text-ink-soft"
        />
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
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={busy || stillUploading} className="w-full">
        {busy ? "등록하는 중…" : "등록하고 공개하기"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm text-ink-soft">
      {label}
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <input
      type="number"
      required
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
    />
  );
}
