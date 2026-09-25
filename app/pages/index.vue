<script setup lang="ts">
import { computeQuotaProgress, UNDO_WINDOW_MINUTES, type Quest } from '#shared/domain'
import type { CompletionRow } from '#shared/types/entities'

useHead({ title: 'Quêtes du jour' })

const game = useGame()
const { snapshot } = useHousehold()
const { complete, undo } = useGameActions()
const now = useClock()

const selectedCategoryId = ref<string | null>(null)

const visibleQuests = computed(() => selectedCategoryId.value
  ? game.pendingQuests.value.filter(quest => quest.task.categoryId === selectedCategoryId.value)
  : game.pendingQuests.value)

const totalQuests = computed(() => game.completedToday.value.length + game.pendingQuests.value.length)
const pendingMinutes = computed(() => game.pendingQuests.value.reduce((sum, quest) => sum + quest.task.durationMin, 0))
const memberName = (id: string | null | undefined) => snapshot.value?.members.find(member => member.id === id)?.displayName

function questDetail(quest: Quest): string | undefined {
  const task = quest.task
  if (task.type === 'quota') {
    const progress = game.progress.value.get(task.id)
    const quota = computeQuotaProgress(task, progress?.completionsThisWeek ?? 0, game.today.value, game.vacations.value)
    return `${quota.done} / ${quota.target} cette semaine`
  }
  if (task.type === 'signal' && quest.urgency.triggeredBySignal) {
    const alert = game.alerts.value.find(a => a.task.id === task.id)
    if (alert?.openSignal) {
      const time = new Date(alert.openSignal.raisedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      return `${task.signalLabel} : alerte de ${memberName(alert.openSignal.raisedBy) ?? '?'} à ${time}`
    }
    return `${task.signalLabel} : délai maximum atteint`
  }
  return undefined
}

function helpFor(quest: Quest) {
  return quest.isHelp ? memberName(game.categoriesById.value.get(quest.task.categoryId)?.ownerMemberId) : undefined
}

function canUndo(completion: CompletionRow) {
  return now.value.getTime() - new Date(completion.completedAt).getTime() < UNDO_WINDOW_MINUTES * 60_000
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const selectedRoomName = computed(() => selectedCategoryId.value ? game.categoriesById.value.get(selectedCategoryId.value)?.name : null)
</script>

<template>
  <div class="quests-page">
    <GamePanel
      title="La maison"
      hint="Touche une pièce pour filtrer"
    >
      <GameHouseMap
        :rooms="game.rooms.value"
        :current-member-id="game.currentMember.value?.id ?? null"
        :selected-category-id="selectedCategoryId"
        @select="id => selectedCategoryId = selectedCategoryId === id ? null : id"
      />
    </GamePanel>

    <GameWeeklyChest :gauge="game.weeklyGauge.value" />

    <GamePanel
      title="Quêtes du jour"
      :level="1"
    >
      <template #aside>
        <p
          class="daily-stars"
          role="img"
          :aria-label="`${game.completedToday.value.length} quête(s) faite(s) sur ${totalQuests} aujourd'hui`"
        >
          <svg
            v-for="index in Math.min(Math.max(totalQuests, 1), 8)"
            :key="index"
            viewBox="0 0 24 24"
            class="daily-stars__star"
            :class="{ 'daily-stars__star--on': index <= game.completedToday.value.length }"
            aria-hidden="true"
          >
            <use href="#icon-star" />
          </svg>
        </p>
      </template>

      <p class="quest-summary tabular-nums">
        <template v-if="game.pendingQuests.value.length">
          {{ game.pendingQuests.value.length }} à faire · environ {{ pendingMinutes }} min
        </template>
        <template v-else>
          Toutes tes quêtes du jour sont faites. Bravo !
        </template>
        <template v-if="selectedRoomName">
          · filtre : {{ selectedRoomName }}
          <button
            class="quest-summary__clear"
            type="button"
            @click="selectedCategoryId = null"
          >
            Tout afficher
          </button>
        </template>
      </p>

      <ul
        class="quest-list"
        role="list"
      >
        <GameQuestCard
          v-for="quest in visibleQuests"
          :key="quest.task.id"
          :task="quest.task"
          :room="game.categoriesById.value.get(quest.task.categoryId)"
          :freshness="game.freshnessByTask.value.get(quest.task.id)"
          :triggered-by-signal="quest.urgency.triggeredBySignal"
          :help-for="helpFor(quest)"
          :detail="questDetail(quest)"
          @complete="origin => complete(quest.task, origin)"
        />
      </ul>

      <ul
        v-if="game.completedToday.value.length"
        class="done-list"
        role="list"
        aria-label="Terminées aujourd'hui"
      >
        <li
          v-for="completion in game.completedToday.value"
          :key="completion.id"
          class="done-list__item"
        >
          <span
            class="done-list__check"
            aria-hidden="true"
          ><GameIcon name="check" /></span>
          <span class="done-list__text">
            {{ game.tasksById.value.get(completion.taskId)?.name }}
            <span class="done-list__meta tabular-nums">
              {{ formatTime(completion.completedAt) }} · +{{ completion.xp }} XP<template v-if="completion.isHelp"> · coup de main</template>
            </span>
          </span>
          <button
            v-if="canUndo(completion)"
            class="done-list__undo"
            type="button"
            @click="undo(completion.id)"
          >
            Annuler
          </button>
        </li>
      </ul>
    </GamePanel>

    <GameFlashChallenge />
    <GameAlertBoard />
  </div>
</template>

<style lang="scss" scoped>
.quests-page {
  display: grid;
  gap: var(--space-5);
}

.daily-stars {
  display: flex;
  gap: 0.15rem;

  &__star {
    width: 1.35rem;
    height: 1.35rem;
    fill: #e4e7f0;
    stroke: #c5cadb;

    &--on {
      fill: var(--color-gold);
      stroke: var(--color-gold-dark);
    }
  }
}

.quest-summary {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);

  &__clear {
    min-height: var(--touch-target-min);
    padding-inline: var(--space-2);
    font-weight: 800;
    color: var(--color-gem-dark);
    text-decoration: underline;
  }
}

.quest-list {
  display: grid;
  gap: var(--space-4);
  margin: 0;
}

.done-list {
  display: grid;
  gap: 0.4rem;
  margin: 0;

  &__item {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    padding: 0.5rem 0.6rem;
    font-size: var(--font-size-sm);
    background: var(--color-success-soft);
    border-radius: 0.75rem;
  }

  &__check {
    display: grid;
    flex: none;
    place-items: center;
    width: 1.6rem;
    height: 1.6rem;
    color: #fff;
    background: var(--color-success);
    border-radius: 50%;
  }

  &__text {
    flex: 1;
    min-width: 0;
  }

  &__meta {
    display: block;
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  &__undo {
    min-height: var(--touch-target-min);
    padding-inline: 0.6rem;
    font-weight: 800;
    color: var(--color-gem-dark);
    border-radius: var(--radius-sm);
  }
}
</style>
