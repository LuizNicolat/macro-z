# Macro Z

App para montar planos alimentares usando a **TACO** (Tabela Brasileira de Composição de Alimentos, 4ª ed., NEPA/Unicamp). Funciona no celular como app instalável (PWA) e offline.

## O que faz

- **Pacientes**: cadastro com nome, sexo, nascimento e objetivo.
- **Plano alimentar**: refeições com horário, totais do dia, anel de distribuição de macros e barras contra a meta (proteína, carboidrato, gordura e fibras).
- **Refeição**: quantidades em gramas com recálculo na hora e troca de alimento por equivalência (carboidrato, proteína, gordura ou calorias).
- **Busca na TACO**: os 597 alimentos, sem precisar de acento e em qualquer ordem de palavras, com filtro por categoria.
- **Fora da TACO**:
  - busca por nome ou código de barras no [Open Food Facts](https://world.openfoodfacts.org), com revisão dos valores antes de salvar;
  - ou cadastro manual. O app confere a energia pelos macros (4·P + 4·C + 9·G) e guarda os valores por 100 g.
- **Avaliação física**:
  - peso, altura, % de gordura e circunferências;
  - IMC, massa magra, TMB (Mifflin-St Jeor) e gasto total;
  - metas por déficit e g/kg, aplicadas ao plano com um toque;
  - histórico com variação desde a avaliação anterior.
- **Manipulados**: fórmulas com ativos e doses, posologia, horário, duração, farmácia e status, além da rotina do dia.
- **Observações** do plano, com opção de mostrar ou não no PDF.
- **PDF**: página de impressão com resumo, refeições, manipulados e observações.
- **Backup**: exportar e importar todos os dados em JSON (Ajustes).

Os dados ficam salvos **só no aparelho**, no IndexedDB do navegador. Não há servidor nem login.

## Rodar

```bash
npm install
npm run dev      # desenvolvimento
npm test         # testes dos cálculos
npm run build    # gera dist/
```

## Publicar

O workflow `.github/workflows/deploy.yml` publica no GitHub Pages a cada push na `main`. Para ativar:

1. Abra **Settings → Pages** no repositório.
2. Em **Source**, escolha **GitHub Actions**.

## Estrutura

```
src/data/taco.json   TACO compacta: [nome, kcal, P, C, G, fibra, sódio] por 100 g; id = posição + 1
src/lib/nutri.ts     cálculos (macros, Mifflin, metas, equivalências, busca, formatação pt-BR)
src/lib/db.ts        banco local (Dexie/IndexedDB) e backup
src/lib/off.ts       Open Food Facts
src/screens/         telas
```

Na TACO, `null` significa "não analisado/traço" e conta como 0 nos totais. Alguns itens não têm nenhum valor, como "Leite, de vaca, integral". Esses aparecem marcados como **Sem dados na TACO**, e o app sugere cadastrar um equivalente.
