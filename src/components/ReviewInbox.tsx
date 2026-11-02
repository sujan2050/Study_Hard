import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardType } from '../types';
import { api } from '../lib/api';
import { CardEditModal } from './CardEditModal';
import { 
  Check, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  CheckSquare, 
  Square, 
  Quote, 
  Inbox, 
  Sparkles,
  Archive,
  Layers
} from 'lucide-react';

interface ReviewInboxProps {
  onCardStatusChanged: () => void;
  onNavigateToAdd: () => void;
}

export const ReviewInbox: React.FC<ReviewInboxProps> = ({
  onCardStatusChanged,
  onNavigateToAdd
}) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'drafts' | 'discarded'>('drafts');
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<CardType | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Editing
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // Active focused card index for keyboard shortcuts
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

  // Fetch cards
  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCards(viewMode === 'drafts' ? 'draft' : 'discarded');
      setCards(res.cards);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load cards:', err);
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Unique sources for dropdown filter
  const sources = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach(c => {
      if (c.source_id && c.source_title) {
        map.set(c.source_id, c.source_title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [cards]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    return cards.filter(c => {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (sourceFilter !== 'all' && c.source_id !== sourceFilter) return false;
      return true;
    });
  }, [cards, typeFilter, sourceFilter]);

  // Set focused card default
  useEffect(() => {
    if (filteredCards.length > 0 && !focusedCardId) {
      setFocusedCardId(filteredCards[0].id);
    }
  }, [filteredCards, focusedCardId]);

  // Single card actions
  const handleApprove = async (cardId: string) => {
    try {
      await api.updateCardStatus(cardId, 'approved');
      setCards(prev => prev.filter(c => c.id !== cardId));
      setSelectedIds(prev => prev.filter(id => id !== cardId));
      onCardStatusChanged();
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleDiscard = async (cardId: string) => {
    try {
      await api.updateCardStatus(cardId, 'discarded');
      setCards(prev => prev.filter(c => c.id !== cardId));
      setSelectedIds(prev => prev.filter(id => id !== cardId));
      onCardStatusChanged();
    } catch (err) {
      console.error('Discard failed:', err);
    }
  };

  const handleRestore = async (cardId: string) => {
    try {
      await api.updateCardStatus(cardId, 'draft');
      setCards(prev => prev.filter(c => c.id !== cardId));
      setSelectedIds(prev => prev.filter(id => id !== cardId));
      onCardStatusChanged();
    } catch (err) {
      console.error('Restore failed:', err);
    }
  };

  // Bulk actions
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.bulkUpdateCardStatus(selectedIds, 'approved');
      setCards(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
      onCardStatusChanged();
    } catch (err) {
      console.error('Bulk approve failed:', err);
    }
  };

  const handleBulkDiscard = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.bulkUpdateCardStatus(selectedIds, 'discarded');
      setCards(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
      onCardStatusChanged();
    } catch (err) {
      console.error('Bulk discard failed:', err);
    }
  };

  const toggleSelectCard = (cardId: string) => {
    setSelectedIds(prev => 
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCards.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCards.map(c => c.id));
    }
  };

  // Keyboard shortcut listener: A approve, D discard, E edit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is inside an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (editingCard) return;

      const targetId = focusedCardId || (filteredCards.length > 0 ? filteredCards[0].id : null);
      if (!targetId) return;

      const activeCard = filteredCards.find(c => c.id === targetId);
      if (!activeCard) return;

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (viewMode === 'drafts') {
          handleApprove(targetId);
        }
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (viewMode === 'drafts') {
          handleDiscard(targetId);
        }
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setEditingCard(activeCard);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingCard, focusedCardId, filteredCards, viewMode]);

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div className="page-eyebrow">The Gatekeeper</div>
          <h2 className="page-title">Read, then decide.</h2>
          <p className="page-description">
            Nothing enters your study library until you verify it. Every card is anchored to its verbatim source quote.
          </p>
        </div>

        {/* View mode toggle: Drafts vs Discarded */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-surface)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setViewMode('drafts')}
            className={`btn ${viewMode === 'drafts' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            id="tab-drafts"
          >
            <Inbox size={14} />
            <span>Awaiting Review</span>
          </button>
          <button
            onClick={() => setViewMode('discarded')}
            className={`btn ${viewMode === 'discarded' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            id="tab-discarded"
          >
            <Archive size={14} />
            <span>Discarded</span>
          </button>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="filter-bar">
        <button
          onClick={() => setTypeFilter('all')}
          className={`filter-chip ${typeFilter === 'all' ? 'active' : ''}`}
          id="filter-all"
        >
          All Types
        </button>
        <button
          onClick={() => setTypeFilter('concept')}
          className={`filter-chip ${typeFilter === 'concept' ? 'active' : ''}`}
          id="filter-concept"
        >
          Concept
        </button>
        <button
          onClick={() => setTypeFilter('term')}
          className={`filter-chip ${typeFilter === 'term' ? 'active' : ''}`}
          id="filter-term"
        >
          Term
        </button>
        <button
          onClick={() => setTypeFilter('process')}
          className={`filter-chip ${typeFilter === 'process' ? 'active' : ''}`}
          id="filter-process"
        >
          Process
        </button>
        <button
          onClick={() => setTypeFilter('question')}
          className={`filter-chip ${typeFilter === 'question' ? 'active' : ''}`}
          id="filter-question"
        >
          Question
        </button>

        {/* Source Dropdown Filter */}
        {sources.length > 1 && (
          <select
            className="select"
            style={{ width: 'auto', padding: '5px 12px', fontSize: '0.82rem', marginLeft: 'auto' }}
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            id="source-filter-select"
          >
            <option value="all">All Sources ({sources.length})</option>
            {sources.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Bulk Action Controls */}
      {filteredCards.length > 0 && viewMode === 'drafts' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--bg-surface-soft)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={toggleSelectAll}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontSize: '0.84rem' }}
              id="select-all-btn"
            >
              {selectedIds.length === filteredCards.length ? (
                <CheckSquare size={18} color="var(--primary-forest)" />
              ) : (
                <Square size={18} color="var(--text-muted)" />
              )}
              <span>Select All ({filteredCards.length})</span>
            </button>
            {selectedIds.length > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-sage)', fontWeight: 600 }}>
                {selectedIds.length} selected
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedIds.length > 0 && (
              <>
                <button
                  onClick={handleBulkApprove}
                  className="btn btn-approve"
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  id="bulk-approve-btn"
                >
                  <Check size={14} />
                  <span>Approve Selected ({selectedIds.length})</span>
                </button>
                <button
                  onClick={handleBulkDiscard}
                  className="btn btn-discard"
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  id="bulk-discard-btn"
                >
                  <Trash2 size={14} />
                  <span>Discard Selected ({selectedIds.length})</span>
                </button>
              </>
            )}
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
              Hotkeys: <span className="kbd-badge">A</span> approve <span className="kbd-badge">D</span> discard <span className="kbd-badge">E</span> edit
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredCards.length === 0 && (
        <div 
          className="card-base" 
          style={{ 
            textAlign: 'center', 
            padding: '60px 24px', 
            backgroundColor: 'var(--bg-surface-soft)',
            border: '1px dashed var(--border-subtle)'
          }}
          id="inbox-empty-state"
        >
          <div style={{ width: '56px', height: '56px', background: 'var(--bg-sage-subtle)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            {viewMode === 'drafts' ? <Sparkles size={26} color="var(--primary-forest)" /> : <Archive size={26} color="var(--text-muted)" />}
          </div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', marginBottom: '8px' }}>
            {viewMode === 'drafts' ? 'Your inbox is clear and peaceful.' : 'No discarded cards.'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '440px', margin: '0 auto 20px' }}>
            {viewMode === 'drafts' 
              ? 'All AI proposals have been evaluated. Add new notes whenever you are ready to expand your study deck.'
              : 'Cards that you discarded during inbox review will appear here if you ever wish to restore them.'
            }
          </p>
          {viewMode === 'drafts' && (
            <button onClick={onNavigateToAdd} className="btn btn-primary" id="inbox-add-notes-btn">
              <Layers size={16} />
              Add Notes
            </button>
          )}
        </div>
      )}

      {/* Card List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredCards.map((card) => {
          const isSelected = selectedIds.includes(card.id);
          const isFocused = focusedCardId === card.id;

          return (
            <div
              key={card.id}
              className="card-base animate-fade-in"
              style={{
                position: 'relative',
                border: isSelected ? '1.5px solid var(--primary-forest)' : isFocused ? '1px solid var(--accent-sage)' : undefined,
                backgroundColor: isSelected ? 'rgba(36, 76, 69, 0.02)' : 'var(--bg-surface)',
                outline: 'none'
              }}
              tabIndex={0}
              onFocus={() => setFocusedCardId(card.id)}
              onMouseEnter={() => setFocusedCardId(card.id)}
              id={`draft-card-${card.id}`}
            >
              {/* Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {viewMode === 'drafts' && (
                    <button
                      onClick={() => toggleSelectCard(card.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      title="Select card"
                    >
                      {isSelected ? (
                        <CheckSquare size={18} color="var(--primary-forest)" />
                      ) : (
                        <Square size={18} color="var(--border-subtle)" />
                      )}
                    </button>
                  )}
                  <span className={`type-pill ${card.type}`}>
                    {card.type}
                  </span>
                  {card.edited && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--accent-clay)', fontWeight: 600, textTransform: 'uppercase' }}>
                      (Edited)
                    </span>
                  )}
                  {viewMode === 'drafts' && (
                    <span className="status-pill needs-review">
                      Needs review
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
                  {card.source_title || 'Notes'}
                </div>
              </div>

              {/* Front */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '4px' }}>
                  Prompt / Front
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.4 }}>
                  {card.front}
                </div>
              </div>

              {/* Back */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '4px' }}>
                  Answer / Back
                </div>
                <div style={{ fontSize: '0.94rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {card.back}
                </div>
              </div>

              {/* SOURCE EVIDENCE (The Core Requirement) */}
              <div className="source-evidence-block">
                <div className="source-evidence-header">
                  <div className="source-evidence-label">
                    <Quote size={12} />
                    <span>Source Evidence</span>
                  </div>
                  <div className="source-evidence-meta">
                    Passage #{card.passage_position || 1}
                  </div>
                </div>
                <div className="source-evidence-quote">
                  "{card.quote}"
                </div>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {viewMode === 'drafts' ? (
                    <>
                      <button
                        onClick={() => handleApprove(card.id)}
                        className="btn btn-approve"
                        title="Shortcut: Press A"
                        id={`approve-btn-${card.id}`}
                      >
                        <Check size={15} />
                        <span>Approve</span>
                        <span className="kbd-badge" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)' }}>A</span>
                      </button>

                      <button
                        onClick={() => setEditingCard(card)}
                        className="btn btn-secondary"
                        title="Shortcut: Press E"
                        id={`edit-btn-${card.id}`}
                      >
                        <Edit3 size={15} />
                        <span>Edit</span>
                        <span className="kbd-badge">E</span>
                      </button>

                      <button
                        onClick={() => handleDiscard(card.id)}
                        className="btn btn-discard"
                        title="Shortcut: Press D"
                        id={`discard-btn-${card.id}`}
                      >
                        <Trash2 size={15} />
                        <span>Discard</span>
                        <span className="kbd-badge">D</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestore(card.id)}
                        className="btn btn-restore"
                        id={`restore-btn-${card.id}`}
                      >
                        <RotateCcw size={15} />
                        <span>Restore to Drafts</span>
                      </button>
                      <button
                        onClick={() => handleApprove(card.id)}
                        className="btn btn-approve"
                        id={`approve-discarded-btn-${card.id}`}
                      >
                        <Check size={15} />
                        <span>Directly Approve</span>
                      </button>
                    </>
                  )}
                </div>

                <div style={{ fontSize: '0.73rem', color: 'var(--text-subtle)' }}>
                  ID: {card.id.slice(-6)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingCard && (
        <CardEditModal
          card={editingCard}
          isOpen={true}
          onClose={() => setEditingCard(null)}
          onSave={async (id, front, back) => {
            const res = await api.updateCardContent(id, front, back);
            if (res.card) {
              setCards(prev => prev.map(c => c.id === id ? res.card : c));
            }
          }}
        />
      )}
    </div>
  );
};
