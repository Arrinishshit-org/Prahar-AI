/**
 * Interaction Service — records user → scheme interactions in Neo4j.
 *
 * Creates (User)-[:INTERACTED {action, ...}]->(Scheme) relationships
 * and exposes aggregated interaction counts for scheme popularity signals.
 *
 * Supported actions: view | apply | bookmark | share | dismiss
 */

import { neo4jService } from '../db/neo4j.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InteractionAction = 'view' | 'apply' | 'bookmark' | 'share' | 'dismiss';

const VALID_ACTIONS: ReadonlySet<InteractionAction> = new Set([
  'view',
  'apply',
  'bookmark',
  'share',
  'dismiss',
]);

export function isValidInteractionAction(value: unknown): value is InteractionAction {
  return typeof value === 'string' && VALID_ACTIONS.has(value as InteractionAction);
}

export interface InteractionRecord {
  userId: string;
  schemeId: string;
  action: InteractionAction;
  sessionId?: string;
  /** ISO-8601 timestamp; defaults to now */
  timestamp?: string;
}

export interface InteractionCounts {
  view: number;
  apply: number;
  bookmark: number;
  share: number;
  dismiss: number;
  total: number;
}

// Popularity score weights per action — dismiss reduces, apply strongly boosts
const ACTION_WEIGHTS: Record<InteractionAction, number> = {
  view: 1,
  apply: 5,
  bookmark: 3,
  share: 2,
  dismiss: -2,
};

// ─── Service ─────────────────────────────────────────────────────────────────

class InteractionService {
  /**
   * Record a user → scheme interaction in Neo4j.
   * Creates a uniquely timestamped :INTERACTED relationship so that
   * multiple interactions of the same type for the same pair are all preserved.
   */
  async trackInteraction(record: InteractionRecord): Promise<void> {
    const { userId, schemeId, action, sessionId, timestamp } = record;
    const ts = timestamp ?? new Date().toISOString();
    await neo4jService.recordInteraction(userId, schemeId, action, ts, sessionId ?? null);
  }

  /**
   * Return aggregated interaction counts for a scheme across all users.
   */
  async getSchemeInteractionCounts(schemeId: string): Promise<InteractionCounts> {
    const result = await neo4jService.getSchemeInteractionCounts(schemeId);

    const counts: InteractionCounts = {
      view: 0,
      apply: 0,
      bookmark: 0,
      share: 0,
      dismiss: 0,
      total: 0,
    };

    for (const row of result) {
      const action = row.action as InteractionAction;
      if (isValidInteractionAction(action)) {
        counts[action] = Number(row.count);
        counts.total += counts[action];
      }
    }

    return counts;
  }

  /**
   * Compute a normalised popularity score [0, 1] for a scheme based on
   * weighted interaction counts.  Uses a log-scale to dampen outliers.
   */
  async getSchemePopularityScore(schemeId: string): Promise<number> {
    const counts = await this.getSchemeInteractionCounts(schemeId);
    const raw =
      counts.view * ACTION_WEIGHTS.view +
      counts.apply * ACTION_WEIGHTS.apply +
      counts.bookmark * ACTION_WEIGHTS.bookmark +
      counts.share * ACTION_WEIGHTS.share +
      counts.dismiss * ACTION_WEIGHTS.dismiss;

    // log1p keeps small counts meaningful; cap at a soft ceiling of 200 raw points
    const capped = Math.max(0, Math.min(raw, 200));
    return Math.log1p(capped) / Math.log1p(200);
  }

  /**
   * Return the complete interaction history for a specific user → scheme pair.
   */
  async getUserSchemeHistory(
    userId: string,
    schemeId: string
  ): Promise<Array<{ action: InteractionAction; timestamp: string; sessionId: string | null }>> {
    const result = await neo4jService.getUserSchemeInteractions(userId, schemeId);
    return result
      .filter((row) => isValidInteractionAction(row.action))
      .map((row) => ({
        action: row.action as InteractionAction,
        timestamp: row.timestamp,
        sessionId: row.sessionId,
      }));
  }
}

export const interactionService = new InteractionService();
