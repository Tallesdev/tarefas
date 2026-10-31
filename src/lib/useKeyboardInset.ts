import { useEffect, useState } from 'react'

// Altura do teclado virtual que está cobrindo a parte de baixo da tela.
// Android (Chrome) já encolhe a página por causa do interactive-widget=resizes-content
// no viewport, então aqui dá 0. No iPhone (Safari) a página não encolhe: o teclado
// só reduz o visualViewport, e é essa diferença que usamos para subir a folha.
export function useKeyboardInset(active: boolean) {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!active || !vv) {
      setInset(0)
      return
    }
    const update = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop
      setInset(covered > 60 ? Math.round(covered) : 0)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [active])

  return inset
}
