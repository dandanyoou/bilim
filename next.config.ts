import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components(dynamicIO)는 끈다: 이 앱은 전부 로그인 사용자별·실시간 DB 데이터라
  // 정적 프리렌더링의 이득이 없고, Suspense 경계를 매 페이지마다 신경 써야 하는 복잡도만 늘어난다.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
