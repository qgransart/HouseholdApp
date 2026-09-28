<template>
  <div class="bare-layout">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.bare-layout {
  max-width: calc(var(--content-max-width) + 2 * var(--gutter));
  padding: var(--space-6) var(--gutter) var(--space-8);
  margin-inline: auto;
}
</style>
