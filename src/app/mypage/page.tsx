import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { listMyItems } from "@/lib/items/queries";
import { ItemStatusBadge } from "@/components/ui/Badge";
import { formatWon } from "@/lib/money";
import { ButtonLink } from "@/components/ui/Button";
import { LogoutButton } from "@/components/layout/LogoutButton";

export default async function MyPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/mypage");

  const myItems = await listMyItems(session.userId);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{session.displayName} 님</h1>
          <p className="text-sm text-ink-soft">역할: {session.role === "member" ? "회원" : session.role}</p>
        </div>
        <LogoutButton />
      </div>

      <div className="mb-6 flex gap-3">
        <ButtonLink href="/rentals" variant="secondary">
          내 대여 보기
        </ButtonLink>
        <ButtonLink href="/items/new">물품 등록하기</ButtonLink>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">내가 등록한 물품</h2>
        {myItems.length === 0 ? (
          <p className="text-sm text-ink-soft">아직 등록한 물품이 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {myItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/items/${item.id}`}
                  className="flex items-center justify-between rounded-xl border border-line bg-white/60 px-4 py-3 hover:shadow-sm"
                >
                  <div>
                    <p className="font-medium text-ink">{item.title}</p>
                    <p className="text-xs text-ink-soft">일 {formatWon(item.dailyFee)}</p>
                  </div>
                  <ItemStatusBadge status={item.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
