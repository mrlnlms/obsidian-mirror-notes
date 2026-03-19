// Central mirror runtime decision — pure function, no DOM queries, no side effects.
// Takes current state and returns what SHOULD happen.
// Callers execute the decision (DOM injection, CM6 dispatch, margin panel).

import { TFile } from 'obsidian';
import { ApplicableMirrorConfig, MirrorPosition, DOM_POSITIONS, CM6_POSITIONS, MARGIN_POSITIONS } from './mirrorTypes';
import { getApplicableConfig } from './mirrorConfig';
import { traceMirrorDecision } from './mirrorUtils';
import type MirrorUIPlugin from '../../main';

export type MirrorEngine = 'cm6' | 'dom' | 'margin' | 'none';

export interface MirrorRuntimeDecision {
  config: ApplicableMirrorConfig | null;
  engine: MirrorEngine;
  requestedPosition: MirrorPosition | null;
  resolvedPosition: MirrorPosition | null;
  fallbackApplied: boolean;
  reason: string;
}

/** Determine engine from position + viewMode. Reading View has no CM6 editor,
 *  so top/bottom positions use DOM injection instead of CM6 widgets. */
export function resolveEngine(position: MirrorPosition, viewMode: string): MirrorEngine {
  if (MARGIN_POSITIONS.includes(position)) {
    // Margin panel is a CM6 ViewPlugin — only works in Live Preview.
    // In Reading View, CM6 editor is hidden, so margin panel would be invisible.
    return viewMode === 'preview' ? 'none' : 'margin';
  }
  if (DOM_POSITIONS.includes(position)) return 'dom';
  if ((CM6_POSITIONS as readonly string[]).includes(position)) {
    return viewMode === 'preview' ? 'dom' : 'cm6';
  }
  return 'none';
}

/** Central mirror runtime decision. Pure function — no DOM queries, no side effects.
 *  Takes current state, returns what SHOULD happen.
 *  Callers execute the decision (DOM injection, CM6 dispatch, margin panel). */
export function computeMirrorRuntimeDecision(
  plugin: MirrorUIPlugin,
  file: TFile | null,
  frontmatter: Record<string, unknown>,
  viewId: string,
  viewMode: string
): MirrorRuntimeDecision {
  if (!file) {
    return { config: null, engine: 'none', requestedPosition: null, resolvedPosition: null, fallbackApplied: false, reason: 'no file' };
  }

  const config = getApplicableConfig(plugin, file, frontmatter, viewId, viewMode);

  if (!config) {
    return { config: null, engine: 'none', requestedPosition: null, resolvedPosition: null, fallbackApplied: false, reason: 'no matching mirror' };
  }

  const requestedPosition = config.position;
  const requestedEngine = resolveEngine(requestedPosition, viewMode);

  // Check position override (set by domPositionManager when DOM fallback → CM6)
  const overrideKey = `${viewId}:${file.path}`;
  const override = plugin.positionOverrides.get(overrideKey);

  if (override) {
    const resolvedEngine = resolveEngine(override, viewMode);
    const reason = `fallback: ${requestedPosition} (${requestedEngine}) → ${override} (${resolvedEngine})`;
    traceMirrorDecision({
      file: file.path, viewId, event: 'runtime-decision',
      mirror: config.templatePath.split('/').pop() ?? config.templatePath,
      position: { requested: requestedPosition, actual: override },
      engine: resolvedEngine, reason,
    });
    return {
      config, engine: resolvedEngine, requestedPosition,
      resolvedPosition: override, fallbackApplied: true, reason,
    };
  }

  const reason = `direct: ${requestedPosition} (${requestedEngine})`;
  traceMirrorDecision({
    file: file.path, viewId, event: 'runtime-decision',
    mirror: config.templatePath.split('/').pop() ?? config.templatePath,
    position: { requested: requestedPosition },
    engine: requestedEngine, reason,
  });
  return {
    config, engine: requestedEngine, requestedPosition,
    resolvedPosition: requestedPosition, fallbackApplied: false, reason,
  };
}
