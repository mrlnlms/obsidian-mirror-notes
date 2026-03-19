/**
 * Registry de dependencias por template path.
 * Rastreia: "templatePath X e usado por bloco/mirror Y".
 * Quando o template muda, callbacks de re-render sao invocados.
 */
export class TemplateDependencyRegistry {
  private deps = new Map<string, Set<string>>();
  private callbacks = new Map<string, () => Promise<void>>();

  /** Registra dependencia de template + callback de re-render. blockKey deve ser unico. */
  register(templatePath: string, blockKey: string, rerender: () => Promise<void>): void {
    // Limpar registro anterior com mesmo blockKey (setupDomPosition pode rodar multiplas vezes)
    this.unregisterBlock(blockKey);

    let set = this.deps.get(templatePath);
    if (!set) {
      set = new Set();
      this.deps.set(templatePath, set);
    }
    set.add(blockKey);
    this.callbacks.set(blockKey, rerender);
  }

  /** Remove todos os blocos cujo blockKey comeca com o prefixo (ex: "dom-v0-") */
  unregisterByPrefix(prefix: string): void {
    const keysToRemove: string[] = [];
    for (const key of this.callbacks.keys()) {
      if (key.startsWith(prefix)) keysToRemove.push(key);
    }
    for (const key of keysToRemove) {
      this.unregisterBlock(key);
    }
  }

  /** Remove um bloco especifico do registry */
  unregisterBlock(blockKey: string): void {
    this.callbacks.delete(blockKey);
    for (const [template, set] of this.deps) {
      set.delete(blockKey);
      if (set.size === 0) {
        this.deps.delete(template);
      }
    }
  }

  /** Remove todos os blocos que dependem de templatePath.
   *  Call on template rename/delete to prevent stale callbacks from accumulating. */
  unregisterTemplate(templatePath: string): void {
    const set = this.deps.get(templatePath);
    if (!set) return;
    for (const key of set) {
      this.callbacks.delete(key);
    }
    this.deps.delete(templatePath);
  }

  /** Retorna callbacks de re-render para blocos que dependem de templatePath */
  getDependentCallbacks(templatePath: string): (() => Promise<void>)[] {
    const set = this.deps.get(templatePath);
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
