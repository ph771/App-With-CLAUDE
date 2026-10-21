# Ferramentas externas disponíveis

O usuário é leigo em programação e não vai lembrar de pedir estas ferramentas pelo nome.
Sempre que um pedido se encaixar em uma delas, use-a por conta própria e diga em uma
linha qual foi usada e por quê.

Os repositórios são clonados e instalados automaticamente no início de cada sessão na
nuvem pelo script `.claude/hooks/session-start.sh`. Eles ficam ao lado deste projeto, em
`../<owner>/<repo>` (por exemplo, `/home/user/obra/superpowers`). Antes de usar uma
ferramenta pela primeira vez na sessão, leia o `README.md` dela para ver os comandos.

| Quando o pedido for sobre... | Use | Caminho |
|---|---|---|
| Gmail, Google Drive, Agenda, Planilhas, Documentos ou qualquer serviço do Google Workspace | **gws** (Google Workspace CLI) | `../googleworkspace/cli` |
| SEO: palavras-chave, posição no Google, concorrentes, backlinks, auditoria de site | **OpenSEO** | `../every-app/open-seo` |
| Entender como um programa, aplicativo ou arquivo binário funciona por dentro (engenharia reversa) | **REA** | `../morluto/rea` |
| Escrever ou planejar código, criar um app ou uma funcionalidade nova | **Superpowers** | `../obra/superpowers` |
| Abrir sites, clicar, preencher formulários, testar páginas ou automatizar tarefas no navegador | **Playwright CLI** | `../microsoft/playwright-cli` |
| Criar ou editar vídeos, animações ou vídeos a partir de HTML | **HyperFrames** | `../heygen-com/hyperframes` |

## Observações

- **Superpowers**: é um conjunto de skills de método de trabalho (em `skills/`). Para
  qualquer tarefa de programação, siga as skills relevantes dele: entender o que o usuário
  quer antes de codar, mostrar o plano em partes curtas e testar o resultado.
- **gws** e **OpenSEO** precisam de credenciais (conta Google; chave da DataForSEO). Se
  faltarem, explique ao usuário em linguagem simples o que ele precisa providenciar.
- **REA** é para análise de software. Use apenas em programas que o usuário tem
  permissão para analisar.
- Se um repositório não estiver na pasta esperada, o script de início falhou para ele:
  avise o usuário em vez de seguir sem a ferramenta.
