import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CATEGORY_LABEL } from "@/lib/categories";

const PAIN_POINTS = [
  { n: "1", text: "몇 번 쓰고 서랍에 넣어둔 물건이 매번 쌓여요" },
  { n: "2", text: "며칠만 쓸 건데 사자니 아깝고, 빌릴 곳은 마땅치 않아요" },
  { n: "3", text: "중고 거래는 믿을 사람인지부터 걱정돼요" },
];

const STEPS = [
  {
    n: "01",
    title: "물건을 등록해요",
    body: "사진 4장과 하루 요금, 보증금, 인수가를 정하면 바로 캠퍼스 안에 올라가요.",
  },
  {
    n: "02",
    title: "요청을 수락해요",
    body: "빌리고 싶은 사람이 기간을 정해 요청하면, 수락만 누르면 결제·보증금 보류까지 자동으로 진행돼요.",
  },
  {
    n: "03",
    title: "만나서 확인하고, 다시 확인해요",
    body: "인계·반납 때 양쪽이 사진으로 상태를 확정해요. 문제가 생기면 운영자가 기록을 보고 판정해요.",
  },
];

export default function Home() {
  return (
    <div className="scroll-sections">
      <section className="scroll-section flex flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm tracking-widest text-ink-soft uppercase">
          가칭 빌림 · 캠퍼스 개인 간 물품 대여
        </p>
        <h1 className="font-hand text-7xl text-ink sm:text-8xl">빌림</h1>
        <p className="mt-6 max-w-xl text-lg text-ink-soft">
          쓰지 않는 물건은 빌려주고 돈을 벌고, 필요한 물건은 사지 않고 빌려 써요.
          <br />
          같은 캠퍼스 학생끼리, 하루 단위로.
        </p>
        <div className="mt-10 flex gap-3">
          <ButtonLink href="/items">둘러보기</ButtonLink>
          <ButtonLink href="/items/new" variant="secondary">
            물건 등록하기
          </ButtonLink>
        </div>
        <p className="mt-16 animate-bounce text-xs text-ink-soft">스크롤하면 한 장씩 넘어가요 ↓</p>
      </section>

      <section className="scroll-section flex flex-col items-center justify-center gap-10 px-6 py-24">
        <h2 className="max-w-md text-center text-3xl font-bold text-ink">
          있는데 안 쓰는 물건,
          <br />
          살 필요 없는 물건.
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PAIN_POINTS.map((p) => (
            <Card key={p.n} className="w-64 p-6">
              <span className="font-hand text-4xl text-accent">{p.n}</span>
              <p className="mt-3 text-sm text-ink-soft">{p.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {STEPS.map((step) => (
        <section
          key={step.n}
          className="scroll-section flex flex-col items-center justify-center gap-4 px-6 py-24 text-center"
        >
          <span className="font-hand text-2xl text-accent">사용법 {step.n}</span>
          <h3 className="max-w-md text-3xl font-bold text-ink">{step.title}</h3>
          <p className="max-w-md text-ink-soft">{step.body}</p>
        </section>
      ))}

      <section className="scroll-section flex flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <h2 className="max-w-md text-3xl font-bold text-ink">1단계에서 다루는 물건</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {Object.values(CATEGORY_LABEL).map((label) => (
            <span
              key={label}
              className="rounded-full border border-line bg-white/60 px-4 py-2 text-sm text-ink-soft"
            >
              {label}
            </span>
          ))}
        </div>
        <ButtonLink href="/items">지금 둘러보기</ButtonLink>
      </section>
    </div>
  );
}
