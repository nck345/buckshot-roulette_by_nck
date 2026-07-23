import React, { useState, useEffect, useRef } from 'react';
import { Crosshair, UserCheck, Copy, Check, Eye, LogOut, Terminal } from 'lucide-react';
import AdrenalineModal from './AdrenalineModal';
import { soundManager } from '../audio/soundManager';
import { ITEMS_INFO, ITEM_TYPES } from '../utils/items';

export default function GameTable({ gameState, socketId, onShoot, onUseItem, onLeaveRoom, privateHint, clearPrivateHint }) {
  const [copied, setCopied] = useState(false);
  const [showAdrenalineModal, setShowAdrenalineModal] = useState(false);
  const [adrenalineItemIndex, setAdrenalineItemIndex] = useState(null);
  
  // Aim & Shot animation states: 'left', 'right', or ''
  const [aimDirection, setAimDirection] = useState('');
  const [shotEffect, setShotEffect] = useState(''); // 'live', 'blank', or ''

  // Damage Flash states
  const [p1Flash, setP1Flash] = useState(false);
  const [p2Flash, setP2Flash] = useState(false);

  const prevP1Hp = useRef(null);
  const prevP2Hp = useRef(null);
  const lastActionTimestamp = useRef(null);
  const logEndRef = useRef(null);

  if (!gameState || !gameState.players || gameState.players.length < 2) return null;

  const isLocalMode = gameState.code === 'LOCAL_ROOM';

  // FIXED POSITIONS:
  // Left is ALWAYS Player 1 (idx 0), Right is ALWAYS Player 2 (idx 1).
  let leftPlayer, rightPlayer;

  if (isLocalMode) {
    leftPlayer = gameState.players[0];
    rightPlayer = gameState.players[1];
  } else {
    leftPlayer = gameState.players.find(p => p.socketId === socketId) || gameState.players[0];
    rightPlayer = gameState.players.find(p => p.socketId !== socketId) || gameState.players[1];
  }

  // Active turn indicators (determines which side's frame GLOWS)
  const isLeftTurn = gameState.turnSocketId === leftPlayer.socketId;
  const isRightTurn = gameState.turnSocketId === rightPlayer.socketId;

  // Active player object for current turn
  const activePlayer = gameState.players[gameState.turnIndex] || leftPlayer;
  const activeOpponent = gameState.players[(gameState.turnIndex + 1) % 2] || rightPlayer;

  // Check if user is allowed to act
  const canAct = isLocalMode ? true : isLeftTurn;

  // Auto-scroll action log to bottom on new log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.logs]);

  // Real-time animation broadcast for ALL actions (Both Player & Opponent turns!)
  useEffect(() => {
    if (!gameState.lastAction || gameState.lastAction.timestamp === lastActionTimestamp.current) {
      return;
    }

    lastActionTimestamp.current = gameState.lastAction.timestamp;
    const action = gameState.lastAction;

    if (action.type === 'shoot') {
      const isActorLeft = action.actorSocketId === leftPlayer.socketId;
      
      let dir = '';
      if (isActorLeft) {
        dir = action.target === 'opponent' ? 'right' : 'left';
      } else {
        dir = action.target === 'opponent' ? 'left' : 'right';
      }

      setAimDirection(dir);
      setShotEffect(action.isLive ? 'live' : 'blank');

      if (action.isLive) {
        soundManager.playGunshot();
      } else {
        soundManager.playBlankClick();
      }

      setTimeout(() => {
        setAimDirection('');
        setShotEffect('');
      }, 700);
    } else if (action.type === 'use_item') {
      switch (action.itemKey) {
        case ITEM_TYPES.GLASS: soundManager.playGlass(); break;
        case ITEM_TYPES.CIGARETTE: soundManager.playCigarette(); break;
        case ITEM_TYPES.BEER: soundManager.playBeer(); break;
        case ITEM_TYPES.SAW: soundManager.playSaw(); break;
        case ITEM_TYPES.PHONE: soundManager.playPhone(); break;
        case ITEM_TYPES.INVERTER: soundManager.playInverter(); break;
        default: break;
      }
    }
  }, [gameState.lastAction, leftPlayer.socketId]);

  // Flash damage effect when HP drops
  useEffect(() => {
    if (prevP1Hp.current !== null && leftPlayer.hp < prevP1Hp.current) {
      setP1Flash(true);
      setTimeout(() => setP1Flash(false), 600);
    }
    if (prevP2Hp.current !== null && rightPlayer.hp < prevP2Hp.current) {
      setP2Flash(true);
      setTimeout(() => setP2Flash(false), 600);
    }

    prevP1Hp.current = leftPlayer.hp;
    prevP2Hp.current = rightPlayer.hp;
  }, [leftPlayer.hp, rightPlayer.hp]);

  const handleShootSelf = () => {
    if (!canAct) return;
    onShoot('self');
  };

  const handleShootOpponent = () => {
    if (!canAct) return;
    onShoot('opponent');
  };

  const handleItemClick = (itemKey, index) => {
    if (!canAct) return;

    if (itemKey === ITEM_TYPES.ADRENALINE) {
      if (activeOpponent.items && activeOpponent.items.length > 0 && activeOpponent.items[0] !== 'unknown') {
        setAdrenalineItemIndex(index);
        setShowAdrenalineModal(true);
        return;
      }
    }

    onUseItem(index);
  };

  const handleSelectStealItem = (stealIdx) => {
    setShowAdrenalineModal(false);
    onUseItem(adrenalineItemIndex, stealIdx);
  };

  const copyRoomLink = () => {
    const inviteUrl = `${window.location.origin}?room=${gameState.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTooltipClass = (index) => {
    const col = index % 4;
    if (col === 0) return 'tooltip-left';
    if (col === 3) return 'tooltip-right';
    return 'tooltip-center';
  };

  const renderHP = (hp, maxHp) => {
    if (maxHp <= 8) {
      const hearts = [];
      for (let i = 0; i < maxHp; i++) {
        hearts.push(
          <span key={i} style={{
            color: i < hp ? 'var(--accent-red)' : '#2a343e',
            fontSize: '1.4rem',
            filter: i < hp ? 'drop-shadow(0 0 6px rgba(255, 59, 48, 0.7))' : 'none',
            transition: 'all 0.3s ease'
          }}>
            ♥
          </span>
        );
      }
      return <div style={{ display: 'flex', gap: '4px' }}>{hearts}</div>;
    }

    const percent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
        <div style={{
          flex: 1,
          height: '14px',
          background: '#151d24',
          border: '1px solid var(--panel-border)',
          borderRadius: '7px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #ff3b30 0%, #ff6b6b 100%)',
            boxShadow: '0 0 8px rgba(255, 59, 48, 0.8)',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--accent-red)' }}>
          {hp}/{maxHp}
        </span>
      </div>
    );
  };

  const getGunTransform = () => {
    if (aimDirection === 'right') {
      return 'rotate(180deg) scale(1.35)';
    }
    if (aimDirection === 'left') {
      return 'rotate(0deg) scale(1.35)';
    }
    return 'rotate(0deg) scale(1)';
  };

  const getGunFilter = () => {
    if (aimDirection === 'right') return 'drop-shadow(0 0 25px rgba(255, 59, 48, 0.9))';
    if (aimDirection === 'left') return 'drop-shadow(0 0 25px rgba(0, 229, 255, 0.9))';
    return 'drop-shadow(0 12px 25px rgba(0,0,0,0.9))';
  };

  return (
    <div className="panorama-layout">
      
      {/* 1. HEADER INFO BAR WITH LEAVE GAME BUTTON */}
      <div className="game-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
            ROUND {gameState.round}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {isLocalMode ? '2 NGƯỜI 1 MÁY (LOCAL)' : `MÃ PHÒNG: ${gameState.code}`}
          </span>
          {!isLocalMode && (
            <button onClick={copyRoomLink} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {copied ? <Check size={14} color="#00ff66" /> : <Copy size={14} />}
            </button>
          )}
        </div>

        {/* Leave Game Button */}
        <button
          className="cyber-button danger"
          onClick={onLeaveRoom}
          style={{ padding: '6px 14px', fontSize: '0.8rem', gap: '4px' }}
        >
          <LogOut size={14} />
          THOÁT PHÒNG
        </button>
      </div>

      {/* Secret Hint Banner */}
      {privateHint && (
        <div style={{
          background: 'rgba(255, 214, 10, 0.15)',
          border: '1px solid var(--accent-gold)',
          color: 'var(--accent-gold)',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Eye size={18} />
          <span style={{ flex: 1 }}>{privateHint}</span>
          <button onClick={clearPrivateHint} style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {/* 2. MAIN PANORAMA ARENA (FIXED LEFT P1 - CENTER - FIXED RIGHT P2) */}
      <div className="arena-grid">

        {/* LEFT PANEL: PLAYER 1 */}
        <div className={`player-side-card ${isLeftTurn ? 'active-turn' : ''} ${p1Flash ? 'damage-flash' : ''}`}>
          <div className="avatar-box">
            <div className="avatar-icon">👤</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 'bold', color: 'var(--accent-cyan)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {leftPlayer.nickname}
              </div>
              <div style={{ fontSize: '0.75rem', color: isLeftTurn ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                {isLeftTurn ? '👉 ĐANG LƯỢT HÀNH ĐỘNG' : 'CHỜ LƯỢT...'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>MÁU (HP):</span>
            {renderHP(leftPlayer.hp || 0, leftPlayer.maxHp || 4)}
          </div>

          {leftPlayer.handcuffed && (
            <div style={{ background: 'rgba(255, 214, 10, 0.2)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', padding: '4px', textAlign: 'center', borderRadius: '4px', fontSize: '0.8rem' }}>
              ⛓️ BỊ CÒNG TAY (MẤT LƯỢT)
            </div>
          )}

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '4px 0' }} />

          {/* LEFT PLAYER INVENTORY GRID */}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              KHAY VẬT PHẨM:
            </div>
            
            <div className="inventory-grid">
              {leftPlayer.items && leftPlayer.items.length > 0 ? (
                leftPlayer.items.map((itemKey, idx) => {
                  const info = ITEMS_INFO[itemKey] || { icon: '📦', nameVi: itemKey, description: 'Vật phẩm bí ẩn' };
                  const isItemClickable = canAct && isLeftTurn;
                  return (
                    <div key={idx} className={`tooltip-container ${getTooltipClass(idx)}`}>
                      <button
                        className="item-card-btn"
                        onClick={() => isItemClickable && handleItemClick(itemKey, idx)}
                        disabled={!isItemClickable}
                      >
                        {info.icon}
                      </button>
                      <span className="tooltip-text">
                        <strong style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>{info.nameVi}</strong><br />
                        {info.description}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: 'span 4', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem', padding: '10px 0', textAlign: 'center' }}>
                  Khay đồ trống
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER PANEL: SHELL COUNT BADGE + SHOTGUN + CONTROLS + ACTION LOG */}
        <div className="center-stage">
          
          {/* PROMINENT SHELL COUNT BADGE (🔴 THẬT / 🔵 GIẢ) IN CENTER STAGE */}
          <div className="center-shell-badge">
            <span style={{ color: '#ff3b30' }}>🔴 THẬT: {gameState.liveCount}</span>
            <span style={{ color: '#00e5ff' }}>🔵 GIẢ: {gameState.blankCount}</span>
          </div>

          {/* Saw Damage Indicator */}
          {gameState.sawActive && (
            <div style={{
              background: 'rgba(255, 59, 48, 0.25)',
              border: '1px solid var(--accent-red)',
              color: '#ff6b6b',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              letterSpacing: '1px',
              animation: 'pulse 1s infinite'
            }}>
              🪚 NÒNG SÚNG ĐÃ CƯA (SÁT THƯƠNG x2)
            </div>
          )}

          {/* Shotgun Display */}
          <div className="shotgun-container">
            <div
              className="shotgun-gun"
              style={{
                transform: getGunTransform(),
                filter: getGunFilter()
              }}
            >
              🔫
            </div>

            {shotEffect && (
              <div className={`muzzle-flash ${aimDirection === 'left' ? 'left' : 'right'}`}>
                {shotEffect === 'live' ? '💥' : '💨'}
              </div>
            )}

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Đạn còn lại trong nòng: <strong style={{ color: 'var(--accent-gold)' }}>{gameState.totalShellsRemaining} viên</strong>
            </div>
          </div>

          {/* Turn Status Banner */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            color: isLeftTurn ? 'var(--accent-cyan)' : '#ff6b6b',
            marginBottom: '6px'
          }}>
            👉 ĐANG LƯỢT: {activePlayer.nickname}
          </div>

          {/* Action Buttons */}
          <div className="action-controls">
            <button
              className="cyber-button"
              onClick={handleShootSelf}
              disabled={!canAct}
              style={{ padding: '12px 18px', fontSize: '0.95rem', borderColor: 'var(--accent-gold)' }}
            >
              <UserCheck size={18} />
              BẮN BẢN THÂN
            </button>

            <button
              className="cyber-button danger"
              onClick={handleShootOpponent}
              disabled={!canAct}
              style={{ padding: '12px 18px', fontSize: '0.95rem' }}
            >
              <Crosshair size={18} />
              BẮN ĐỐI THỦ
            </button>
          </div>

          {/* MINI ACTION LOG CONSOLE (RESETS EVERY NEW RELOAD ROUND) */}
          <div className="action-log-mini">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontSize: '0.72rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
              <Terminal size={12} /> NHẬT KÝ LẦN NẠP ĐẠN NÀY:
            </div>
            {gameState.logs && gameState.logs.length > 0 ? (
              gameState.logs.map((log, index) => (
                <div key={index} className="action-log-item">
                  <span className="action-log-time">[{log.time}]</span>
                  <span>{log.text}</span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                Chờ lượt hành động...
              </div>
            )}
            <div ref={logEndRef} />
          </div>

        </div>

        {/* RIGHT PANEL: PLAYER 2 */}
        <div className={`player-side-card ${isRightTurn ? 'active-turn' : ''} ${p2Flash ? 'damage-flash' : ''}`}>
          <div className="avatar-box">
            <div className="avatar-icon opponent">💀</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 'bold', color: '#ff6b6b', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {rightPlayer.nickname || 'ĐỐI THỦ'}
              </div>
              <div style={{ fontSize: '0.75rem', color: isRightTurn ? '#ff6b6b' : 'var(--text-muted)' }}>
                {isRightTurn ? '👉 ĐANG LƯỢT HÀNH ĐỘNG' : 'CHỜ LƯỢT...'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>MÁU (HP):</span>
            {renderHP(rightPlayer.hp || 0, rightPlayer.maxHp || 4)}
          </div>

          {rightPlayer.handcuffed && (
            <div style={{ background: 'rgba(255, 214, 10, 0.2)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', padding: '4px', textAlign: 'center', borderRadius: '4px', fontSize: '0.8rem' }}>
              ⛓️ BỊ CÒNG TAY (MẤT LƯỢT)
            </div>
          )}

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '4px 0' }} />

          {/* RIGHT PLAYER INVENTORY GRID */}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              KHAY VẬT PHẨM:
            </div>
            
            <div className="inventory-grid">
              {rightPlayer.items && rightPlayer.items.length > 0 ? (
                rightPlayer.items.map((itemKey, idx) => {
                  const info = ITEMS_INFO[itemKey] || { icon: '📦', nameVi: itemKey, description: 'Vật phẩm đối thủ' };
                  const isItemClickable = canAct && isRightTurn;
                  return (
                    <div key={idx} className={`tooltip-container ${getTooltipClass(idx)}`}>
                      <button
                        className="item-card-btn"
                        onClick={() => isItemClickable && handleItemClick(itemKey, idx)}
                        disabled={!isItemClickable}
                      >
                        {info.icon}
                      </button>
                      <span className="tooltip-text">
                        <strong style={{ color: 'var(--accent-red)', fontSize: '0.9rem' }}>{info.nameVi}</strong><br />
                        {info.description}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: 'span 4', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem', padding: '10px 0', textAlign: 'center' }}>
                  Khay đồ trống
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Adrenaline Steal Modal */}
      {showAdrenalineModal && (
        <AdrenalineModal
          opponentItems={activeOpponent.items || []}
          onSelect={handleSelectStealItem}
          onClose={() => setShowAdrenalineModal(false)}
        />
      )}
    </div>
  );
}
