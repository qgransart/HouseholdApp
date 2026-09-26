<script setup lang="ts">
import type { RoomIcon } from '#shared/types/entities'

export type GameIconName = RoomIcon | 'coin' | 'gem' | 'flame' | 'star' | 'check' | 'bell' | 'dice' | 'heart' | 'gear' | 'plane' | 'medal' | 'lock' | 'plus' | 'copy'

defineProps<{ name: GameIconName }>()
</script>

<template>
  <!-- Decorative: the meaning is always carried by adjacent text or an aria-label. -->
  <svg
    class="game-icon"
    aria-hidden="true"
    focusable="false"
  >
    <use :href="`#icon-${name}`" />
  </svg>
</template>

<style lang="scss" scoped>
.game-icon {
  flex: none;
  width: 1.25em;
  height: 1.25em;
}
</style>
