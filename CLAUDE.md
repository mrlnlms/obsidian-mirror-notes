# Project Instructions

## Git

- NUNCA adicionar Co-Authored-By em commits. O usuario é o unico autor.
- NUNCA adicionar trailers, signed-off-by, ou qualquer metadata de autoria nos commits.
- Commit messages em ingles, prefixo convencional (docs:, chore:, fix:, feat:).
- Nao fazer push sem o usuario pedir explicitamente.

## Idioma

- Conversa em PT-BR.
- Docs do projeto em PT-BR
- README.md em ingles (public-facing).

## Fluxo de trabalho

1. Desenvolver (codigo, docs, etc)
2. Revisar e atualizar docs (ver regras abaixo)
3. Commit
4. docs/learnings.md — responsabilidade do usuario. Claude NAO edita esse arquivo a menos que o usuario peca explicitamente.
5. Push (so quando o usuario pedir)

## Docs — Regras de atualizacao

Cada doc tem um proposito unico. NAO duplicar informacao entre eles. Na duvida, perguntar: "isso e sobre como funciona HOJE ou sobre o que MUDOU?"

### `docs/architecture.md` — Como funciona hoje
- **Quando atualizar:** quando o codigo muda de forma que altera fluxos, file map, decisoes arquiteturais, ou comportamento do position engine/cache/reactivity
- **O que colocar:** estado ATUAL. Remover informacao que nao reflete mais o codigo
- **O que NAO colocar:** historico, "antes era X agora e Y", detalhes de versao
- **Regra:** se alguem abrir esse arquivo sem contexto, deve entender como o plugin funciona AGORA

### `docs/technical-notes.md` — O que mudou e por que (historico)
- **Quando atualizar:** a cada versao nova, adicionar secao "O que mudou na vXX" no TOPO (abaixo do header)
- **O que colocar:** contexto do problema, causa raiz, o que foi feito e por que, trade-offs, arquivos tocados
- **O que NAO colocar:** arquitetura atual (vai no architecture.md), listas de itens concluidos (vai no changelog)
- **Regra:** header do arquivo deve referenciar architecture.md. Secoes de versao sao append-only (nao editar versoes antigas)

### `docs/CHANGELOG.md` — Historico de versoes (resumido)
- **Quando atualizar:** a cada versao nova, adicionar entrada no TOPO
- **O que colocar:** lista concisa do que mudou (bullet points). Foco no "o que", nao no "por que"
- **O que NAO colocar:** detalhes tecnicos profundos (vai no technical-notes)
- **Regra:** se a versao tem entrada no technical-notes, o changelog e o resumo curto

### `docs/backlog.md` — Trabalho pendente
- **Quando atualizar:** quando descobrir bug/feature novo OU resolver um item existente
- **O que colocar:** item pendente com descricao clara, ou mover item resolvido pra secao "Resolvidos" com versao
- **O que NAO colocar:** itens ja resolvidos na secao pendente, duplicatas de coisas que ja estao no codigo
- **Regra:** antes de adicionar, verificar se o item ja existe. Organizado por tipo (Bugs, Features, Position engine)

### `docs/roadmap.md` — Horizonte de produto (forward-looking)
- **Quando atualizar:** quando prioridades mudam ou versao nova e concluida
- **O que colocar:** o que vem pela frente (proximo, pre-lancamento, should-have, nice-to-have). Versoes concluidas vao na tabela resumo (1 linha por versao)
- **O que NAO colocar:** listas detalhadas de itens concluidos (vai no changelog/technical-notes)
- **Regra:** se a secao "Concluido" tiver mais de 5 linhas detalhadas, ta errado. Usar tabela resumo

### `README.md` — Public-facing (ingles)
- **Quando atualizar:** quando features, known issues, ou arquitetura mudam de forma visivel pro usuario
- **O que colocar:** o que o plugin faz, como usar, como instalar. Apontar pra architecture.md pra detalhes tecnicos
- **O que NAO colocar:** file map completo (ta no architecture.md), bugs internos, historico detalhado

### Arquivos do usuario (NAO mexer)
- `docs/learnings.md` — responsabilidade do usuario (gitignored)
- `docs/notes.md` — notas pessoais do usuario (gitignored)
- `docs/dev-history.md` — referencia interna (gitignored)
- `docs/claudememoryfiles/` — arquivos movidos/arquivados (gitignored)

## Skills Obsidian — Regras de atualizacao

- Padrao novo descoberto → adicionar DIRETAMENTE ao skill relevante (cm6, core, settings, design, development)
- NAO usar learnings.md como intermediario pra skills
- learnings.md e responsabilidade do usuario (registro pessoal)
- Cada pattern tem UMA casa (o skill mais relevante). Nunca duplicar entre skills
- Anti-pattern descoberto → adicionar na secao "Common Pitfalls" do skill relevante
- Revisao periodica: ao fechar uma era (grupo de versoes), verificar se skills tem conteudo obsoleto
