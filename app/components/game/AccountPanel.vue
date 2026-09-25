<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()
const toast = useToast()

async function signOut() {
  await clear()
  toast.show('Déconnecté. Tu peux continuer à jouer sur ce téléphone.')
}
</script>

<template>
  <GamePanel title="Compte">
    <template v-if="loggedIn && user">
      <p class="account-panel__text">
        Connecté avec <strong>{{ user.email }}</strong>
      </p>
      <GameChunkyButton
        variant="ghost"
        block
        @click="signOut"
      >
        Se déconnecter
      </GameChunkyButton>
    </template>
    <template v-else>
      <p class="account-panel__text">
        Connecte-toi pour partager la maison entre vos deux téléphones.
      </p>
      <GameChunkyButton
        href="/auth/google"
        variant="gold"
        block
      >
        Continuer avec Google
      </GameChunkyButton>
    </template>
  </GamePanel>
</template>

<style lang="scss" scoped>
.account-panel__text {
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}
</style>
