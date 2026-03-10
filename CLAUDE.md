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
2. Revisar e atualizar docs (changelog, technical-notes, backlog, roadmap)
3. Commit
4. docs/learnings.md — responsabilidade do usuario. Claude NAO edita esse arquivo a menos que o usuario peca explicitamente.
5. Push (so quando o usuario pedir)

## Docs — Manter atualizados

A cada sessao de trabalho, revisar e atualizar os docs conforme o que foi feito:

- `docs/CHANGELOG.md` — adicionar entrada pra cada versao nova
- `docs/technical-notes.md` — atualizar arquitetura, fluxo, bugs, "o que mudou na vXX"
- `docs/backlog.md` — adicionar itens novos descobertos, marcar resolvidos
- `docs/roadmap.md` — ajustar prioridades conforme progresso
- `docs/learnings.md` — atualizar apos commit, antes do push. Registrar aprendizados tecnicos da sessao (gitignored)
- `docs/notes.md` — NAO mexer, e do usuario (gitignored)
- `docs/dev-history.md` — referencia interna, atualizar se relevante (gitignored)
