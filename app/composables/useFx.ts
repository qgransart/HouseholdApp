/**
 * Imperative celebration effects (confetti, floating text, flying coins).
 * Purely decorative: the layer is aria-hidden and every effect is skipped under reduced motion.
 */

const CONFETTI_COLORS = ['#ffc53d', '#7b5cff', '#17a398', '#e5484d', '#74c0fc']

let layer: HTMLElement | undefined

function getLayer(): HTMLElement {
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div')
    layer.className = 'fx-layer'
    layer.setAttribute('aria-hidden', 'true')
    document.body.appendChild(layer)
  }
  return layer
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function spawn(className: string, x: number, y: number): HTMLElement {
  const element = document.createElement('span')
  element.className = className
  element.style.left = `${x}px`
  element.style.top = `${y}px`
  getLayer().appendChild(element)
  return element
}

export interface Point { x: number, y: number }

export function centerOf(element: Element): Point {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

export function useFx() {
  function confetti(at: Point, count = 18) {
    if (prefersReducedMotion()) {
      return
    }
    for (let i = 0; i < count; i++) {
      const piece = spawn('fx-layer__confetti', at.x, at.y)
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length]!
      piece.style.setProperty('--dx', `${(Math.random() - 0.5) * 220}px`)
      piece.style.setProperty('--dy', `${-60 - Math.random() * 140}px`)
      piece.style.setProperty('--rotation', `${Math.random() * 720}deg`)
      piece.addEventListener('animationend', () => piece.remove())
    }
  }

  function floatText(at: Point, text: string) {
    if (prefersReducedMotion()) {
      return
    }
    const element = spawn('fx-layer__float', at.x, at.y)
    element.textContent = text
    element.addEventListener('animationend', () => element.remove())
  }

  /** Coins fly from `from` to `target`; `onEach` fires on each arrival (sound), the promise when all landed. */
  function flyCoins(from: Point, target: Element, count: number, onEach?: () => void): Promise<void> {
    if (prefersReducedMotion()) {
      return Promise.resolve()
    }
    const to = centerOf(target)
    const arrivals = Array.from({ length: count }, (_, i) => new Promise<void>((resolve) => {
      const coin = spawn('fx-layer__coin', from.x + (Math.random() - 0.5) * 40, from.y)
      coin.innerHTML = '<svg viewBox="0 0 24 24"><use href="#icon-coin"/></svg>'
      setTimeout(() => {
        coin.style.transform = `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(0.8)`
      }, 30 + i * 70)
      setTimeout(() => {
        coin.remove()
        onEach?.()
        resolve()
      }, 700 + i * 70)
    }))
    return Promise.all(arrivals).then(() => undefined)
  }

  return { confetti, floatText, flyCoins }
}
