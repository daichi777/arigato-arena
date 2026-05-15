import {
  ROOM_MAX_PLAYERS,
  type ClientJoinRoom,
  type PlayerState,
} from '@arigato/shared';

import { sendError } from '../net/send-error.js';
import { assignSpawn, listPlayers, pickBalancedTeam, teamSpawnOccupancy } from '../room/room-state.js';
import { createPlayerState, pickInitialCharacter } from '../room/player.js';
import type { HandlerContext } from './dispatch.js';

/**
 * ルーム参加処理。
 * - 接続時点で onConnect 側がプレースホルダを作っていないので、ここで PlayerState を初期化する。
 * - 同名は許可しないが「自分自身が再送した join」は冪等に扱う。
 * - asHost=true でも先客（既存ホスト）がいれば普通の参加者扱い。
 */
export function handleJoin(ctx: HandlerContext, message: ClientJoinRoom): void {
  const { state, connId } = ctx;

  // 既に参加済みなら、名前・希望ホストの変更要求は無視（冪等）
  if (state.players[connId]) {
    return;
  }

  const players = listPlayers(state);
  if (players.length >= ROOM_MAX_PLAYERS) {
    sendError(ctx.sender, 'room_full', 'ルームが満員です');
    return;
  }

  // 名前重複チェック（大文字小文字無視）
  const nameLower = message.name.trim().toLowerCase();
  const taken = players.some((p) => p.name.toLowerCase() === nameLower);
  if (taken) {
    sendError(ctx.sender, 'name_taken', 'その名前は既に使われています');
    return;
  }

  const team = pickBalancedTeam(state);
  const occupiedChars = players.map((p) => p.characterId);
  const characterId = pickInitialCharacter(occupiedChars);
  const spawn = assignSpawn(team, teamSpawnOccupancy(state, team));

  const newPlayer: PlayerState = createPlayerState({
    id: connId,
    name: message.name.trim(),
    team,
    characterId,
    spawn,
    nowMs: ctx.nowMs,
    currentTick: state.serverTick,
  });

  state.players[connId] = newPlayer;

  // ホスト未設定なら最初の参加者をホストに。asHost フラグはヒント程度の扱い。
  if (!state.hostId) {
    state.hostId = connId;
  }

  ctx.logger.info('player joined', {
    playerId: connId,
    name: newPlayer.name,
    team,
    characterId,
    isHost: state.hostId === connId,
  });

  // フェーズ全体の再 broadcast を促す
  ctx.onPhaseShouldRebroadcast();
}
