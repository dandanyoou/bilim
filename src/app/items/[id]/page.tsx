import Image from "next/image";
import { notFound } from "next/navigation";
import { getItemDetail } from "@/lib/items/queries";
import { getSession } from "@/lib/auth/session";
import { CATEGORY_LABEL, type Category } from "@/lib/categories";
import { ItemStatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatWon } from "@/lib/money";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { id } = await params;
  const item = await getItemDetail(id);
  const session = await getSession();

  if (!item) notFound();

  const isOwner = session?.userId === item.ownerId;
  // SSAD API-06: 공개(listed) 물품 또는 소유자 본인만 볼 수 있다. 그 외에는 404로 존재 여부를 숨긴다(SEC-02).
  if (item.status !== "listed" && !isOwner) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-2">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-cream-soft">
            {item.photos[0] ? (
              <Image
                src={`/uploads/${item.photos[0].storageKey}`}
                alt={item.title}
                fill
                sizes="(min-width: 768px) 45vw, 90vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center font-hand text-4xl text-ink-soft/50">
                빌림
              </div>
            )}
          </div>
          {item.photos.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {item.photos.slice(1).map((p) => (
                <div key={p.position} className="relative aspect-square overflow-hidden rounded-lg bg-cream-soft">
                  <Image src={`/uploads/${p.storageKey}`} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-accent">
                {CATEGORY_LABEL[item.category as Category] ?? item.category}
              </span>
              {isOwner && <ItemStatusBadge status={item.status} />}
            </div>
            <h1 className="mt-1 text-2xl font-bold text-ink">{item.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">{item.pickupPlace}에서 직접 주고받아요</p>
          </div>

          <Card className="space-y-3 p-5">
            <Row label="일 요금" value={formatWon(item.dailyFee)} strong />
            <Row label="보증금" value={formatWon(item.deposit)} />
            <Row label="인수가(파손·분실 시)" value={formatWon(item.buyoutPrice)} />
          </Card>

          {item.description && <p className="whitespace-pre-wrap text-sm text-ink-soft">{item.description}</p>}

          <p className="text-sm text-ink-soft">
            빌려주는 사람: <span className="text-ink">{item.ownerDisplayName}</span>
          </p>

          {isOwner ? (
            <ButtonLink href={`/items/${item.id}/edit`} variant="secondary">
              물품 수정하기
            </ButtonLink>
          ) : (
            <ButtonLink href={`/rentals/new?itemId=${item.id}`} className="w-full sm:w-auto">
              대여 신청하기
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className={strong ? "text-base font-semibold text-ink" : "text-ink"}>{value}</span>
    </div>
  );
}
