import * as fs from 'fs';
import * as path from 'path';

type LogLevel = 'LOG' | 'WARN' | 'ERR';

class MirrorLogger {
  private logFilePath: string | null = null;
  private _enabled = false;
  private buffer: string[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private maxFileSize = 512 * 1024; // 512KB max — auto-rotate

  get enabled(): boolean {
    return this._enabled;
  }

  /** Called once from plugin onload() */
  init(vaultPath: string) {
    if (!__DEV__) return;
    this.logFilePath = path.join(
      vaultPath,
      '.obsidian', 'plugins', 'obsidian-mirror-notes', 'src', 'dev', 'debug.log'
    );
  }

  /** Toggle from settings */
  setEnabled(value: boolean) {
    if (!__DEV__) return;
    this._enabled = value;
    if (value) {
      this.write('LOG', '--- Debug logging enabled ---');
    } else {
      this.flush();
    }
  }

  log(...args: any[]) {
    if (!__DEV__ || !this._enabled) return;
    console.log('[MirrorNotes]', ...args);
    this.write('LOG', args);
  }

  warn(...args: any[]) {
    if (!__DEV__ || !this._enabled) return;
    console.warn('[MirrorNotes]', ...args);
    this.write('WARN', args);
  }

  error(...args: any[]) {
    console.error('[MirrorNotes]', ...args);
    if (!__DEV__) return;
    if (this._enabled) this.write('ERR', args);
  }

  /** Force flush and clean up — call from plugin onunload() */
  destroy() {
    if (!__DEV__) return;
    this.flush();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // --- internals ---

  private write(level: LogLevel, args: any) {
    if (!this.logFilePath) return;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const msg = Array.isArray(args) ? this.serialize(args) : String(args);
    this.buffer.push(`[${timestamp}] [${level}] ${msg}`);
    this.scheduleFlush();
  }

  private serialize(args: any[]): string {
    return args.map(a => {
      if (a === undefined) return 'undefined';
      if (a === null) return 'null';
      if (a instanceof Error) return `${a.message}\n${a.stack}`;
      if (typeof a === 'object') {
        try { return JSON.stringify(a); }
        catch { return String(a); }
      }
      return String(a);
    }).join(' ');
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flush();
      this.flushTimer = null;
    }, 200);
  }

  private flush() {
    if (!this.logFilePath || this.buffer.length === 0) return;
    try {
      // Auto-rotate if file too large
      if (fs.existsSync(this.logFilePath)) {
        const stat = fs.statSync(this.logFilePath);
        if (stat.size > this.maxFileSize) {
          const rotated = this.logFilePath + '.old';
          if (fs.existsSync(rotated)) fs.unlinkSync(rotated);
          fs.renameSync(this.logFilePath, rotated);
        }
      }
      fs.appendFileSync(this.logFilePath, this.buffer.join('\n') + '\n');
    } catch {
      // silently fail — we're a logger, can't log our own errors
    }
    this.buffer = [];
  }
}

/** Singleton — import and use everywhere */
export const Logger = new MirrorLogger();
