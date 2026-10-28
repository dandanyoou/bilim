"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface ApiErrorBody {
  error: { code: string; message: string };
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/items";
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [needsDisplayName, setNeedsDisplayName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/email-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) throw body as ApiErrorBody;
      setDevCode((body as { devCode?: string }).devCode ?? null);
      setStep("code");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, displayName: displayName || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        const apiErr = body as ApiErrorBody;
        if (apiErr.error?.code === "E_VALIDATION") {
          setNeedsDisplayName(true);
          setError("처음 오셨네요! 표시 이름을 입력해 주세요.");
          return;
        }
        throw apiErr;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-20">
      <h1 className="font-hand text-4xl text-ink">빌림</h1>
      <p className="mt-2 text-sm text-ink-soft">학교 이메일로 로그인해요</p>

      <Card className="mt-8 w-full p-6">
        {step === "email" ? (
          <form onSubmit={requestCode} className="space-y-4">
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              학교 이메일
              <input
                type="email"
                required
                placeholder="you@korea.ac.kr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              인증코드 받기
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <p className="text-sm text-ink-soft">
              <strong className="text-ink">{email}</strong>로 보낸 6자리 코드를 입력하세요(10분 이내).
            </p>
            {devCode && (
              <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
                개발 모드: 실제 메일 대신 코드를 바로 보여줘요 → <strong>{devCode}</strong>
              </p>
            )}
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              인증코드
              <input
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="rounded-lg border border-line bg-cream px-3 py-2 text-center text-lg tracking-[0.5em] text-ink outline-accent"
              />
            </label>
            {needsDisplayName && (
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                표시 이름(2~20자)
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={20}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
                />
              </label>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {needsDisplayName ? "가입하고 로그인" : "로그인"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-center text-xs text-ink-soft hover:underline"
            >
              이메일 다시 입력
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}

function toMessage(err: unknown): string {
  if (err && typeof err === "object" && "error" in err) {
    const e = (err as ApiErrorBody).error;
    return e?.message ?? "오류가 발생했어요.";
  }
  return "오류가 발생했어요.";
}
