<script setup lang="ts">
defineProps<{
  title: string
  hint?: string
  /** Heading level: the page title is the only h1. */
  level?: 1 | 2
}>()

const titleId = useId()
</script>

<template>
  <section
    class="game-panel"
    :aria-labelledby="titleId"
  >
    <div class="game-panel__head">
      <component
        :is="`h${level ?? 2}`"
        :id="titleId"
        class="game-panel__title"
      >
        {{ title }}
      </component>
      <slot name="aside">
        <p
          v-if="hint"
          class="game-panel__hint"
        >
          {{ hint }}
        </p>
      </slot>
    </div>
    <slot />
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins';

.game-panel {
  @include mixins.panel;

  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);

  &__head {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
    align-items: baseline;
    justify-content: space-between;
  }

  &__title {
    font-size: var(--font-size-xl);
    font-weight: 700;
  }

  &__hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }
}
</style>
