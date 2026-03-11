import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { mirrorStateField, widgetRecoveryEffect } from "./mirrorState";
import { Logger } from "../logger";

const RECOVERY_COOLDOWN = 500;
const MAX_CONSECUTIVE_RECOVERIES = 5;

export const mirrorRecoveryPlugin = ViewPlugin.fromClass(class {
  private lastRecoveryTime = 0;
  private recoveryPending = false;
  private consecutiveRecoveries = 0;

  update(update: ViewUpdate) {
    if (!update.docChanged && !update.geometryChanged) return;

    const fieldState = update.view.state.field(mirrorStateField, false);
    if (!fieldState) return;

    const { mirrorState } = fieldState;

    if (!mirrorState.enabled || !mirrorState.config) {
      this.consecutiveRecoveries = 0;
      return;
    }

    const widgetEl = update.view.dom.querySelector(
      `.mirror-ui-widget[data-widget-id="${mirrorState.widgetId}"]`
    );

    if (widgetEl) {
      this.consecutiveRecoveries = 0;
      return;
    }

    const now = Date.now();
    if (now - this.lastRecoveryTime < RECOVERY_COOLDOWN) return;
    if (this.recoveryPending) return;
    if (this.consecutiveRecoveries >= MAX_CONSECUTIVE_RECOVERIES) {
      Logger.error(`Widget recovery failed ${MAX_CONSECUTIVE_RECOVERIES}x, stopping`);
      return;
    }

    this.recoveryPending = true;
    this.lastRecoveryTime = now;
    this.consecutiveRecoveries++;

    Logger.warn(`Widget DOM missing (attempt ${this.consecutiveRecoveries}), triggering recovery`);

    requestAnimationFrame(() => {
      this.recoveryPending = false;
      try {
        update.view.dispatch({
          effects: widgetRecoveryEffect.of()
        });
      } catch (e) {
        Logger.error('Recovery dispatch failed:', e);
      }
    });
  }

  destroy() {}
});
