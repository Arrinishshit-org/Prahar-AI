import { z } from 'zod';

const INTENT_BASE_URL =
  process.env.INTENT_SERVICE_URL ||
  process.env.ML_SERVICE_URL ||
  (process.env.NODE_ENV === 'production' ? 'http://ml:8000' : 'http://localhost:8000');
const TIMEOUT_MS = Math.max(250, Number(process.env.INTENT_SERVICE_TIMEOUT_MS || 2000));

export interface IntentPredictionResult {
  intent: string;
  confidence: number;
}

const intentResponseSchema = z.object({
  intent: z.string(),
  confidence: z.coerce.number(),
});

function unknownIntentFallback(reason: string): IntentPredictionResult {
  console.error(
    JSON.stringify({
      event: 'intent_service_fallback',
      reason,
      timestamp: new Date().toISOString(),
    })
  );
  return {
    intent: 'unknown_intent',
    confidence: 0,
  };
}

async function postWithTimeout(path: string, payload: unknown): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${INTENT_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function getWithTimeout(path: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${INTENT_BASE_URL}${path}`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

class IntentService {
  async isHealthy(): Promise<boolean> {
    try {
      const payload = await getWithTimeout('/health');
      return payload?.status === 'ok';
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(
        JSON.stringify({
          event: 'intent_service_health_failed',
          reason: msg,
          timestamp: new Date().toISOString(),
        })
      );
      return false;
    }
  }

  async predictIntent(text: string): Promise<IntentPredictionResult> {
    const input = String(text || '').trim();
    if (!input) {
      return { intent: 'unknown_intent', confidence: 0 };
    }

    try {
      const result = await postWithTimeout('/predict_intent', { text: input });
      const parsed = intentResponseSchema.safeParse(result);
      if (!parsed.success) {
        return unknownIntentFallback(`schema_mismatch:${parsed.error.message}`);
      }

      return {
        intent: parsed.data.intent,
        confidence: parsed.data.confidence,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return unknownIntentFallback(msg);
    }
  }
}

export const intentService = new IntentService();
