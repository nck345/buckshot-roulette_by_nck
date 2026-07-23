// localGameEngine.js - Client-side engine for Local 2-Player (1 Device / Pass & Play)
import { ITEM_TYPES, ITEMS_INFO } from './items.js';

const ALL_ITEM_KEYS = Object.keys(ITEM_TYPES).map(k => ITEM_TYPES[k]);

export class LocalGameEngine {
  constructor(p1Name = 'Người chơi 1', p2Name = 'Người chơi 2', initialHp = '', initialItems = '') {
    this.config = { initialHp, initialItems };
    this.room = {
      code: 'LOCAL_ROOM',
      status: 'playing',
      round: 1,
      turnIndex: 0,
      players: [
        { socketId: 'p1', nickname: p1Name, hp: 4, maxHp: 4, items: [], handcuffed: false },
        { socketId: 'p2', nickname: p2Name, hp: 4, maxHp: 4, items: [], handcuffed: false }
      ],
      shells: [],
      currentIndex: 0,
      liveCount: 0,
      blankCount: 0,
      sawActive: false,
      winner: null,
      logs: [],
      lastAction: null
    };

    this.startGame();
  }

  startGame() {
    this.room.status = 'playing';
    this.room.round = 1;
    this.room.turnIndex = Math.floor(Math.random() * 2);

    let startHp = this.config?.initialHp !== '' && this.config?.initialHp !== undefined ? parseInt(this.config.initialHp) : null;
    if (startHp === null || isNaN(startHp) || startHp < 1) {
      startHp = Math.floor(Math.random() * 4) + 3;
    }

    this.room.players.forEach(p => {
      p.maxHp = startHp;
      p.hp = startHp;
      p.items = [];
      p.handcuffed = false;
    });

    this.loadNewRound(true);
  }

  loadNewRound(isGameStart = false) {
    // CLEAR/RESET ACTION LOGS FOR EACH NEW SHELL RELOAD ROUND!
    this.room.logs = [];
    this.room.sawActive = false;
    this.room.currentIndex = 0;

    const totalShells = Math.floor(Math.random() * 5) + 3;
    let live = Math.floor(Math.random() * (totalShells - 1)) + 1;
    let blank = totalShells - live;
    if (blank === 0) { blank = 1; live--; }

    this.room.liveCount = live;
    this.room.blankCount = blank;

    const array = [];
    for (let i = 0; i < live; i++) array.push('live');
    for (let i = 0; i < blank; i++) array.push('blank');

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    this.room.shells = array;

    this.room.players.forEach(p => {
      let countToGive = 0;

      if (isGameStart) {
        if (this.config?.initialItems !== '' && this.config?.initialItems !== undefined) {
          countToGive = parseInt(this.config.initialItems);
          if (isNaN(countToGive) || countToGive < 0) countToGive = Math.floor(Math.random() * 3);
        } else {
          countToGive = Math.floor(Math.random() * 3);
        }
      } else {
        countToGive = Math.floor(Math.random() * 2) + 2;
      }

      for (let i = 0; i < countToGive; i++) {
        if (p.items.length < 8) {
          const randomItem = ALL_ITEM_KEYS[Math.floor(Math.random() * ALL_ITEM_KEYS.length)];
          p.items.push(randomItem);
        }
      }
    });

    if (!isGameStart) {
      this.room.round += 1;
    }

    this.addLog(`🔄 BẮT ĐẦU ĐỢT ĐẠN MỚI (ROUND ${this.room.round})`);
    this.addLog(`🔴 Đạn THẬT: ${live} | 🔵 Đạn GIẢ: ${blank}`);
    this.addLog(`👉 ${this.room.players[this.room.turnIndex].nickname} đi trước.`);
  }

  addLog(text) {
    this.room.logs.push({
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text
    });
    if (this.room.logs.length > 30) this.room.logs.shift();
  }

  switchTurn() {
    const nextTurnIndex = (this.room.turnIndex + 1) % 2;
    const nextPlayer = this.room.players[nextTurnIndex];

    if (nextPlayer.handcuffed) {
      nextPlayer.handcuffed = false;
      this.addLog(`⛓️ ${nextPlayer.nickname} đang bị CÒNG TAY! Mất lượt!`);
    } else {
      this.room.turnIndex = nextTurnIndex;
    }
  }

  getState() {
    const activeSocketId = this.room.players[this.room.turnIndex]?.socketId;
    return {
      code: this.room.code,
      status: this.room.status,
      round: this.room.round,
      turnIndex: this.room.turnIndex,
      turnSocketId: activeSocketId,
      sawActive: this.room.sawActive,
      liveCount: this.room.liveCount,
      blankCount: this.room.blankCount,
      totalShellsRemaining: this.room.shells.length - this.room.currentIndex,
      currentIndex: this.room.currentIndex,
      winner: this.room.winner,
      logs: [...this.room.logs],
      lastAction: this.room.lastAction,
      players: this.room.players.map(p => ({
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

  handleShoot(target) {
    const shooter = this.room.players[this.room.turnIndex];
    const opponent = this.room.players[(this.room.turnIndex + 1) % 2];

    const currentShell = this.room.shells[this.room.currentIndex];
    const isLive = currentShell === 'live';
    const damage = this.room.sawActive ? 2 : 1;

    this.room.currentIndex++;
    this.room.sawActive = false;

    if (target === 'self') {
      if (isLive) {
        shooter.hp = Math.max(0, shooter.hp - damage);
        this.addLog(`💥 ${shooter.nickname} tự bắn mình bằng ĐẠN THẬT! Mất ${damage} HP.`);
        this.switchTurn();
      } else {
        this.addLog(`💨 ${shooter.nickname} tự bắn mình bằng ĐẠN GIẢ! Được GIỮ LƯỢT!`);
      }
    } else if (target === 'opponent') {
      if (isLive) {
        opponent.hp = Math.max(0, opponent.hp - damage);
        this.addLog(`💥 ${shooter.nickname} bắn ${opponent.nickname} bằng ĐẠN THẬT! Gây ${damage} HP sát thương!`);
      } else {
        this.addLog(`💨 ${shooter.nickname} bắn ${opponent.nickname} bằng ĐẠN GIẢ! Không có sát thương.`);
      }
      this.switchTurn();
    }

    this.room.lastAction = {
      type: 'shoot',
      actorSocketId: shooter.socketId,
      target,
      isLive,
      timestamp: Date.now()
    };

    if (shooter.hp <= 0 || opponent.hp <= 0) {
      this.room.status = 'ended';
      this.room.winner = shooter.hp > 0 ? shooter.socketId : opponent.socketId;
      const winnerName = shooter.hp > 0 ? shooter.nickname : opponent.nickname;
      this.addLog(`🏆 TRẬN ĐẤU KẾT THÚC! ${winnerName} CHIẾN THẮNG!`);
    } else if (this.room.currentIndex >= this.room.shells.length) {
      this.addLog('⚡ Đã hết đạn! Nạp băng đạn mới...');
      this.loadNewRound(false);
    }

    return this.getState();
  }

  handleUseItem(itemIndex, extraTarget = null) {
    const player = this.room.players[this.room.turnIndex];
    const opponent = this.room.players[(this.room.turnIndex + 1) % 2];

    if (itemIndex < 0 || itemIndex >= player.items.length) return null;

    const itemKey = player.items[itemIndex];
    player.items.splice(itemIndex, 1);

    let privateFeedback = null;
    const currentShell = this.room.shells[this.room.currentIndex];

    switch (itemKey) {
      case ITEM_TYPES.GLASS: {
        privateFeedback = `🔍 MẬT (Kính Lúp): Viên đạn hiện tại là ${currentShell === 'live' ? 'ĐẠN THẬT (ĐỎ)' : 'ĐẠN GIẢ (XANH)'}`;
        this.addLog(`🔍 ${player.nickname} xem Kính Lúp.`);
        break;
      }
      case ITEM_TYPES.CIGARETTE: {
        player.hp = Math.min(player.maxHp, player.hp + 1);
        this.addLog(`🚬 ${player.nickname} hút thuốc hồi 1 HP!`);
        break;
      }
      case ITEM_TYPES.BEER: {
        this.room.currentIndex++;
        this.addLog(`🍺 ${player.nickname} uống bia xả đạn: ${currentShell === 'live' ? 'ĐẠN THẬT (ĐỎ)' : 'ĐẠN GIẢ (XANH)'}`);
        if (this.room.currentIndex >= this.room.shells.length) {
          this.addLog('⚡ Đã hết đạn! Nạp băng đạn mới...');
          this.loadNewRound(false);
        }
        break;
      }
      case ITEM_TYPES.SAW: {
        this.room.sawActive = true;
        this.addLog(`🪚 ${player.nickname} cưa nòng súng! Sát thương x2!`);
        break;
      }
      case ITEM_TYPES.HANDCUFFS: {
        opponent.handcuffed = true;
        this.addLog(`⛓️ ${player.nickname} còng tay ${opponent.nickname}! Mất lượt tiếp.`);
        break;
      }
      case ITEM_TYPES.INVERTER: {
        this.room.shells[this.room.currentIndex] = currentShell === 'live' ? 'blank' : 'live';
        this.addLog(`🔄 ${player.nickname} dùng Đầu Chuyển đổi loại đạn!`);
        break;
      }
      case ITEM_TYPES.PHONE: {
        const remaining = this.room.shells.length - this.room.currentIndex;
        if (remaining > 1) {
          const offset = Math.floor(Math.random() * (remaining - 1)) + 1;
          const futureShell = this.room.shells[this.room.currentIndex + offset];
          privateFeedback = `📞 MẬT (Điện thoại): Viên đạn thứ ${offset + 1} tính từ hiện tại là ${futureShell === 'live' ? 'ĐẠN THẬT (ĐỎ)' : 'ĐẠN GIẢ (XANH)'}`;
          this.addLog(`📞 ${player.nickname} nghe điện thoại nhận manh mối.`);
        } else {
          privateFeedback = `📞 Điện thoại: Không còn đạn tương lai để xem.`;
          this.addLog(`📞 ${player.nickname} nghe điện thoại nhưng không có thông tin.`);
        }
        break;
      }
      case ITEM_TYPES.ADRENALINE: {
        if (opponent.items.length > 0) {
          let stealIdx = extraTarget !== null ? extraTarget : 0;
          if (stealIdx >= opponent.items.length) stealIdx = 0;
          const stolen = opponent.items.splice(stealIdx, 1)[0];
          player.items.push(stolen);
          this.addLog(`💉 ${player.nickname} cướp ${ITEMS_INFO[stolen]?.nameVi || stolen}!`);
        } else {
          this.addLog(`💉 ${player.nickname} dùng Adrenaline nhưng đối thủ hết đồ!`);
        }
        break;
      }
      case ITEM_TYPES.EXPIRED_MEDICINE: {
        if (Math.random() < 0.5) {
          player.hp = Math.min(player.maxHp, player.hp + 2);
          this.addLog(`💊 ${player.nickname} dùng Thuốc Hết Hạn HỒI 2 HP!`);
        } else {
          player.hp = Math.max(0, player.hp - 1);
          this.addLog(`💊 ${player.nickname} dùng Thuốc Hết Hạn BỊ NGỘ ĐỘC mất 1 HP!`);
          if (player.hp <= 0) {
            this.room.status = 'ended';
            this.room.winner = opponent.socketId;
            this.addLog(`🏆 TRẬN ĐẤU KẾT THÚC! ${opponent.nickname} CHIẾN THẮNG!`);
          }
        }
        break;
      }
      default: break;
    }

    this.room.lastAction = {
      type: 'use_item',
      actorSocketId: player.socketId,
      itemKey,
      timestamp: Date.now()
    };

    return { state: this.getState(), privateFeedback };
  }
}
