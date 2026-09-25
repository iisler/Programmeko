import { possessive } from '../utils/format';

// Başka birinin planı açıkken ya da plan salt okunurken gösterilen işaret.
export default function PlanBanner({ member, canEdit }) {
  if (!member || (member.isMe && canEdit)) return null;
  return (
    <div className={`plan-banner${canEdit ? '' : ' readonly'}`} role="status">
      <b>{member.isMe ? 'Senin planın' : `${possessive(member.displayName)} planı`}</b>
      {!canEdit && <span> · yalnızca görüntüleme</span>}
    </div>
  );
}
