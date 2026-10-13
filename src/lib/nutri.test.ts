import { describe, expect, it } from 'vitest'
import { buscarAlimentos, calcularMetas, distribuicao, equivalenteCarbo, idadeEm, imc, lerNumero, paraGramas, somar, tmbMifflin } from './nutri'
import { TACO } from './taco'

const taco = (id: number) => TACO[id - 1]

describe('tabela TACO', () => {
  it('tem os 597 alimentos com categoria', () => {
    expect(TACO).toHaveLength(597)
    expect(taco(410).nome).toBe('Frango, peito, sem pele, grelhado')
    expect(taco(410).categoria).toBe('Carnes e derivados')
    expect(taco(597).categoria).toBe('Nozes e sementes')
    expect(TACO.every((a) => a.categoria !== 'Outros')).toBe(true)
  })
})

describe('cálculo de macros', () => {
  it('converte por 100 g para a quantidade', () => {
    const t = paraGramas(taco(410).por100, 150)
    expect(t.kcal).toBeCloseTo(238.5)
    expect(t.p).toBeCloseTo(48)
  })

  it('trata null (não analisado) como zero', () => {
    const azeite = paraGramas(taco(260).por100, 5)
    expect(azeite.kcal).toBeCloseTo(44.2)
    expect(azeite.p).toBe(0)
    expect(azeite.g).toBeCloseTo(5)
  })

  it('soma o almoço do mockup: 532 kcal', () => {
    const t = somar([
      paraGramas(taco(3).por100, 120),
      paraGramas(taco(561).por100, 100),
      paraGramas(taco(410).por100, 150),
      paraGramas(taco(100).por100, 80),
      paraGramas(taco(260).por100, 5),
    ])
    expect(Math.round(t.kcal)).toBe(532)
    expect(t.p).toBeCloseTo(57.48, 1)
    expect(t.c).toBeCloseTo(50.84, 1)
    expect(t.g).toBeCloseTo(9.89, 1)
  })

  it('distribui as calorias entre os macros', () => {
    const d = distribuicao({ kcal: 0, p: 100, c: 100, g: 0, fibra: 0, sodio: 0 })
    expect(d.p).toBeCloseTo(0.5)
    expect(d.g).toBe(0)
  })

  it('calcula substituição por carboidrato', () => {
    expect(Math.round(equivalenteCarbo(120, taco(3).por100, taco(88).por100)!)).toBe(183)
    expect(equivalenteCarbo(100, taco(410).por100, taco(88).por100)).toBeNull()
  })
})

describe('avaliação física', () => {
  it('Mifflin-St Jeor e metas da paciente do mockup', () => {
    expect(Math.round(tmbMifflin('F', 68.4, 165, 32))).toBe(1394)
    expect(imc(68.4, 165)).toBeCloseTo(25.1, 1)
    const m = calcularMetas({ sexo: 'F', pesoKg: 68.4, alturaCm: 165, idade: 32, atividade: 1.55, deficit: 400, protKg: 2.3, gordKg: 0.65 })
    expect(Math.round(m.get)).toBe(2161)
    expect(Math.round(m.kcal)).toBe(1761)
    expect(Math.round(m.p)).toBe(157)
    expect(Math.round(m.g)).toBe(44)
    expect(Math.round(m.c)).toBe(183)
  })

  it('calcula idade pela data de nascimento', () => {
    expect(idadeEm('1994-10-14', new Date('2026-10-13T12:00:00'))).toBe(31)
    expect(idadeEm('1994-10-13', new Date('2026-10-13T12:00:00'))).toBe(32)
    expect(idadeEm('')).toBeNull()
  })
})

describe('busca e números', () => {
  it('ignora acentos e ordem das palavras', () => {
    const r = buscarAlimentos(TACO, 'grelhado frango')
    expect(r[0].nome).toContain('Frango')
    expect(buscarAlimentos(TACO, 'pao frances').map((a) => a.nome)).toContain('Pão, trigo, francês')
    expect(buscarAlimentos(TACO, 'whey protein')).toHaveLength(0)
  })

  it('lê números com vírgula', () => {
    expect(lerNumero('68,4')).toBe(68.4)
    expect(lerNumero(' 120 ')).toBe(120)
    expect(lerNumero('')).toBeNull()
    expect(lerNumero('abc')).toBeNull()
  })
})
