import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User as UserIcon, Eye, EyeOff, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, closeAuthModal, login, register, openAuthModal } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(authModalMode);
    setError(null);
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(23, 37, 33, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px'
      }}
      onClick={closeAuthModal}
    >
      <div
        className="card-base animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '32px',
          boxShadow: 'var(--shadow-elevated)',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-subtle)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'var(--transition-smooth)'
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header Tabs */}
        <div style={{ marginBottom: '24px' }}>
          <div className="page-eyebrow" style={{ marginBottom: '6px' }}>Quiet Study Account</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '14px' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </h2>

          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-cream)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              gap: '4px'
            }}
          >
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              style={{
                flex: 1,
                padding: '8px 14px',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                backgroundColor: mode === 'login' ? '#FFFFFF' : 'transparent',
                color: mode === 'login' ? 'var(--primary-forest)' : 'var(--text-muted)',
                boxShadow: mode === 'login' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              style={{
                flex: 1,
                padding: '8px 14px',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                backgroundColor: mode === 'register' ? '#FFFFFF' : 'transparent',
                color: mode === 'register' ? 'var(--primary-forest)' : 'var(--text-muted)',
                boxShadow: mode === 'register' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Seamless Sync Note */}
        <div
          style={{
            backgroundColor: 'var(--bg-sage-subtle)',
            border: '1px solid #C8DDD6',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '0.85rem',
            color: 'var(--primary-forest)'
          }}
        >
          <Sparkles size={17} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-sage)' }} />
          <div>
            <strong>Seamless Sync:</strong> All cards and notes created in this browser will automatically be linked to your account.
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div
            style={{
              backgroundColor: 'var(--bg-clay-subtle)',
              border: '1px solid #ECC8BC',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '0.86rem',
              color: 'var(--accent-clay)'
            }}
          >
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'register' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: '6px'
                }}
              >
                Name (optional)
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-subtle)'
                  }}
                />
                <input
                  type="text"
                  placeholder="e.g. Alex Turing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-card)',
                    fontSize: '0.92rem',
                    backgroundColor: 'var(--bg-surface-soft)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '6px'
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-subtle)'
                }}
              />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  fontSize: '0.92rem',
                  backgroundColor: 'var(--bg-surface-soft)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '6px'
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-subtle)'
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 38px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  fontSize: '0.92rem',
                  backgroundColor: 'var(--bg-surface-soft)',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-subtle)',
                  padding: '2px',
                  display: 'flex'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{
              marginTop: '8px',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              width: '100%'
            }}
          >
            {isSubmitting ? (
              'Processing...'
            ) : mode === 'login' ? (
              <>
                Sign In to Library <ArrowRight size={17} />
              </>
            ) : (
              <>
                Create Account & Sync <CheckCircle2 size={17} />
              </>
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-muted)'
          }}
        >
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-forest)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Create one now
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-forest)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
