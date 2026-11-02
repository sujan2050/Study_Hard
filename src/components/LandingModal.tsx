import React, { useState, useEffect } from 'react';
import { BookMarked, ArrowRight, ShieldCheck, Check, Sparkles } from 'lucide-react';

interface LandingModalProps {
  onAddNotes: () => void;
  onTrySample: () => void;
}

const VISITED_KEY = 'quiet_study_has_visited';

export const LandingModal: React.FC<LandingModalProps> = ({
  onAddNotes,
  onTrySample
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem(VISITED_KEY);
    if (!hasVisited) {
      setIsOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(VISITED_KEY, 'true');
    setIsOpen(false);
  };

  const handleAddNotesClick = () => {
    handleDismiss();
    onAddNotes();
  };

  const handleSampleClick = () => {
    handleDismiss();
    onTrySample();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(23, 37, 33, 0.55)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 120,
      padding: '20px'
    }}>
      <div 
        className="card-base animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '36px',
          boxShadow: 'var(--shadow-elevated)',
          textAlign: 'center'
        }}
      >
        <div style={{
          width: '64px',
          height: '64px',
          backgroundColor: 'var(--primary-forest)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          margin: '0 auto 20px',
          boxShadow: '0 4px 12px rgba(36, 76, 69, 0.25)'
        }}>
          <BookMarked size={32} />
        </div>

        <div className="page-eyebrow" style={{ color: 'var(--accent-sage)', marginBottom: '8px' }}>
          Welcome to Quiet Study
        </div>

        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.85rem',
          fontWeight: 600,
          lineHeight: 1.25,
          color: 'var(--text-main)',
          marginBottom: '14px'
        }}>
          Don't just memorize.<br />Understand where it came from.
        </h2>

        <p style={{
          fontSize: '0.98rem',
          color: 'var(--text-muted)',
          lineHeight: 1.55,
          marginBottom: '24px'
        }}>
          A living study guide where the AI proposes, the source stays visible, and <strong>you</strong> decide what enters your library. Nothing is auto-approved.
        </p>

        {/* Feature bullets */}
        <div style={{
          background: 'var(--bg-surface-soft)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          textAlign: 'left',
          marginBottom: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: 'var(--text-main)' }}>
            <Check size={16} color="var(--primary-forest)" />
            <span><strong>Verbatim Evidence:</strong> Every card cites its exact passage sentence.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: 'var(--text-main)' }}>
            <Check size={16} color="var(--primary-forest)" />
            <span><strong>Human In The Loop:</strong> Approve, edit, or discard before studying.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: 'var(--text-main)' }}>
            <ShieldCheck size={16} color="var(--primary-forest)" />
            <span><strong>Private by Design:</strong> Your library is scoped solely to this browser.</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleAddNotesClick}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 20px', fontSize: '0.96rem' }}
            id="landing-add-notes-btn"
          >
            <span>Add your first notes</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={handleSampleClick}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '10px 20px', fontSize: '0.9rem' }}
            id="landing-try-sample-btn"
          >
            <Sparkles size={16} color="var(--accent-sage)" />
            <span>Try sample notes immediately</span>
          </button>
        </div>
      </div>
    </div>
  );
};
