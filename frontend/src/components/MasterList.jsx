import { useState } from 'react';

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

function StatusDot({ status }) {
  const colors = {
    active: 'bg-[#2d7a2d]',
    inactive: 'bg-[#aaa]',
    overdue: 'bg-[#c0392b]',
  };
  return (
    <span className={`w-2 h-2 rounded-full shrink-0 ${colors[status] || colors.active}`} />
  );
}

function ClientItem({ client, isSelected, onClick }) {
  const color = getAvatarColor(client.name);
  const initials = getInitials(client.name);

  return (
    <button
      onClick={() => onClick(client)}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-[#f0f0ea] ${
        isSelected
          ? 'bg-[#f0f7f0]'
          : 'bg-white hover:bg-[#fafbf8]'
      }`}
    >
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-medium ${color.bg} ${color.text}`}
        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-sm font-medium text-[#1a2a1a] truncate"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            {client.name}
          </span>
          <StatusDot status={client.status} />
        </div>
        <div
          className="text-xs text-[#7a8a7a] truncate mt-0.5"
          style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
        >
          {client.company || client.email}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              client.type === 'retainer'
                ? 'bg-[#e8f4e8] text-[#2d7a2d]'
                : 'bg-[#f0f0ea] text-[#6a7a6a]'
            }`}
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            {client.type}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function MasterList({ clients = [], selectedId, onSelect, onNewClient, loading, isOpen, onClose }) {
  const [search, setSearch] = useState('');

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <div className={`${isOpen ? 'fixed inset-0 z-40 flex' : 'hidden'} md:relative md:flex md:inset-auto md:z-auto`}>
        <div className="w-[280px] shrink-0 flex flex-col border-r border-[#eceee6] bg-white h-full">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-[#eceee6]">
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-xs font-semibold text-[#4a5a4a] uppercase tracking-wider"
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              >
                Clients {clients.length > 0 && `(${clients.length})`}
              </span>
              <button
                onClick={onClose}
                className="md:hidden text-[#7a8a7a] hover:text-[#1a2a1a] text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] transition-colors"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-[#eceee6]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-[#eceee6] rounded w-3/4" />
                      <div className="h-2 bg-[#eceee6] rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div
                className="p-6 text-center text-sm text-[#7a8a7a]"
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              >
                {search ? 'No clients found.' : 'No clients yet.'}
              </div>
            ) : (
              filtered.map(client => (
                <ClientItem
                  key={client.id}
                  client={client}
                  isSelected={client.id === selectedId}
                  onClick={onSelect}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}