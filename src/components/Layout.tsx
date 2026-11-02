import React from 'react';
import { 
  Inbox, 
  BookOpen, 
  GraduationCap, 
  BarChart3, 
  PlusCircle, 
  ShieldCheck, 
  BookMarked,
  LogIn,
  LogOut,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { getOrCreateOwnerId } from '../lib/owner';
import { useAuth } from '../context/AuthContext';

export type Screen = 'welcome' | 'inbox' | 'library' | 'study' | 'progress' | 'add';

interface LayoutProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  draftCount: number;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentScreen,
  onNavigate,
  draftCount,
  children
}) => {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const ownerId = getOrCreateOwnerId();
  const shortId = ownerId.length > 18 ? `${ownerId.slice(0, 10)}...${ownerId.slice(-4)}` : ownerId;

  const navItems: { id: Screen; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'welcome',
      label: 'Overview & Guide',
      icon: <BookMarked size={18} />
    },
    {
      id: 'inbox',
      label: 'Review Inbox',
      icon: <Inbox size={18} />,
      badge: draftCount
    },
    {
      id: 'library',
      label: 'My Library',
      icon: <BookOpen size={18} />
    },
    {
      id: 'study',
      label: 'Study',
      icon: <GraduationCap size={18} />
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: <BarChart3 size={18} />
    },
    {
      id: 'add',
      label: 'Add Notes',
      icon: <PlusCircle size={18} />
    }
  ];

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="app-sidebar">
        <div 
          className="brand-area" 
          onClick={() => onNavigate('welcome')} 
          style={{ cursor: 'pointer' }}
          title="Go to Overview & Guide"
        >
          <div className="brand-icon">
            <BookMarked size={22} />
          </div>
          <div>
            <h1 className="brand-title">Quiet Study</h1>
            <div className="brand-subtitle">A Living Study Guide</div>
          </div>
        </div>

        <nav className="nav-menu">
          {navItems.map(item => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`nav-link ${isActive ? 'active' : ''}`}
                id={`nav-${item.id}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="nav-badge" id="draft-count-badge">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {isAuthenticated && user ? (
            <div className="user-profile-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="user-avatar-circle" title={user.email}>
                  {userInitial}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div className="user-profile-name" title={user.name || user.email}>
                    {user.name || user.email.split('@')[0]}
                  </div>
                  <div className="user-profile-email" title={user.email}>
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="sidebar-logout-btn"
                  title="Log Out"
                  aria-label="Log Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
              <div className="user-status-tag">
                <UserCheck size={12} />
                <span>Account Synced</span>
              </div>
            </div>
          ) : (
            <div className="guest-auth-card">
              <button
                onClick={() => openAuthModal('login')}
                className="sidebar-login-btn"
                id="sidebar-sign-in-btn"
              >
                <LogIn size={16} />
                <span>Sign In / Register</span>
              </button>
              <div className="privacy-note">
                <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1, color: '#A3D9C9' }} />
                <div>
                  <strong>Guest Mode</strong>
                  <div>Notes saved in browser. Sign in anytime to preserve & sync.</div>
                </div>
              </div>
              <div className="owner-pill" title={`Owner ID: ${ownerId}`}>
                Guest ID: {shortId}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="app-main">
        {children}
      </main>
    </div>
  );
};

