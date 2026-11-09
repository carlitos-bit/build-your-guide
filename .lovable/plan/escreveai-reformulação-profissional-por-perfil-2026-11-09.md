# EscreveAI — reformulação profissional por perfil

## Objetivo e preservação
Transformar o aplicativo conforme a referência descrita da Estuda.com, preservando dados e funções existentes, correção com IA, avatar personalizável, CASH, XP, TROFÉUS e **“Escreva. Evolua. Conquiste. Resgate.”**. Nenhuma tela ou regra do aplicativo será alterada antes da aprovação deste plano.

Professores continuarão editando e revisando tudo **das próprias turmas**. Administradores terão gestão global independente do professor. A separação será aplicada também nos dados e nas operações, não apenas nos menus.

## 1. Inventário confirmado
Levantamento do código atual e das permissões vigentes no banco; não é uma nova rodada de testes de funcionamento.

| Área / endereço atual | O que existe hoje |
|---|---|
| Início `/` e acesso `/auth` | Apresentação, entrada, cadastro, recuperação de senha e entrada com Google. |
| Aluno `/painel` | Indicadores, histórico de redações com data e competências, evolução, gamificação e eventos próximos. |
| Envio `/nova-redacao` | Temas cadastrados ou livres, editor textual com rascunho e contagem de linhas; simulado de 90 minutos com modo foco, pausa e retomada. |
| Histórico `/redacoes` | Lista de envios com data, tipo, nota liberada ou indicação de revisão. |
| Resultado `/redacao/:id` | Nota e análise C1–C5, pontos fortes, melhorias, trechos comentados e comentário do professor. Trechos ficam separados do texto, sem marcações interativas por competência. |
| Perfil `/perfil` | Avatar editável, nível, XP, CASH e troféus; resgate de prêmios em breve. |
| Eventos `/eventos` | Consulta de simulados/eventos e bônus; não há gestão completa de atividades com todos os campos solicitados. |
| Biblioteca `/biblioteca` | Materiais por links, busca/publicação; administração pode remover materiais e alterar a opção de publicação por alunos. |
| Professor `/professor` | Fila de revisão, ajuste C1–C5, comentário, salvar/liberar, médias por competência e progresso individual. Ainda não há editor do texto marcado, filtros completos ou gestão de turmas/atividades. |
| Administração `/admin` | Indicadores, usuários, papéis e configurações da biblioteca. Não reúne ainda toda a administração escolar solicitada. |

**Integrações e recursos ausentes ou incompletos**
- Existe a estrutura de turmas e vínculo de aluno no banco, mas faltam gestão completa, matrícula em múltiplas turmas e isolamento por escola/professor.
- O código oferece Gemini como principal quando configurado e alternativa de IA se indisponível. O provedor efetivamente usado não foi confirmado nesta análise; preservar a integração e validar Gemini nos testes.
- Não encontrei integração atual de arquivos com Google Drive. Entrada com Google não dá acesso ao Drive.
- Faltam upload de proposta PDF, redação por foto/arquivo, anotações editáveis com C1-1/C2-1, histórico de revisões, notificações persistentes, regras de recompensa por atividade e exportação completa.
- Não foram encontrados testes automatizados atuais. Algumas páginas também precisam completar seus metadados individuais.

### Prioridades de segurança encontradas
- O banco já restringe redações ao aluno proprietário e esconde correções não liberadas nas consultas de aluno.
- Porém, a resposta do envio ainda devolve a nota estimada ao aluno; isso será corrigido para cumprir o sigilo até a liberação.
- Professores hoje têm acesso amplo a redações, correções e turmas, sem isolamento pelas próprias turmas.
- Perfis e turmas têm leitura ampla para pessoas autenticadas; isso precisa ser restringido.
- Alunos podem atualmente alterar a própria gamificação e inserir troféus por acesso direto aos dados. Recompensas passarão a ser calculadas e gravadas somente por operações autorizadas.
- As restrições visuais de professor/admin não substituem autorização das operações.

## 2. Telas e endereços propostos
Os endereços atuais continuarão funcionando, com conteúdo reorganizado ou redirecionamento quando necessário.

### Aluno — barra superior azul
Logo, **Atividades · Biblioteca · Evolução · Conquistas**, sino e menu do avatar com perfil/sair.

| Endereço | Tela |
|---|---|
| `/painel` | Boas-vindas com avatar, turma/escola, ilustração, nível, XP, CASH, troféus e Minhas Turmas. |
| `/atividades` | Suas avaliações: pendentes e encerradas, filtros, cores por tipo, prazos, professor, status e ações. |
| `/nova-redacao` | Treino livre existente preservado. |
| `/atividades/:id/enviar` | Tema/modelo, material de apoio PDF, digitação ou arquivo/foto, cronômetro quando aplicável, estatísticas pessoais do tema. |
| `/redacoes` | Histórico pessoal completo. |
| `/redacao/:id` | Envio e situação da correção; após liberação, nota e acesso aos detalhes. |
| `/redacao/:id/correcao` | Texto marcado à esquerda, comentários à direita, notas 0–1000 e 0–10, níveis C1–C5 e reescrita se permitida. |
| `/evolucao` | Evolução pessoal, médias, maior nota e competências. |
| `/conquistas` e `/loja` | Troféus e recompensas; loja inicialmente em breve, conforme permitido no documento. |
| `/biblioteca`, `/eventos`, `/perfil` | Recursos existentes preservados, com visual atualizado e conteúdo autorizado. |

### Professor — menu lateral próprio
`/professor` (painel), `/professor/turmas`, `/professor/turmas/:id`, `/professor/atividades`, `/professor/atividades/:id`, `/professor/correcoes`, `/professor/correcoes/:id`, `/professor/biblioteca`, `/professor/gamificacao`, `/professor/relatorios`, `/professor/configuracoes`.

- Turmas/alunos, importação de planilhas, desempenho individual e acompanhamento de entregas.
- Atividades Treino/Redação/Simulado: tema, modelo, PDF, turmas, início/fim, tempo, limite de envios, reescrita e recompensas.
- Fila filtrável, leitura do texto e rascunho da IA, marcações/comentários editáveis, níveis C1–C5, revisão, liberação e operações em lote com confirmação. Liberação automática somente quando configurada.
- Biblioteca por categoria/turma, regras de CASH/XP/troféus e cadastro de prêmios.
- Relatórios por aluno/turma, médias por competência e ranking restrito à área autorizada do professor/admin.

### Administrador — menu independente
`/admin`, `/admin/usuarios`, `/admin/turmas`, `/admin/atividades`, `/admin/correcoes`, `/admin/biblioteca`, `/admin/gamificacao`, `/admin/relatorios`, `/admin/configuracoes`.

Gestão global de escolas, usuários/papéis, turmas, atividades, correções, biblioteca, recompensas e critérios. Contas com mais de um papel poderão alternar entre áreas autorizadas sem misturar menus ou dados.

## 3. Implementação em etapas

### A. Permissões e separação de perfis
1. Completar vínculos escola–professor–turma–matrícula–atividade–envio, preservando registros atuais. Registros sem turma ficarão identificados para associação pelo administrador, nunca expostos a todos os professores.
2. Restringir leitura e edição por proprietário e turma responsável; validar ações e acesso por endereço direto. Papéis continuam administrados pela operação protegida existente.
3. Ocultar notas/feedback pendentes em todas as respostas e telas de aluno. Anotações internas e comentários liberados terão visibilidade distinta.
4. Tornar recompensas controladas, sem edição direta pelo aluno e sem crédito duplicado. Manter saldos existentes; novas regras configuráveis sem recalcular o passado silenciosamente.

### B. Professor e administrador
Construir menus próprios e gestão de turmas, atividades, anexos, fila de correções, marcações, revisão/liberação, histórico, biblioteca, recompensas e relatórios.

**Drive escolhido: conta individual de cada professor.** Implementar autorização individual e acesso apenas aos próprios arquivos; importar planilhas/arquivos para os fluxos autorizados e exportar notas. Google Drive e Google Sheets têm suporte disponível, mas exigirão configuração e autorização antes dos testes reais. Importar alunos não significa criar contas com privilégios ou dispensar confirmação de acesso.

### C. Aluno
Construir avaliações pendentes/encerradas com filtros, boas-vindas/turmas, envio com material de apoio, anexos e cronômetro, estatísticas pessoais, detalhes de correção marcados, reescrita permitida, evolução e conquistas. Nota e recompensa só serão reveladas conforme a liberação configurada.

### D. Acabamento e validação
Azul principal e neutros claros, cores semânticas por atividade/competência, bordas suaves, tipografia legível, espaço bem distribuído e ilustrações pertinentes. Adaptar telas ao celular, navegação por teclado, contraste, estados vazios/carregamento/erro e notificações persistentes para prazos, simulados, liberação e troféus, sem depender apenas de avisos temporários.

## 4. Detalhes técnicos
- Manter TanStack Start, componentes e tokens existentes; separar apresentações por perfil e módulos de dados compartilhados, sem duplicar regras.
- Evoluir o banco de forma aditiva, com permissões explícitas, políticas por usuário/turma e arquivos privados com acesso autorizado.
- Operações sensíveis e chamadas de IA/Drive executadas no servidor autenticado. Conexões individuais protegidas e nunca compartilhadas entre professores.
- Anotações terão vínculo com trechos reais do texto e competência; validar ocorrência e posição, sem inventar marcações por interpretação visual.
- Recompensas e liberação precisam ser consistentes e idempotentes, inclusive em correções em lote ou reenvios.
- Adicionar testes concretos de permissões, prazos, limites de envio, níveis C1–C5, conversão de nota e recompensas. Completar título, descrição e metadados sociais de cada página de conteúdo.

## 5. Checklist de entrega
- [ ] Entrada, saída, recuperação, avatar e dados antigos preservados.
- [ ] Treino livre, simulado, rascunho, envio e correção com IA continuam funcionando.
- [ ] Professor revisa, comenta, ajusta e libera uma redação da própria turma; aluno lê a versão liberada.
- [ ] Aluno bloqueado em áreas/ações de professor/admin, inclusive endereço direto e chamadas diretas aos dados.
- [ ] Aluno não lê dados de colegas, notas pendentes nem anotações internas; não altera papéis, turma, CASH/XP ou troféus por acesso direto.
- [ ] Professor bloqueado em turmas, textos, arquivos e relatórios alheios; administrador executa as exceções autorizadas.
- [ ] Prazos, limite de envios, reescrita, liberação automática e recompensas obedecem à configuração, sem duplicação.
- [ ] Drive/planilhas testados com conta real autorizada; pendências de conexão serão explicitadas, não tratadas como concluídas.
- [ ] Fluxos completos testados com sessões distintas de aluno, professor e administrador, em computador e celular.

**Próximo passo:** aprovação deste plano. Configurações de conexão e decisões necessárias serão coletadas na etapa correspondente; nenhuma conexão ou alteração de acesso foi aplicada nesta preparação.