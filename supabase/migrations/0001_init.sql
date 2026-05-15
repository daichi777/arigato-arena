-- ============================================================================
-- ArigatoArena 初期スキーマ
-- 試合記録とプレイヤー単位の試合統計を保存する
-- ============================================================================

-- 試合記録
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  winner_team TEXT NOT NULL CHECK (winner_team IN ('red', 'blue', 'draw')),
  team_kills_red INT NOT NULL,
  team_kills_blue INT NOT NULL,
  mvp_player_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_started_at ON matches (started_at DESC);
CREATE INDEX idx_matches_room_code ON matches (room_code);

-- プレイヤー単位の試合統計
CREATE TABLE player_match_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  -- PartyKit セッション ID
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  character_id TEXT NOT NULL CHECK (
    character_id IN ('k2', 'hyouga', 'shuto', 'daichi', 'katsuya',
                     'tsuchiga', 'hide', 'yugo', 'iru')
  ),
  team TEXT NOT NULL CHECK (team IN ('red', 'blue')),
  kills INT NOT NULL DEFAULT 0,
  deaths INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  headshots INT NOT NULL DEFAULT 0,
  damage_dealt INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pms_match_id ON player_match_stats (match_id);
CREATE INDEX idx_pms_player_name ON player_match_stats (player_name);
CREATE INDEX idx_pms_character_id ON player_match_stats (character_id);

-- ============================================================================
-- RLS は無効（社内ツール想定、PartyKit サーバーから service_role で書き込み）
-- クライアントから直書きさせない方針
-- ============================================================================
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_match_stats DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 集計用ビュー（社内ランキング）
-- ============================================================================
CREATE OR REPLACE VIEW player_lifetime_stats AS
SELECT
  player_name,
  COUNT(*) AS matches_played,
  SUM(kills) AS total_kills,
  SUM(deaths) AS total_deaths,
  SUM(assists) AS total_assists,
  SUM(headshots) AS total_headshots,
  SUM(damage_dealt) AS total_damage,
  CASE
    WHEN SUM(deaths) = 0 THEN SUM(kills)::FLOAT
    ELSE ROUND((SUM(kills)::NUMERIC / NULLIF(SUM(deaths), 0))::NUMERIC, 2)::FLOAT
  END AS kd_ratio
FROM player_match_stats
GROUP BY player_name;
