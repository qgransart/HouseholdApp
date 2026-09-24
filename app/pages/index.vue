<template>
  <main class="home">
    <h1 class="home__title">
      HouseholdApp
    </h1>
    <p class="home__subtitle">
      Le ménage, en mode jeu de gestion.
    </p>
  </main>
</template>

<style lang="scss" scoped>
.home {
  display: grid;
  gap: var(--space-2);
  place-content: center;
  min-height: 100dvh;
  padding: var(--space-6);
  text-align: center;

  &__title {
    font-size: var(--font-size-2xl);
  }

  &__subtitle {
    color: var(--color-text-muted);
  }
}
</style>
