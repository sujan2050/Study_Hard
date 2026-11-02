export type CardType = 'concept' | 'term' | 'process' | 'question';
export type CardStatus = 'draft' | 'approved' | 'discarded';

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface DbUser extends User {
  password_hash: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
}

export interface Source {
  id: string;
  owner_id: string;
  title: string;
  raw_text: string;
  created_at: string;
}

export interface Passage {
  id: string;
  source_id: string;
  position: number;
  text: string;
}

export interface Card {
  id: string;
  owner_id: string;
  passage_id: string;
  type: CardType;
  front: string;
  back: string;
  quote: string;
  status: CardStatus;
  edited: boolean;
  times_correct: number;
  times_wrong: number;
  created_at: string;
  approved_at: string | null;

  // Joined metadata for UI convenience
  passage_position?: number;
  passage_text?: string;
  source_title?: string;
  source_id?: string;
}

export interface ProgressStats {
  counts: {
    approved: number;
    draft: number;
    discarded: number;
    total: number;
  };
  quizAccuracy: {
    totalAnswers: number;
    correctAnswers: number;
    percentage: number;
  };
  mostMissedCards: Card[];
  recentSources: Source[];
}

export interface GenerationProgressEvent {
  passageIndex: number;
  totalPassages: number;
  generatedCount: number;
  verifiedCount: number;
  status: 'reading' | 'generating' | 'verifying' | 'completed' | 'error';
  message: string;
}
