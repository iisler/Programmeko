import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { errorText } from '../api/errors';
import WeekTrail from '../components/WeekTrail';
import StatsBar from '../components/StatsBar';
import StudyCard from '../components/StudyCard';
import TrainingCard from '../components/TrainingCard';
import EventCard from '../components/EventCard';

function dkey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEKDAYS_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function addDays(d, n) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

export default function DayPage({ currentDate, setCurrentDate, weekSummaries, subjects, setSubjects, onDataChanged }) {
  const { logout } = useAuth();
  const [day, setDay] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const date = dkey(currentDate);
  const isToday = dkey(new Date()) === date;

  useEffect(() => {
    let active = true;
    client.get(`/days/${date}`)
      .then(r => { if (active) { setDay(r.data); setLoadError(''); } })
      .catch(err => { if (active) setLoadError(errorText(err)); });
    return () => { active = false; };
  }, [date, retry]);

  if (loadError && !day) return (
    <div className="load-error">
      <p>Gün yüklenemedi: {loadError}</p>
      <button className="btn" onClick={() => { setLoadError(''); setRetry(n => n + 1); }}>Tekrar dene</button>
      <button className="logout-btn" onClick={logout}>Çıkış Yap</button>
    </div>
  );
  if (!day) return <div className="loading">Yükleniyor…</div>;

  const totalStudy = day.studyEntries.reduce((s, e) => s + e.minutes, 0);
  const totalTrain = day.trainingEntries.reduce((s, e) => s + e.minutes, 0);

  async function refresh() {
    try {
      const r = await client.get(`/days/${date}`);
      setDay(r.data);
    } catch (err) {
      setLoadError(errorText(err));
    }
    onDataChanged();
  }

  return (
    <>
      <section className="dayhero">
        <div className="datenav">
          <button aria-label="Önceki gün" onClick={() => setCurrentDate(d => addDays(d, -1))}>‹</button>
          <div className="label">
            <div className="day">{WEEKDAYS_FULL[(currentDate.getDay() + 6) % 7]}</div>
            <div className="sub">{currentDate.getDate()} {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}{isToday && <span className="today">bugün</span>}</div>
          </div>
          <button aria-label="Sonraki gün" onClick={() => setCurrentDate(d => addDays(d, 1))}>›</button>
        </div>

        <WeekTrail currentDate={currentDate} setCurrentDate={setCurrentDate} weekSummaries={weekSummaries} />
        <StatsBar weekSummaries={weekSummaries} />
      </section>

      <StudyCard date={date} entries={day.studyEntries} subjects={subjects} setSubjects={setSubjects} totalMinutes={totalStudy} onRefresh={refresh} />
      <TrainingCard date={date} entries={day.trainingEntries} totalMinutes={totalTrain} onRefresh={refresh} />
      <EventCard date={date} events={day.events} onRefresh={refresh} />

      <div className="note">
        "Hafta Planı" sekmesinden gelecek günler için önceden ders/antrenman/etkinlik girebilirsiniz.
      </div>

    </>
  );
}
