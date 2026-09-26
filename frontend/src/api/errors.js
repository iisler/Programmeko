// API hatasını kullanıcıya gösterilecek Türkçe metne çevirir.
// Yeni gövde: { code, message, errors?: string[] }. Model doğrulama: { errors: { Alan: ["mesaj"] } }.
export function errorText(err) {
  const data = err?.response?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) return data.message;
    if (Array.isArray(data.errors) && data.errors.length) return data.errors.join(' ');
    if (data.errors && typeof data.errors === 'object') return Object.values(data.errors).flat().join(' ');
  }
  if (Array.isArray(data) && data.length) return data.join(' ');
  if (typeof data === 'string' && data) return data;
  if (!err?.response) return 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.';
  const status = err.response.status;
  if (status === 429) return 'Çok fazla istek. Biraz bekleyip tekrar dene.';
  if (status === 403) return 'Bu işlem için yetkin yok.';
  if (status === 404) return 'Kayıt bulunamadı.';
  return 'Bir hata oluştu. Tekrar dene.';
}

// Makine tarafından okunabilir hata kodu (ör. "plan_read_only"); yoksa null.
export function errorCode(err) {
  const code = err?.response?.data?.code;
  return typeof code === 'string' ? code : null;
}
