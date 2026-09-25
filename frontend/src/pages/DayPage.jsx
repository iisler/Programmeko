import { useCallback, useEffect, useState } from 'react';
import client from '../api/client';
import { errorCode, errorText } from '../api/errors';
import useMutation from '../hooks/useMutation';
import WeekTrail from '../components/WeekTrail';
import StatsBar from '../components/StatsBar';
import StudyCard from '../components/StudyCard';
import TrainingCard from '../components/TrainingCard';
import EventCard from '../components/EventCard';
import { addDays, dkey, MONTHS, WEEKDAYS_FULL } from '../utils/format';

// Seçili kişinin tek günlük planı. planParams: { memberId } (başkasının planı) veya {} (kendi planı).
export default function DayPage({
  currentDate, setCurrentDate, weekSummaries, planParams, fallbackCanEdit,
  subjects, subjectsCanEdit, onAddSubject, onDeleteSubject, onDataChanged, onAccessChanged,
}) {
  const [day, setDay] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const date = dkey(currentDate);
  const isToday = dkey(new Date()) === date;
  const memberId = planParams.memberId;

  useEffect(() => {
    let active = true;
    client.get(`/days/${date}`, { params: memberId ? { memberId } : {} })
      .then(r => { if (active) { setDay(r.data); setLoadError(''); } })
      .catch(err => {
        if (!active) return;
        setLoadError(errorText(err));
        if (errorCode(err) === 'plan_not_found') onAccessChanged?.('plan_not_found');
      });
    return () => { active = false; };
  }, [date, memberId, retry, onAccessChanged]);

  const reload = useCallback(async () => {
    try {
      const r = await client.get(`/days/${date}`, { params: memberId ? { memberId } : {} });
      setDay(r.data);
    } finally {
      onDataChanged();
    }
  }, [date, memberId, onDataChanged]);

  const mutate = useMutation({ state: day, setState: setDay, reload, onAccessChanged });

  // Gün değişirken önceki günün verisi gösterilmesin
  const ready = day && day.date === date;

  if (loadError && !ready) return (
    <div className="load-error">
      <p>Gün yüklenemedi: {loadError}</p>
      <button className="btn" onClick={() => { setLoadError(''); setRetry(n => n + 1); }}>Tekrar dene</button>
    </div>
  );

  const canEdit = ready ? day.canEdit : fallbackCanEdit;
  const ownerId = ready ? day.memberId : memberId;
  const totalStudy = ready ? day.studyEntries.reduce((s, e) => s + e.minutes, 0) : 0;
  const totalTrain = ready ? day.trainingEntries.reduce((s, e) => s + e.minutes, 0) : 0;
  const common = { date, canEdit, ownerId, planParams, mutate };

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

      {!ready ? <div className="loading">Yükleniyor…</div> : (
        <>
          <StudyCard {...common} entries={day.studyEntries} totalMinutes={totalStudy}
            subjects={subjects} subjectsCanEdit={subjectsCanEdit} onAddSubject={onAddSubject} onDeleteSubject={onDeleteSubject} />
          <TrainingCard {...common} entries={day.trainingEntries} totalMinutes={totalTrain} />
          <EventCard {...common} events={day.events} />
        </>
      )}

      {canEdit && (
        <div className="note">
          "Hafta Planı" sekmesinden gelecek günler için önceden ders/antrenman/etkinlik girebilirsiniz.
        </div>
      )}
    </>
  );
}
