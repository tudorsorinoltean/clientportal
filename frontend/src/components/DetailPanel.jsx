const AVATAR_COLORS = [
  { bg: 'bg-[#d4edda]', text: 'text-[#1a5c2a]' },
  { bg: 'bg-[#dce8f7]', text: 'text-[#1a3a6b]' },
  { bg: 'bg-[#fde8d0]', text: 'text-[#7a3a0a]' },
  { bg: 'bg-[#ead4f7]', text: 'text-[#4a1a6b]' },
];

function getAvatarColor(name) {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function StatusBadge({ status, type = 'proposal' }) {
  const proposalColors = {
    draft: 'bg-[#f0f0ea] text-[#6a7a6a]',
    sent: 'bg-[#dce8f7] text-[#1a3a6b]',
    accepted: 'bg-[#e8f4e8] text-[#2d7a2d]',
    rejected: 'bg-[#fde8e8] text-[#c0392b]',
  };
  const invoiceColors = {
    draft: 'bg-[#f0f0ea] text-[#6a7a6a]',
    sent: 'bg-[#dce8f7] text-[#1a3a6b]',
    paid: 'bg-[#e8f4e8] text-[#2d7a2d]',
    overdue: 'bg-[#fde8e8] text-[#c0392b]',
  };
  const colors = type === 'invoice' ? invoiceColors : proposalColors;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded font-medium ${colors[status] || 'bg-[#f0f0ea] text-[#6a7a6a]'}`}
      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
    >
      {status}
    </span>
  );
}

function ProposalsCard({ proposals = [], loading }) {
  return (
    <div className="bg-white border border-[#eceee6] rounded-lg p-4">
      <h3
        className="text-sm font-semibold text-[#1a2a1a] mb-3"
        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
      >
        Proposals
      </h3>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-8 bg-[#f7f8f5] rounded" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <p className="text-sm text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
          No proposals yet.
        </p>
      ) : (
        <div className="space-y-2">
          {proposals.slice(0, 5).map(p => (
            <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-[#f7f8f5] last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1a2a1a] line-clamp-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {p.title}
                </p>
                <p className="text-xs text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {p.price} {p.currency}
                </p>
              </div>
              <StatusBadge status={p.status} type="proposal" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InvoicesCard({ invoices = [], loading }) {
  return (
    <div className="bg-white border border-[#eceee6] rounded-lg p-4">
      <h3
        className="text-sm font-semibold text-[#1a2a1a] mb-3"
        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
      >
        Invoices
      </h3>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-8 bg-[#f7f8f5] rounded" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
          No invoices yet.
        </p>
      ) : (
        <div className="space-y-2">
          {invoices.slice(0, 5).map(inv => (
            <div key={inv.id} className="flex items-center justify-between py-1.5 border-b border-[#f7f8f5] last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1a2a1a] line-clamp-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  #{inv.number}
                </p>
                <p className="text-xs text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {inv.total} {inv.currency}
                </p>
              </div>
              <StatusBadge status={inv.status} type="invoice" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activities = [], loading }) {
  const typeLabels = {
    client_created: '👤 Client created',
    client_updated: '✏️ Client updated',
    proposal_created: '📄 Proposal created',
    proposal_sent: '📤 Proposal sent',
    proposal_accepted: '✅ Proposal accepted',
    proposal_rejected: '❌ Proposal rejected',
    invoice_created: '🧾 Invoice created',
    invoice_sent: '📤 Invoice sent',
    invoice_paid: '💚 Invoice paid',
    invoice_overdue: '⚠️ Invoice overdue',
    file_uploaded: '📎 File uploaded',
    portal_access_granted: '🔑 Portal access granted',
  };

  return (
    <div className="bg-white border border-[#eceee6] rounded-lg p-4">
      <h3
        className="text-sm font-semibold text-[#1a2a1a] mb-3"
        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
      >
        Activity
      </h3>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 bg-[#f7f8f5] rounded" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
          No activity yet.
        </p>
      ) : (
        <div className="space-y-2">
          {activities.map(act => (
            <div key={act.id} className="flex items-start gap-2 py-1">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1a2a1a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {typeLabels[act.type] || act.description}
                </p>
                <p className="text-xs text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {act.createdAt ? new Date(act.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DetailPanel({ client, proposals, invoices, activities, loading, onNewProposal }) {
  if (!client) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f7f8f5]">
        <div className="text-center">
          <p
            className="text-[#7a8a7a] text-sm"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            Select a client to view details
          </p>
        </div>
      </div>
    );
  }

  const color = getAvatarColor(client.name);
  const initials = getInitials(client.name);

  return (
    <div className="flex-1 flex flex-col bg-[#f7f8f5] overflow-hidden">
      {/* Client header */}
      <div className="bg-white border-b border-[#eceee6] px-4 md:px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-medium ${color.bg} ${color.text}`}
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            {initials}
          </div>
          <div>
            <h2
              className="text-lg text-[#1a2a1a]"
              style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500 }}
            >
              {client.name}
            </h2>
            <p className="text-sm text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {client.email}{client.company ? ` · ${client.company}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <button
            className="w-full md:w-auto px-3 py-1.5 text-sm border border-[#eceee6] text-[#4a5a4a] rounded-md hover:bg-[#f0f7f0] transition-colors"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            Send Message
          </button>
          <button
            onClick={onNewProposal}
            className="w-full md:w-auto px-3 py-1.5 text-sm bg-[#2d7a2d] text-white rounded-md hover:bg-[#256425] transition-colors"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            New Proposal
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ProposalsCard proposals={proposals} loading={loading} />
          <InvoicesCard invoices={invoices} loading={loading} />
        </div>
        <ActivityCard activities={activities} loading={loading} />
      </div>
    </div>
  );
}