<script setup lang="ts">
const { $pwa } = useNuxtApp()
const updating = ref(false)

async function update() {
  updating.value = true
  await $pwa?.updateServiceWorker(true)
}
</script>

<template>
  <div
    v-if="$pwa?.needRefresh"
    class="update-prompt"
    role="status"
  >
    <p class="update-prompt__text">
      Nouvelle version disponible
    </p>
    <GameChunkyButton
      variant="gold"
      :disabled="updating"
      @click="update"
    >
      Mettre à jour
    </GameChunkyButton>
    <button
      class="update-prompt__later"
      type="button"
      @click="$pwa?.cancelPrompt()"
    >
      Plus tard
    </button>
  </div>
</template>

<style lang="scss" scoped>
.update-prompt {
  position: fixed;
  top: calc(var(--space-2) + env(safe-area-inset-top, 0));
  right: var(--gutter);
  left: var(--gutter);
  z-index: 40;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  align-items: center;
  max-width: var(--content-max-width);
  padding: var(--space-3) var(--space-4);
  margin-inline: auto;
  color: #fff;
  background: var(--color-text);
  border-radius: var(--radius-md);

  &__text {
    flex: 1;
    min-width: 10rem;
  }

  &__later {
    min-height: var(--touch-target-min);
    padding-inline: var(--space-2);
    font-weight: 800;
    color: var(--color-gold);
  }
}
</style>
