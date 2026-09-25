<script setup lang="ts">
import { computeQuotaProgress, type Task } from '#shared/domain'

useHead({ title: 'La maison' })

const game = useGame()
const { complete } = useGameActions()

const rooms = computed(() => game.rooms.value.map(room => ({
  ...room,
  tasks: game.tasks.value
    .filter(task => task.categoryId === room.category.id && task.active)
    .sort((a, b) => (game.freshnessByTask.value.get(a.id)?.ratio ?? 1) - (game.freshnessByTask.value.get(b.id)?.ratio ?? 1)),
})))

function detail(task: Task): string {
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
</script>

<template>
  <div class="house-page">
    <h1 class="house-title">
      La maison
    </h1>
    <GamePanel
      v-for="room in rooms"
      :key="room.category.id"
      :title="room.category.name"
      :hint="room.owner ? `Responsable : ${room.owner.displayName}` : undefined"
    >
      <ul
        class="room-tasks"
        role="list"
      >
        <li
          v-for="task in room.tasks"
          :key="task.id"
          class="room-tasks__item"
        >
          <div class="room-tasks__main">
            <h3 class="room-tasks__name">
              {{ task.name }}
            </h3>
            <GameHpMeter
              v-if="game.freshnessByTask.value.get(task.id)"
              :ratio="game.freshnessByTask.value.get(task.id)!.ratio"
              :status="game.freshnessByTask.value.get(task.id)!.status"
              :days-overdue="game.freshnessByTask.value.get(task.id)!.daysOverdue"
              :subject="task.name"
            />
            <p class="room-tasks__detail">
              {{ detail(task) }} · {{ task.durationMin }} min
            </p>
          </div>
          <GameChunkyButton
            variant="ghost"
            :aria-label="`C'est fait : ${task.name}`"
            @click="complete(task, $event.currentTarget as HTMLElement)"
          >
            <GameIcon name="check" />
          </GameChunkyButton>
        </li>
      </ul>
    </GamePanel>
  </div>
</template>

<style lang="scss" scoped>
.house-page {
  display: grid;
  gap: var(--space-5);
}

.house-title {
  font-size: var(--font-size-2xl);
}

.room-tasks {
  display: grid;
  margin: 0;

  &__item {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    padding-block: var(--space-3);
    border-top: 2px solid var(--color-line);

    &:first-child {
      padding-top: 0;
      border-top: 0;
    }
  }

  &__main {
    display: grid;
    flex: 1;
    gap: 0.3rem;
    min-width: 0;
  }

  &__name {
    font-size: var(--font-size-md);
  }

  &__detail {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }
}
</style>
