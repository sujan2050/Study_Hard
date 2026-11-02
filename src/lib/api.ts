import { getOrCreateOwnerId } from './owner';
import { Card, CardStatus, Passage, ProgressStats, Source, User, AuthResponse } from '../types';

const API_BASE = '/api';
export const AUTH_TOKEN_KEY = 'quiet_study_token';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const ownerId = getOrCreateOwnerId();
  const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-owner-id': ownerId,
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `API Error ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Sources & Passages
  previewPassages: (rawText: string) =>
    request<{ passages: { position: number; text: string }[] }>('/sources/preview-passages', {
      method: 'POST',
      body: JSON.stringify({ raw_text: rawText })
    }),

  createSource: (title: string, rawText: string) =>
    request<{ source: Source; passages: Passage[] }>('/sources', {
      method: 'POST',
      body: JSON.stringify({ title, raw_text: rawText })
    }),

  getSources: () =>
    request<{ sources: Source[] }>('/sources'),

  getPassages: (sourceId: string) =>
    request<{ passages: Passage[] }>(`/sources/${sourceId}/passages`),

  deleteSource: (sourceId: string) =>
    request<{ success: boolean }>(`/sources/${sourceId}`, {
      method: 'DELETE'
    }),

  // Generation
  generatePassageCards: (passageId: string) =>
    request<{ cards: Card[]; count: number }>('/generate-passage', {
      method: 'POST',
      body: JSON.stringify({ passage_id: passageId })
    }),

  // Cards
  getCards: (status?: CardStatus) =>
    request<{ cards: Card[] }>(status ? `/cards?status=${status}` : '/cards'),

  updateCardStatus: (cardId: string, status: CardStatus) =>
    request<{ card: Card }>(`/cards/${cardId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),

  bulkUpdateCardStatus: (cardIds: string[], status: CardStatus) =>
    request<{ updatedCount: number }>('/cards/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ card_ids: cardIds, status })
    }),

  updateCardContent: (cardId: string, front: string, back: string) =>
    request<{ card: Card }>(`/cards/${cardId}`, {
      method: 'PATCH',
      body: JSON.stringify({ front, back })
    }),

  deleteCard: (cardId: string) =>
    request<{ success: boolean }>(`/cards/${cardId}`, {
      method: 'DELETE'
    }),

  recordStudyResult: (cardId: string, correct: boolean) =>
    request<{ card: Card }>(`/cards/${cardId}/study-result`, {
      method: 'POST',
      body: JSON.stringify({ correct })
    }),

  // Stats
  getStats: () =>
    request<ProgressStats>('/stats'),

  // Authentication
  register: (payload: { email: string; password: string; name?: string; anonymousOwnerId?: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  login: (payload: { email: string; password: string; anonymousOwnerId?: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getMe: () =>
    request<{ user: User }>('/auth/me')
};
