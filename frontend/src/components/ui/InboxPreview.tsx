import { Mail, MailOpen, Clock, AlertTriangle, Bell, XCircle } from 'lucide-react';
import type { VirtualInboxPreview, VirtualInboxMessage, InboxEventType, RiskBand } from '../../types';

// ─── Event type styling ───────────────────────────────────────────────────────

const EVENT_CONFIG: Record<
  InboxEventType,
  { label: string; icon: React.ReactNode; rowCls: string; iconCls: string }
> = {
  email_sent: {
    label: 'Email Sent',
    icon: <Mail className="h-4 w-4" />,
    rowCls: 'bg-white',
    iconCls: 'text-blue-500 bg-blue-50',
  },
  awaiting_reply: {
    label: 'Awaiting Reply',
    icon: <Clock className="h-4 w-4" />,
    rowCls: 'bg-amber-50/40',
    iconCls: 'text-amber-500 bg-amber-50',
  },
  reminder_sent: {
    label: 'Reminder Sent',
    icon: <Bell className="h-4 w-4" />,
    rowCls: 'bg-white',
    iconCls: 'text-purple-500 bg-purple-50',
  },
  reply_received: {
    label: 'Reply Received',
    icon: <MailOpen className="h-4 w-4" />,
    rowCls: 'bg-emerald-50/40',
    iconCls: 'text-emerald-500 bg-emerald-50',
  },
  deadline_warning: {
    label: 'Deadline Warning',
    icon: <AlertTriangle className="h-4 w-4" />,
    rowCls: 'bg-amber-50/60',
    iconCls: 'text-amber-600 bg-amber-100',
  },
  deadline_missed: {
    label: 'Deadline Missed',
    icon: <XCircle className="h-4 w-4" />,
    rowCls: 'bg-red-50',
    iconCls: 'text-red-600 bg-red-100',
  },
};

const BAND_COLORS: Record<RiskBand, string> = {
  Low: 'bg-emerald-100 text-emerald-700',
  Guarded: 'bg-blue-100 text-blue-700',
  Elevated: 'bg-amber-100 text-amber-700',
  Critical: 'bg-red-100 text-red-700',
};

function MessageRow({ msg }: { msg: VirtualInboxMessage }) {
  const cfg = EVENT_CONFIG[msg.event_type] ?? EVENT_CONFIG.email_sent;
  return (
    <div className={`flex gap-3 px-4 py-3 border-b border-slate-100 last:border-0 ${cfg.rowCls}`}>
      <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${cfg.iconCls}`}>
        {cfg.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-700">{cfg.label}</span>
          {msg.risk_band && (
            <span className={`text-xs rounded-full px-1.5 py-0.5 font-medium ${BAND_COLORS[msg.risk_band]}`}>
              {msg.risk_band}
            </span>
          )}
          <span className="text-xs text-slate-400 ml-auto">Day {msg.day}</span>
        </div>
        <p className="text-xs font-medium text-slate-800 mt-0.5 truncate">{msg.subject}</p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{msg.body_preview}</p>
      </div>
    </div>
  );
}

function InboxColumn({
  label,
  messages,
  emptyText,
}: {
  label: string;
  messages: VirtualInboxMessage[];
  emptyText: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-lg">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{messages.length} message(s)</p>
      </div>
      <div className="rounded-b-lg border border-slate-200 border-t-0 overflow-hidden max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">{emptyText}</p>
        ) : (
          messages.map((msg, i) => <MessageRow key={i} msg={msg} />)
        )}
      </div>
    </div>
  );
}

interface Props {
  inbox: VirtualInboxPreview;
}

export function InboxPreview({ inbox }: Props) {
  return (
    <section aria-labelledby="inbox-heading">
      <h3 id="inbox-heading" className="text-sm font-semibold text-slate-800 mb-3">
        Virtual Inbox Preview
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Simulated email exchange derived from your task timings and assumptions. Messages are ordered
        chronologically by projected calendar day.
      </p>
      <div className="flex gap-4 flex-col sm:flex-row">
        <InboxColumn
          label={`Outbound — ${inbox.sender_label}`}
          messages={inbox.sent_messages}
          emptyText="No outbound messages simulated."
        />
        <InboxColumn
          label={`Inbound — ${inbox.recipient_label}`}
          messages={inbox.received_messages}
          emptyText="No inbound messages simulated."
        />
      </div>
    </section>
  );
}
