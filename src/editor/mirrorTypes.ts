// Tipos e interfaces usados no Mirror Notes

export interface ApplicableMirrorConfig {
  templatePath: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  hideProps: boolean;
}

export interface MirrorState {
  enabled: boolean;
  config: ApplicableMirrorConfig | null;
  frontmatter: any;
  widgetId: string;
  lastDocText?: string;
  frontmatterHash?: string; // Hash do frontmatter para detectar mudanças reais
  lastContentHash?: string; // Hash do conteúdo do template para evitar re-renderização
}

export interface MirrorFieldState {
  mirrorState: MirrorState;
  decorations: import("@codemirror/view").DecorationSet;
} 