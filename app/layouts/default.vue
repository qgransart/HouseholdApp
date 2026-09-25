<script setup lang="ts">
// Routing to the onboarding is handled by the onboarding middleware.
const { isReady } = useHousehold()
</script>

<template>
  <div class="game-layout">
    <template v-if="isReady">
      <GameAppHud />
      <main class="game-layout__main">
        <slot />
      </main>
      <GameBottomNav />
      <GameToast />
      <GameCelebrationDialog />
      <GameUpdatePrompt />
    </template>
    <p
      v-else
      class="game-layout__loading"
      role="status"
    >
      Chargement de la maison…
    </p>
  </div>
</template>

<style lang="scss" scoped>
.game-layout {
  max-width: calc(var(--content-max-width) + 2 * var(--gutter));
  padding-inline: var(--gutter);
  margin-inline: auto;

  &__main {
    padding-block: var(--space-5) calc(6.5rem + env(safe-area-inset-bottom, 0));
  }

  &__loading {
    padding-block: var(--space-8);
    text-align: center;
  }
}
</style>
