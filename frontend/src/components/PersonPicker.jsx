import { useState } from 'react';
import { initial, ROLE_LABEL } from '../utils/format';

// Başlıktaki kişi seçici: aile üyeleri arasında geçiş. Sıralama sunucudan gelir (önce çocuklar).
export default function PersonPicker({ members, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = members.find((m) => m.id === selectedId);
  if (!selected) return null;

  return (
    <div className="picker">
      <button type="button" className="tag picker-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="av">{initial(selected.displayName)}</span>
        {selected.displayName}
        <span className="caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <>
          <div className="picker-backdrop" onClick={() => setOpen(false)} />
          <ul className="picker-list" role="listbox" aria-label="Kişi seç">
            {members.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={m.id === selectedId}
                  className={m.id === selectedId ? 'active' : ''}
                  onClick={() => { onSelect(m.id); setOpen(false); }}
                >
                  <span className="av">{initial(m.displayName)}</span>
                  <span className="nm">{m.displayName}{m.isMe && <small> (sen)</small>}</span>
                  <span className="rl">{ROLE_LABEL[m.role]}{!m.canEdit && ' · görüntüleme'}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
