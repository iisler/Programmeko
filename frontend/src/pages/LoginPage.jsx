import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

function errorText(err) {
  const data = err.response?.data;
  if (Array.isArray(data)) return data.join(' ');
  if (typeof data === 'string' && data) return data;
  if (!err.response) return 'Sunucuya ulaşılamadı. Backend çalışıyor mu?';
  return 'Bir hata oluştu';
}

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', username: '', password2: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function switchMode(m) {
    setMode(m);
    setError('');
    setInfo('');
    setForm((f) => ({ ...f, password: '', password2: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (mode === 'reset' && form.password !== form.password2) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        navigate('/');
      } else if (mode === 'register') {
        await register(form.email, form.password, form.username);
        await login(form.email, form.password);
        navigate('/');
      } else {
        await client.post('/auth/reset-password', { email: form.email, newPassword: form.password });
        switchMode('login');
        setInfo('Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.');
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  const submitLabel = { login: 'Giriş Yap', register: 'Kayıt Ol', reset: 'Şifreyi Güncelle' }[mode];

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>PlanMee</h1>
        <p className="auth-sub">{mode === 'reset' ? 'Şifreni sıfırla' : 'Ders & Antrenman Takip'}</p>

        {mode !== 'reset' && (
          <div className="auth-tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Giriş</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Kayıt Ol</button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input id="username" placeholder="Kullanıcı adı" value={form.username} onChange={set('username')} required />
          )}
          <input id="email" type="email" placeholder="E-posta" autoComplete="email" value={form.email} onChange={set('email')} required />
          <input
            id="password"
            type="password"
            placeholder={mode === 'reset' ? 'Yeni şifre (en az 6 karakter)' : 'Şifre'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'login' ? undefined : 6}
            value={form.password}
            onChange={set('password')}
            required
          />
          {mode === 'reset' && (
            <input id="password2" type="password" placeholder="Yeni şifre (tekrar)" autoComplete="new-password" value={form.password2} onChange={set('password2')} required />
          )}
          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Yükleniyor…' : submitLabel}
          </button>
        </form>

        {mode === 'login' && (
          <button className="auth-link" onClick={() => switchMode('reset')}>Şifremi unuttum</button>
        )}
        {mode === 'reset' && (
          <button className="auth-link" onClick={() => switchMode('login')}>‹ Girişe dön</button>
        )}
      </div>
    </div>
  );
}
