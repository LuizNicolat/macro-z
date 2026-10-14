import { agora, db } from './db'
import { calcularMetas } from './nutri'
import { TACO } from './taco'
import type { AlimentoProprio, Avaliacao, Formula, Item, Paciente, Plano, Refeicao } from './types'

/**
 * Dois pacientes fictícios para demonstração. Ids fixos: carregar de novo
 * substitui os exemplos em vez de duplicar, e "remover" apaga só eles.
 */

const IDS = { ana: 'exemplo-ana', bruno: 'exemplo-bruno' }
const WHEY_ID = 'exemplo-whey'

const whey: AlimentoProprio = {
  id: WHEY_ID, nome: 'Whey protein concentrado', marca: '', categoria: 'Suplementos', porcaoG: 30, medida: '1 scoop',
  fonte: 'rotulo', codigoBarras: '',
  // 30 g = 120 kcal · P 24 · C 3 · G 1,5 → por 100 g
  por100: { kcal: 400, p: 80, c: 10, g: 5, fibra: 0, sodio: null },
  criadoEm: agora(),
}

let seq = 0
const it = (id: number, gramas: number): Item => {
  const a = TACO[id - 1]
  return { id: `ex-item-${++seq}`, ref: a.ref, nome: a.nome, fonte: 'taco', por100: a.por100, gramas }
}
const itWhey = (gramas: number): Item => ({ id: `ex-item-${++seq}`, ref: `propria:${WHEY_ID}`, nome: whey.nome, fonte: 'propria', por100: whey.por100, gramas })
const ref = (id: string, nome: string, horario: string, itens: Item[]): Refeicao => ({ id, nome, horario, itens })

function metasDe(a: Avaliacao) {
  const m = calcularMetas({ sexo: a.sexo, pesoKg: a.pesoKg, alturaCm: a.alturaCm, idade: a.idade, atividade: a.atividade, deficit: a.deficit, protKg: a.protKg, gordKg: a.gordKg })
  return { kcal: Math.round(m.kcal), p: Math.round(m.p), c: Math.round(m.c), g: Math.round(m.g), fibra: m.fibra }
}

export async function carregarExemplos() {
  seq = 0
  const t = agora()

  const pacientes: Paciente[] = [
    { id: IDS.ana, nome: 'Ana Ribeiro', sexo: 'F', nascimento: '1994-01-10', objetivo: 'Emagrecimento', telefone: '', criadoEm: t, atualizadoEm: t },
    { id: IDS.bruno, nome: 'Bruno Tavares', sexo: 'M', nascimento: '1990-05-22', objetivo: 'Hipertrofia', telefone: '', criadoEm: t, atualizadoEm: t },
  ]

  const avaliacoes: Avaliacao[] = [
    { id: 'exemplo-ana-av1', pacienteId: IDS.ana, data: '2026-09-12', sexo: 'F', idade: 32, alturaCm: 165, pesoKg: 70.1, gorduraPct: 29, atividade: 1.55, metodo: 'Bioimpedância',
      circ: { cintura: 79, abdomen: 85, quadril: 104, braco: 29.5, coxa: 59 }, deficit: 400, protKg: 2.2, gordKg: 0.65, notas: 'Primeira consulta.' },
    { id: 'exemplo-ana-av2', pacienteId: IDS.ana, data: '2026-10-11', sexo: 'F', idade: 32, alturaCm: 165, pesoKg: 68.4, gorduraPct: 27.5, atividade: 1.55, metodo: 'Bioimpedância',
      circ: { cintura: 76, abdomen: 82, quadril: 102, braco: 29, coxa: 58 }, deficit: 400, protKg: 2.3, gordKg: 0.65, notas: 'Boa adesão. Mantém treino 4x/semana.' },
    { id: 'exemplo-bruno-av1', pacienteId: IDS.bruno, data: '2026-10-06', sexo: 'M', idade: 36, alturaCm: 180, pesoKg: 82, gorduraPct: 15, atividade: 1.725, metodo: 'Dobras cutâneas',
      circ: { cintura: 84, abdomen: 87, quadril: 99, braco: 37, coxa: 60 }, deficit: -300, protKg: 2, gordKg: 0.9, notas: 'Treina 6x/semana, quer ganhar massa.' },
  ]

  const planos: Plano[] = [
    {
      pacienteId: IDS.ana, versao: 3, atualizadoEm: t, obsVisivel: true, meta: metasDe(avaliacoes[1]),
      observacoes: 'Priorizar legumes no almoço e no jantar.\nEm dias sem treino, retirar a cafeína.\nTrocas: use as substituições de cada refeição.',
      refeicoes: [
        ref('exemplo-ana-r1', 'Café da manhã', '07:00', [it(52, 50), it(488, 100), it(182, 80), it(471, 100)]),
        ref('exemplo-ana-r2', 'Almoço', '12:30', [it(3, 120), it(561, 100), it(410, 150), it(100, 80), it(260, 5)]),
        ref('exemplo-ana-r3', 'Lanche da tarde', '16:00', [it(449, 170), it(7, 30), it(239, 100)]),
        ref('exemplo-ana-r4', 'Jantar', '19:30', [it(88, 150), it(377, 120), it(78, 50), it(157, 80)]),
        ref('exemplo-ana-r5', 'Ceia', '22:00', [itWhey(30), it(589, 10)]),
      ],
    },
    {
      pacienteId: IDS.bruno, versao: 1, atualizadoEm: t, obsVisivel: true, meta: metasDe(avaliacoes[2]),
      observacoes: 'Beber água ao longo do dia, principalmente perto dos treinos.\nNo pré-treino, a batata-doce pode ser trocada por mandioca cozida.',
      refeicoes: [
        ref('exemplo-bruno-r1', 'Café da manhã', '07:00', [it(53, 150), it(488, 100), it(182, 120), it(7, 60)]),
        ref('exemplo-bruno-r2', 'Almoço', '12:00', [it(3, 350), it(567, 150), it(377, 130), it(100, 100), it(260, 10)]),
        ref('exemplo-bruno-r3', 'Pré-treino', '16:00', [it(88, 350)]),
        ref('exemplo-bruno-r4', 'Pós-treino', '18:30', [itWhey(30), it(179, 150), it(507, 30)]),
        ref('exemplo-bruno-r5', 'Jantar', '20:30', [it(1, 250), it(317, 120), it(546, 150)]),
        ref('exemplo-bruno-r6', 'Ceia', '22:30', [it(449, 170), it(589, 15)]),
      ],
    },
  ]

  const formulas: Formula[] = [
    { id: 'exemplo-ana-f1', pacienteId: IDS.ana, nome: 'Vitamina D3 + K2', forma: 'Cápsula', ativos: [{ nome: 'Colecalciferol (D3)', dose: '2.000 UI' }, { nome: 'Menaquinona-7 (K2)', dose: '100 mcg' }],
      posologia: '1 cáps. ao dia', horario: '12:30', duracao: '60 dias', farmacia: '', status: 'em_uso', criadoEm: t },
    { id: 'exemplo-ana-f2', pacienteId: IDS.ana, nome: 'Cafeína anidra', forma: 'Cápsula', ativos: [{ nome: 'Cafeína anidra', dose: '200 mg' }],
      posologia: '1 cáps. nos dias de treino', horario: '17:30', duracao: '', farmacia: '', status: 'em_uso', criadoEm: t },
    { id: 'exemplo-ana-f3', pacienteId: IDS.ana, nome: 'Magnésio dimalato', forma: 'Cápsula', ativos: [{ nome: 'Magnésio dimalato', dose: '300 mg' }],
      posologia: '1 cáps. ao dia', horario: '22:00', duracao: 'Uso contínuo', farmacia: '', status: 'aguardando', criadoEm: t },
    { id: 'exemplo-bruno-f1', pacienteId: IDS.bruno, nome: 'Creatina monoidratada', forma: 'Pó', ativos: [{ nome: 'Creatina monoidratada', dose: '5 g' }],
      posologia: '1 dose ao dia', horario: '18:30', duracao: 'Uso contínuo', farmacia: '', status: 'em_uso', criadoEm: t },
  ]

  await db.transaction('rw', [db.pacientes, db.planos, db.avaliacoes, db.formulas, db.alimentos], async () => {
    await db.alimentos.put(whey)
    await db.pacientes.bulkPut(pacientes)
    await db.planos.bulkPut(planos)
    await db.avaliacoes.bulkPut(avaliacoes)
    await db.formulas.bulkPut(formulas)
  })
}

export async function removerExemplos() {
  await db.transaction('rw', [db.pacientes, db.planos, db.avaliacoes, db.formulas, db.alimentos, db.diario], async () => {
    for (const id of Object.values(IDS)) {
      await db.pacientes.delete(id)
      await db.planos.delete(id)
      await db.avaliacoes.where('pacienteId').equals(id).delete()
      await db.formulas.where('pacienteId').equals(id).delete()
      await db.diario.where('pacienteId').equals(id).delete()
    }
    await db.alimentos.delete(WHEY_ID)
  })
}
