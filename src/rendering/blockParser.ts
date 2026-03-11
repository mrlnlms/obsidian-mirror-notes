export interface MirrorBlockConfig {
  templatePath: string;
  sourcePath?: string;
  inlineVars: Record<string, string>;
}


export function parseBlockContent(content: string): MirrorBlockConfig | { error: string } {
  const lines = content.trim().split('\n').filter(l => l.trim().length > 0);

  if (lines.length === 0) {
    return { error: 'Empty mirror block. Add at least: template: path/to/template.md' };
  }

  let templatePath: string | undefined;
  let sourcePath: string | undefined;
  const inlineVars: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return { error: `Invalid syntax: "${line.trim()}". Expected "key: value"` };
    }

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (!key) {
      return { error: `Missing key in line: "${line.trim()}"` };
    }

    if (key === 'template') {
      templatePath = value;
    } else if (key === 'source') {
      sourcePath = value;
    } else {
      inlineVars[key] = value;
    }
  }

  if (!templatePath) {
    return { error: 'Missing required field: template. Example: template: path/to/template.md' };
  }

  return { templatePath, sourcePath, inlineVars };
}
