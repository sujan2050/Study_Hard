import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardType } from '../types';
import { api } from '../lib/api';
import { CardEditModal } from './CardEditModal';
import { 
  Search, 
  Quote, 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  Trash2, 
  BookOpen, 
  GraduationCap,
  Sparkles,
  Layers
} from 'lucide-react';

interface LibraryProps {
  onNavigateToStudy: () => void;
  onNavigateToAdd: () => void;
}

export const Library: React.FC<LibraryProps> = ({
  onNavigateToStudy,
  onNavigateToAdd
}) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CardType | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [expandedQuotes, setExpandedQuotes] = useState<Record<string, boolean>>({});
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const loadApprovedCards = async () => {
    setLoading(true);
    try {
      const res = await api.getCards('approved');
      setCards(res.cards);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovedCards();
  }, []);

  const sources = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach(c => {
      if (c.source_id && c.source_title) {
        map.set(c.source_id, c.source_title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [cards]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return cards.filter(c => {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (sourceFilter !== 'all' && c.source_id !== sourceFilter) return false;
      if (q) {
        const matchesFront = c.front.toLowerCase().includes(q);
        const matchesBack = c.back.toLowerCase().includes(q);
        const matchesQuote = c.quote.toLowerCase().includes(q);
        if (!matchesFront && !matchesBack && !matchesQuote) return false;
      }
      return true;
    });
  }, [cards, searchQuery, typeFilter, sourceFilter]);

  const toggleExpandQuote = (cardId: string) => {
    setExpandedQuotes(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to remove this card from your library?')) return;
    try {
      await api.deleteCard(cardId);
      setCards(prev => prev.filter(c => c.id !== cardId));
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div className="page-eyebrow">Verified Knowledge</div>
          <h2 className="page-title">My Library</h2>
          <p className="page-description">
            Your personal, verified study deck. Every card here was actively vetted by you and is grounded in your source notes.
          </p>
        </div>

        {cards.length >= 4 && (
          <button
            onClick={onNavigateToStudy}
            className="btn btn-primary"
            style={{ padding: '9px 18px' }}
            id="library-start-study-btn"
          >
            <GraduationCap size={16} />
            <span>Study This Library ({cards.length})</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        <div style={{ position: 'relative' }}>
          <Search 
            size={18} 
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
          />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '40px' }}
            placeholder="Search across questions, answers, or exact source quotes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            id="library-search-input"
          />
        </div>

        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <button
            onClick={() => setTypeFilter('all')}
            className={`filter-chip ${typeFilter === 'all' ? 'active' : ''}`}
            id="lib-filter-all"
          >
            All Types ({cards.length})
          </button>
          <button
            onClick={() => setTypeFilter('concept')}
            className={`filter-chip ${typeFilter === 'concept' ? 'active' : ''}`}
            id="lib-filter-concept"
          >
            Concept
          </button>
          <button
            onClick={() => setTypeFilter('term')}
            className={`filter-chip ${typeFilter === 'term' ? 'active' : ''}`}
            id="lib-filter-term"
          >
            Term
          </button>
          <button
            onClick={() => setTypeFilter('process')}
            className={`filter-chip ${typeFilter === 'process' ? 'active' : ''}`}
            id="lib-filter-process"
          >
            Process
          </button>
          <button
            onClick={() => setTypeFilter('question')}
            className={`filter-chip ${typeFilter === 'question' ? 'active' : ''}`}
            id="lib-filter-question"
          >
            Question
          </button>

          {sources.length > 1 && (
            <select
              className="select"
              style={{ width: 'auto', padding: '5px 12px', fontSize: '0.82rem', marginLeft: 'auto' }}
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              id="lib-source-select"
            >
              <option value="all">All Sources ({sources.length})</option>
              {sources.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          )}
        </div>
      </div>

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
          id="library-empty-state"
        >
          <div style={{ width: '56px', height: '56px', background: 'var(--bg-sage-subtle)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <BookOpen size={26} color="var(--primary-forest)" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', marginBottom: '8px' }}>
            {cards.length === 0 ? 'Your library is waiting for its first approved card.' : 'No cards matched your filter.'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '440px', margin: '0 auto 20px' }}>
            {cards.length === 0
              ? 'Visit the Review Inbox to approve proposals generated by the AI, or add fresh notes.'
              : 'Try adjusting your search query or reset the type filter to see more study items.'
            }
          </p>
          {cards.length === 0 && (
            <button onClick={onNavigateToAdd} className="btn btn-primary" id="lib-add-notes-btn">
              <Layers size={16} />
              Add Notes
            </button>
          )}
        </div>
      )}

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {filteredCards.map(card => {
          const isQuoteOpen = !!expandedQuotes[card.id];
          return (
            <div
              key={card.id}
              className="card-base animate-fade-in"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '22px',
                position: 'relative'
              }}
              id={`library-card-${card.id}`}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className={`type-pill ${card.type}`}>
                    {card.type}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-subtle)' }}>
                      Passage #{card.passage_position || 1}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.4 }}>
                  {card.front}
                </div>

                <div style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
                  {card.back}
                </div>
              </div>

              <div>
                {/* Source Quote Accordion */}
                <div style={{ marginBottom: '12px' }}>
                  <button
                    onClick={() => toggleExpandQuote(card.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--accent-sage)'
                    }}
                    id={`toggle-quote-${card.id}`}
                  >
                    <Quote size={13} />
                    <span>{isQuoteOpen ? 'Hide Source Evidence' : 'Show Source Evidence'}</span>
                    {isQuoteOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {isQuoteOpen && (
                    <div className="source-evidence-block animate-fade-in" style={{ marginTop: '8px' }}>
                      <div className="source-evidence-quote">
                        "{card.quote}"
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '6px' }}>
                        Source: {card.source_title || 'Notes'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-card)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                    Acc: {card.times_correct}W / {card.times_wrong}L
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setEditingCard(card)}
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                      title="Edit Front and Back"
                      id={`lib-edit-${card.id}`}
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="btn btn-discard"
                      style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                      title="Delete card"
                      id={`lib-delete-${card.id}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
