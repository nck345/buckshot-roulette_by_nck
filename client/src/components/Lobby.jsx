import React, { useState, useEffect } from 'react';
import { Play, Plus, Users, Copy, Check, Skull, Monitor } from 'lucide-react';
import RoomConfigModal from './RoomConfigModal';

export default function Lobby({ onCreateRoom, onJoinRoom, onStartLocalGame, roomCode, isWaitingForPlayer }) {
  const [nickname, setNickname] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [p2Nickname, setP2Nickname] = useState('Người chơi 2');
  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [pendingMode, setPendingMode] = useState(''); // 'online' or 'local'

  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('online');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('room');
    if (codeParam) {
      setInputCode(codeParam.toUpperCase());
      setActiveTab('online');
    }

    const savedNick = localStorage.getItem('buckshot_nick');
    if (savedNick) setNickname(savedNick);
    else setNickname(`Player_${Math.floor(Math.random() * 8999 + 1000)}`);
  }, []);

  const handleSaveNick = (val) => {
    setNickname(val);
    localStorage.setItem('buckshot_nick', val);
  };

  const handleOpenOnlineConfig = () => {
    if (!nickname.trim()) {
      setErrorMsg('Vui lòng nhập tên biệt hiệu!');
      return;
    }
    setErrorMsg('');
    setPendingMode('online');
    setShowConfigModal(true);
  };

  const handleOpenLocalConfig = () => {
    if (!nickname.trim()) {
      setErrorMsg('Vui lòng nhập tên Người chơi 1!');
      return;
    }
    setErrorMsg('');
    setPendingMode('local');
    setShowConfigModal(true);
  };

  const handleConfirmConfig = (initialHp, initialItems) => {
    setShowConfigModal(false);
    if (pendingMode === 'online') {
      onCreateRoom(nickname.trim(), initialHp, initialItems);
    } else if (pendingMode === 'local') {
      const p1 = nickname.trim() || 'Người chơi 1';
      const p2 = p2Nickname.trim() || 'Người chơi 2';
      onStartLocalGame(p1, p2, initialHp, initialItems);
    }
  };

  const handleJoin = () => {
    if (!nickname.trim()) {
      setErrorMsg('Vui lòng nhập tên biệt hiệu!');
      return;
    }
    if (!inputCode.trim()) {
      setErrorMsg('Vui lòng nhập mã phòng!');
      return;
    }
    setErrorMsg('');
    onJoinRoom(inputCode.trim().toUpperCase(), nickname.trim());
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (isWaitingForPlayer && roomCode) {
    return (
      <div style={{ maxWidth: '540px', margin: '60px auto', padding: '0 20px' }}>
        <div className="cyber-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>⏳</div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', fontSize: '1.8rem', marginBottom: '15px' }}>
            ĐANG CHỜ ĐỐI THỦ VÀO PHÒNG...
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>
            Chia sẻ mã phòng hoặc đường dẫn bên dưới cho bạn bè của bạn để bắt đầu trận đấu:
          </p>

          <div style={{
            background: 'rgba(0, 229, 255, 0.08)',
            border: '2px dashed var(--accent-cyan)',
            padding: '20px',
            borderRadius: '6px',
            marginBottom: '25px'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>MÃ PHÒNG (ROOM CODE)</div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', fontFamily: 'var(--font-retro)', color: 'var(--accent-gold)', letterSpacing: '4px', margin: '5px 0' }}>
              {roomCode}
            </div>
          </div>

          <button className="cyber-button" onClick={copyInviteLink} style={{ width: '100%', padding: '14px' }}>
            {copied ? <Check size={18} color="#00ff66" /> : <Copy size={18} />}
            {copied ? 'ĐÃ SAO CHÉP DẪN TRUYỀN!' : 'SAO CHÉP LINK MỜI BẠN BÈ'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px', margin: '40px auto', padding: '0 20px' }}>
      <div className="cyber-card" style={{ padding: '30px 25px' }}>
        
        {/* Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: 'var(--accent-red)' }}>
            <Skull size={36} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
              BUCKSHOT ROULETTE
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Game Đấu Súng Luân Phiên Tactical Real-Time
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
          <button
            className={`cyber-button ${activeTab === 'online' ? 'danger' : ''}`}
            onClick={() => setActiveTab('online')}
            style={{ padding: '12px', fontSize: '0.85rem' }}
          >
            <Users size={16} />
            CHƠI ONLINE (SERVER)
          </button>

          <button
            className={`cyber-button ${activeTab === 'local' ? 'danger' : ''}`}
            onClick={() => setActiveTab('local')}
            style={{ padding: '12px', fontSize: '0.85rem', borderColor: activeTab === 'local' ? 'var(--accent-gold)' : undefined }}
          >
            <Monitor size={16} />
            2 NGƯỜI 1 MÁY (LOCAL)
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(255, 59, 48, 0.15)',
            border: '1px solid var(--accent-red)',
            color: '#ff6b6b',
            padding: '10px 14px',
            borderRadius: '4px',
            fontSize: '0.9rem',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ONLINE TAB */}
        {activeTab === 'online' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Tên Biệt Hiệu (Nickname):
              </label>
              <input
                type="text"
                className="cyber-input"
                value={nickname}
                onChange={(e) => handleSaveNick(e.target.value)}
                placeholder="Nhập tên của bạn..."
                maxLength={16}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
              <button className="cyber-button danger" onClick={handleOpenOnlineConfig} style={{ padding: '15px' }}>
                <Plus size={18} />
                TẠO PHÒNG MỚI (ONLINE ROOM)
              </button>

              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                — HOẶC THAM GIA PHÒNG CÓ SẴN —
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="cyber-input"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="MÃ PHÒNG (VD: A1B2C)..."
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
                />
                <button className="cyber-button" onClick={handleJoin} style={{ whiteSpace: 'nowrap' }}>
                  <Users size={16} />
                  VÀO PHÒNG
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOCAL 2-PLAYER TAB */}
        {activeTab === 'local' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', lineHeight: '1.4' }}>
              Chế độ **2 Người 1 Máy (Pass & Play)**: Hai người chơi luân phiên thao tác trên cùng một thiết bị.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                🔴 Người Chơi 1 (P1):
              </label>
              <input
                type="text"
                className="cyber-input"
                value={nickname}
                onChange={(e) => handleSaveNick(e.target.value)}
                placeholder="Tên Người Chơi 1..."
                maxLength={16}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-gold)', marginBottom: '4px' }}>
                🔵 Người Chơi 2 (P2):
              </label>
              <input
                type="text"
                className="cyber-input"
                value={p2Nickname}
                onChange={(e) => setP2Nickname(e.target.value)}
                placeholder="Tên Người Chơi 2..."
                maxLength={16}
              />
            </div>

            <button className="cyber-button danger" onClick={handleOpenLocalConfig} style={{ padding: '15px', marginTop: '5px', fontSize: '1rem' }}>
              <Play size={18} />
              BẮT ĐẦU CHƠI 2 NGƯỜI 1 MÁY
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '25px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          🎮 Chế độ Online Multiplayer & Offline 2 Người 1 Máy
        </div>
      </div>

      {/* POPUP CONFIGURATION MODAL DIALOG */}
      {showConfigModal && (
        <RoomConfigModal
          title={pendingMode === 'online' ? "CẤU HÌNH PHÒNG ONLINE" : "CẤU HÌNH PHÒNG CHƠI LOCAL"}
          onConfirm={handleConfirmConfig}
          onClose={() => setShowConfigModal(false)}
        />
      )}
    </div>
  );
}
