import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { ButtonLink } from "@/components/ui/Button";

export async function NavBar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Logo />
          <NavLinks />
        </div>

        {session ? (
          <Link href="/mypage" className="text-sm font-medium text-ink hover:underline">
            {session.displayName} 님
          </Link>
        ) : (
          <ButtonLink href="/auth/login" variant="secondary" className="!px-4 !py-2 text-sm">
            로그인
          </ButtonLink>
        )}
      </div>
    </header>
  );
}
