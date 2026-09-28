<script setup lang="ts">
const { alerts } = useGame()
const { toggleSignal } = useGameActions()
</script>

<template>
  <GamePanel
    v-if="alerts.length"
    title="Alertes"
    hint="Sonne chez la personne responsable"
  >
    <ul
      class="alert-board"
      role="list"
    >
      <li
        v-for="alert in alerts"
        :key="alert.task.id"
      >
        <button
          class="alert-board__button"
          type="button"
          :aria-pressed="alert.triggered"
          :disabled="alert.triggered && !alert.openSignal"
          @click="toggleSignal(alert.task.id, alert.openSignal?.id ?? null, alert.task.type === 'signal' ? alert.task.signalLabel : alert.task.name)"
        >
          <GameIcon name="bell" />
          {{ alert.task.type === 'signal' ? alert.task.signalLabel : alert.task.name }}
        </button>
      </li>
    </ul>
  </GamePanel>
</template>

<style lang="scss" scoped>
.alert-board {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;

  &__button {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    min-height: var(--touch-target-min);
    padding: 0.4rem 0.85rem 0.4rem 0.5rem;
    font-size: var(--font-size-sm);
    font-weight: 800;
    background: var(--color-surface);
    border: 2px solid var(--color-line);
    border-radius: var(--radius-full);
    box-shadow: 0 3px 0 var(--color-line);

    &:active:not(:disabled) {
      box-shadow: none;
      transform: translateY(3px);
    }

    :deep(.game-icon) {
      width: 1.3rem;
      height: 1.3rem;
      color: var(--color-text-muted);
    }

    &[aria-pressed='true'] {
      color: var(--color-red-dark);
      border-color: var(--color-red);
      box-shadow: 0 3px 0 var(--color-red-dark);

      :deep(.game-icon) {
        color: var(--color-red);
        animation: bell-ring 1s ease-in-out infinite;
      }
    }

    &:disabled {
      cursor: default;
    }
  }
}

@keyframes bell-ring {
  10%,
  30% {
    transform: rotate(14deg);
  }

  20%,
  40% {
    transform: rotate(-14deg);
  }

  50% {
    transform: none;
  }
}
</style>
