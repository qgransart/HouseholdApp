import { completeTask, DomainError, raiseSignal, undoCompletion, withdrawSignal } from '~/db/repository'
import { computeLevel, type Task } from '#shared/domain'
import { centerOf } from './useFx'

/** Selector of the HUD element coins fly to. */
export const COIN_TARGET_SELECTOR = '[data-coin-target]'

/**
 * Game actions with their feedback (sound, vibration, effects, toast, celebrations).
 * Persistence and rules live in the repository and the domain; this layer only orchestrates.
 */
export function useGameActions() {
  const db = useDatabase()
  const game = useGame()
  const toast = useToast()
  const sound = useSound()
  const fx = useFx()
  const celebrations = useCelebrations()

  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    try {
      return await action()
    }
    catch (error) {
      if (error instanceof DomainError) {
        toast.show(error.message)
      }
      else {
        console.error(error)
        toast.show('Oups, l\'action n\'a pas pu être enregistrée. Réessaie.')
      }
      return undefined
    }
  }

  async function complete(task: Task, origin?: Element | null) {
    const member = game.currentMember.value
    if (!member) {
      return
    }
    // Captured before the write: the live projections update right after it.
    const totalXpBefore = game.totalXp.value
    const gaugeBefore = game.weeklyGauge.value
    const streakBefore = game.streak.value

    const completion = await run(() => completeTask(db, { taskId: task.id, memberId: member.id, now: new Date() }))
    if (!completion) {
      return
    }

    sound.play('complete')
    try {
      navigator.vibrate?.([20, 40, 20])
    }
    catch {
      // Not supported on this device.
    }

    if (origin?.isConnected) {
      const point = centerOf(origin)
      fx.confetti(point)
      fx.floatText({ x: point.x, y: point.y - 24 }, `+${completion.xp} XP`)
      const target = document.querySelector(COIN_TARGET_SELECTOR)
      if (target) {
        void fx.flyCoins(point, target, Math.min(6, Math.ceil(completion.coins / 3)), () => sound.play('coin'))
      }
    }

    toast.show(`${task.name} : +${completion.xp} XP, +${completion.coins} pièces`, { undoCompletionId: completion.id })

    const levelBefore = computeLevel(totalXpBefore).level
    const levelAfter = computeLevel(totalXpBefore + completion.xp).level
    if (levelAfter > levelBefore) {
      celebrations.celebrate({ kind: 'level', level: levelAfter })
    }
    if (!gaugeBefore.frozen && !gaugeBefore.achieved && gaugeBefore.earned + completion.xp >= gaugeBefore.target) {
      celebrations.celebrate({ kind: 'chest', streak: streakBefore + 1 })
    }
  }

  async function undo(completionId: string) {
    const done = await run(() => undoCompletion(db, { completionId, now: new Date() }).then(() => true))
    if (done) {
      toast.show('Validation annulée')
    }
  }

  async function toggleSignal(taskId: string, openSignalId: string | null, label: string) {
    const member = game.currentMember.value
    if (!member) {
      return
    }
    if (openSignalId) {
      await run(() => withdrawSignal(db, { signalId: openSignalId, now: new Date() }))
      toast.show(`Alerte « ${label} » retirée`)
      return
    }
    const signal = await run(() => raiseSignal(db, { taskId, memberId: member.id, now: new Date() }))
    if (signal) {
      sound.play('bell')
      toast.show(`Alerte « ${label} » envoyée`)
    }
  }

  return { complete, undo, toggleSignal }
}
