// API hatasını kullanıcıya gösterilecek Türkçe metne çevirir.
export function errorText(err) {
  const data = err?.response?.data;
  if (Array.isArray(data)) return data.join(' ');
  if (typeof data === 'string' && data) return data;
  // [ApiController] doğrulama hataları: { errors: { Alan: ["mesaj"] } }
  if (data?.errors && typeof data.errors === 'object') return Object.values(data.errors).flat().join(' ');
  if (!err?.response) return 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.';
  return 'Bir hata oluştu. Tekrar dene.';
}
