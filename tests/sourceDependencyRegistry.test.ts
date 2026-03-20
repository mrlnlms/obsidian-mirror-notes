import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SourceDependencyRegistry } from '../src/rendering/sourceDependencyRegistry';

describe('SourceDependencyRegistry', () => {
  let registry: SourceDependencyRegistry;

  beforeEach(() => {
    registry = new SourceDependencyRegistry();
  });

  describe('register', () => {
    it('registers a source dependency with callback', () => {
      registry.register('source.md', 'view.md', 'block-1', vi.fn());
      expect(registry.getDependentCallbacks('source.md')).toHaveLength(1);
    });

    it('registers multiple blocks for the same source', () => {
      registry.register('source.md', 'view-a.md', 'block-1', vi.fn());
      registry.register('source.md', 'view-b.md', 'block-2', vi.fn());
      expect(registry.getDependentCallbacks('source.md')).toHaveLength(2);
    });

    it('registers blocks for different sources', () => {
      registry.register('source-a.md', 'view.md', 'block-1', vi.fn());
      registry.register('source-b.md', 'view.md', 'block-2', vi.fn());
      expect(registry.getDependentCallbacks('source-a.md')).toHaveLength(1);
      expect(registry.getDependentCallbacks('source-b.md')).toHaveLength(1);
    });

    it('overwrites callback when same blockKey is registered again', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      registry.register('source.md', 'view.md', 'block-1', cb1);
      registry.register('source.md', 'view.md', 'block-1', cb2);

      const callbacks = registry.getDependentCallbacks('source.md');
      expect(callbacks).toHaveLength(1);
      callbacks[0]();
      expect(cb2).toHaveBeenCalled();
    });

    it('cleans up old source when blockKey moves to new source', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      // Block starts with source-a
      registry.register('source-a.md', 'view.md', 'block-1', cb1);
      expect(registry.getDependentCallbacks('source-a.md')).toHaveLength(1);

      // Block changes to source-b (same blockKey, different source)
      registry.register('source-b.md', 'view.md', 'block-1', cb2);

      // Old source should be clean
      expect(registry.getDependentCallbacks('source-a.md')).toHaveLength(0);
      // New source has the block
      expect(registry.getDependentCallbacks('source-b.md')).toHaveLength(1);
      registry.getDependentCallbacks('source-b.md')[0]();
      expect(cb2).toHaveBeenCalled();
    });
  });

  describe('unregisterBlock', () => {
    it('removes block from registry', () => {
      registry.register('source.md', 'view.md', 'block-1', vi.fn());
      registry.unregisterBlock('block-1');
      expect(registry.getDependentCallbacks('source.md')).toHaveLength(0);
    });

    it('removes only the specified block', () => {
      registry.register('source.md', 'view-a.md', 'block-1', vi.fn());
      registry.register('source.md', 'view-b.md', 'block-2', vi.fn());
      registry.unregisterBlock('block-1');
      expect(registry.getDependentCallbacks('source.md')).toHaveLength(1);
    });

    it('is safe to call with non-existent blockKey', () => {
      registry.unregisterBlock('non-existent');
    });

    it('cleans up empty source entry after last block removed', () => {
      registry.register('source.md', 'view.md', 'block-1', vi.fn());
      registry.unregisterBlock('block-1');
      expect(registry.getDependentCallbacks('source.md')).toEqual([]);
    });
  });

  describe('getDependentCallbacks', () => {
    it('returns empty array for unknown source', () => {
      expect(registry.getDependentCallbacks('unknown.md')).toEqual([]);
    });

    it('returns callable callbacks', async () => {
      const cb = vi.fn().mockResolvedValue(undefined);
      registry.register('source.md', 'view.md', 'block-1', cb);

      const callbacks = registry.getDependentCallbacks('source.md');
      await callbacks[0]();
      expect(cb).toHaveBeenCalledOnce();
    });
  });

  describe('callback error isolation', () => {
    it('rejecting callback does not prevent other callbacks from being retrieved', () => {
      const cbBad = vi.fn().mockRejectedValue(new Error('render failed'));
      const cbGood = vi.fn().mockResolvedValue(undefined);
      registry.register('source.md', 'view-a.md', 'block-1', cbBad);
      registry.register('source.md', 'view-b.md', 'block-2', cbGood);

      const callbacks = registry.getDependentCallbacks('source.md');
      expect(callbacks).toHaveLength(2);

      // Simulate the dispatch pattern from main.ts: Promise.resolve(cb()).catch(...)
      const results: Promise<void>[] = [];
      for (const cb of callbacks) {
        results.push(Promise.resolve(cb()).catch(() => { /* isolated */ }));
      }

      // Both callbacks were called — the rejection of one doesn't block the other
      expect(cbBad).toHaveBeenCalledTimes(1);
      expect(cbGood).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('removes all registrations', () => {
      registry.register('source-a.md', 'view.md', 'block-1', vi.fn());
      registry.register('source-b.md', 'view.md', 'block-2', vi.fn());
      registry.clear();
      expect(registry.getDependentCallbacks('source-a.md')).toHaveLength(0);
      expect(registry.getDependentCallbacks('source-b.md')).toHaveLength(0);
    });
  });
});
