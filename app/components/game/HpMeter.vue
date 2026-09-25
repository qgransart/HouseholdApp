<script setup lang="ts">
import type { FreshnessStatus } from '#shared/domain/freshness'

const props = withDefaults(defineProps<{
  ratio: number
  status: FreshnessStatus
  daysOverdue?: number
  cells?: number
  /** What is measured, for screen readers (e.g. the task name). */
  subject: string
}>(), {
  daysOverdue: 0,
  cells: 8,
})

const STATUS_LABELS: Record<FreshnessStatus, string> = {
  fresh: 'Nickel',
  soon: 'Bientôt',
  due: 'À faire',
  late: 'En retard',
}

const percent = computed(() => Math.round(props.ratio * 100))
const filled = computed(() => Math.round(props.ratio * props.cells))
const label = computed(() => props.status === 'late'
  ? `En retard de ${props.daysOverdue} j`
  : `${STATUS_LABELS[props.status]} · ${percent.value} %`)
</script>

<template>
  <div
    class="hp-meter"
    :class="`hp-meter--${status}`"
    role="meter"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="percent"
    :aria-valuetext="`${subject} : ${label}`"
  >
    <span
      class="hp-meter__cells"
      aria-hidden="true"
    >
      <span
        v-for="index in cells"
        :key="index"
        class="hp-meter__cell"
        :class="{ 'hp-meter__cell--on': index <= filled }"
      />
    </span>
    <span
      class="hp-meter__label"
      aria-hidden="true"
    >{{ label }}</span>
  </div>
</template>

<style lang="scss" scoped>
.hp-meter {
  --state-color: var(--color-state-fresh);
  --label-color: var(--color-state-fresh);

  display: flex;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--font-size-xs);
  font-weight: 800;

  &--soon {
    --state-color: var(--color-state-soon);
    --label-color: var(--color-state-soon-text);
  }

  &--due {
    --state-color: var(--color-state-due);
    --label-color: var(--color-red-dark);
  }

  &--late {
    --state-color: var(--color-state-late);
    --label-color: var(--color-red-dark);
  }

  &__cells {
    display: flex;
    gap: 2px;
  }

  &__cell {
    width: 0.7rem;
    height: 0.55rem;
    background: var(--color-state-empty);
    border-radius: 2px;

    &--on {
      background: var(--state-color);
    }
  }

  &--late &__cell {
    background: var(--color-red-soft);
    box-shadow: inset 0 0 0 1px var(--color-state-late);
  }

  &__label {
    color: var(--label-color);
  }
}
</style>
