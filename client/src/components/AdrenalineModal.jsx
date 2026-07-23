import React from 'react';
import { Syringe, X } from 'lucide-react';
import { ITEMS_INFO, ITEM_TYPES } from '../utils/items';

export default function AdrenalineModal({ opponentItems, onSelect, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div className="cyber-card" style={{ maxWidth: '450px', width: '100%', padding: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 'bold' }}>
            <Syringe size={22} />
            <span>ADRENALINE: CHỌN ĐỒ ĐỂ CƯỚP</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
          Chọn 1 vật phẩm từ khay đồ đối thủ để cướp và sử dụng ngay lập tức:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
          {opponentItems && opponentItems.length > 0 ? (
            opponentItems.map((itemKey, idx) => {
              const isAdrenaline = itemKey === ITEM_TYPES.ADRENALINE;
              const info = ITEMS_INFO[itemKey] || { icon: '📦', nameVi: itemKey, description: '' };
              return (
                <button
                  key={idx}
                  className="cyber-button"
                  onClick={() => !isAdrenaline && onSelect(idx)}
                  disabled={isAdrenaline}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    justifyContent: 'flex-start',
                    fontSize: '0.85rem',
                    opacity: isAdrenaline ? 0.4 : 1,
                    cursor: isAdrenaline ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{info.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', color: isAdrenaline ? 'var(--text-muted)' : 'var(--text-main)' }}>{info.nameVi}</div>
                    {isAdrenaline && <div style={{ fontSize: '0.7rem', color: 'var(--accent-red)' }}>Không thể cướp</div>}
                  </div>
                </button>
              );
            })
          ) : (
            <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--text-muted)', padding: '15px' }}>
              Đối thủ không có vật phẩm nào!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
