import { createClient } from '@supabase/supabase-js';
import type { MatchResult, RoomCode } from '@arigato/shared';

import type { Logger } from '../util/logger.js';

/**
 * Supabase 書き込みは fire-and-forget。
 * - 失敗してもゲーム継続を優先（ログだけ吐く）
 * - env が未設定なら warn を 1 回だけ吐いて何もしない
 */

export interface PersistEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export interface PersistMatchArgs {
  roomCode: RoomCode;
  startedAt: number;
  endedAt: number;
  result: MatchResult;
}

export async function persistMatchResult(
  env: PersistEnv,
  args: PersistMatchArgs,
  logger: Logger,
): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn('supabase env not configured, skip persist', {
      hasUrl: Boolean(env.SUPABASE_URL),
      hasKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    });
    return;
  }

  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: matchRow, error: matchErr } = await supabase
      .from('matches')
      .insert({
        room_code: args.roomCode,
        started_at: new Date(args.startedAt).toISOString(),
        ended_at: new Date(args.endedAt).toISOString(),
        winner_team: args.result.winnerTeam,
        team_kills_red: args.result.teamKills.red,
        team_kills_blue: args.result.teamKills.blue,
        mvp_player_id: args.result.mvpPlayerId || null,
      })
      .select('id')
      .single();

    if (matchErr || !matchRow) {
      logger.error('supabase insert matches failed', {
        error: matchErr ? matchErr.message : 'no row returned',
      });
      return;
    }

    const matchId = matchRow.id as string;
    if (args.result.playerStats.length === 0) {
      logger.info('supabase match persisted (no players)', { matchId });
      return;
    }

    const rows = args.result.playerStats.map((s) => ({
      match_id: matchId,
      player_id: s.playerId,
      player_name: s.name,
      character_id: s.characterId,
      team: s.team,
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
      headshots: s.headshots,
      damage_dealt: s.damageDealt,
    }));
    const { error: statsErr } = await supabase.from('player_match_stats').insert(rows);
    if (statsErr) {
      logger.error('supabase insert player_match_stats failed', { error: statsErr.message });
      return;
    }

    logger.info('supabase match persisted', { matchId, players: rows.length });
  } catch (err) {
    logger.error('supabase persist exception', { error: String(err) });
  }
}
