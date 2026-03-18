// Utilitários para frontmatter, hash e geração de IDs

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
