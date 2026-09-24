import { useState } from 'react';
import client from '../api/client';
import { errorText } from '../api/errors';

const STATUS_ORDER = ['todo', 'inprogress', 'done'];
const STATUS_SHORT = { todo: 'Yapılacak', inprogress: 'Devam Ediyor', done: 'Tamamlandı' };

const STUDY_ICON = (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" /><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" /></svg>
);

export default function StudyCard({ date, entries, subjects, setSubjects, totalMinutes, onRefresh }) {
  const [form, setForm] = useState({ subject: '', topic: '', minutes: '' });
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [subjectError, setSubjectError] = useState('');

  async function addEntry(e) {
    e.preventDefault();
    if (!form.subject || !form.minutes) return;
    await client.post(`/days/${date}/entries`, { subject: form.subject, topic: form.topic, minutes: parseInt(form.minutes) });
    setForm({ subject: form.subject, topic: '', minutes: '' });
    onRefresh();
  }

  async function deleteEntry(id) {
    await client.delete(`/days/${date}/entries/${id}`);
    onRefresh();
  }

  async function cycleStatus(id, currentStatus) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(currentStatus) + 1) % STATUS_ORDER.length];
    await client.patch(`/days/${date}/entries/${id}/status`, { status: next });
    onRefresh();
  }

  async function addSubject(e) {
    e.preventDefault();
    if (!newSubject.trim()) return;
    try {
      const res = await client.post('/subjects', JSON.stringify(newSubject.trim()), { headers: { 'Content-Type': 'application/json' } });
      setSubjects(s => [...s, res.data.name]);
      setNewSubject('');
      setSubjectError('');
    } catch (err) {
      setSubjectError(errorText(err));
    }
  }

  async function deleteSubject(name) {
    const res = await client.get('/subjects');
    const found = res.data.find(s => s.name === name);
    if (found) {
      await client.delete(`/subjects/${found.id}`);
      setSubjects(s => s.filter(x => x !== name));
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><span className="icon-tile study">{STUDY_ICON}</span><h2>Çalışma Planı</h2></div>
        {totalMinutes > 0 && <span className="total">{totalMinutes} dk toplam</span>}
      </div>
      <div className="hint">Rozete dokunarak durumu değiştirin: Yapılacak → Devam Ediyor → Tamamlandı</div>

      {entries.length === 0
        ? <div className="empty-note">Bu gün için henüz ders kaydı yok.</div>
        : entries.map(e => (
          <div key={e.id} className="entry">
            <button className={`status-badge status-${e.status}`} onClick={() => cycleStatus(e.id, e.status)}>
              {STATUS_SHORT[e.status]}
            </button>
            <div className="info">
              <div className={`subj${e.status === 'done' ? ' done' : ''}`}>{e.subject}</div>
              {e.topic && <div className="topic">{e.topic}</div>}
            </div>
            <span className="mins">{e.minutes} dk</span>
            <button className="del" aria-label="Sil" onClick={() => deleteEntry(e.id)}>×</button>
          </div>
        ))
      }

      <form className="addform" onSubmit={addEntry}>
        <select value={form.subject} onChange={ev => setForm(f => ({ ...f, subject: ev.target.value }))}>
          <option value="">Ders seçin</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input name="topic" placeholder="Konu (opsiyonel)" value={form.topic} onChange={ev => setForm(f => ({ ...f, topic: ev.target.value }))} />
        <input name="minutes" type="number" min="1" placeholder="dk" value={form.minutes} onChange={ev => setForm(f => ({ ...f, minutes: ev.target.value }))} />
        <button type="submit">Ekle</button>
      </form>

      <button className="manage-toggle" onClick={() => setSubjectsOpen(o => !o)}>
        {subjectsOpen ? '▲ Ders listesini kapat' : '✎ Dersleri düzenle (ekle/sil)'}
      </button>

      {subjectsOpen && (
        <div className="subject-panel">
          {subjects.length === 0
            ? <div className="empty-note">Henüz ders eklenmemiş.</div>
            : subjects.map(s => (
              <span key={s} className="subject-chip">
                {s}
                <button className="x" onClick={() => deleteSubject(s)}>×</button>
              </span>
            ))
          }
          <form className="subject-addrow" onSubmit={addSubject}>
            <input id="new-subject" aria-label="Yeni ders adı" placeholder="Yeni ders adı (ör. Almanca)" value={newSubject}
              className={subjectError ? 'input-error' : ''}
              onChange={e => { setNewSubject(e.target.value); setSubjectError(''); }} />
            <button type="submit">Ekle</button>
          </form>
          {subjectError && <div className="inline-error" role="alert">{subjectError}</div>}
        </div>
      )}
    </div>
  );
}
