import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DayPage from './pages/DayPage';
import WeekPage from './pages/WeekPage';
import client from './api/client';

function mondayOf(d) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() - (nd.getDay() + 6) % 7);
  nd.setHours(0, 0, 0, 0);
  return nd;
}
function dkey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function AppRoutes() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekSummaries, setWeekSummaries] = useState([]);
  const [view, setView] = useState('day');
  const [subjects, setSubjects] = useState([]);

  async function loadWeek(date) {
    const mon = mondayOf(date);
    const res = await client.get(`/days/week/${dkey(mon)}`);
    setWeekSummaries(res.data);
  }

  async function loadSubjects() {
    const res = await client.get('/subjects');
    setSubjects(res.data.map(s => s.name));
  }

  useEffect(() => {
    if (user) {
      loadWeek(currentDate);
      loadSubjects();
    }
  }, [user, currentDate]);

  if (!user) return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );

  return (
    <Routes>
      <Route path="/" element={
        <div className="wrap">
          <header className="top">
            <h1><span className="mark">P</span>PlanMee</h1>
            <span className="tag"><span className="av">{user.username?.[0]}</span>{user.username}</span>
          </header>

          <div className="viewtabs">
            <button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>Gün</button>
            <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Hafta Planı</button>
          </div>

          {view === 'day'
            ? <DayPage
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                weekSummaries={weekSummaries}
                subjects={subjects}
                setSubjects={setSubjects}
                onDataChanged={() => loadWeek(currentDate)}
              />
            : <WeekPage
                currentDate={currentDate}
                setCurrentDate={(d) => { setCurrentDate(d); setView('day'); }}
                weekSummaries={weekSummaries}
                subjects={subjects}
                onDataChanged={() => loadWeek(currentDate)}
              />
          }
        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
