/**
 * Registry centralizado de dependencias cross-note para mirror blocks com `source:`.
 * Rastreia: "sourcePath X e dependencia de viewPath Y".
 * Guarda callbacks de re-render pra atualizar blocos diretamente (funciona em Live Preview + Reading View).
 */
export class SourceDependencyRegistry {
  private deps = new Map<string, Set<string>>();
  private callbacks = new Map<string, () => Promise<void>>();

  /** Registra dependencia + callback de re-render. blockKey deve ser unico por bloco. */
  register(sourcePath: string, viewPath: string, blockKey: string, rerender: () => Promise<void>): void {
    // Limpar registro anterior com mesmo blockKey (source pode ter mudado)
    this.unregisterBlock(blockKey);

    let set = this.deps.get(sourcePath);
    if (!set) {
      set = new Set();
      this.deps.set(sourcePath, set);
    }
    set.add(blockKey);
    this.callbacks.set(blockKey, rerender);
  }

  /** Remove um bloco especifico do registry */
  unregisterBlock(blockKey: string): void {
    this.callbacks.delete(blockKey);
    for (const [source, set] of this.deps) {
      set.delete(blockKey);
      if (set.size === 0) {
        this.deps.delete(source);
      }
    }
  }

  /** Retorna callbacks de re-render para blocos que dependem de sourcePath */
  getDependentCallbacks(sourcePath: string): (() => Promise<void>)[] {
    const set = this.deps.get(sourcePath);
    if (!set) return [];
    const result: (() => Promise<void>)[] = [];
    for (const key of set) {
      const cb = this.callbacks.get(key);
      if (cb) result.push(cb);
    }
    return result;
  }

  clear(): void {
    this.deps.clear();
    this.callbacks.clear();
  }
}
