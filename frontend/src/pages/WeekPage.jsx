import { useEffect, useState } from 'react';
import client from '../api/client';
import StatsBar from '../components/StatsBar';

const WEEKDAYS_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function dkey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function mondayOf(d) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() - (nd.getDay() + 6) % 7);
  nd.setHours(0, 0, 0, 0);
  return nd;
}
function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }
function formatDuration(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

const STATUS_ORDER = ['todo', 'inprogress', 'done'];
const STATUS_SHORT = { todo: 'Yapılacak', inprogress: 'Devam', done: 'Tamam' };

export default function WeekPage({ currentDate, setCurrentDate, weekSummaries, onDataChanged, subjects }) {
  const [weekDays, setWeekDays] = useState([]);
  const [weekStart, setWeekStart] = useState(() => mondayOf(currentDate));

  useEffect(() => { loadWeek(weekStart); }, [weekStart]);

  async function loadWeek(mon) {
    const keys = Array.from({ length: 7 }, (_, i) => dkey(addDays(mon, i)));
    const results = await Promise.all(keys.map(k => client.get(`/days/${k}`).then(r => ({ key: k, data: r.data }))));
    setWeekDays(results);
  }

  async function refresh() {
    await loadWeek(weekStart);
    onDataChanged();
  }

  function shiftWeek(delta) {
    const newMon = addDays(weekStart, delta * 7);
    setWeekStart(newMon);
  }

  const mon = weekStart;
  const rangeLabel = `${mon.getDate()} ${MONTHS[mon.getMonth()].slice(0, 3)} – ${addDays(mon, 6).getDate()} ${MONTHS[addDays(mon, 6).getMonth()].slice(0, 3)}`;

  return (
    <>
      <div className="weeknav">
        <button onClick={() => shiftWeek(-1)}>‹ Önceki</button>
        <span className="rng">{rangeLabel}</span>
        <button onClick={() => shiftWeek(1)}>Sonraki ›</button>
      </div>

      <StatsBar weekSummaries={weekSummaries} standalone />

      {weekDays.map(({ key, data }, i) => {
        const date = addDays(weekStart, i);
        const isToday = dkey(new Date()) === key;
        return (
          <WeekDayCard
            key={key}
            dateKey={key}
            date={date}
            dayIndex={i}
            data={data}
            isToday={isToday}
            subjects={subjects}
            onGoToDay={() => { setCurrentDate(date); }}
            onRefresh={refresh}
          />
        );
      })}

      <div className="note">Buradan gelecek (veya geçmiş) günlere direkt ders, antrenman ve etkinlik girebilirsiniz.</div>
    </>
  );
}

function WeekDayCard({ dateKey, date, dayIndex, data, isToday, subjects, onGoToDay, onRefresh }) {
  const [studyForm, setStudyForm] = useState({ subject: '', minutes: '' });
  const [trainForm, setTrainForm] = useState({ type: 'Top', hours: '', minutes: '' });
  const [eventForm, setEventForm] = useState({ title: '', time: '' });

  async function addStudy(e) {
    e.preventDefault();
    if (!studyForm.subject || !studyForm.minutes) return;
    await client.post(`/days/${dateKey}/entries`, { subject: studyForm.subject, topic: '', minutes: parseInt(studyForm.minutes) });
    setStudyForm(f => ({ ...f, minutes: '' }));
    onRefresh();
  }

  async function addTraining(e) {
    e.preventDefault();
    const totalMins = (parseInt(trainForm.hours) || 0) * 60 + (parseInt(trainForm.minutes) || 0);
    if (totalMins <= 0) return;
    await client.post(`/days/${dateKey}/training`, { type: trainForm.type, minutes: totalMins, note: '' });
    setTrainForm(f => ({ ...f, hours: '', minutes: '' }));
    onRefresh();
  }

  async function addEvent(e) {
    e.preventDefault();
    if (!eventForm.title) return;
    await client.post(`/days/${dateKey}/events`, { title: eventForm.title, time: eventForm.time, note: '' });
    setEventForm({ title: '', time: '' });
    onRefresh();
  }

  async function deleteEntry(id) { await client.delete(`/days/${dateKey}/entries/${id}`); onRefresh(); }
  async function deleteTraining(id) { await client.delete(`/days/${dateKey}/training/${id}`); onRefresh(); }
  async function deleteEvent(id) { await client.delete(`/days/${dateKey}/events/${id}`); onRefresh(); }
  async function cycleStatus(id, status) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % STATUS_ORDER.length];
    await client.patch(`/days/${dateKey}/entries/${id}/status`, { status: next });
    onRefresh();
  }

  return (
    <div className={`weekcard${isToday ? ' today' : ''}`}>
      <div className="datecol">
        <div className="dn">{date.getDate()}</div>
        <div className="dw">{MONTHS[date.getMonth()].slice(0, 3)}</div>
      </div>
      <div className="body">
      <div className="weekcard-head">
        <div className="wd">
          {WEEKDAYS_FULL[dayIndex]}
          {isToday && <span className="datep">bugün</span>}
        </div>
        <button className="goto" onClick={onGoToDay}>Güne git →</button>
      </div>

      <div className="sectionlbl">Ders</div>
      {data.studyEntries.length > 0 && (
        <div className="chiprow">
          {data.studyEntries.map(e => (
            <span key={e.id} className={`chip study status-${e.status}`}>
              <button type="button" className="clicktext" onClick={() => cycleStatus(e.id, e.status)}>
                {e.subject} · {e.minutes}dk
              </button>
              <button type="button" className="x" aria-label="Sil" onClick={() => deleteEntry(e.id)}>×</button>
            </span>
          ))}
        </div>
      )}
      <form className="quickrow" onSubmit={addStudy}>
        <select value={studyForm.subject} onChange={e => setStudyForm(f => ({ ...f, subject: e.target.value }))}>
          <option value="">Ders</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="number" min="1" placeholder="dk" className="small"
          value={studyForm.minutes} onChange={e => setStudyForm(f => ({ ...f, minutes: e.target.value }))} />
        <button type="submit">+</button>
      </form>

      <div className="sectionlbl sport">Antrenman</div>
      {data.trainingEntries.length > 0 && (
        <div className="chiprow">
          {data.trainingEntries.map(e => (
            <span key={e.id} className="chip sport">
              {e.type} · {formatDuration(e.minutes)}
              <button type="button" className="x" aria-label="Sil" onClick={() => deleteTraining(e.id)}>×</button>
            </span>
          ))}
        </div>
      )}
      <form className="quickrow sport" onSubmit={addTraining}>
        <select value={trainForm.type} onChange={e => setTrainForm(f => ({ ...f, type: e.target.value }))}>
          <option value="Top">Top</option>
          <option value="Kuvvet">Kuvvet</option>
        </select>
        <input type="number" min="0" placeholder="sa" className="small"
          value={trainForm.hours} onChange={e => setTrainForm(f => ({ ...f, hours: e.target.value }))} />
        <input type="number" min="0" max="59" placeholder="dk" className="small"
          value={trainForm.minutes} onChange={e => setTrainForm(f => ({ ...f, minutes: e.target.value }))} />
        <button type="submit">+</button>
      </form>

      <div className="sectionlbl event">Etkinlik</div>
      {data.events.length > 0 && (
        <div className="chiprow">
          {data.events.map(e => (
            <span key={e.id} className="chip event">
              {e.title}{e.time ? ` · ${e.time}` : ''}
              <button type="button" className="x" aria-label="Sil" onClick={() => deleteEvent(e.id)}>×</button>
            </span>
          ))}
        </div>
      )}
      <form className="quickrow event" onSubmit={addEvent}>
        <input placeholder="Etkinlik" value={eventForm.title}
          onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} />
        <input placeholder="Saat" className="small" value={eventForm.time}
          onChange={e => setEventForm(f => ({ ...f, time: e.target.value }))} />
        <button type="submit">+</button>
      </form>
      </div>
    </div>
  );
}
