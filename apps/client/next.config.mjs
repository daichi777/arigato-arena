import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@arigato/shared'],
  experimental: {
    typedRoutes: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glb|gltf|hdr|exr)$/,
      type: 'asset/resource',
    });
    // strict ESM の .js 拡張子付き相対import を .ts/.tsx に解決させる
    // （packages/shared が server 側互換のため .js 拡張子を使っている）
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
  // monorepo の assets/ を tracing root として認識させる
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
