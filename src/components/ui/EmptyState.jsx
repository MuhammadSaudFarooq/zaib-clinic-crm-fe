import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', text, action }) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Icon size={26} />
      </div>
      <div className="empty__title">{title}</div>
      {text && <div className="empty__text">{text}</div>}
      {action}
    </div>
  );
}
