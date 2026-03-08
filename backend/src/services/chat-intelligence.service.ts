import * as crypto from 'crypto';
import { neo4jService, SchemeRow } from '../db/neo4j.service';
import { CacheTTL, redisService } from '../db/redis.service';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface StructuredSchemeCard {
  id: string;
  title: string;
  description: string;
  category: string;
  ministry?: string | null;
  state?: string | null;
  score: number;
}

export interface StructuredChatPayload {
  summary: string;
  schemes: StructuredSchemeCard[];
  next_actions: string[];
}

interface ChatMemory {
  summary: string;
  recent: ChatTurn[];
  updatedAt: string;
}

export interface RetrievalResult {
  schemes: StructuredSchemeCard[];
  cacheHit: boolean;
}

const EMBED_DIM = 256;
const CONTEXT_TOKEN_BUDGET = Number(process.env.CHAT_CONTEXT_TOKEN_BUDGET || 1800);
const SUMMARY_TOKEN_BUDGET = Number(process.env.CHAT_SUMMARY_TOKEN_BUDGET || 400);
const MESSAGE_TOKEN_LIMIT = Number(process.env.CHAT_MESSAGE_TOKEN_LIMIT || 400);
const OUTPUT_CHAR_LIMIT = Number(process.env.CHAT_OUTPUT_CHAR_LIMIT || 3500);

function estimateTokens(text: string): number {
  return Math.ceil((text || '').length / 4);
}

function sanitizeText(text: string, maxChars = 1200): string {
  return (text || '').replace(/\r\n?/g, '\n').replace(/\s+/g, ' ').trim().slice(0, maxChars);
}

function normalize(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function hashText(text: string): string {
  return crypto.createHash('sha1').update(text).digest('hex');
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((token) => token.length > 2)
    .slice(0, 300);
}

function hashToIndex(token: string): number {
  const digest = crypto.createHash('md5').update(token).digest();
  return digest.readUInt16BE(0) % EMBED_DIM;
}

function embedText(text: string): number[] {
  const vec = new Array<number>(EMBED_DIM).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vec;

  for (const token of tokens) {
    const idx = hashToIndex(token);
    vec[idx] += 1;
  }

  const norm = Math.sqrt(vec.reduce((acc, cur) => acc + cur * cur, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < EMBED_DIM; i += 1) dot += a[i] * b[i];
  return dot;
}

function categoryFromScheme(s: SchemeRow): string {
  try {
    const parsed = JSON.parse(s.category || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) return String(parsed[0]);
  } catch {
    // ignore invalid category payload
  }
  return 'General';
}

function scoreProfileBoost(profile: Record<string, any>, scheme: SchemeRow): number {
  const text = normalize(`${scheme.name} ${scheme.description} ${scheme.tags || ''}`);
  let boost = 0;

  const state = normalize(String(profile.state || ''));
  if (state && normalize(String(scheme.state || '')).includes(state)) boost += 0.08;

  const employment = normalize(String(profile.employment || profile.occupation || ''));
  if (employment && text.includes(employment)) boost += 0.06;

  const education = normalize(String(profile.education || profile.education_level || ''));
  if (education && text.includes(education)) boost += 0.05;

  const socialCategory = normalize(String(profile.social_category || ''));
  if (socialCategory && text.includes(socialCategory)) boost += 0.04;

  const gender = normalize(String(profile.gender || ''));
  if (gender && text.includes(gender)) boost += 0.03;

  if (profile.is_disabled && /(disab|pwd|divyang)/.test(text)) boost += 0.06;
  if (profile.is_minority && /(minority|muslim|christian|sikh|buddhist|jain|parsi)/.test(text)) boost += 0.05;

  return boost;
}

function dedupeSchemes(items: StructuredSchemeCard[]): StructuredSchemeCard[] {
  const seen = new Set<string>();
  const output: StructuredSchemeCard[] = [];

  for (const item of items) {
    const key = `${item.id}|${normalize(item.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function summarizeTurns(turns: ChatTurn[]): string {
  if (!turns.length) return '';
  const snippets: string[] = [];

  for (const turn of turns) {
    if (turn.role !== 'user') continue;
    const snippet = sanitizeText(turn.content, 140);
    if (snippet) snippets.push(`User asked: ${snippet}`);
    if (snippets.length >= 6) break;
  }

  const summary = snippets.join(' | ');
  return sanitizeText(summary, SUMMARY_TOKEN_BUDGET * 4);
}

function fallbackActions(intent: string): string[] {
  switch (intent) {
    case 'eligibility_check':
      return ['Check my eligibility', 'Show matching schemes', 'What documents are required?'];
    case 'application_info':
      return ['How do I apply?', 'Show official links', 'List required documents'];
    case 'scheme_search':
    default:
      return ['Show matching schemes', 'Personalize using my profile', 'Check eligibility'];
  }
}

function cleanSummaryText(raw: string): string {
  let text = sanitizeText(raw || '', OUTPUT_CHAR_LIMIT);
  if (!text) return '';

  // Remove bulky list sections from model output; schemes are rendered as cards.
  text = text.replace(/(?:matching\s+schemes|recommended\s+schemes|top\s+schemes)[\s\S]*/i, '').trim();
  text = text.replace(/(?:say\s+"?am\s+i\s+eligible[\s\S]*)$/i, '').trim();

  // Keep only the first 2-3 sentence-level chunks for a concise header summary.
  const chunks = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  let concise = chunks.join(' ').trim();

  // Remove dangling markdown/control artifacts after truncation.
  concise = concise
    .replace(/[•·]\s*$/g, '')
    .replace(/\*\*\s*$/g, '')
    .replace(/[#*_`]+\s*$/g, '')
    .replace(/[,:;\-–]\s*$/g, '')
    .trim();

  return sanitizeText(concise, 320);
}

class ChatIntelligenceService {
  async getContext(
    userId: string,
    incomingHistory: ChatTurn[]
  ): Promise<{ modelHistory: ChatTurn[]; summary: string }> {
    const memoryKey = `chat:memory:${userId}`;
    const existing = (await redisService.get<ChatMemory>(memoryKey)) || {
      summary: '',
      recent: [],
      updatedAt: new Date().toISOString(),
    };

    const normalizedIncoming = incomingHistory
      .filter((turn) => turn && typeof turn.content === 'string')
      .map((turn) => ({
        role: (turn.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: sanitizeText(turn.content, 1200),
      }));

    let merged = [...existing.recent, ...normalizedIncoming].slice(-30);
    let summary = existing.summary || '';

    while (merged.length > 8 && estimateTokens(JSON.stringify(merged)) > CONTEXT_TOKEN_BUDGET) {
      const removed = merged.slice(0, 2);
      merged = merged.slice(2);
      const rollup = summarizeTurns(removed);
      summary = sanitizeText(`${summary} ${rollup}`.trim(), SUMMARY_TOKEN_BUDGET * 4);
    }

    const modelHistory: ChatTurn[] = [];
    if (summary) {
      modelHistory.push({
        role: 'assistant',
        content: `Conversation summary for continuity: ${summary}`,
      });
    }

    const boundedHistory = merged
      .slice(-20)
      .filter((turn) => estimateTokens(turn.content) <= MESSAGE_TOKEN_LIMIT)
      .map((turn) => ({
        role: (turn.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: turn.content.slice(0, MESSAGE_TOKEN_LIMIT * 4),
      }));

    modelHistory.push(...boundedHistory);

    await redisService.set(
      memoryKey,
      {
        summary,
        recent: merged,
        updatedAt: new Date().toISOString(),
      },
      CacheTTL.RECOMMENDATIONS
    );

    return { modelHistory, summary };
  }

  async retrieveSchemes(
    query: string,
    userProfile: Record<string, any>,
    limit = 6
  ): Promise<RetrievalResult> {
    const stateKey = normalize(String(userProfile.state || 'all'));
    const profileKey = hashText(
      `${stateKey}|${normalize(String(userProfile.employment || ''))}|${normalize(String(userProfile.education || ''))}|${normalize(String(userProfile.social_category || ''))}`
    );
    const cacheKey = `chat:retrieval:${hashText(normalize(query))}:${profileKey}:${limit}`;

    const cached = await redisService.get<StructuredSchemeCard[]>(cacheKey);
    if (cached) {
      return { schemes: cached, cacheHit: true };
    }

    const primaryCandidates = await neo4jService.searchSchemes(query, 120, 0);
    const candidates = primaryCandidates.length >= 30
      ? primaryCandidates
      : [...primaryCandidates, ...(await neo4jService.getAllSchemes(200, 0))];

    const qVec = embedText(query);

    const scored = candidates.map((scheme) => {
      const text = `${scheme.name} ${scheme.description} ${scheme.tags || ''} ${scheme.ministry || ''} ${scheme.state || ''}`;
      const semantic = cosine(qVec, embedText(text));
      const profileBoost = scoreProfileBoost(userProfile, scheme);
      const score = semantic * 0.82 + profileBoost;

      return {
        id: scheme.scheme_id,
        title: scheme.name,
        description: sanitizeText(scheme.description || 'Government scheme details available.', 240),
        category: categoryFromScheme(scheme),
        ministry: scheme.ministry,
        state: scheme.state,
        score: Number(score.toFixed(4)),
      } as StructuredSchemeCard;
    });

    const deduped = dedupeSchemes(scored)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    await redisService.set(cacheKey, deduped, CacheTTL.SCHEME_SEARCH);
    return { schemes: deduped, cacheHit: false };
  }

  buildStructuredPayload(
    mlResponse: string,
    intent: string,
    schemes: StructuredSchemeCard[],
    degraded: boolean
  ): StructuredChatPayload {
    const fallbackSummary =
      intent === 'eligibility_check'
        ? 'I checked your profile context and shortlisted relevant schemes. Ask me about eligibility for any specific scheme.'
        : 'I matched your request against relevant schemes and prepared next steps.';

    const summary = cleanSummaryText(mlResponse) || fallbackSummary;
    const nextActions = fallbackActions(intent);

    if (degraded) {
      return {
        summary,
        schemes,
        next_actions: [...nextActions, 'Retry in a moment'],
      };
    }

    return {
      summary,
      schemes,
      next_actions: nextActions,
    };
  }
}

export const chatIntelligenceService = new ChatIntelligenceService();
