// gameEngine.js - Core game logic for Buckshot Roulette
import { ITEM_TYPES, ITEMS_INFO } from './items.js';

const ALL_ITEM_KEYS = Object.keys(ITEM_TYPES).map(k => ITEM_TYPES[k]);

export class GameEngine {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom(hostSocketId, nickname, initialHp = '', initialItems = '') {
    let code = this.generateRoomCode();
    while (this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const room = {
      code,
      hostId: hostSocketId,
      config: { initialHp, initialItems },
      players: [
        {
          socketId: hostSocketId,
          nickname: nickname || 'Player 1',
          hp: 4,
          maxHp: 4,
          items: [],
          handcuffed: false
        }
      ],
      turnIndex: 0,
      round: 1,
      shells: [],
      currentIndex: 0,
      liveCount: 0,
      blankCount: 0,
      sawActive: false,
      status: 'waiting',
      winner: null,
      logs: [],
      lastAction: null
    };

    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code, socketId, nickname) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      return { error: 'Phòng không tồn tại!' };
    }
    if (room.players.length >= 2) {
      return { error: 'Phòng đã đủ 2 người chơi!' };
    }

    room.players.push({
      socketId,
      nickname: nickname || 'Player 2',
      hp: 4,
      maxHp: 4,
      items: [],
      handcuffed: false
    });

    this.startGame(room);
    return { room };
  }

  getRoom(code) {
    return this.rooms.get(code?.toUpperCase());
  }

  // Handle player leaving or unexpected disconnect: resets remaining player to WAITING room state!
  removePlayer(socketId) {
    for (const [code, room] of this.rooms.entries()) {
      const pIndex = room.players.findIndex(p => p.socketId === socketId);
      if (pIndex !== -1) {
        const leavingPlayer = room.players[pIndex];
        room.players.splice(pIndex, 1);

        if (room.players.length === 0) {
          this.rooms.delete(code);
        } else {
          // Reset room back to WAITING status so remaining player can wait with the same Room Code!
          room.status = 'waiting';
          room.winner = null;
          room.currentIndex = 0;
          room.sawActive = false;
          room.lastAction = null;
          this.addLog(room, `⚠️ ${leavingPlayer.nickname} đã thoát phòng. Đang chờ người chơi mới...`);
        }
        return { code, room };
      }
    }
    return null;
  }

  leaveRoom(code, socketId) {
    const room = this.rooms.get(code?.toUpperCase());
    if (!room) return null;
    return this.removePlayer(socketId);
  }

  startGame(room) {
    room.status = 'playing';
    room.round = 1;
    room.turnIndex = Math.floor(Math.random() * 2);

    let startHp = room.config?.initialHp !== '' && room.config?.initialHp !== undefined ? parseInt(room.config.initialHp) : null;
    if (startHp === null || isNaN(startHp) || startHp < 1) {
      startHp = Math.floor(Math.random() * 4) + 3; // Random 3 to 6
    }

    room.players.forEach(p => {
      p.maxHp = startHp;
      p.hp = startHp;
      p.items = [];
      p.handcuffed = false;
    });

    this.addLog(room, `Trận đấu bắt đầu! HP ban đầu: ${startHp}. ${room.players[room.turnIndex].nickname} đi trước.`);
    this.loadNewRound(room, true);
  }

  loadNewRound(room, isGameStart = false) {
    room.sawActive = false;
    room.currentIndex = 0;

    const totalShells = Math.floor(Math.random() * 5) + 3;
    let live = Math.floor(Math.random() * (totalShells - 1)) + 1;
    let blank = totalShells - live;
    if (blank === 0) {
      blank = 1;
      live--;
    }

    room.liveCount = live;
    room.blankCount = blank;

    const array = [];
    for (let i = 0; i < live; i++) array.push('live');
    for (let i = 0; i < blank; i++) array.push('blank');

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    room.shells = array;

    room.players.forEach(p => {
      let countToGive = 0;

      if (isGameStart) {
        if (room.config?.initialItems !== '' && room.config?.initialItems !== undefined) {
          countToGive = parseInt(room.config.initialItems);
          if (isNaN(countToGive) || countToGive < 0) countToGive = Math.floor(Math.random() * 3);
        } else {
          countToGive = Math.floor(Math.random() * 3);
        }
      } else {
        countToGive = Math.floor(Math.random() * 2) + 2; // 2 to 3
      }

      for (let i = 0; i < countToGive; i++) {
        if (p.items.length < 8) {
          const randomItem = ALL_ITEM_KEYS[Math.floor(Math.random() * ALL_ITEM_KEYS.length)];
          p.items.push(randomItem);
        }
      }
    });

    if (!isGameStart) {
      room.round += 1;
    }

    this.addLog(room, `🔄 Nạp đạn mới (Round ${room.round}): ${live} viên THẬT (Đỏ) | ${blank} viên GIẢ (Xanh).`);
  }

  addLog(room, text) {
    room.logs.push({
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text
    });
    if (room.logs.length > 30) room.logs.shift();
  }

  switchTurn(room) {
    const nextTurnIndex = (room.turnIndex + 1) % 2;
    const nextPlayer = room.players[nextTurnIndex];

    if (nextPlayer.handcuffed) {
      nextPlayer.handcuffed = false;
      this.addLog(room, `⛓️ ${nextPlayer.nickname} đang bị CÒNG TAY! Mất lượt!`);
    } else {
      room.turnIndex = nextTurnIndex;
    }
  }

  getSanitizedState(room, forSocketId) {
    return {
      code: room.code,
      status: room.status,
      round: room.round,
      turnIndex: room.turnIndex,
      turnSocketId: room.players[room.turnIndex]?.socketId,
      isMyTurn: room.players[room.turnIndex]?.socketId === forSocketId,
      sawActive: room.sawActive,
      liveCount: room.liveCount,
      blankCount: room.blankCount,
      totalShellsRemaining: room.shells.length - room.currentIndex,
      currentIndex: room.currentIndex,
      winner: room.winner,
      logs: room.logs,
      lastAction: room.lastAction,
      players: room.players.map(p => ({
        socketId: p.socketId,
        nickname: p.nickname,
        hp: p.hp,
        maxHp: p.maxHp,
        handcuffed: p.handcuffed,
        itemsCount: p.items.length,
        items: [...p.items]
      }))
    };
  }

  handleShoot(room, socketId, target) {
    const playerIndex = room.players.findIndex(p => p.socketId === socketId);
    if (playerIndex !== room.turnIndex || room.status !== 'playing') {
      return { error: 'Chưa đến lượt của bạn!' };
    }

    const shooter = room.players[playerIndex];
    const opponentIndex = (playerIndex + 1) % 2;
    const opponent = room.players[opponentIndex];

    const currentShell = room.shells[room.currentIndex];
    const isLive = currentShell === 'live';
    const damage = room.sawActive ? 2 : 1;

    room.currentIndex++;
    room.sawActive = false;

    let resultMsg = '';
    let resultType = '';

    if (target === 'self') {
      if (isLive) {
        shooter.hp = Math.max(0, shooter.hp - damage);
        resultType = 'self_live';
        resultMsg = `💥 ${shooter.nickname} tự bắn chính mình với viên THẬT! Mất ${damage} HP.`;
        this.addLog(room, resultMsg);
        this.switchTurn(room);
      } else {
        resultType = 'self_blank';
        resultMsg = `💨 ${shooter.nickname} tự bắn chính mình với viên GIẢ! Được GIỮ LƯỢT!`;
        this.addLog(room, resultMsg);
      }
    } else if (target === 'opponent') {
      if (isLive) {
        opponent.hp = Math.max(0, opponent.hp - damage);
        resultType = 'opponent_live';
        resultMsg = `💥 ${shooter.nickname} bắn ${opponent.nickname} bằng viên THẬT! Gây ${damage} sát thương!`;
        this.addLog(room, resultMsg);
      } else {
        resultType = 'opponent_blank';
        resultMsg = `💨 ${shooter.nickname} bắn ${opponent.nickname} bằng viên GIẢ! Không có sát thương.`;
        this.addLog(room, resultMsg);
      }
      this.switchTurn(room);
    }

    room.lastAction = {
      type: 'shoot',
      actorSocketId: socketId,
      target,
      isLive,
      timestamp: Date.now()
    };

    if (shooter.hp <= 0 || opponent.hp <= 0) {
      room.status = 'ended';
      room.winner = shooter.hp > 0 ? shooter.socketId : opponent.socketId;
      const winnerName = shooter.hp > 0 ? shooter.nickname : opponent.nickname;
      this.addLog(room, `🏆 TRẬN ĐẤU KẾT THÚC! ${winnerName} LÀ NGƯỜI CHIẾN THẮNG!`);
      return { success: true, resultType, resultMsg };
    }

    if (room.currentIndex >= room.shells.length) {
      this.addLog(room, '⚡ Băng đạn đã hết! Đang nạp băng đạn mới...');
      this.loadNewRound(room, false);
    }

    return { success: true, resultType, resultMsg };
  }

  handleUseItem(room, socketId, itemIndex, extraTarget = null) {
    const playerIndex = room.players.findIndex(p => p.socketId === socketId);
    if (playerIndex !== room.turnIndex || room.status !== 'playing') {
      return { error: 'Chưa đến lượt của bạn!' };
    }

    const player = room.players[playerIndex];
    const opponent = room.players[(playerIndex + 1) % 2];

    if (itemIndex < 0 || itemIndex >= player.items.length) {
      return { error: 'Vật phẩm không hợp lệ!' };
    }

    const itemKey = player.items[itemIndex];
    player.items.splice(itemIndex, 1);

    let privateFeedback = null;
    const currentShell = room.shells[room.currentIndex];

    switch (itemKey) {
      case ITEM_TYPES.GLASS: {
        privateFeedback = `🔍 Kính lúp cho thấy viên đạn hiện tại là: ${currentShell === 'live' ? 'ĐẠN THẬT (ĐỎ)' : 'ĐẠN GIẢ (XANH)'}`;
        this.addLog(room, `🔍 ${player.nickname} đã dùng Kính Lúp để kiểm tra viên đạn hiện tại.`);
        break;
      }

      case ITEM_TYPES.CIGARETTE: {
        if (player.hp < player.maxHp) {
          player.hp += 1;
          this.addLog(room, `🚬 ${player.nickname} hút thuốc và hồi 1 HP! (HP: ${player.hp}/${player.maxHp})`);
        } else {
          this.addLog(room, `🚬 ${player.nickname} hút thuốc nhưng máu đã đầy!`);
        }
        break;
      }

      case ITEM_TYPES.BEER: {
        room.currentIndex++;
        this.addLog(room, `🍺 ${player.nickname} uống bia và xả bỏ viên đạn hiện tại! Đạn bị xả ra là: ${currentShell === 'live' ? 'ĐẠN THẬT (ĐỎ)' : 'ĐẠN GIẢ (XANH)'}`);
        if (room.currentIndex >= room.shells.length) {
          this.addLog(room, '⚡ Băng đạn đã hết! Đang nạp băng đạn mới...');
          this.loadNewRound(room, false);
        }
        break;
      }

      case ITEM_TYPES.SAW: {
        room.sawActive = true;
        this.addLog(room, `🪚 ${player.nickname} đã cưa nòng súng! Sát thương x2!`);
        break;
      }

      case ITEM_TYPES.HANDCUFFS: {
        opponent.handcuffed = true;
        this.addLog(room, `⛓️ ${player.nickname} đã CÒNG TAY ${opponent.nickname}! Đối thủ sẽ mất lượt tiếp theo.`);
        break;
      }

      case ITEM_TYPES.INVERTER: {
        room.shells[room.currentIndex] = currentShell === 'live' ? 'blank' : 'live';
        this.addLog(room, `🔄 ${player.nickname} dùng Đầu Chuyển để thay đổi trạng thái viên đạn hiện tại!`);
        break;
      }

      case ITEM_TYPES.PHONE: {
        const remaining = room.shells.length - room.currentIndex;
        if (remaining <= 1) {
          privateFeedback = `📞 Điện thoại báo: "Không còn viên đạn tương lai nào để kiểm tra."`;
          this.addLog(room, `📞 ${player.nickname} dùng Điện thoại nhưng không có thêm thông tin.`);
        } else {
          const offset = Math.floor(Math.random() * (remaining - 1)) + 1;
          const futureIndex = room.currentIndex + offset;
          const futureShell = room.shells[futureIndex];
          privateFeedback = `📞 Điện thoại báo: "Viên đạn thứ ${offset + 1} tính từ hiện tại là ${futureShell === 'live' ? 'ĐẠN THẬT (ĐỎ)' : 'ĐẠN GIẢ (XANH)'}."`;
          this.addLog(room, `📞 ${player.nickname} đã nghe điện thoại để lấy manh mối bí mật.`);
        }
        break;
      }

      case ITEM_TYPES.ADRENALINE: {
        if (opponent.items.length === 0) {
          this.addLog(room, `💉 ${player.nickname} dùng Adrenaline nhưng đối thủ không có vật phẩm nào!`);
        } else {
          let stealIndex = extraTarget !== null ? extraTarget : Math.floor(Math.random() * opponent.items.length);
          if (stealIndex < 0 || stealIndex >= opponent.items.length) stealIndex = 0;
          const stolenItem = opponent.items[stealIndex];
          opponent.items.splice(stealIndex, 1);
          player.items.push(stolenItem);
          this.addLog(room, `💉 ${player.nickname} dùng Adrenaline cướp vật phẩm ${ITEMS_INFO[stolenItem]?.nameVi || stolenItem} của ${opponent.nickname}!`);
        }
        break;
      }

      case ITEM_TYPES.EXPIRED_MEDICINE: {
        const isHeal = Math.random() < 0.5;
        if (isHeal) {
          player.hp = Math.min(player.maxHp, player.hp + 2);
          this.addLog(room, `💊 ${player.nickname} dùng Thuốc Hết Hạn HỒI THÀNH CÔNG 2 HP! (HP: ${player.hp}/${player.maxHp})`);
        } else {
          player.hp = Math.max(0, player.hp - 1);
          this.addLog(room, `💊 ${player.nickname} dùng Thuốc Hết Hạn BỊ NGỘ ĐỘC mất 1 HP! (HP: ${player.hp}/${player.maxHp})`);
          if (player.hp <= 0) {
            room.status = 'ended';
            room.winner = opponent.socketId;
            this.addLog(room, `🏆 TRẬN ĐẤU KẾT THÚC! ${opponent.nickname} CHIẾN THẮNG do đối thủ tử vong vì ngộ độc!`);
          }
        }
        break;
      }

      default: break;
    }

    room.lastAction = {
      type: 'use_item',
      actorSocketId: socketId,
      itemKey,
      timestamp: Date.now()
    };

    return { success: true, privateFeedback };
  }

  restartGame(room) {
    this.startGame(room);
  }
}
