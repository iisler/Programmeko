import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Ekranın altında görünen kısa bildirim (hata veya bilgi). Sessiz başarısızlık olmasın diye
// tüm kayıt işlemleri hatayı buradan gösterir.
const NoticeContext = createContext({ notify: () => {} });

export function NoticeProvider({ children }) {
  const [notice, setNotice] = useState(null);
  const timer = useRef(null);

  const notify = useCallback((text, kind = 'error') => {
    clearTimeout(timer.current);
    setNotice({ text, kind });
    timer.current = setTimeout(() => setNotice(null), kind === 'error' ? 6000 : 3500);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <NoticeContext.Provider value={{ notify }}>
      {children}
      {notice && (
        <div className={`notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          <span>{notice.text}</span>
          <button aria-label="Kapat" onClick={() => setNotice(null)}>×</button>
        </div>
      )}
    </NoticeContext.Provider>
  );
}

export const useNotice = () => useContext(NoticeContext);
