import React, { useState, useEffect } from 'react';
import { ProgressStats } from '../types';
import { api } from '../lib/api';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Target, 
  AlertTriangle,
  Quote,
  Sparkles
} from 'lucide-react';

interface ProgressProps {
  onNavigateToStudy: () => void;
  onNavigateToInbox: () => void;
}

export const Progress: React.FC<ProgressProps> = ({
  onNavigateToStudy,
  onNavigateToInbox
}) => {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        Gathering your study records...
      </div>
    );
  }

  const counts = stats?.counts || { approved: 0, draft: 0, discarded: 0, total: 0 };
  const accuracy = stats?.quizAccuracy || { totalAnswers: 0, correctAnswers: 0, percentage: 0 };
  const mostMissed = stats?.mostMissedCards || [];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-eyebrow">Retention & Analytics</div>
        <h2 className="page-title">Learning Progress</h2>
        <p className="page-description">
          Track the growth of your approved library, your active recall accuracy, and the specific concepts that require reinforcement.
        </p>
      </div>

      {/* Grid of Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Approved Cards */}
        <div className="card-base" style={{ padding: '20px', borderTop: '4px solid #2D6A4F' }} id="stat-approved">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Approved
            </span>
            <CheckCircle2 size={18} color="#2D6A4F" />
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, color: '#2D6A4F' }}>
            {counts.approved}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            In your active study deck
          </div>
        </div>

        {/* Awaiting Review */}
        <div className="card-base" style={{ padding: '20px', borderTop: '4px solid #D97706' }} id="stat-awaiting">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Awaiting Review
            </span>
            <Clock size={18} color="#D97706" />
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, color: '#D97706' }}>
            {counts.draft}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Pending human decision
          </div>
        </div>

        {/* Discarded */}
        <div className="card-base" style={{ padding: '20px', borderTop: '4px solid #9CA3AF' }} id="stat-discarded">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Discarded
            </span>
            <Trash2 size={18} color="#9CA3AF" />
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {counts.discarded}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Filtered out by you
          </div>
        </div>

        {/* Accuracy */}
        <div className="card-base" style={{ padding: '20px', borderTop: '4px solid var(--primary-forest)' }} id="stat-accuracy">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Accuracy
            </span>
            <Target size={18} color="var(--primary-forest)" />
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, color: 'var(--primary-forest)' }}>
            {accuracy.percentage}%
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {accuracy.correctAnswers} of {accuracy.totalAnswers} answered correctly
          </div>
        </div>
      </div>

      {/* Most Missed Cards Section */}
      <div className="card-base" style={{ padding: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <AlertTriangle size={20} color="var(--accent-clay)" />
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>
              Concepts Needing Reinforcement
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Cards you missed most often during study sessions.
            </p>
          </div>
        </div>

        {mostMissed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <Sparkles size={24} color="var(--accent-sage)" style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontWeight: 500, fontSize: '0.94rem' }}>No missed cards yet!</div>
            <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
              Complete flashcard or quiz sessions, and any tricky concepts will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mostMissed.map((card, idx) => (
              <div
                key={card.id}
                style={{
                  background: 'var(--bg-surface-soft)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className={`type-pill ${card.type}`}>
                    {card.type}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#C0392B', fontWeight: 700 }}>
                    Missed {card.times_wrong} {card.times_wrong === 1 ? 'time' : 'times'}
                  </span>
                </div>

                <div style={{ fontWeight: 600, fontSize: '0.98rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                  {card.front}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  {card.back}
                </div>

                <div className="source-evidence-block" style={{ marginTop: '8px', padding: '10px 14px' }}>
                  <div className="source-evidence-header" style={{ marginBottom: '4px' }}>
                    <div className="source-evidence-label" style={{ fontSize: '0.66rem' }}>
                      <Quote size={10} />
                      <span>Source Evidence</span>
                    </div>
                  </div>
                  <div className="source-evidence-quote" style={{ fontSize: '0.86rem' }}>
                    "{card.quote}"
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
