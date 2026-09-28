<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
}>()

const checked = defineModel<boolean>({ required: true })
const labelId = useId()
const hintId = useId()
</script>

<template>
  <div class="game-switch">
    <span class="game-switch__text">
      <span
        :id="labelId"
        class="game-switch__label"
      >{{ label }}</span>
      <span
        v-if="hint"
        :id="hintId"
        class="game-switch__hint"
      >{{ hint }}</span>
    </span>
    <button
      class="game-switch__control"
      type="button"
      role="switch"
      :aria-checked="checked"
      :aria-labelledby="labelId"
      :aria-describedby="hint ? hintId : undefined"
      @click="checked = !checked"
    />
  </div>
</template>

<style lang="scss" scoped>
.game-switch {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;

  &__text {
    display: grid;
    gap: 0.1rem;
  }

  &__label {
    font-weight: 800;
  }

  &__hint {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__control {
    position: relative;
    flex: none;
    width: 3.2rem;
    height: 1.9rem;
    background: var(--color-line-strong);
    border-radius: var(--radius-full);
    transition: background var(--duration-base);

    &::after {
      position: absolute;
      top: 0.2rem;
      left: 0.2rem;
      width: 1.5rem;
      height: 1.5rem;
      content: '';
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 2px 0 rgb(43 45 66 / 20%);
      transition: transform var(--duration-base);
    }

    &[aria-checked='true'] {
      background: var(--color-teal);

      &::after {
        transform: translateX(1.3rem);
      }
    }
  }
}
</style>
