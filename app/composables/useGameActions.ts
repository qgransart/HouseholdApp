import { completeTask, DomainError, raiseSignal, undoCompletion, withdrawSignal } from '~/db/repository'
import { setCategoryOwner, setVacationMode, snoozeTask, updateHouseholdSettings, updateMember, updateTask, type TaskChanges } from '~/db/management'
import { createReward, honorPurchase, purchaseReward, thank } from '~/db/shop'
import { computeLevel, type Task } from '#shared/domain'
import type { HouseholdSettings, NotificationPrefs } from '#shared/types/entities'
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
    sound.vibrate([20, 40, 20])

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

  const now = () => new Date()

  async function snooze(task: Task, days: number) {
    const until = await run(() => snoozeTask(db, { taskId: task.id, days, today: game.today.value, now: now() }))
    if (until) {
      toast.show(`« ${task.name} » reportée de ${days} jour${days > 1 ? 's' : ''}`)
    }
  }

  async function saveTask(task: Task, changes: TaskChanges) {
    if (await run(() => updateTask(db, { taskId: task.id, changes, now: now() }).then(() => true))) {
      toast.show('Tâche enregistrée')
    }
  }

  async function changeOwner(categoryId: string, memberId: string) {
    if (await run(() => setCategoryOwner(db, { categoryId, memberId, now: now() }).then(() => true))) {
      toast.show(`Pièce confiée à ${game.memberName(memberId)}`)
    }
  }

  async function setVacation(on: boolean) {
    const householdId = game.household.value?.id
    if (householdId && await run(() => setVacationMode(db, { householdId, on, today: game.today.value, now: now() }).then(() => true))) {
      toast.show(on ? 'Bonnes vacances ! Le temps est suspendu.' : 'Bon retour ! Les quêtes reprennent.')
    }
  }

  async function buy(rewardId: string) {
    const member = game.currentMember.value
    if (!member) {
      return false
    }
    const purchase = await run(() => purchaseReward(db, { rewardId, memberId: member.id, now: now() }))
    if (purchase) {
      sound.play('buy')
      sound.vibrate([20, 30, 20])
      const target = document.querySelector(COIN_TARGET_SELECTOR)
      if (target) {
        fx.confetti(centerOf(target), 14)
      }
      toast.show(`Récompense achetée ! ${game.partner.value?.displayName ?? 'L\'autre joueur'} va l'honorer.`)
    }
    return Boolean(purchase)
  }

  async function honor(purchaseId: string) {
    const member = game.currentMember.value
    if (member && await run(() => honorPurchase(db, { purchaseId, memberId: member.id, now: now() }).then(() => true))) {
      sound.play('coin')
      toast.show('Récompense honorée, bravo !')
    }
  }

  async function addReward(name: string, emoji: string, cost: number) {
    const householdId = game.household.value?.id
    if (householdId && await run(() => createReward(db, { householdId, name, emoji, cost, now: now() }).then(() => true))) {
      toast.show(`Récompense « ${name.trim()} » ajoutée`)
      return true
    }
    return false
  }

  async function sayThanks(completionId: string, origin?: Element | null) {
    const member = game.currentMember.value
    if (member && await run(() => thank(db, { completionId, memberId: member.id, now: now() }).then(() => true))) {
      sound.play('coin')
      if (origin?.isConnected) {
        fx.confetti(centerOf(origin), 10)
      }
      toast.show(`Merci envoyé à ${game.partner.value?.displayName ?? 'l\'autre joueur'}`)
    }
  }

  async function saveMember(changes: { dailyBudgetMin?: number, notificationPrefs?: NotificationPrefs }) {
    const member = game.currentMember.value
    if (member) {
      await run(() => updateMember(db, { memberId: member.id, changes, now: now() }))
    }
  }

  async function saveHouseholdSettings(settings: HouseholdSettings) {
    const householdId = game.household.value?.id
    if (householdId) {
      await run(() => updateHouseholdSettings(db, { householdId, settings, now: now() }))
    }
  }

  return { complete, undo, toggleSignal, snooze, saveTask, changeOwner, setVacation, buy, honor, addReward, sayThanks, saveMember, saveHouseholdSettings }
}
