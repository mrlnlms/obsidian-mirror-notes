// Utilitários para frontmatter, hash e geração de IDs

export function parseFrontmatter(content: string): any {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  try {
    const yaml = match[1];
    const result: any = {};
    yaml.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (key && value) {
          result[key] = value.replace(/^[\"']|[\"']$/g, '');
        }
      }
    });
    return result;
  } catch (e) {
    return {};
  }
}

export function hashObject(obj: any): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
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