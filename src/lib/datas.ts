export function somarDias(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "Ter., 14 de out." */
export const diaCurto = (iso: string) => {
  const s = new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const dataBR = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')

export const horaAgora = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** "12:30" → minutos desde 00:00; horário inválido vai para o fim do dia. */
export const minutos = (h: string) => {
  const m = h.match(/^(\d{1,2}):(\d{2})/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : 24 * 60
}
