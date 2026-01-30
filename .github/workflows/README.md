# Configuração de Proteção de Branch

Este documento explica como configurar proteções de branch no GitHub para garantir que todas as Pull Requests sejam testadas antes do merge.

## Workflows de CI/CD Criados

Foram criados 2 workflows de GitHub Actions:

### 1. `.github/workflows/ci.yml` - CI Completo

Roda em:
- Push para `main` ou `master`
- Pull Requests para `main` ou `master`

**Jobs:**
- **test**: Instala dependências, roda linter, executa testes e gera coverage report
- **build**: Build do pacote (depende do job de testes passar)
- **typecheck**: Validação de tipos TypeScript

### 2. `.github/workflows/pr-validation.yml` - Validação Rápida de PR

Roda em:
- Pull Requests para `main` ou `master`

**Jobs:**
- **quick-test**: Testes rápidos com timeout de 30s
- **validate-pr**: Valida título da PR seguindo Conventional Commits e verifica descrição

## Como Configurar Proteção de Branch

### Passo 1: Acessar Configurações do Repositório

1. Vá para a página do repositório no GitHub
2. Clique em **Settings** (aba superior)
3. No menu lateral esquerdo, clique em **Branches**

### Passo 2: Criar Regra de Proteção

1. Clique em **Add rule** (ou **Add classic rule**)
2. Em **Branch name pattern**, digite: `main`
3. Configure as seguintes opções:

#### ☑️ Branch Protection Rules

**Regras Básicas:**
- [x] **Require a pull request before merging**
  - [x] Require approvals: `1` (ou mais, conforme necessário)
  - [x] Dismiss stale PR approvals when new commits are pushed
  - [x] Require review from CODEOWNERS (se houver arquivo CODEOWNERS)

**Status Checks:**
- [x] **Require status checks to pass before merging**
  - [x] **Require branches to be up to date before merging**
  
  **Status checks that are required:**
  - `Run Tests` (job de test do ci.yml)
  - `Build Package` (job de build do ci.yml)
  - `Type Check` (job de typecheck do ci.yml)
  - `Quick Test` (job do pr-validation.yml)
  - `Validate PR` (job do pr-validation.yml)

**Restrições Adicionais:**
- [x] **Require conversation resolution before merging**
- [x] **Require signed commits** (opcional, mas recomendado)
- [x] **Require linear history** (opcional, mantém histórico limpo)
- [x] **Include administrators** (aplica regras também para admins)

### Passo 3: Salvar Configurações

1. Clique em **Create** ou **Save changes**
2. A proteção está ativa!

## Comportamento Esperado

### Quando uma PR é aberta:

1. ⏳ GitHub Actions inicia automaticamente
2. ✅ Workflows rodam em paralelo:
   - `ci.yml` → test, build, typecheck
   - `pr-validation.yml` → quick-test, validate-pr
3. 🔄 Status checks aparecem na PR
4. ⚠️ **Merge button fica bloqueado** até todos checks passarem
5. ❌ Se algum check falhar, merge é impedido
6. ✅ Se todos passarem, merge é liberado (mas ainda requer aprovação)

### Exemplo de Fluxo:

```
Dev abre PR → CI roda → Tests passam → Review required → Merge liberado
     ↓              ↓            ↓              ↓
   [Create]    [Running]    [Success]    [Approved]
     ↓              ↓            ↓              ↓
   Draft        Pending    All checks    Ready to
                             passed        merge
```

## Troubleshooting

### Checks não aparecem?

1. Verifique se os workflows foram commitados na branch `main`
2. Faça um push de teste para ativar os workflows
3. Checks aparecerão em PRs subsequentes

### Quer bypassar a proteção (emergência)?

**Não recomendado**, mas administradores podem:
1. Ir em Settings → Branches
2. Desmarcar "Include administrators"
3. Fazer o merge
4. **Re-marcar** a opção após o merge

### Checks ficam pendentes forever?

1. Verifique se há runners disponíveis (GitHub Actions → Runners)
2. Verifique quotas de GitHub Actions (repositórios públicos têm limites)
3. Cancele runs pendentes manualmente se necessário

## Badge de Status

Adicione este badge no README.md para mostrar o status da CI:

```markdown
![CI](https://github.com/diariodaregiao/bunstone/actions/workflows/ci.yml/badge.svg)
![PR Validation](https://github.com/diariodaregiao/bunstone/actions/workflows/pr-validation.yml/badge.svg)
```

Resultado:

![CI](https://github.com/diariodaregiao/bunstone/actions/workflows/ci.yml/badge.svg)
![PR Validation](https://github.com/diariodaregiao/bunstone/actions/workflows/pr-validation.yml/badge.svg)

## Resumo de Segurança

| Camada | Proteção |
|--------|----------|
| CI/CD | Testes automáticos em toda PR |
| Branch | Merge só com checks passando |
| Review | Aprovação obrigatória de 1+ reviewer |
| Código | Linter + TypeScript + Testes |

**Resultado**: Código só chega à `main` se passar por todas as validações! 🛡️
