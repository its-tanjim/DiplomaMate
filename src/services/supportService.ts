import { apiFetch } from './apiClient';

// Student support tickets: POST /api/support/tickets (create, authed
// student) and GET /api/support/tickets/mine (the student's own tickets).

export type SupportTicketCategory =
  | 'missing_note'
  | 'wrong_info'
  | 'account_help'
  | 'app_bug'
  | 'other';

export type SupportTicketPriority = 'low' | 'medium' | 'high';

export interface SupportTicket {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  description: string;
  status: string;
  createdAt: string;
}

export interface CreateSupportTicketInput {
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  description: string;
}

const AUTH_TOKEN_KEY = 'diplomamate_auth_token';

export const SUPPORT_TICKET_CATEGORIES: Array<{ value: SupportTicketCategory; label: string }> = [
  { value: 'missing_note', label: 'Missing note / material' },
  { value: 'wrong_info', label: 'Wrong information in the app' },
  { value: 'account_help', label: 'Account help' },
  { value: 'app_bug', label: 'App bug / something not working' },
  { value: 'other', label: 'Other' }
];

export const SUPPORT_TICKET_PRIORITIES: Array<{ value: SupportTicketPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function normalizeTicket(item: Record<string, unknown>): SupportTicket | null {
  if (!item || typeof item !== 'object') return null;
  const id = String(item.id ?? '');
  if (!id) return null;
  return {
    id,
    subject: String(item.subject ?? ''),
    category: (item.category as SupportTicketCategory) || 'other',
    priority: (item.priority as SupportTicketPriority) || 'medium',
    description: String(item.description ?? ''),
    status: String(item.status ?? 'open'),
    createdAt: String(item.createdAt ?? '')
  };
}

function normalizeList(data: unknown): SupportTicket[] {
  const raw = Array.isArray(data)
    ? data
    : (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).tickets)
      ? (data as Record<string, unknown>).tickets
      : []);
  return (raw as Array<Record<string, unknown>>)
    .map(normalizeTicket)
    .filter((t): t is SupportTicket => t !== null)
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<SupportTicket> {
  const res = await apiFetch('/api/support/tickets', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input)
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && typeof (data as Record<string, unknown>).error === 'string'
        ? (data as Record<string, unknown>).error as string
        : '') ||
      (data && typeof data === 'object' && typeof (data as Record<string, unknown>).message === 'string'
        ? (data as Record<string, unknown>).message as string
        : '') ||
      'Could not submit your ticket. Please try again.';
    throw new Error(message);
  }
  const ticket =
    data && typeof data === 'object'
      ? normalizeTicket(((data as Record<string, unknown>).ticket ?? data) as Record<string, unknown>)
      : null;
  if (!ticket) throw new Error('The server did not return the created ticket. Please check My Tickets.');
  return ticket;
}

export async function fetchMySupportTickets(): Promise<SupportTicket[]> {
  try {
    const res = await apiFetch('/api/support/tickets/mine', {
      headers: authHeaders()
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) return [];
    const data = await res.json();
    return normalizeList(data);
  } catch {
    return [];
  }
}
