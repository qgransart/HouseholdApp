<script setup lang="ts">
import { centerOf } from '~/composables/useFx'

const { current, next } = useCelebrations()
const sound = useSound()
const fx = useFx()
const titleId = useId()

const open = computed({
  get: () => current.value !== null,
  set: (value) => {
    if (!value) {
      next()
    }
  },
})

const content = computed(() => {
  const celebration = current.value
  if (!celebration) {
    return null
  }
  switch (celebration.kind) {
    case 'level':
      return { title: 'Niveau supérieur !', text: `La maison passe au niveau ${celebration.level}. Continuez comme ça !` }
    case 'chest':
      return { title: 'Coffre ouvert !', text: `Vous avez rempli le coffre de la semaine à deux : la récompense commune est débloquée. Série : ${celebration.streak} semaine${celebration.streak > 1 ? 's' : ''}.` }
    case 'badge':
      return { title: `Badge : ${celebration.name}`, text: `${celebration.hint}. Retrouve tes badges dans Trophées.` }
    default:
      return null
  }
})

watch(current, (celebration) => {
  if (celebration) {
    sound.play('fanfare')
    fx.confetti(centerOf(document.body), 40)
  }
})
</script>

<template>
  <GameDialog
    v-model:open="open"
    :labelledby="titleId"
  >
    <template v-if="current && content">
      <div
        v-if="current.kind === 'level'"
        class="celebration__badge tabular-nums"
        aria-hidden="true"
      >
        {{ current.level }}
      </div>
      <div
        v-else-if="current.kind === 'badge'"
        class="celebration__medal"
        aria-hidden="true"
      >
        <GameIcon name="medal" />
      </div>
      <svg
        v-else
        class="celebration__chest"
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <circle
          cx="32"
          cy="30"
          r="28"
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
        <path
          d="M8 30l4-14h40l4 14z"
          fill="#d99a63"
          stroke="#6b3f1d"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <use
          href="#icon-coin"
          x="18"
          y="16"
          width="13"
          height="13"
        />
        <use
          href="#icon-gem"
          x="32"
          y="12"
          width="15"
          height="15"
        />
      </svg>
      <h2
        :id="titleId"
        class="celebration__title"
      >
        {{ content.title }}
      </h2>
      <p class="celebration__text">
        {{ content.text }}
      </p>
      <GameChunkyButton
        variant="gold"
        block
        @click="open = false"
      >
        Super !
      </GameChunkyButton>
    </template>
  </GameDialog>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins';

.celebration {
  &__badge {
    @include mixins.display-text;

    display: grid;
    place-items: center;
    width: 5.5rem;
    height: 5.5rem;
    font-size: 2.4rem;
    font-weight: 700;
    color: #fff;
    background: var(--color-gem);
    border: 5px solid var(--color-gem-soft);
    border-radius: 50%;
  }

  &__chest {
    width: 6rem;
    height: 6rem;
  }

  &__medal {
    display: grid;
    place-items: center;
    width: 5.5rem;
    height: 5.5rem;
    font-size: 3rem;
    background: var(--color-gold-soft);
    border: 4px solid var(--color-gold);
    border-radius: 50%;
  }

  &__title {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  &__text {
    color: var(--color-text-muted);
  }
}
</style>
