// Cloudflare Worker / PartyKit に注入される環境変数定義。
// Day1 午後時点では Supabase 書き込みは未実装。値が無くてもサーバーは起動できる。
export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}
