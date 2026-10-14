const PATHS: Record<string, string> = {
  voltar: 'M15 5l-7 7 7 7',
  seta: 'M9 5l7 7-7 7',
  mais: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  busca: 'M20 20l-4.2-4.2M17.5 11a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z',
  pessoas: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M13 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM21 19v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8',
  prato: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0zM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  pulso: 'M3 12h4l3-7 4 14 3-7h4',
  capsula: 'M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7zM7 7l7 7',
  baixar: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  lapis: 'M4 20h4L19 9l-4-4L4 16z',
  lixo: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  ok: 'M5 12.5l4.5 4.5L19 7.5',
  info: 'M12 8v5M12 16.5v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  codigo: 'M4 7V5h3M17 5h3v2M20 17v2h-3M7 19H4v-2M8 9v6M11 9v6M14 9v6M17 9v6',
  troca: 'M7 4L4 7l3 3M4 7h12a4 4 0 0 1 4 4M17 20l3-3-3-3M20 17H8a4 4 0 0 1-4-4',
  ajustes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  fechar: 'M6 6l12 12M18 6L6 18',
  lista: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  baixo: 'M6 9l6 6 6-6',
  usuario: 'M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
}

export type NomeIcone = keyof typeof PATHS

export function Icon({ n, size = 20, stroke = 2 }: { n: NomeIcone; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[n]} />
    </svg>
  )
}
