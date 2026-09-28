import { getMeta, setMeta } from '~/db/repository'

const META_SOUND = 'soundEnabled'
const META_VIBRATION = 'vibrationEnabled'

type Note = [frequency: number, startAt: number, duration?: number]

const EFFECTS = {
  complete: [[660, 0], [880, 0.08], [1320, 0.16, 0.2]],
  coin: [[1400, 0, 0.06], [1800, 0.05, 0.1]],
  fanfare: [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36, 0.4]],
  tick: [[560, 0, 0.04]],
  bell: [[1200, 0, 0.3], [900, 0.15, 0.3]],
  buy: [[900, 0, 0.08], [700, 0.08, 0.08], [1100, 0.16, 0.18]],
} satisfies Record<string, Note[]>

export type SoundEffect = keyof typeof EFFECTS

let audio: AudioContext | undefined

/**
 * Tiny synthesised sound effects (Web Audio, no audio file to download).
 * Off by default; the preference is a device setting.
 */
export const useSound = createSharedComposable(() => {
  const db = useDatabase()
  const stored = useLiveQuery(() => getMeta<boolean>(db, META_SOUND))
  const enabled = computed(() => stored.value === true)
  const storedVibration = useLiveQuery(() => getMeta<boolean>(db, META_VIBRATION))
  /** On by default: a short haptic feedback is part of the game feel. */
  const vibrationEnabled = computed(() => storedVibration.value !== false)

  function play(effect: SoundEffect) {
    if (!enabled.value) {
      return
    }
    try {
      audio ??= new AudioContext()
      for (const [frequency, startAt, duration = 0.12] of EFFECTS[effect]) {
        const oscillator = audio.createOscillator()
        const gain = audio.createGain()
        const start = audio.currentTime + startAt
        oscillator.type = 'triangle'
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0.12, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
        oscillator.connect(gain).connect(audio.destination)
        oscillator.start(start)
        oscillator.stop(start + duration)
      }
    }
    catch {
      // Sound is a bonus: never let an audio failure break a game action.
    }
  }

  async function toggle() {
    await setMeta(db, META_SOUND, !enabled.value)
  }

  function vibrate(pattern: number[]) {
    if (!vibrationEnabled.value) {
      return
    }
    try {
      navigator.vibrate?.(pattern)
    }
    catch {
      // Not supported on this device.
    }
  }

  async function toggleVibration() {
    await setMeta(db, META_VIBRATION, !vibrationEnabled.value)
  }

  return { enabled, play, toggle, vibrationEnabled, vibrate, toggleVibration }
})
