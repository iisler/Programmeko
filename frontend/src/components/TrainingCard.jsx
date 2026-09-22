import { useState } from 'react';
import client from '../api/client';

const SPORT_ICON = (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 3c2.5 2.5 2.5 15.5 0 18" /><path d="M4.5 8c4 2 11 2 15 0" /><path d="M4.5 16c4-2 11-2 15 0" /></svg>
);

function formatDuration(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

export default function TrainingCard({ date, entries, totalMinutes, onRefresh }) {
  const [form, setForm] = useState({ type: 'Top', hours: '', minutes: '', note: '' });

  async function addTraining(e) {
    e.preventDefault();
    const totalMins = (parseInt(form.hours) || 0) * 60 + (parseInt(form.minutes) || 0);
    if (totalMins <= 0) return;
    await client.post(`/days/${date}/training`, { type: form.type, minutes: totalMins, note: form.note });
    setForm({ type: 'Top', hours: '', minutes: '', note: '' });
    onRefresh();
  }

  async function deleteTraining(id) {
    await client.delete(`/days/${date}/training/${id}`);
    onRefresh();
  }

  return (
    <div className="card sport">
      <div className="card-head">
        <div className="card-title"><span className="icon-tile sport">{SPORT_ICON}</span><h2>Antrenman</h2></div>
        {totalMinutes > 0 && <span className="total">{formatDuration(totalMinutes)} toplam</span>}
      </div>

      {entries.length === 0
        ? <div className="empty-note">Bu gün için henüz antrenman kaydı yok.</div>
        : entries.map(e => (
          <div key={e.id} className="entry">
            <span className="swatch sport" />
            <div className="info">
              <div className="subj">{e.type}</div>
              {e.note && <div className="topic">{e.note}</div>}
            </div>
            <span className="mins sport">{formatDuration(e.minutes)}</span>
            <button className="del" aria-label="Sil" onClick={() => deleteTraining(e.id)}>×</button>
          </div>
        ))
      }

      <form className="addform sport" onSubmit={addTraining}>
        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="Top">Top</option>
          <option value="Kuvvet">Kuvvet</option>
        </select>
        <input
          type="number" min="0" placeholder="sa"
          value={form.hours}
          onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
        />
        <input
          type="number" min="0" max="59" placeholder="dk"
          value={form.minutes}
          onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))}
        />
        <input placeholder="Not (opsiyonel)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        <button type="submit">Ekle</button>
      </form>
    </div>
  );
}
