import React, { useState } from 'react';
import { Card } from '../types';
import { X, Lock, Check } from 'lucide-react';

interface CardEditModalProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardId: string, front: string, back: string) => Promise<void>;
}

export const CardEditModal: React.FC<CardEditModalProps> = ({
  card,
  isOpen,
  onClose,
  onSave
}) => {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    setIsSaving(true);
    try {
      await onSave(card.id, front.trim(), back.trim());
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(23, 37, 33, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px'
    }}>
      <div 
        className="card-base animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '580px',
          padding: '28px',
          boxShadow: 'var(--shadow-elevated)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div className="page-eyebrow">Refine Card</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 600 }}>Edit Front & Back</h3>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px', borderRadius: '50%' }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Front (Prompt / Question / Term)
            </label>
            <textarea
              className="textarea"
              rows={3}
              value={front}
              onChange={e => setFront(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Back (Explanation / Answer)
            </label>
            <textarea
              className="textarea"
              rows={4}
              value={back}
              onChange={e => setBack(e.target.value)}
              required
            />
          </div>

          {/* Locked Quote Block */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Lock size={12} color="var(--accent-sage)" />
              <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-sage)' }}>
                Locked Source Evidence (Read-only)
              </span>
            </div>
            <div className="source-evidence-block" style={{ marginTop: '4px', opacity: 0.9 }}>
              <div className="source-evidence-quote">
                "{card.quote}"
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '6px' }}>
                Passage #{card.passage_position || 1} — {card.source_title || 'Original Note'}
              </div>
            </div>
            <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              The source quote is immutably anchored to your original text to preserve truth.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              <Check size={16} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
