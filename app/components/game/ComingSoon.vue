<script setup lang="ts">
defineProps<{ title: string, features: string[] }>()
</script>

<template>
  <GamePanel
    :title="title"
    :level="1"
  >
    <p class="coming-soon__lead">
      Bientôt dans la maison :
    </p>
    <ul class="coming-soon__list">
      <li
        v-for="feature in features"
        :key="feature"
      >
        {{ feature }}
      </li>
    </ul>
  </GamePanel>
</template>

<style lang="scss" scoped>
.coming-soon {
  &__lead {
    color: var(--color-text-muted);
  }

  &__list {
    display: grid;
    gap: var(--space-2);
    padding-left: var(--space-5);
  }
}
</style>
