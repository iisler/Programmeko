import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.username);
        await login(form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>!PlanMee!</h1>
        <p className="auth-sub">Ders &amp; Antrenman Takip</p>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Giriş</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Kayıt Ol</button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input placeholder="Kullanıcı adı" value={form.username} onChange={set('username')} required />
          )}
          <input type="email" placeholder="E-posta" value={form.email} onChange={set('email')} required />
          <input type="password" placeholder="Şifre" value={form.password} onChange={set('password')} required />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Yükleniyor…' : mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>
      </div>
    </div>
  );
}
