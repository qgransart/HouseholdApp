<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'teal' | 'gold' | 'gem' | 'ghost'
  size?: 'md' | 'lg'
  block?: boolean
  type?: 'button' | 'submit'
  /** Renders a link instead of a button (full page navigation, e.g. to the Google sign-in). */
  href?: string
}>(), {
  variant: 'teal',
  size: 'md',
  block: false,
  type: 'button',
})
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    :type="href ? undefined : type"
    :href="href"
    class="chunky-button"
    :class="[`chunky-button--${variant}`, `chunky-button--${size}`, { 'chunky-button--block': block }]"
  >
    <slot />
  </component>
</template>

<style lang="scss" scoped>
// 3D "press" button: the drop shadow flattens when pressed (ARCHITECTURE §10.2).
.chunky-button {
  --button-bg: var(--color-teal);
  --button-shade: var(--color-teal-dark);
  --button-ink: #fff;

  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: center;
  min-height: var(--touch-target-min);
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--button-ink);
  text-decoration: none;
  background: var(--button-bg);
  border-radius: var(--radius-md);
  box-shadow: 0 var(--press-depth) 0 var(--button-shade);
  transition: transform var(--duration-fast), box-shadow var(--duration-fast);

  &:active:not(:disabled) {
    box-shadow: 0 0 0 var(--button-shade);
    transform: translateY(var(--press-depth));
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  &--gold {
    --button-bg: var(--color-gold);
    --button-shade: var(--color-gold-dark);
    --button-ink: var(--color-text);
  }

  &--gem {
    --button-bg: var(--color-gem);
    --button-shade: var(--color-gem-dark);
  }

  &--ghost {
    --button-bg: var(--color-paper);
    --button-shade: var(--color-line-strong);
    --button-ink: var(--color-text);
  }

  &--lg {
    min-height: 3.5rem;
    font-size: 1.2rem;
  }

  &--block {
    width: 100%;
  }
}
</style>
