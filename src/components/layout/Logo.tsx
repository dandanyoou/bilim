import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`font-hand text-3xl tracking-wide text-ink ${className}`}>
      빌림
    </Link>
  );
}
