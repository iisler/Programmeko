import { useEffect, useRef, useState } from 'react';
import client from '../api/client';
import { errorText } from '../api/errors';
import StatsBar from '../components/StatsBar';

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
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
function readPref(k, def) { try { return localStorage.getItem(k) || def; } catch { return def; } }
function writePref(k, v) { try { localStorage.setItem(k, v); } catch { /* yoksay */ } }

const STATUS_ORDER = ['todo', 'inprogress', 'done'];

export default function WeekPage({ currentDate, setCurrentDate, onDataChanged, subjects }) {
  const [weekDays, setWeekDays] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [weekStart, setWeekStart] = useState(() => mondayOf(currentDate));
  const [mode, setMode] = useState(() => readPref('weekMode', 'table'));

  useEffect(() => { loadWeek(weekStart); }, [weekStart]);

  async function loadWeek(mon) {
    const keys = Array.from({ length: 7 }, (_, i) => dkey(addDays(mon, i)));
    try {
      const results = await Promise.all(keys.map(k => client.get(`/days/${k}`).then(r => ({ key: k, data: r.data }))));
      setWeekDays(results);
      setLoadError('');
    } catch (err) {
      setLoadError(errorText(err));
    }
  }

  // İstatistikler gösterilen haftadan hesaplanır (seçili günün haftasından değil)
  const shownWeekSummaries = weekDays.map(({ key, data }) => ({
    date: key,
    studyMinutes: data.studyEntries.reduce((s, e) => s + e.minutes, 0),
    trainingDone: data.trainingEntries.length > 0,
    eventCount: data.events.length,
  }));

  async function refresh() {
    await loadWeek(weekStart);
    onDataChanged();
  }

  function shiftWeek(delta) {
    const newMon = addDays(weekStart, delta * 7);
    setWeekStart(newMon);
  }

  function changeMode(m) {
    setMode(m);
    writePref('weekMode', m);
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

      {loadError && (
        <div className="load-error">
          <p>Hafta yüklenemedi: {loadError}</p>
          <button className="btn" onClick={() => loadWeek(weekStart)}>Tekrar dene</button>
        </div>
      )}

      <div className="weekbar">
        <div className="modetoggle" role="group" aria-label="Görünüm">
          <button className={mode === 'table' ? 'active' : ''} onClick={() => changeMode('table')}>Tablo</button>
          <button className={mode === 'list' ? 'active' : ''} onClick={() => changeMode('list')}>Liste</button>
        </div>
      </div>

      {mode === 'table' ? (
        <WeekTable
          weekStart={weekStart}
          weekDays={weekDays}
          subjects={subjects}
          onGoToDay={setCurrentDate}
          onRefresh={refresh}
        />
      ) : (
        <>
          <StatsBar weekSummaries={shownWeekSummaries} standalone />

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
      )}
    </>
  );
}

function WeekTable({ weekStart, weekDays, subjects, onGoToDay, onRefresh }) {
  const todayKey = dkey(new Date());
  const keys = Array.from({ length: 7 }, (_, i) => dkey(addDays(weekStart, i)));
  const defaultDay = keys.includes(todayKey) ? todayKey : keys[0];

  const [kind, setKind] = useState('study');
  const [form, setForm] = useState({ day: defaultDay, subject: '', minutes: '', type: 'Top', title: '', time: '' });
  const [invalid, setInvalid] = useState(null);
  const firstFieldRef = useRef(null);
  const formRef = useRef(null);

  // Hafta değişince seçili gün o haftaya ait değilse varsayılana dön
  const day = keys.includes(form.day) ? form.day : defaultDay;

  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setInvalid(null); };

  function prefill(key, k) {
    setKind(k);
    setForm(f => ({ ...f, day: key }));
    setInvalid(null);
    formRef.current?.scrollIntoView({ block: 'nearest' });
    setTimeout(() => firstFieldRef.current?.focus(), 0);
  }

  async function submit(e) {
    e.preventDefault();
    const subject = form.subject || subjects[0];
    if (kind === 'study') {
      if (!subject) return setInvalid('subject');
      if (!form.minutes) return setInvalid('minutes');
      await client.post(`/days/${day}/entries`, { subject, topic: '', minutes: parseInt(form.minutes) });
      setForm(f => ({ ...f, minutes: '' }));
    } else if (kind === 'sport') {
      if (!form.minutes) return setInvalid('minutes');
      await client.post(`/days/${day}/training`, { type: form.type, minutes: parseInt(form.minutes), note: '' });
      setForm(f => ({ ...f, minutes: '' }));
    } else {
      if (!form.title.trim()) return setInvalid('title');
      await client.post(`/days/${day}/events`, { title: form.title.trim(), time: form.time.trim(), note: '' });
      setForm(f => ({ ...f, title: '', time: '' }));
    }
    onRefresh();
  }

  async function cycleStatus(key, id, status) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % STATUS_ORDER.length];
    await client.patch(`/days/${key}/entries/${id}/status`, { status: next });
    onRefresh();
  }
  async function remove(key, kindPath, id) {
    await client.delete(`/days/${key}/${kindPath}/${id}`);
    onRefresh();
  }

  let studyTotal = 0, trainTotal = 0, trainDays = 0, eventTotal = 0;
  for (const { data } of weekDays) {
    studyTotal += data.studyEntries.reduce((s, e) => s + e.minutes, 0);
    trainTotal += data.trainingEntries.reduce((s, e) => s + e.minutes, 0);
    if (data.trainingEntries.length > 0) trainDays++;
    eventTotal += data.events.length;
  }

  const err = f => (invalid === f ? ' input-error' : '');
  const plus = (key, k) => (
    <button type="button" className="plus" aria-label="Ekle" onClick={() => prefill(key, k)}>+</button>
  );

  return (
    <>
      <form className="wkadd" data-kind={kind} ref={formRef} onSubmit={submit}>
        <select id="wk-day" aria-label="Gün" value={day} onChange={set('day')}>
          {keys.map((k, i) => (
            <option key={k} value={k}>{WEEKDAYS[i]} {addDays(weekStart, i).getDate()}</option>
          ))}
        </select>
        <div className="kind" role="group" aria-label="Tür">
          <button type="button" data-k="study" onClick={() => setKind('study')}>Ders</button>
          <button type="button" data-k="sport" onClick={() => setKind('sport')}>Antrenman</button>
          <button type="button" data-k="event" onClick={() => setKind('event')}>Etkinlik</button>
        </div>

        {kind === 'study' && (
          <>
            <select id="wk-subject" className={`grow${err('subject')}`} aria-label="Ders" value={form.subject || subjects[0] || ''} onChange={set('subject')}>
              {subjects.length === 0 && <option value="">Önce ders ekleyin</option>}
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input id="wk-minutes" ref={firstFieldRef} type="number" min="1" placeholder="dk" className={`num${err('minutes')}`} aria-label="Dakika" value={form.minutes} onChange={set('minutes')} />
          </>
        )}
        {kind === 'sport' && (
          <>
            <select id="wk-type" className="grow" aria-label="Antrenman türü" value={form.type} onChange={set('type')}>
              <option value="Top">Top</option>
              <option value="Kuvvet">Kuvvet</option>
            </select>
            <input id="wk-sminutes" ref={firstFieldRef} type="number" min="1" placeholder="dk" className={`num${err('minutes')}`} aria-label="Dakika" value={form.minutes} onChange={set('minutes')} />
          </>
        )}
        {kind === 'event' && (
          <>
            <input id="wk-title" ref={firstFieldRef} placeholder="Etkinlik adı" className={`grow${err('title')}`} autoComplete="off" aria-label="Etkinlik" value={form.title} onChange={set('title')} />
            <input id="wk-time" placeholder="Saat" className="num" autoComplete="off" aria-label="Saat" value={form.time} onChange={set('time')} />
          </>
        )}
        <button type="submit" className="go">Ekle</button>
      </form>

      <div className="wktable-wrap">
        <table className="wktable">
          <colgroup><col className="c-day" /><col /><col /><col /></colgroup>
          <thead>
            <tr>
              <th />
              <th><span className="dotc" style={{ background: 'var(--study)' }} />Ders</th>
              <th><span className="dotc" style={{ background: 'var(--sport)' }} />Antrenman</th>
              <th><span className="dotc" style={{ background: 'var(--event)' }} />Etkinlik</th>
            </tr>
          </thead>
          <tbody>
            {weekDays.map(({ key, data }, i) => {
              const date = addDays(weekStart, i);
              return (
                <tr key={key} className={`${key === todayKey ? 'today' : ''} ${i >= 5 ? 'weekend' : ''}`}>
                  <th className="daycell" scope="row">
                    <button title="Güne git" onClick={() => onGoToDay(date)}>
                      <span className="dw">{WEEKDAYS[i]}</span>
                      <span className="dn">{date.getDate()}</span>
                    </button>
                  </th>
                  <td>
                    <div className="cell">
                      {data.studyEntries.map(e => (
                        <span key={e.id} className={`chip study status-${e.status}`}>
                          <button type="button" className="clicktext" title="Durumu değiştir" onClick={() => cycleStatus(key, e.id, e.status)}>
                            {e.subject} · {e.minutes}dk
                          </button>
                          <button type="button" className="x" aria-label="Sil" onClick={() => remove(key, 'entries', e.id)}>×</button>
                        </span>
                      ))}
                      {plus(key, 'study')}
                    </div>
                  </td>
                  <td>
                    <div className="cell">
                      {data.trainingEntries.map(e => (
                        <span key={e.id} className="chip sport">
                          <span className="lbl">{e.type} · {formatDuration(e.minutes)}</span>
                          <button type="button" className="x" aria-label="Sil" onClick={() => remove(key, 'training', e.id)}>×</button>
                        </span>
                      ))}
                      {plus(key, 'sport')}
                    </div>
                  </td>
                  <td>
                    <div className="cell">
                      {data.events.map(e => (
                        <span key={e.id} className="chip event">
                          <span className="lbl">{e.title}{e.time ? ` · ${e.time}` : ''}</span>
                          <button type="button" className="x" aria-label="Sil" onClick={() => remove(key, 'events', e.id)}>×</button>
                        </span>
                      ))}
                      {plus(key, 'event')}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th>Top.</th>
              <td><b>{studyTotal}</b> dk</td>
              <td><b>{trainDays}</b>/7 gün · {formatDuration(trainTotal)}</td>
              <td><b>{eventTotal}</b> etkinlik</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="note">Ders kaydına dokununca durumu değişir (Yapılacak → Devam → Tamam). Hücredeki + o günü ve türü ekleme çubuğuna getirir. Gün numarasına dokunarak o günün detayına geçebilirsiniz.</div>
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
