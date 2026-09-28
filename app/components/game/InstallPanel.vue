<script setup lang="ts">
const { $pwa } = useNuxtApp()
</script>

<template>
  <GamePanel
    v-if="$pwa?.showInstallPrompt && !$pwa?.isPWAInstalled"
    title="Installer l'app"
  >
    <p class="install-panel__text">
      Ajoute la maison à ton écran d'accueil : elle s'ouvrira comme une vraie app, même sans réseau.
    </p>
    <div class="install-panel__actions">
      <GameChunkyButton
        variant="gold"
        @click="$pwa?.install()"
      >
        Installer
      </GameChunkyButton>
      <GameChunkyButton
        variant="ghost"
        @click="$pwa?.cancelInstall()"
      >
        Pas maintenant
      </GameChunkyButton>
    </div>
  </GamePanel>
</template>

<style lang="scss" scoped>
.install-panel {
  &__text {
    color: var(--color-text-muted);
  }

  &__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }
}
</style>
