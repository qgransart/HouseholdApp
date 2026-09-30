<script setup lang="ts">
import { isoDayOfWeek } from '#shared/domain'

/** Link to the weekly recap (CONCEPT §9 bis); on the quests screen, only on Sunday and Monday. */
const props = defineProps<{ always?: boolean }>()
const game = useGame()
const shown = computed(() => game.partner.value !== null && (props.always || [7, 1].includes(isoDayOfWeek(game.today.value))))
const week = computed(() => isoDayOfWeek(game.today.value) === 1 ? 'precedente' : undefined)
</script>

<template>
  <NuxtLink
    v-if="shown"
    class="recap-banner"
    :to="{ path: '/recap', query: week ? { semaine: week } : {} }"
  >
    <span
      class="recap-banner__emoji"
      aria-hidden="true"
    >💞</span>
    <span class="recap-banner__text">
      <strong>Notre semaine</strong>
      Ce que {{ game.partner.value?.displayName }} a fait, et un merci en un tap
    </span>
  </NuxtLink>
</template>

<style lang="scss" scoped>
.recap-banner {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  min-height: var(--touch-target-min);
  padding: var(--space-3);
  color: var(--color-text);
  text-decoration: none;
  background: var(--color-gem-soft);
  border: var(--border-width) solid var(--color-gem);
  border-radius: var(--radius-md);

  &:focus-visible {
    outline: 3px solid var(--color-gem);
    outline-offset: 2px;
  }

  &__emoji {
    font-size: 1.75rem;
  }

  &__text {
    display: grid;
    font-size: var(--font-size-sm);
  }
}
</style>
