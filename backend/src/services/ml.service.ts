/**
 * ML Service — HTTP client for the Python ML microservice (T-09)
 *
 * Connects to ml-pipeline/api.py running on port 8000.
 * All calls have a timeout + fallback so the backend never blocks.
 *
 * Endpoints used:
 *   POST /classify    — intent classification + entity extraction
 *   POST /recommend   — ranked scheme recommendations
 *   POST /eligibility — eligibility score for a user-scheme pair
 *   GET  /health      — service health
 */

import { z } from 'zod';

const ML_BASE = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT_MS = 15000; // 15 s — /chat does a roundtrip through backend schemes API + Neo4j
const RETRY_ATTEMPTS = Math.max(1, Number(process.env.ML_RETRY_ATTEMPTS || 3));
const RETRY_BASE_DELAY_MS = Math.max(50, Number(process.env.ML_RETRY_BASE_DELAY_MS || 100));
const CHAT_TIMEOUT_MS = Math.max(1000, Number(process.env.ML_CHAT_TIMEOUT_MS || 10000));
const CHAT_RETRY_ATTEMPTS = Math.max(1, Number(process.env.ML_CHAT_RETRY_ATTEMPTS || 1));

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClassifyResult {
  primary_intent: string; // scheme_search | eligibility_check | application_info | ...
  confidence: number;
  entities: Record<string, any>; // { age: 25, state: "Gujarat", ... }
  secondary_intents: string[];
}

export interface RecommendResult {
  recommendations: Array<{
    id?: string;
    schemeId?: string;
    scheme_id?: string;
    name: string;
    scheme_name?: string;
    relevanceScore?: number;
    relevance_score?: number;
    [key: string]: any;
  }>;
  total: number;
  cached: boolean;
}

export interface ChatResult {
  response: string;
  suggestions: string[];
  extracted_entities?: Record<string, any>;
}

export interface MLServiceStatus {
  baseUrl: string;
  timeoutMs: number;
  retryAttempts: number;
  retryBaseDelayMs: number;
  chatTimeoutMs: number;
  chatRetryAttempts: number;
  available: boolean | null;
  lastCheckAt: string | null;
  lastHealthCheckLatencyMs: number | null;
  lastFailureType: MLErrorType | null;
  circuitBreaker: {
    state: 'closed' | 'open' | 'half-open';
    consecutiveFailures: number;
    openUntil: string | null;
  };
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Normalize backend profile to ML user_profile schema.
 * Backend -> ML should prefer snake_case keys at boundary.
 */
function normalizeUserProfile(userProfile: Record<string, any>): Record<string, any> {
  const userId = userProfile.user_id ?? userProfile.userId ?? userProfile.id ?? '';
  const annualIncome = userProfile.annual_income ?? userProfile.income ?? 0;
  const occupation = userProfile.occupation ?? userProfile.employment ?? '';
  const educationLevel = userProfile.education_level ?? userProfile.education ?? '';
  const isDisabled =
    userProfile.is_disabled ?? userProfile.disability ?? userProfile.isDisabled ?? false;
  const isMinority = userProfile.is_minority ?? userProfile.minority ?? userProfile.isMinority;

  return {
    user_id: String(userId || ''),
    name: userProfile.name ?? null,
    email: userProfile.email ?? null,
    age: toNumber(userProfile.age, 0),
    state: userProfile.state ?? '',
    gender: userProfile.gender ?? null,
    annual_income: toNumber(annualIncome, 0),
    occupation: occupation ?? '',
    education_level: educationLevel ?? '',
    disability: Boolean(isDisabled),
    is_disabled: Boolean(isDisabled),
    ...(isMinority !== undefined ? { is_minority: Boolean(isMinority) } : {}),

    // New high/medium impact fields
    marital_status: userProfile.marital_status ?? userProfile.maritalStatus ?? null,
    family_size: toNumber(userProfile.family_size ?? userProfile.familySize, 0),
    rural_urban: userProfile.rural_urban ?? userProfile.residenceType ?? null,
    poverty_status: userProfile.poverty_status ?? userProfile.povertyStatus ?? null,
    ration_card: userProfile.ration_card ?? userProfile.rationCard ?? null,
    land_ownership: userProfile.land_ownership ?? userProfile.landOwnership ?? null,
    district: userProfile.district ?? null,
    disability_type: userProfile.disability_type ?? userProfile.disabilityType ?? null,
    minority_community: userProfile.minority_community ?? userProfile.minorityCommunity ?? null,
    social_category: userProfile.social_category ?? userProfile.socialCategory ?? null,
    interests: userProfile.interests ?? null,

    // Compatibility aliases consumed by some current ML chat heuristics.
    income: toNumber(annualIncome, 0),
    employment: occupation ?? '',
    education: educationLevel ?? '',
  };
}

function normalizeRecommendationResult(result: RecommendResult | null): RecommendResult | null {
  if (!result) return null;
  return {
    total: toNumber(result.total, 0),
    cached: Boolean(result.cached),
    recommendations: (result.recommendations || []).map((rec) => {
      const resolvedId = rec.id ?? rec.schemeId ?? rec.scheme_id ?? '';
      const resolvedScore = toNumber(rec.relevanceScore ?? rec.relevance_score, 0);
      const resolvedName = rec.name ?? rec.scheme_name ?? '';
      return {
        ...rec,
        name: resolvedName,
        id: resolvedId,
        schemeId: rec.schemeId ?? rec.scheme_id ?? resolvedId,
        relevanceScore: resolvedScore,
      };
    }),
  };
}

export interface EligibilityResult {
  scheme_id: string;
  score: number; // 0.0 – 1.0
  percentage: number; // 0 – 100
  category: string; // highly_eligible | potentially_eligible | low_eligibility
  met_criteria: string[];
  unmet_criteria: string[];
  explanation: string;
}

type LogLevel = 'info' | 'warn' | 'error';
type MLErrorType =
  | 'timeout'
  | 'network'
  | 'http_4xx'
  | 'http_5xx'
  | 'rate_limited'
  | 'schema_mismatch'
  | 'circuit_open';

const classifyRequestSchema = z.object({
  message: z.string().trim().min(1),
  user_id: z.string().optional(),
});

const classifyResponseSchema = z.object({
  primary_intent: z.string(),
  confidence: z.number(),
  entities: z.record(z.any()).default({}),
  secondary_intents: z.array(z.string()).default([]),
  review_queued: z.boolean().optional(),
});

const recommendRequestSchema = z.object({
  user_profile: z.record(z.any()),
  schemes: z.array(z.any()),
  max_results: z.number(),
  min_score: z.number(),
});

const recommendResponseSchema = z.object({
  recommendations: z.array(z.record(z.any())).default([]),
  total: z.coerce.number(),
  cached: z.coerce.boolean().default(false),
});

const eligibilityRequestSchema = z.object({
  user_profile: z.record(z.any()),
  scheme: z.record(z.any()),
});

const eligibilityResponseSchema = z.object({
  scheme_id: z.string(),
  score: z.coerce.number(),
  percentage: z.coerce.number(),
  category: z.string(),
  met_criteria: z.array(z.string()).default([]),
  unmet_criteria: z.array(z.string()).default([]),
  explanation: z.string().default(''),
});

const chatRequestSchema = z.object({
  message: z.string().trim().min(1),
  user_profile: z.record(z.any()),
  conversation_history: z.array(z.object({ role: z.string(), content: z.string() })).default([]),
});

const chatResponseSchema = z.object({
  response: z.string(),
  suggestions: z.array(z.string()).default([]),
  extracted_entities: z.record(z.any()).optional(),
  grounding_meta: z.record(z.any()).optional(),
});

// ─── HTTP helper ──────────────────────────────────────────────────────────────

interface RetryOptions {
  timeoutMs?: number;
  retryAttempts?: number;
}

function logMLEvent(level: LogLevel, event: string, payload: Record<string, unknown>): void {
  const line = JSON.stringify({
    event,
    source: 'ml_service',
    timestamp: new Date().toISOString(),
    ...payload,
  });

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
}

function classifyHttpError(status: number): MLErrorType {
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'http_5xx';
  return 'http_4xx';
}

function classifyException(error: unknown): MLErrorType {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'timeout';
  }
  return 'network';
}

function validateContract<T>(
  schema: z.ZodType<T>,
  payload: unknown,
  metadata: {
    endpoint: string;
    direction: 'request' | 'response';
  }
): T | null {
  const parsed = schema.safeParse(payload);
  if (parsed.success) return parsed.data;

  logMLEvent('warn', 'ml_contract_validation_failed', {
    endpoint: metadata.endpoint,
    direction: metadata.direction,
    errorType: 'schema_mismatch',
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    })),
  });
  return null;
}

async function postWithTimeout<T>(
  path: string,
  body: unknown,
  options: RetryOptions = {}
): Promise<T | null> {
  const timeoutMs = Math.max(1, options.timeoutMs ?? TIMEOUT_MS);
  const retryAttempts = Math.max(1, options.retryAttempts ?? RETRY_ATTEMPTS);

  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const res = await fetch(`${ML_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const latencyMs = Date.now() - startedAt;

      if (!res.ok) {
        const errorType = classifyHttpError(res.status);
        const shouldRetry = isRetryableStatus(res.status) && attempt < retryAttempts;
        logMLEvent('warn', 'ml_call_failed', {
          method: 'POST',
          endpoint: path,
          status: res.status,
          latencyMs,
          attempt,
          retryAttempts,
          willRetry: shouldRetry,
          errorType,
        });
        if (shouldRetry) {
          await sleep(getBackoffDelayMs(attempt));
          continue;
        }
        return null;
      }

      logMLEvent('info', 'ml_call_succeeded', {
        method: 'POST',
        endpoint: path,
        latencyMs,
        attempt,
        retryAttempts,
      });
      return res.json() as Promise<T>;
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const shouldRetry = attempt < retryAttempts;
      logMLEvent('warn', 'ml_call_failed', {
        method: 'POST',
        endpoint: path,
        latencyMs,
        attempt,
        retryAttempts,
        willRetry: shouldRetry,
        errorType: classifyException(error),
      });
      if (shouldRetry) {
        await sleep(getBackoffDelayMs(attempt));
        continue;
      }
      return null; // timeout or connection refused
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

async function getWithTimeout<T>(path: string): Promise<T | null> {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const startedAt = Date.now();

    try {
      const res = await fetch(`${ML_BASE}${path}`, { signal: controller.signal });
      const latencyMs = Date.now() - startedAt;

      if (!res.ok) {
        const errorType = classifyHttpError(res.status);
        const shouldRetry = isRetryableStatus(res.status) && attempt < RETRY_ATTEMPTS;
        logMLEvent('warn', 'ml_call_failed', {
          method: 'GET',
          endpoint: path,
          status: res.status,
          latencyMs,
          attempt,
          retryAttempts: RETRY_ATTEMPTS,
          willRetry: shouldRetry,
          errorType,
        });
        if (shouldRetry) {
          await sleep(getBackoffDelayMs(attempt));
          continue;
        }
        return null;
      }

      logMLEvent('info', 'ml_call_succeeded', {
        method: 'GET',
        endpoint: path,
        latencyMs,
        attempt,
        retryAttempts: RETRY_ATTEMPTS,
      });
      return res.json() as Promise<T>;
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const shouldRetry = attempt < RETRY_ATTEMPTS;
      logMLEvent('warn', 'ml_call_failed', {
        method: 'GET',
        endpoint: path,
        latencyMs,
        attempt,
        retryAttempts: RETRY_ATTEMPTS,
        willRetry: shouldRetry,
        errorType: classifyException(error),
      });
      if (shouldRetry) {
        await sleep(getBackoffDelayMs(attempt));
        continue;
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function getBackoffDelayMs(attempt: number): number {
  return RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Service ──────────────────────────────────────────────────────────────────

class MLService {
  private _available: boolean | null = null; // null = not checked yet
  private _lastCheck = 0;
  private _lastHealthLatencyMs: number | null = null;
  private _lastFailureType: MLErrorType | null = null;
  private readonly HEALTH_CACHE_MS = 30_000; // re-check every 30 s
  private breakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private consecutiveFailures = 0;
  private openUntilMs = 0;
  private readonly BREAKER_FAILURE_THRESHOLD = Number(process.env.ML_CB_FAILURES || 3);
  private readonly BREAKER_OPEN_MS = Number(process.env.ML_CB_OPEN_MS || 30000);

  private canCallML(): boolean {
    const now = Date.now();
    if (this.breakerState === 'open') {
      if (now >= this.openUntilMs) {
        this.breakerState = 'half-open';
        logMLEvent('info', 'ml_circuit_state_changed', {
          state: this.breakerState,
          consecutiveFailures: this.consecutiveFailures,
        });
        return true;
      }
      logMLEvent('warn', 'ml_call_skipped', {
        errorType: 'circuit_open',
        openUntil: new Date(this.openUntilMs).toISOString(),
      });
      return false;
    }
    return true;
  }

  private noteSuccess(): void {
    const previousState = this.breakerState;
    this.consecutiveFailures = 0;
    this._lastFailureType = null;
    this.breakerState = 'closed';
    this.openUntilMs = 0;
    if (previousState !== this.breakerState) {
      logMLEvent('info', 'ml_circuit_state_changed', {
        state: this.breakerState,
        consecutiveFailures: this.consecutiveFailures,
      });
    }
  }

  private noteFailure(): void {
    this._lastFailureType = this._lastFailureType || 'network';
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.BREAKER_FAILURE_THRESHOLD) {
      this.breakerState = 'open';
      this.openUntilMs = Date.now() + this.BREAKER_OPEN_MS;
      logMLEvent('warn', 'ml_circuit_state_changed', {
        state: this.breakerState,
        consecutiveFailures: this.consecutiveFailures,
        openUntil: new Date(this.openUntilMs).toISOString(),
      });
    }
  }

  /** Quick availability probe — cached */
  async isAvailable(): Promise<boolean> {
    const now = Date.now();
    if (this._available !== null && now - this._lastCheck < this.HEALTH_CACHE_MS) {
      return this._available;
    }
    const startedAt = Date.now();
    const result = await getWithTimeout('/health');
    this._lastHealthLatencyMs = Date.now() - startedAt;
    this._available = result !== null;
    this._lastCheck = now;
    if (this._available) {
      logMLEvent('info', 'ml_health_available', {
        baseUrl: ML_BASE,
      });
    }
    return this._available;
  }

  getStatus(): MLServiceStatus {
    return {
      baseUrl: ML_BASE,
      timeoutMs: TIMEOUT_MS,
      retryAttempts: RETRY_ATTEMPTS,
      retryBaseDelayMs: RETRY_BASE_DELAY_MS,
      chatTimeoutMs: CHAT_TIMEOUT_MS,
      chatRetryAttempts: CHAT_RETRY_ATTEMPTS,
      available: this._available,
      lastCheckAt: this._lastCheck > 0 ? new Date(this._lastCheck).toISOString() : null,
      lastHealthCheckLatencyMs: this._lastHealthLatencyMs,
      lastFailureType: this._lastFailureType,
      circuitBreaker: {
        state: this.breakerState,
        consecutiveFailures: this.consecutiveFailures,
        openUntil: this.openUntilMs > 0 ? new Date(this.openUntilMs).toISOString() : null,
      },
    };
  }

  /**
   * Classify intent of a user message.
   * Returns null if ML service is unavailable.
   */
  async classify(message: string, userId?: string): Promise<ClassifyResult | null> {
    if (!this.canCallML()) return null;
    const payload = validateContract(
      classifyRequestSchema,
      { message, user_id: userId },
      {
        endpoint: '/classify',
        direction: 'request',
      }
    );
    if (!payload) return null;

    const result = await postWithTimeout<ClassifyResult>('/classify', payload);
    if (!result) {
      this._lastFailureType = 'network';
      this.noteFailure();
      return null;
    }

    const parsed = validateContract(classifyResponseSchema, result, {
      endpoint: '/classify',
      direction: 'response',
    });
    if (!parsed) {
      this._lastFailureType = 'schema_mismatch';
      this.noteFailure();
      return null;
    }

    this.noteSuccess();
    return {
      primary_intent: parsed.primary_intent,
      confidence: parsed.confidence,
      entities: parsed.entities ?? {},
      secondary_intents: parsed.secondary_intents ?? [],
    };
  }

  /**
   * Generate ML-ranked recommendations from a list of candidate schemes.
   * Returns null if ML service is unavailable.
   */
  async recommend(
    userProfile: Record<string, any>,
    schemes: any[],
    maxResults = 10,
    minScore = 0.2
  ): Promise<RecommendResult | null> {
    if (!this.canCallML()) return null;
    const payload = validateContract(
      recommendRequestSchema,
      {
        user_profile: normalizeUserProfile(userProfile),
        schemes,
        max_results: maxResults,
        min_score: minScore,
      },
      {
        endpoint: '/recommend',
        direction: 'request',
      }
    );
    if (!payload) return null;

    const result = await postWithTimeout<RecommendResult>('/recommend', payload);
    if (!result) {
      this._lastFailureType = 'network';
      this.noteFailure();
      return null;
    }

    const parsed = validateContract(recommendResponseSchema, result, {
      endpoint: '/recommend',
      direction: 'response',
    });
    if (!parsed) {
      this._lastFailureType = 'schema_mismatch';
      this.noteFailure();
      return null;
    }

    this.noteSuccess();
    return normalizeRecommendationResult({
      recommendations: parsed.recommendations as RecommendResult['recommendations'],
      total: parsed.total,
      cached: parsed.cached ?? false,
    });
  }

  /**
   * Calculate eligibility score for a single user-scheme pair.
   * Returns null if ML service is unavailable.
   */
  async eligibility(
    userProfile: Record<string, any>,
    scheme: Record<string, any>
  ): Promise<EligibilityResult | null> {
    if (!this.canCallML()) return null;
    const payload = validateContract(
      eligibilityRequestSchema,
      {
        user_profile: normalizeUserProfile(userProfile),
        scheme,
      },
      {
        endpoint: '/eligibility',
        direction: 'request',
      }
    );
    if (!payload) return null;

    const result = await postWithTimeout<EligibilityResult>('/eligibility', payload);
    if (!result) {
      this._lastFailureType = 'network';
      this.noteFailure();
      return null;
    }

    const parsed = validateContract(eligibilityResponseSchema, result, {
      endpoint: '/eligibility',
      direction: 'response',
    });
    if (!parsed) {
      this._lastFailureType = 'schema_mismatch';
      this.noteFailure();
      return null;
    }

    this.noteSuccess();
    return {
      scheme_id: parsed.scheme_id,
      score: parsed.score,
      percentage: parsed.percentage,
      category: parsed.category,
      met_criteria: parsed.met_criteria ?? [],
      unmet_criteria: parsed.unmet_criteria ?? [],
      explanation: parsed.explanation ?? '',
    };
  }

  /**
   * Process conversational response from ML chat endpoint.
   * Returns null when ML is unavailable or times out.
   */
  async chat(
    message: string,
    userProfile: Record<string, any>,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<ChatResult | null> {
    if (!this.canCallML()) return null;
    const payload = validateContract(
      chatRequestSchema,
      {
        message,
        user_profile: normalizeUserProfile(userProfile),
        conversation_history: conversationHistory,
      },
      {
        endpoint: '/chat',
        direction: 'request',
      }
    );
    if (!payload) return null;

    const result = await postWithTimeout<ChatResult>('/chat', payload, {
      timeoutMs: CHAT_TIMEOUT_MS,
      retryAttempts: CHAT_RETRY_ATTEMPTS,
    });
    if (!result) {
      this._lastFailureType = 'network';
      this.noteFailure();
      return null;
    }

    const parsed = validateContract(chatResponseSchema, result, {
      endpoint: '/chat',
      direction: 'response',
    });
    if (!parsed) {
      this._lastFailureType = 'schema_mismatch';
      this.noteFailure();
      return null;
    }

    this.noteSuccess();
    return {
      response: parsed.response,
      suggestions: parsed.suggestions ?? [],
      extracted_entities: parsed.extracted_entities,
    };
  }
}

export const mlService = new MLService();
