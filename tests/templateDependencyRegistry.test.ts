import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateDependencyRegistry } from '../src/rendering/templateDependencyRegistry';

describe('TemplateDependencyRegistry', () => {
  let registry: TemplateDependencyRegistry;

  beforeEach(() => {
    registry = new TemplateDependencyRegistry();
  });

  describe('register', () => {
    it('registers a template dependency with callback', () => {
      const cb = vi.fn();
      registry.register('templates/header.md', 'block-1', cb);
      const callbacks = registry.getDependentCallbacks('templates/header.md');
      expect(callbacks).toHaveLength(1);
    });

    it('registers multiple blocks for the same template', () => {
      registry.register('templates/header.md', 'block-1', vi.fn());
      registry.register('templates/header.md', 'block-2', vi.fn());
      const callbacks = registry.getDependentCallbacks('templates/header.md');
      expect(callbacks).toHaveLength(2);
    });

    it('registers blocks for different templates', () => {
      registry.register('templates/header.md', 'block-1', vi.fn());
      registry.register('templates/footer.md', 'block-2', vi.fn());
      expect(registry.getDependentCallbacks('templates/header.md')).toHaveLength(1);
      expect(registry.getDependentCallbacks('templates/footer.md')).toHaveLength(1);
    });

    it('auto-unregisters previous registration for same blockKey', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      registry.register('templates/header.md', 'block-1', cb1);
      registry.register('templates/header.md', 'block-1', cb2);

      const callbacks = registry.getDependentCallbacks('templates/header.md');
      expect(callbacks).toHaveLength(1);
      // Should be the NEW callback
      callbacks[0]();
      expect(cb2).toHaveBeenCalled();
      expect(cb1).not.toHaveBeenCalled();
    });

    it('auto-unregisters from old template when blockKey re-registers to new template', () => {
      registry.register('templates/old.md', 'block-1', vi.fn());
      registry.register('templates/new.md', 'block-1', vi.fn());

      expect(registry.getDependentCallbacks('templates/old.md')).toHaveLength(0);
      expect(registry.getDependentCallbacks('templates/new.md')).toHaveLength(1);
    });

    it('cleans up empty template entry after re-registration moves last block', () => {
      registry.register('templates/old.md', 'block-1', vi.fn());
      registry.register('templates/new.md', 'block-1', vi.fn());

      // old.md should have no deps left — empty Set should be deleted
      expect(registry.getDependentCallbacks('templates/old.md')).toHaveLength(0);
    });
  });

  describe('unregisterBlock', () => {
    it('removes block from registry', () => {
      registry.register('templates/header.md', 'block-1', vi.fn());
      registry.unregisterBlock('block-1');
      expect(registry.getDependentCallbacks('templates/header.md')).toHaveLength(0);
    });

    it('removes only the specified block, others stay', () => {
      registry.register('templates/header.md', 'block-1', vi.fn());
      registry.register('templates/header.md', 'block-2', vi.fn());
      registry.unregisterBlock('block-1');
      expect(registry.getDependentCallbacks('templates/header.md')).toHaveLength(1);
    });

    it('is safe to call with non-existent blockKey', () => {
      registry.unregisterBlock('non-existent');
      // no error
    });

    it('cleans up empty template entry after last block is removed', () => {
      registry.register('templates/header.md', 'block-1', vi.fn());
      registry.unregisterBlock('block-1');
      // Internal state clean — getDependentCallbacks returns empty
      expect(registry.getDependentCallbacks('templates/header.md')).toHaveLength(0);
    });
  });

  describe('getDependentCallbacks', () => {
    it('returns empty array for unknown template', () => {
      expect(registry.getDependentCallbacks('nonexistent.md')).toEqual([]);
    });

    it('returns callable callbacks', async () => {
      const cb = vi.fn().mockResolvedValue(undefined);
      registry.register('templates/header.md', 'block-1', cb);

      const callbacks = registry.getDependentCallbacks('templates/header.md');
      await callbacks[0]();
      expect(cb).toHaveBeenCalledOnce();
    });

    it('returns only callbacks for blocks with active registrations', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      registry.register('templates/header.md', 'block-1', cb1);
      registry.register('templates/header.md', 'block-2', cb2);
      registry.unregisterBlock('block-1');

      const callbacks = registry.getDependentCallbacks('templates/header.md');
      expect(callbacks).toHaveLength(1);
      callbacks[0]();
      expect(cb2).toHaveBeenCalled();
      expect(cb1).not.toHaveBeenCalled();
    });
  });

  describe('unregisterTemplate', () => {
    it('removes all blocks depending on a template path', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const cb3 = vi.fn();
      registry.register('templates/header.md', 'block-1', cb1);
      registry.register('templates/header.md', 'block-2', cb2);
      registry.register('templates/footer.md', 'block-3', cb3);

      registry.unregisterTemplate('templates/header.md');

      expect(registry.getDependentCallbacks('templates/header.md')).toHaveLength(0);
      // Other templates unaffected
      expect(registry.getDependentCallbacks('templates/footer.md')).toHaveLength(1);
    });

    it('is no-op for unknown template path', () => {
      registry.register('templates/header.md', 'block-1', vi.fn());
      registry.unregisterTemplate('nonexistent.md');
      expect(registry.getDependentCallbacks('templates/header.md')).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('removes all registrations', () => {
      registry.register('templates/header.md', 'block-1', vi.fn());
      registry.register('templates/footer.md', 'block-2', vi.fn());
      registry.clear();
      expect(registry.getDependentCallbacks('templates/header.md')).toHaveLength(0);
      expect(registry.getDependentCallbacks('templates/footer.md')).toHaveLength(0);
    });
  });
});
