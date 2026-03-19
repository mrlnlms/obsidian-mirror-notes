import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/dev/logger', () => ({
  Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../src/rendering/templateRenderer', () => ({
  renderMirrorTemplate: vi.fn(),
}));

import { MirrorTemplateWidget } from '../src/editor/mirrorWidget';
import type { ApplicableMirrorConfig, MirrorState } from '../src/editor/mirrorTypes';

function makeConfig(overrides?: Partial<ApplicableMirrorConfig>): ApplicableMirrorConfig {
  return {
    templatePath: 'templates/default.md',
    position: 'top',
    hideProps: false,
    showContainer: false,
    viewOverrides: { hideProps: false, readableLineLength: null, showInlineTitle: null },
    ...overrides,
  };
}

function makeState(overrides?: Partial<MirrorState>): MirrorState {
  return {
    enabled: true,
    config: null,
    frontmatter: { title: 'Test' },
    widgetId: 'w-123',
    filePath: 'notes/test.md',
    ...overrides,
  };
}

const fakePlugin = {} as any;

function createWidget(overrides?: {
  config?: Partial<ApplicableMirrorConfig>;
  state?: Partial<MirrorState>;
  widgetId?: string;
  frontmatterHash?: string;
}) {
  const config = makeConfig(overrides?.config);
  const state = makeState(overrides?.state);
  return new MirrorTemplateWidget(
    fakePlugin,
    state,
    config,
    overrides?.widgetId ?? 'w-123',
    overrides?.frontmatterHash ?? 'hash-abc',
  );
}

describe('MirrorTemplateWidget', () => {
  beforeEach(() => {
    MirrorTemplateWidget.domCache.clear();
    MirrorTemplateWidget.widgetInstanceCache.clear();
  });

  describe('getCacheKey', () => {
    it('combines widgetId and position', () => {
      const widget = createWidget();
      expect(widget.getCacheKey()).toBe('w-123-top');
    });

    it('changes when position changes', () => {
      const widgetTop = createWidget({ config: { position: 'top' } });
      const widgetBottom = createWidget({ config: { position: 'bottom' } });
      expect(widgetTop.getCacheKey()).not.toBe(widgetBottom.getCacheKey());
    });
  });

  describe('eq', () => {
    it('returns true for identical widgets', () => {
      const a = createWidget();
      const b = createWidget();
      expect(a.eq(b)).toBe(true);
    });

    it('returns false when widgetId differs', () => {
      const a = createWidget({ widgetId: 'w-1' });
      const b = createWidget({ widgetId: 'w-2' });
      expect(a.eq(b)).toBe(false);
    });

    it('returns false when templatePath differs', () => {
      const a = createWidget({ config: { templatePath: 'a.md' } });
      const b = createWidget({ config: { templatePath: 'b.md' } });
      expect(a.eq(b)).toBe(false);
    });

    it('returns false when position differs', () => {
      const a = createWidget({ config: { position: 'top' } });
      const b = createWidget({ config: { position: 'bottom' } });
      expect(a.eq(b)).toBe(false);
    });

    it('returns false when showContainer differs', () => {
      const a = createWidget({ config: { showContainer: false } });
      const b = createWidget({ config: { showContainer: true } });
      expect(a.eq(b)).toBe(false);
    });

    it('returns false when frontmatterHash differs', () => {
      const a = createWidget({ frontmatterHash: 'hash-1' });
      const b = createWidget({ frontmatterHash: 'hash-2' });
      expect(a.eq(b)).toBe(false);
    });

    it('returns false when compared to non-MirrorTemplateWidget object', () => {
      const a = createWidget();
      const fakeWidget = { toDOM: () => document.createElement('div') } as any;
      expect(a.eq(fakeWidget)).toBe(false);
    });
  });

  describe('toDOM', () => {
    const fakeView = {} as any;

    it('creates container with correct attributes', () => {
      const widget = createWidget();
      const el = widget.toDOM(fakeView);
      expect(el.getAttribute('data-widget-id')).toBe('w-123');
      expect(el.getAttribute('data-position')).toBe('top');
      expect(el.getAttribute('contenteditable')).toBe('false');
    });

    it('sets mirror-ui-widget and mirror-position-{pos} classes without mirror-container-styled when false', () => {
      const widget = createWidget({ config: { showContainer: false } });
      const el = widget.toDOM(fakeView);
      expect(el.classList.contains('mirror-ui-widget')).toBe(true);
      expect(el.classList.contains('mirror-position-top')).toBe(true);
      expect(el.classList.contains('mirror-container-styled')).toBe(false);
    });

    it('adds mirror-container-styled when showContainer is true', () => {
      const widget = createWidget({ config: { showContainer: true } });
      const el = widget.toDOM(fakeView);
      expect(el.classList.contains('mirror-container-styled')).toBe(true);
    });

    it('reuses container from domCache for same cacheKey', () => {
      const widget1 = createWidget();
      const widget2 = createWidget();
      const el1 = widget1.toDOM(fakeView);
      const el2 = widget2.toDOM(fakeView);
      expect(el1).toBe(el2);
    });

    it('shows "Loading template..." on first render', () => {
      const widget = createWidget();
      const el = widget.toDOM(fakeView);
      expect(el.innerHTML).toContain('Loading template...');
    });
  });
});
