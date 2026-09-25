<script setup lang="ts">
definePageMeta({ layout: 'bare' })
useHead({ title: 'Connexion' })

const route = useRoute()

const ERRORS: Record<string, string> = {
  'non-autorise': 'Ce compte Google n\'est pas autorisé pour cette maison. Utilise l\'adresse enregistrée par le foyer.',
  'google': 'La connexion avec Google a échoué. Réessaie dans un instant.',
}

const error = computed(() => ERRORS[String(route.query.erreur ?? '')] ?? '')
const online = ref(true)
onMounted(() => {
  online.value = navigator.onLine
})
</script>

<template>
  <div class="login">
    <img
      class="login__logo"
      src="/pwa-192x192.png"
      alt=""
      width="96"
      height="96"
    >
    <h1 class="login__title">
      Quêtes de la maison
    </h1>
    <p class="login__lead">
      Le ménage à deux, en mode jeu. Connecte-toi avec ton compte Google pour créer ou rejoindre votre maison.
    </p>
    <p
      v-if="error"
      class="login__error"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-if="!online"
      class="login__error"
      role="status"
    >
      Pas de réseau : la connexion sera possible dès le retour d'Internet.
    </p>
    <GameChunkyButton
      href="/auth/google"
      variant="gold"
      size="lg"
      block
    >
      Continuer avec Google
    </GameChunkyButton>
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins';

.login {
  @include mixins.panel;

  display: grid;
  gap: var(--space-4);
  justify-items: center;
  padding: var(--space-8) var(--space-5);
  margin-top: 10vh;
  text-align: center;

  &__logo {
    border-radius: var(--radius-lg);
  }

  &__title {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  &__lead {
    color: var(--color-text-muted);
  }

  &__error {
    width: 100%;
    padding: var(--space-3);
    color: var(--color-red-dark);
    background: var(--color-red-soft);
    border-radius: var(--radius-md);
  }
}
</style>
