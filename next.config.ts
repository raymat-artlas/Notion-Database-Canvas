import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 一時的にESLintエラーを無視（Internal Server Error対応）
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 一時的にTypeScriptエラーを無視
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
