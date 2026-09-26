<script setup lang="ts">
import { computeQuotaProgress, type Task } from '#shared/domain'
import type { CategoryRow } from '#shared/types/entities'

useHead({ title: 'La maison' })

const game = useGame()
const { complete, setVacation, changeOwner } = useGameActions()

const selectedTask = ref<Task | null>(null)
const taskSheetOpen = ref(false)
const ownerRoom = ref<CategoryRow | null>(null)
const ownerSheetOpen = ref(false)
const ownerTitleId = useId()

const vacation = computed({
  get: () => game.vacationActive.value,
  set: value => void setVacation(value),
})

const rooms = computed(() => game.rooms.value.map(room => ({
  ...room,
  tasks: game.tasks.value
    .filter(task => task.categoryId === room.category.id)
    .sort((a, b) => Number(b.active) - Number(a.active)
      || (game.freshnessByTask.value.get(a.id)?.ratio ?? 1) - (game.freshnessByTask.value.get(b.id)?.ratio ?? 1)),
})))

function detail(task: Task): string {
  if (!task.active) {
    return 'Désactivée'
  }
  if (task.snoozedUntil && task.snoozedUntil >= game.today.value) {
    return `Reportée jusqu'au ${new Date(`${task.snoozedUntil}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
  }
  if (task.type === 'quota') {
    const quota = computeQuotaProgress(task, game.progress.value.get(task.id)?.completionsThisWeek ?? 0, game.today.value, game.vacations.value)
    return `${quota.done} / ${quota.target} cette semaine`
  }
  if (task.type === 'signal') {
    const alert = game.alerts.value.find(a => a.task.id === task.id)
    return alert?.triggered ? `${task.signalLabel} : à faire` : `Sur alerte « ${task.signalLabel} »`
  }
  return `Tous les ${task.intervalDays} j`
}

function openTask(task: Task) {
  selectedTask.value = task
  taskSheetOpen.value = true
}

function openOwner(room: CategoryRow) {
  ownerRoom.value = room
  ownerSheetOpen.value = true
}

async function pickOwner(memberId: string) {
  if (ownerRoom.value) {
    await changeOwner(ownerRoom.value.id, memberId)
  }
  ownerSheetOpen.value = false
}
</script>

<template>
  <div class="house-page">
    <h1 class="house-page__title">
      La maison
    </h1>

    <section
      class="house-page__vacation"
      aria-label="Mode vacances"
    >
      <GameSwitch
        v-model="vacation"
        label="Mode vacances"
        hint="Le temps s'arrête : rien ne se salit, pas de quêtes, la série est préservée."
      />
    </section>

    <GamePanel
      v-for="room in rooms"
      :key="room.category.id"
      :title="room.category.name"
    >
      <template #aside>
        <button
          class="owner-chip"
          type="button"
          :aria-label="`Responsable : ${room.owner?.displayName ?? '?'}. Changer`"
          @click="openOwner(room.category)"
        >
          <GameIcon :name="room.category.icon" />
          {{ room.owner?.displayName }}
        </button>
      </template>
      <p class="house-page__health">
        Propreté {{ Math.round(room.health * 100) }} %
      </p>
      <ul
        class="room-tasks"
        role="list"
      >
        <li
          v-for="task in room.tasks"
          :key="task.id"
          class="room-tasks__item"
          :class="{ 'room-tasks__item--off': !task.active }"
        >
          <button
            class="room-tasks__main"
            type="button"
            :aria-label="`${task.name} : détails et réglages`"
            @click="openTask(task)"
          >
            <span class="room-tasks__name">{{ task.name }}</span>
            <GameHpMeter
              v-if="task.active && game.freshnessByTask.value.get(task.id)"
              :ratio="game.freshnessByTask.value.get(task.id)!.ratio"
              :status="game.freshnessByTask.value.get(task.id)!.status"
              :days-overdue="game.freshnessByTask.value.get(task.id)!.daysOverdue"
              :subject="task.name"
            />
            <span class="room-tasks__detail">{{ detail(task) }} · {{ task.durationMin }} min</span>
          </button>
          <GameChunkyButton
            v-if="task.active"
            variant="ghost"
            :aria-label="`C'est fait : ${task.name}`"
            @click="complete(task, $event.currentTarget as HTMLElement)"
          >
            <GameIcon name="check" />
          </GameChunkyButton>
        </li>
      </ul>
    </GamePanel>

    <GameTaskSheet
      v-model:open="taskSheetOpen"
      :task="selectedTask"
    />

    <GameDialog
      v-model:open="ownerSheetOpen"
      variant="sheet"
      :labelledby="ownerTitleId"
    >
      <h2
        :id="ownerTitleId"
        class="house-page__sheet-title"
      >
        Responsable : {{ ownerRoom?.name }}
      </h2>
      <p class="house-page__health">
        Ses quêtes apparaîtront chez cette personne. L'autre peut toujours donner un coup de main.
      </p>
      <GameChunkyButton
        v-for="member in game.members.value"
        :key="member.id"
        :variant="ownerRoom?.ownerMemberId === member.id ? 'teal' : 'ghost'"
        block
        @click="pickOwner(member.id)"
      >
        {{ member.displayName }}
      </GameChunkyButton>
    </GameDialog>
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins';

.house-page {
  display: grid;
  gap: var(--space-5);

  &__title {
    font-size: var(--font-size-2xl);
  }

  &__vacation {
    @include mixins.panel;

    padding: var(--space-4);
  }

  &__health {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__sheet-title {
    font-size: var(--font-size-xl);
  }
}

.owner-chip {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  min-height: 2.5rem;
  padding: 0.15rem 0.7rem 0.15rem 0.35rem;
  font-size: var(--font-size-xs);
  font-weight: 800;
  background: var(--color-surface);
  border: 2px solid var(--color-line);
  border-radius: var(--radius-full);

  :deep(.game-icon) {
    width: 1.5rem;
    height: 1.5rem;
  }
}

.room-tasks {
  display: grid;
  margin: 0;

  &__item {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    padding-block: var(--space-2);
    border-top: 2px solid var(--color-line);

    &:first-child {
      padding-top: 0;
      border-top: 0;
    }

    &--off {
      opacity: 0.55;
    }
  }

  &__main {
    display: grid;
    flex: 1;
    gap: 0.25rem;
    min-width: 0;
    padding: var(--space-1);
    text-align: left;
    border-radius: var(--radius-sm);
  }

  &__name {
    font-family: var(--font-display);
    font-weight: 600;
  }

  &__detail {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
  }
}
</style>
