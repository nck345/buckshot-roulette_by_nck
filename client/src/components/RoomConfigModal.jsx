import React, { useState } from 'react';
import { Settings, Play, X } from 'lucide-react';

export default function RoomConfigModal({ onConfirm, onClose, title = "CẤU HÌNH PHÒNG CHƠI" }) {
  const [initialHp, setInitialHp] = useState('');
  const [initialItems, setInitialItems] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(initialHp, initialItems);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div className="cyber-card" style={{ maxWidth: '460px', width: '100%', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 'bold' }}>
            <Settings size={20} />
            <span>{title}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '6px' }}>
              ❤️ Lượng máu ban đầu (Initial HP):
            </label>
            <input
              type="number"
              className="cyber-input"
              value={initialHp}
              onChange={(e) => setInitialHp(e.target.value)}
              placeholder="Để trống = Ngẫu nhiên từ 3 đến 6 HP..."
              min={1}
              max={10}
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--accent-gold)', marginBottom: '6px' }}>
              📦 Lượng vật phẩm (Đồ) ban đầu:
            </label>
            <input
              type="number"
              className="cyber-input"
              value={initialItems}
              onChange={(e) => setInitialItems(e.target.value)}
              placeholder="Để trống = Ngẫu nhiên từ 0 đến 2 đồ..."
              min={0}
              max={8}
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '4px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            ℹ️ <strong>Quy tắc:</strong> Nếu để trống, game sẽ ngẫu nhiên máu (3-6) & vật phẩm (0-2) ở Round 1. Các round nạp đạn tiếp theo sẽ cộng ngẫu nhiên thêm 2-3 vật phẩm mới.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
            <button type="button" className="cyber-button" onClick={onClose} style={{ padding: '12px' }}>
              HỦY BỎ
            </button>
            <button type="submit" className="cyber-button danger" style={{ padding: '12px' }}>
              <Play size={16} />
              XÁC NHẬN CHƠI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
