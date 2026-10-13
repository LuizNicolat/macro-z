/** Valores por 100 g de parte comestível. `null` = não analisado/traço (como na TACO). */
export type Nutrientes = {
  kcal: number | null
  p: number | null
  c: number | null
  g: number | null
  fibra: number | null
  sodio: number | null
}

/** Totais já calculados para uma quantidade; ausência de dado conta como 0. */
export type Totais = { kcal: number; p: number; c: number; g: number; fibra: number; sodio: number }

export type Fonte = 'taco' | 'propria'

export type Alimento = {
  /** `taco:410` ou `propria:<id>` */
  ref: string
  nome: string
  categoria: string
  fonte: Fonte
  por100: Nutrientes
  medida?: string
  porcaoG?: number
  marca?: string
}

export type Item = {
  id: string
  ref: string
  nome: string
  fonte: Fonte
  /** Cópia dos valores no momento em que o alimento entrou no plano. */
  por100: Nutrientes
  gramas: number
}

export type Refeicao = { id: string; nome: string; horario: string; itens: Item[] }

export type Meta = { kcal: number; p: number; c: number; g: number; fibra: number }

export type Plano = {
  pacienteId: string
  refeicoes: Refeicao[]
  meta: Meta
  observacoes: string
  obsVisivel: boolean
  versao: number
  atualizadoEm: string
}

export type Sexo = 'F' | 'M'

export type Paciente = {
  id: string
  nome: string
  sexo: Sexo
  nascimento: string
  objetivo: string
  telefone: string
  criadoEm: string
  atualizadoEm: string
}

export type Circunferencias = {
  cintura: number | null
  abdomen: number | null
  quadril: number | null
  braco: number | null
  coxa: number | null
}

export type Avaliacao = {
  id: string
  pacienteId: string
  data: string
  sexo: Sexo
  idade: number
  alturaCm: number
  pesoKg: number
  gorduraPct: number | null
  atividade: number
  metodo: string
  circ: Circunferencias
  deficit: number
  protKg: number
  gordKg: number
  notas: string
}

export type Ativo = { nome: string; dose: string }

export type StatusFormula = 'em_uso' | 'aguardando' | 'encerrada'

export type Formula = {
  id: string
  pacienteId: string
  nome: string
  forma: string
  ativos: Ativo[]
  posologia: string
  horario: string
  duracao: string
  farmacia: string
  status: StatusFormula
  criadoEm: string
}

export type FonteProprio = 'rotulo' | 'outra_tabela' | 'propria' | 'open_food_facts'

export type AlimentoProprio = {
  id: string
  nome: string
  marca: string
  categoria: string
  porcaoG: number
  medida: string
  fonte: FonteProprio
  codigoBarras: string
  por100: Nutrientes
  criadoEm: string
}
