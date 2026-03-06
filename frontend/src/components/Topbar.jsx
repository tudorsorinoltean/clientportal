import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Clients', path: '/admin' },
  { label: 'Proposals', path: '/admin/proposals' },
  { label: 'Invoices', path: '/admin/invoices' },
  { label: 'Files', path: '/admin/files' },
];

function isActive(itemPath, pathname) {
  return pathname === itemPath;
}

export default function Topbar({ onNewClient, onMenuOpen, onBack }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'A';

  return (
    <>
    <header className="h-14 bg-white border-b border-[#eceee6] flex items-center px-4 md:px-6 gap-3 md:gap-6 shrink-0">
      {/* Mobile left button: back or hamburger */}
      {onBack ? (
        <button
          onClick={onBack}
          className="md:hidden text-sm text-[#4a5a4a] shrink-0 hover:text-[#1a2a1a] transition-colors"
          style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
        >
          ← Back
        </button>
      ) : onMenuOpen ? (
        <button
          onClick={onMenuOpen}
          className="md:hidden text-xl text-[#4a5a4a] shrink-0 leading-none hover:text-[#1a2a1a] transition-colors"
        >
          ☰
        </button>
      ) : null}

      {/* Logo */}
      <span
        className="text-[#1a2a1a] shrink-0"
        style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 500, letterSpacing: '-0.01em' }}
      >
        Client.Portal
      </span>

      {/* Nav pills — hidden on mobile */}
      <nav className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto">
        {NAV_ITEMS.map(item => (
          <button
            key={item.label}
            onClick={() => window.location.href = item.path}
            className={`shrink-0 px-3 py-1.5 rounded-md text-sm transition-colors ${
              isActive(item.path, pathname)
                ? 'bg-[#1a2a1a] text-white'
                : 'text-[#4a5a4a] hover:bg-[#f0f7f0]'
            }`}
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Spacer on mobile to push right side to the end */}
      <div className="flex-1 md:hidden" />

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        {onNewClient && (
          <button
            onClick={onNewClient}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d7a2d] text-white text-sm rounded-md hover:bg-[#256425] transition-colors"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            <span className="text-lg leading-none">+</span>
            <span className="hidden md:inline">New Client</span>
          </button>
        )}

        {/* Avatar */}
        <button
          onClick={logout}
          title="Logout"
          className="w-8 h-8 rounded-full bg-[#1a2a1a] text-white text-xs flex items-center justify-center hover:bg-[#2d7a2d] transition-colors"
          style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
        >
          {initials}
        </button>
      </div>
    </header>

    {/* Mobile bottom navigation */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#eceee6] flex overflow-x-auto z-50">
      {NAV_ITEMS.map(item => (
        <a
          key={item.label}
          href={item.path}
          className={`shrink-0 min-w-[4.5rem] py-3 text-center text-xs font-medium transition-colors ${
            isActive(item.path, pathname)
              ? 'text-[#2d7a2d] border-t-2 border-[#2d7a2d]'
              : 'text-[#7a8a7a]'
          }`}
          style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
        >
          {item.label}
        </a>
      ))}
    </nav>
    </>
  );
}