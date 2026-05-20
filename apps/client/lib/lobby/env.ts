/**
 * 環境変数アクセサ（クライアント側）。
 * Next.js では `NEXT_PUBLIC_*` のみブラウザに露出する。
 */

const DEFAULT_PARTYKIT_PORT = 1999;
const DEFAULT_PARTYKIT_HOST = `127.0.0.1:${DEFAULT_PARTYKIT_PORT}`;

/**
 * PartyKit Room の接続先ホスト。
 * 解決順:
 *   1. NEXT_PUBLIC_PARTYKIT_HOST 環境変数（本番デプロイ時に明示指定）
 *   2. ブラウザの window.location.hostname + デフォルトポート
 *      → 社内LAN配布時に「ホストPCの IP:3000 を踏んだ参加者」が
 *        自動的に「ホストPCの IP:1999」へ WS 接続できる
 *   3. SSR / 環境変数なし → 127.0.0.1:1999
 */
export function getPartyKitHost(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PARTYKIT_HOST : undefined;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  // ブラウザのホスト名を引き継ぐ（社内LAN 配布時の自動追従）
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `${window.location.hostname}:${DEFAULT_PARTYKIT_PORT}`;
  }
  return DEFAULT_PARTYKIT_HOST;
}

/**
 * 接続プロトコル（ws/wss）。
 * ブラウザのページプロトコルに合わせるが、デフォは ws（社内/ローカル前提）。
 */
export function getPartyKitProtocol(): 'ws' | 'wss' {
  if (typeof window === 'undefined') {
    return 'ws';
  }
  return window.location.protocol === 'https:' ? 'wss' : 'ws';
}
