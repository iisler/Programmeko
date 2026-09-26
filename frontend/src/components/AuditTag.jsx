import { auditTrail } from '../utils/format';

// Kaydın "ekleyen / son düzenleyen" izi. Plan sahibinin kendi kayıtlarında hiçbir şey göstermez.
export default function AuditTag({ entry, ownerId, compact = false }) {
  const text = auditTrail(entry, ownerId);
  if (!text) return null;
  return <span className={compact ? 'audit compact' : 'audit'}>{text}</span>;
}
