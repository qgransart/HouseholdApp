<script setup lang="ts">
const props = withDefaults(defineProps<{
  labelledby: string
  variant?: 'modal' | 'sheet'
}>(), { variant: 'modal' })

const open = defineModel<boolean>('open', { required: true })
const dialog = useTemplateRef<HTMLDialogElement>('dialog')

// Native <dialog>: focus trap, Escape, inert background and focus restoration come from the platform.
watch([open, dialog], ([isOpen, element]) => {
  if (!element) {
    return
  }
  if (isOpen && !element.open) {
    element.showModal()
  }
  else if (!isOpen && element.open) {
    element.close()
  }
}, { immediate: true, flush: 'post' })

function onBackdropClick(event: MouseEvent) {
  if (props.variant === 'sheet' && event.target === dialog.value) {
    open.value = false
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    class="game-dialog"
    :class="`game-dialog--${variant}`"
    :aria-labelledby="labelledby"
    @close="open = false"
    @click="onBackdropClick"
  >
    <div class="game-dialog__panel">
      <slot />
    </div>
  </dialog>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins';

.game-dialog {
  max-width: none;
  max-height: none;
  padding: 0;
  color: var(--color-text);
  background: transparent;
  border: 0;

  &::backdrop {
    background: var(--color-overlay);
  }

  &__panel {
    display: grid;
    gap: var(--space-4);
    background: var(--color-paper);
  }

  &--modal {
    width: min(100% - 2 * var(--gutter), 22rem);
    margin: auto;
  }

  &--modal &__panel {
    justify-items: center;
    padding: var(--space-6) var(--space-5);
    text-align: center;
    border: var(--border-width) solid var(--color-line);
    border-radius: var(--radius-lg);
    animation: dialog-pop 400ms var(--easing-bounce);
  }

  &--sheet {
    width: 100%;
    max-width: calc(var(--content-max-width) + 2 * var(--gutter));
    margin: auto auto 0;
  }

  &--sheet &__panel {
    padding: var(--space-4) var(--gutter) calc(var(--space-5) + env(safe-area-inset-bottom, 0));
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    animation: dialog-slide 250ms var(--easing-standard);
  }
}

@keyframes dialog-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

@keyframes dialog-slide {
  from {
    transform: translateY(100%);
  }
}
</style>
