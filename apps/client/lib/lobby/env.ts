/**
 * 環境変数アクセサ（クライアント側）。
 * Next.js では `NEXT_PUBLIC_*` のみブラウザに露出する。
 */

const DEFAULT_PARTYKIT_HOST = '127.0.0.1:1999';

/** PartyKit Room の接続先ホスト。未設定時はローカル開発デフォルト。 */
export function getPartyKitHost(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PARTYKIT_HOST : undefined;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
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
