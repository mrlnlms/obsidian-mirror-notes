import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fs to prevent actual file writes
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  statSync: vi.fn(() => ({ size: 0 })),
  appendFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  renameSync: vi.fn(),
}));

// Import after mocking fs
import { Logger } from '../src/logger';

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
    Logger.init('/fake/vault');
    Logger.setEnabled(false);
  });

  afterEach(() => {
    Logger.destroy();
    vi.restoreAllMocks();
  });

  describe('early return when disabled', () => {
    it('log() does not call console.log when disabled', () => {
      Logger.log('test message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('warn() does not call console.warn when disabled', () => {
      Logger.warn('test warning');
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it('error() ALWAYS calls console.error even when disabled', () => {
      Logger.error('test error');
      expect(consoleSpy.error).toHaveBeenCalledWith('[MirrorNotes]', 'test error');
    });
  });

  describe('when enabled', () => {
    beforeEach(() => {
      Logger.setEnabled(true);
    });

    it('log() calls console.log', () => {
      Logger.log('hello', 'world');
      expect(consoleSpy.log).toHaveBeenCalledWith('[MirrorNotes]', 'hello', 'world');
    });

    it('warn() calls console.warn', () => {
      Logger.warn('careful');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[MirrorNotes]', 'careful');
    });

    it('error() calls console.error', () => {
      Logger.error('boom');
      expect(consoleSpy.error).toHaveBeenCalledWith('[MirrorNotes]', 'boom');
    });
  });

  describe('enabled property', () => {
    it('returns false by default', () => {
      expect(Logger.enabled).toBe(false);
    });

    it('returns true after setEnabled(true)', () => {
      Logger.setEnabled(true);
      expect(Logger.enabled).toBe(true);
    });

    it('returns false after setEnabled(false)', () => {
      Logger.setEnabled(true);
      Logger.setEnabled(false);
      expect(Logger.enabled).toBe(false);
    });
  });
});
