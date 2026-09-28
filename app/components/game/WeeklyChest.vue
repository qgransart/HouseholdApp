<script setup lang="ts">
import type { WeeklyGauge } from '#shared/domain'

const props = defineProps<{ gauge: WeeklyGauge }>()

const titleId = useId()
const formatNumber = (value: number) => value.toLocaleString('fr-FR')
const isReady = computed(() => !props.gauge.achieved && props.gauge.ratio >= 0.95)
</script>

<template>
  <section
    class="weekly-chest"
    :class="{ 'weekly-chest--open': gauge.achieved, 'weekly-chest--ready': isReady }"
    :aria-labelledby="titleId"
  >
    <svg
      class="weekly-chest__art"
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <circle
        class="weekly-chest__glow"
        cx="32"
        cy="30"
        r="26"
        fill="#fff3b0"
      />
      <rect
        x="8"
        y="30"
        width="48"
        height="26"
        rx="4"
        fill="#c98b55"
        stroke="#6b3f1d"
        stroke-width="3"
      />
      <rect
        x="8"
        y="38"
        width="48"
        height="5"
        fill="#9a6232"
      />
      <rect
        x="28"
        y="34"
        width="8"
        height="10"
        rx="2"
        fill="#ffc53d"
        stroke="#6b3f1d"
        stroke-width="2"
      />
      <g class="weekly-chest__lid">
        <path
          d="M8 30v-6a12 12 0 0 1 12-12h24a12 12 0 0 1 12 12v6z"
          fill="#d99a63"
          stroke="#6b3f1d"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <path
          d="M20 12v18M44 12v18"
          stroke="#9a6232"
          stroke-width="3"
        />
      </g>
    </svg>
    <div class="weekly-chest__body">
      <h2
        :id="titleId"
        class="weekly-chest__title"
      >
        Coffre de la semaine
      </h2>
      <div
        v-if="!gauge.frozen"
        class="weekly-chest__bar"
        role="progressbar"
        :aria-labelledby="titleId"
        aria-valuemin="0"
        :aria-valuemax="gauge.target"
        :aria-valuenow="Math.min(gauge.earned, gauge.target)"
        :aria-valuetext="`${gauge.earned} sur ${gauge.target} XP`"
      >
        <div
          class="weekly-chest__fill"
          :style="{ width: `${gauge.ratio * 100}%` }"
        />
        <span
          class="weekly-chest__value tabular-nums"
          aria-hidden="true"
        >{{ formatNumber(gauge.earned) }} / {{ formatNumber(gauge.target) }} XP</span>
      </div>
      <p class="weekly-chest__hint">
        <template v-if="gauge.frozen">
          Semaine de vacances : le coffre attend votre retour.
        </template>
        <template v-else-if="gauge.achieved">
          Coffre ouvert ! La récompense commune est débloquée.
        </template>
        <template v-else>
          Remplissez-le à deux pour débloquer la récompense commune.
        </template>
      </p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins';

.weekly-chest {
  @include mixins.panel;

  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);

  &__art {
    width: 4rem;
    height: 4rem;
  }

  &--ready &__art {
    animation: chest-wiggle 1.2s ease-in-out infinite;
  }

  &__glow {
    opacity: 0;
    transition: opacity var(--duration-slow);
  }

  &--open &__glow {
    opacity: 1;
  }

  &__lid {
    transform-origin: 10% 55%;
    transition: transform 500ms var(--easing-bounce);
  }

  &--open &__lid {
    transform: rotate(-28deg) translateY(-2px);
  }

  &__body {
    display: grid;
    gap: 0.35rem;
  }

  &__title {
    font-size: var(--font-size-lg);
  }

  &__bar {
    position: relative;
    height: 1.1rem;
    overflow: hidden;
    background: var(--color-line);
    border-radius: var(--radius-full);
    box-shadow: inset 0 2px 0 rgb(43 45 66 / 10%);
  }

  &__fill {
    height: 100%;
    background: linear-gradient(var(--color-gold), var(--color-gold-dark));
    border-radius: inherit;
    transition: width var(--duration-slow) var(--easing-standard);
  }

  &__value {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 0.72rem;
    font-weight: 800;
  }

  &__hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }
}

@keyframes chest-wiggle {
  10%,
  30% {
    transform: rotate(-6deg);
  }

  20%,
  40% {
    transform: rotate(6deg);
  }

  50% {
    transform: rotate(0);
  }
}
</style>
