// Utilitários para frontmatter, hash e geração de IDs
import { Logger } from '../dev/logger';

/** Extrai o bloco YAML bruto (sem delimitadores ---) pra hashing rapido */
export function extractRawYaml(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : '';
}

export function hashObject(obj: any): string {
  const str = typeof obj === 'string'
    ? obj
    : JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

export function generateWidgetId(): string {
  return `mirror-widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** Resolve a template variable key against a frontmatter object.
 *  Strategy: flat key first (respects Obsidian literal property names like "ma.miii"),
 *  then nested path fallback (like Dataview: "project_info.dates.start_date"). */
export function resolveVariable(key: string, variables: Record<string, any>): string | undefined {
  // 1. Flat first — literal key lookup
  const flat = variables[key];
  if (flat != null) return String(flat);

  // 2. Nested fallback — split on dots and traverse
  if (key.includes('.')) {
    const segments = key.split('.');
    let current: any = variables;
    for (const seg of segments) {
      if (current == null || typeof current !== 'object') return undefined;
      current = current[seg];
    }
    if (current != null) return String(current);
  }

  return undefined;
}

export interface TraceDecision {
  file: string;
  viewId?: string;
  event: string;
  mirror?: string | null;
  position?: { requested: string; actual?: string };
  engine?: 'dom' | 'cm6' | 'margin' | 'none';
  reason?: string;
}

/** Log a mirror runtime decision with [trace] prefix for filtering.
 *  Usage: grep '[trace]' debug.log */
export function traceMirrorDecision(d: TraceDecision): void {
  const view = d.viewId ? ` [${d.viewId}]` : '';
  let msg = `[trace] ${d.file}${view} ${d.event}`;

  if (d.mirror !== undefined) {
    if (d.mirror === null) {
      msg += ' → no match';
    } else {
      msg += ` → mirror="${d.mirror}"`;
    }
  }

  if (d.position) {
    const { requested, actual } = d.position;
    if (actual && actual !== requested) {
      msg += ` pos=${requested}→${actual} (fallback)`;
    } else {
      msg += ` pos=${requested}`;
    }
  }

  if (d.engine) msg += ` engine=${d.engine}`;
  if (d.reason) msg += ` [${d.reason}]`;

  Logger.log(msg);
}
