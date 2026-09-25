<script setup lang="ts">
const toast = useToast()
const { undo } = useGameActions()

async function onUndo(completionId: string) {
  toast.dismiss()
  await undo(completionId)
}
</script>

<template>
  <!-- The live region stays mounted so that every new message is announced. -->
  <div
    class="game-toast"
    role="status"
    aria-live="polite"
  >
    <div
      v-if="toast.current.value"
      :key="toast.current.value.id"
      class="game-toast__message"
    >
      <span>{{ toast.current.value.text }}</span>
      <button
        v-if="toast.current.value.undoCompletionId"
        class="game-toast__undo"
        type="button"
        @click="onUndo(toast.current.value.undoCompletionId)"
      >
        Annuler
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.game-toast {
  position: fixed;
  right: var(--gutter);
  bottom: calc(5.25rem + env(safe-area-inset-bottom, 0));
  left: var(--gutter);
  z-index: 30;
  pointer-events: none;

  &__message {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    justify-content: space-between;
    max-width: var(--content-max-width);
    min-height: var(--touch-target-min);
    padding: 0.35rem 0.4rem 0.35rem var(--space-4);
    margin-inline: auto;
    font-size: 0.9rem;
    color: #fff;
    pointer-events: auto;
    background: var(--color-text);
    border-radius: var(--radius-md);
    animation: toast-in var(--duration-base) var(--easing-standard);
  }

  &__undo {
    min-height: var(--touch-target-min);
    padding-inline: var(--space-3);
    font-weight: 800;
    color: var(--color-gold);
    border-radius: var(--radius-sm);
  }
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
}
</style>
