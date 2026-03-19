// Tipos e interfaces usados no Mirror Notes

export type MirrorPosition =
  | 'top'             // CM6 Decoration.widget side:0 (inside editor)
  | 'bottom'          // CM6 Decoration.widget side:1 (inside editor)
  | 'above-title'     // DOM insertBefore(.inline-title)
  | 'above-properties'// DOM insertBefore(.metadata-container)
  | 'below-properties'// DOM insertAfter(.metadata-container)
  | 'above-backlinks' // DOM insertBefore(.embedded-backlinks)
  | 'below-backlinks' // DOM insertAfter(.embedded-backlinks), CM6 bottom fallback
  | 'left'            // CM6 ViewPlugin (margin panel)
  | 'right';          // CM6 ViewPlugin (margin panel)

/** Positions that use DOM injection (outside CM6 editor) */
export const DOM_POSITIONS: MirrorPosition[] = [
  'above-title', 'above-properties', 'below-properties',
  'above-backlinks', 'below-backlinks'
];

/** Positions that use CM6 Decoration.widget */
export const CM6_POSITIONS: MirrorPosition[] = ['top', 'bottom'];

/** Positions that use CM6 ViewPlugin (margin panels) */
export const MARGIN_POSITIONS: MirrorPosition[] = ['left', 'right'];

export interface ApplicableMirrorConfig {
  templatePath: string;
  position: MirrorPosition;
  hideProps: boolean;
  showContainer: boolean;
  viewOverrides: import('../settings/types').ViewOverrides;
}

export interface MirrorState {
  enabled: boolean;
  config: ApplicableMirrorConfig | null;
  frontmatter: Record<string, unknown>;
  widgetId: string;
  filePath: string; // Path do arquivo que contém este editor (não depende de getActiveFile)
  lastDocText?: string;
  frontmatterHash?: string; // Hash do frontmatter para detectar mudanças reais
  lastContentHash?: string; // Hash do conteúdo do template para evitar re-renderização
}

export interface MirrorFieldState {
  mirrorState: MirrorState;
  decorations: import("@codemirror/view").DecorationSet;
}

/** Build CSS class string for mirror containers (shared between CM6 widget and DOM injection) */
export function buildContainerClasses(position: MirrorPosition, showContainer: boolean): string {
  const classes = ['mirror-ui-widget', `mirror-position-${position}`];
  if (showContainer) classes.push('mirror-container-styled');
  return classes.join(' ');
}