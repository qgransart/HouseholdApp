<script setup lang="ts">
import type { RoomView } from '~/composables/useGame'

defineProps<{
  rooms: RoomView[]
  currentMemberId: string | null
  selectedCategoryId: string | null
}>()

defineEmits<{ select: [categoryId: string] }>()

const HEALTH_CELLS = 5
</script>

<template>
  <ul
    class="house-map"
    role="list"
  >
    <li
      v-for="room in rooms"
      :key="room.category.id"
    >
      <button
        class="house-map__room"
        :class="`house-map__room--${room.condition}`"
        type="button"
        :aria-pressed="selectedCategoryId === room.category.id"
        :aria-label="`${room.category.name}, propreté ${Math.round(room.health * 100)} %, ${room.category.ownerMemberId === currentMemberId ? 'ta pièce' : `pièce de ${room.owner?.displayName ?? '?'}`}${room.triggeredSignals ? `, ${room.triggeredSignals} alerte(s)` : ''}`"
        @click="$emit('select', room.category.id)"
      >
        <span
          class="house-map__fx"
          aria-hidden="true"
        >
          <template v-if="room.condition !== 'clean'">
            <span
              v-for="index in (room.condition === 'dirty' ? 5 : 2)"
              :key="index"
              class="house-map__speck"
              :style="{ left: `${index * 17 - 5}%`, top: `${18 + (index % 2) * 30}%`, animationDelay: `${index * 0.4}s` }"
            />
          </template>
          <template v-else-if="room.health >= 0.85">
            <span
              class="house-map__sparkle"
              style="top: 20%; left: 18%"
            />
            <span
              class="house-map__sparkle"
              style="top: 40%; right: 16%; animation-delay: 0.6s"
            />
          </template>
        </span>
        <span
          class="house-map__owner"
          :class="{ 'house-map__owner--mine': room.category.ownerMemberId === currentMemberId }"
          aria-hidden="true"
        >{{ room.owner?.displayName.charAt(0).toUpperCase() }}</span>
        <span
          v-if="room.triggeredSignals"
          class="house-map__alert"
          aria-hidden="true"
        >!</span>
        <GameIcon
          class="house-map__icon"
          :name="room.category.icon"
        />
        <span class="house-map__name">{{ room.category.name }}</span>
        <span
          class="house-map__health"
          aria-hidden="true"
        >
          <span
            v-for="index in HEALTH_CELLS"
            :key="index"
            class="house-map__health-cell"
            :class="{ 'house-map__health-cell--on': index <= Math.round(room.health * HEALTH_CELLS) }"
          />
        </span>
      </button>
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.house-map {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  padding: var(--space-2);
  margin: 0;
  background: var(--color-wood);
  border: var(--border-width) solid var(--color-wood-dark);
  border-radius: var(--radius-md);

  &__room {
    --health-color: var(--color-state-fresh);

    position: relative;
    display: grid;
    gap: 0.3rem;
    justify-items: center;
    width: 100%;
    height: 100%;
    padding: 0.6rem 0.3rem 0.5rem;
    overflow: hidden;
    font-size: var(--font-size-xs);
    background: var(--color-cream);
    border: 2px solid transparent;
    border-radius: 0.75rem;
    transition: transform 120ms;

    &:active {
      transform: scale(0.96);
    }

    &[aria-pressed='true'] {
      background: var(--color-gem-soft);
      border-color: var(--color-gem);
    }

    &--average {
      --health-color: var(--color-state-soon);
    }

    &--dirty {
      --health-color: var(--color-state-due);
    }
  }

  &__fx {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  &__speck {
    position: absolute;
    width: 0.35rem;
    height: 0.35rem;
    background: #a79c8a;
    border-radius: 50%;
    opacity: 0.7;
    animation: room-drift 3s ease-in-out infinite;
  }

  &__sparkle {
    position: absolute;
    width: 0.6rem;
    height: 0.6rem;
    background: var(--color-gold);
    clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
    animation: room-twinkle 1.8s ease-in-out infinite;
  }

  &__owner {
    position: absolute;
    top: 0.3rem;
    left: 0.4rem;
    font-size: 0.65rem;
    font-weight: 800;
    color: var(--color-gem-dark);

    &--mine {
      color: var(--color-teal-dark);
    }
  }

  &__alert {
    position: absolute;
    top: 0.25rem;
    right: 0.3rem;
    display: grid;
    place-items: center;
    width: 1.3rem;
    height: 1.3rem;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 700;
    color: #fff;
    background: var(--color-red);
    border-radius: 50%;
    animation: room-bounce 900ms ease-in-out infinite;
  }

  &__icon {
    width: 2.1rem;
    height: 2.1rem;
  }

  &__name {
    font-weight: 800;
    line-height: 1.1;
    text-align: center;
  }

  &__health {
    display: flex;
    gap: 2px;
    width: 100%;
    max-width: 4.5rem;
  }

  &__health-cell {
    flex: 1;
    height: 0.45rem;
    background: var(--color-state-empty);
    border-radius: 2px;

    &--on {
      background: var(--health-color);
    }
  }
}

@keyframes room-drift {
  50% {
    opacity: 0.35;
    transform: translate(0.3rem, -0.4rem);
  }
}

@keyframes room-twinkle {
  50% {
    opacity: 0.3;
    transform: scale(0.4) rotate(45deg);
  }
}

@keyframes room-bounce {
  50% {
    transform: translateY(-3px);
  }
}
</style>
