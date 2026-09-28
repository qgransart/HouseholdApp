<script setup lang="ts">
const { currentMember, partner, canSwitchMember, switchMember } = useHousehold()
const { level, coins, streak } = useGame()

const initial = computed(() => currentMember.value?.displayName.charAt(0).toUpperCase() ?? '?')
const formatNumber = (value: number) => value.toLocaleString('fr-FR')

// Bumps the coin counter when coins arrive.
const coinsBump = ref(false)
watch(coins, (value, previous) => {
  if (value > previous) {
    coinsBump.value = false
    requestAnimationFrame(() => {
      coinsBump.value = true
    })
  }
})
</script>

<template>
  <header class="app-hud">
    <component
      :is="canSwitchMember ? 'button' : 'div'"
      class="app-hud__avatar"
      :type="canSwitchMember ? 'button' : undefined"
      :style="{ '--xp-ratio': level.ratio }"
      :aria-label="canSwitchMember && partner ? `Joueur : ${currentMember?.displayName}. Passer à ${partner.displayName}` : undefined"
      @click="canSwitchMember && switchMember()"
    >
      <span
        class="app-hud__initial"
        aria-hidden="true"
      >{{ initial }}</span>
      <span
        class="app-hud__level tabular-nums"
        aria-hidden="true"
      >{{ level.level }}</span>
    </component>

    <div class="app-hud__progress">
      <p class="app-hud__name">
        {{ currentMember?.displayName }}
      </p>
      <div
        class="app-hud__xp"
        role="progressbar"
        aria-label="Expérience du foyer"
        aria-valuemin="0"
        :aria-valuemax="level.xpForNextLevel"
        :aria-valuenow="level.xpIntoLevel"
        :aria-valuetext="`Niveau ${level.level}, ${level.xpIntoLevel} sur ${level.xpForNextLevel} XP`"
      >
        <div
          class="app-hud__xp-fill"
          :style="{ width: `${level.ratio * 100}%` }"
        />
      </div>
      <p class="app-hud__xp-text tabular-nums">
        Niv. {{ level.level }} · {{ formatNumber(level.xpIntoLevel) }} / {{ formatNumber(level.xpForNextLevel) }} XP
      </p>
    </div>

    <div class="app-hud__stats">
      <p
        class="app-hud__stat"
        :class="{ 'app-hud__stat--bump': coinsBump }"
        data-coin-target
        @animationend="coinsBump = false"
      >
        <GameIcon name="coin" />
        <span class="tabular-nums">{{ formatNumber(coins) }}</span>
        <span class="visually-hidden">pièces</span>
      </p>
      <p class="app-hud__stat">
        <GameIcon name="flame" />
        <span class="tabular-nums">{{ streak }}</span>
        <span class="visually-hidden">semaines de série</span>
      </p>
      <NuxtLink
        class="app-hud__gear"
        to="/reglages"
        aria-label="Réglages"
        active-class="app-hud__gear--active"
      >
        <GameIcon name="gear" />
      </NuxtLink>
    </div>
  </header>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins';

.app-hud {
  position: sticky;
  top: env(safe-area-inset-top, 0);
  z-index: 20;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
  margin-inline: calc(-1 * var(--gutter));
  padding: var(--space-3) var(--gutter);
  background: var(--color-paper);
  border-bottom: var(--border-width) solid var(--color-line);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);

  &__avatar {
    position: relative;
    display: grid;
    place-items: center;
    width: 3.25rem;
    height: 3.25rem;
    background: conic-gradient(var(--color-gem) calc(var(--xp-ratio) * 1turn), var(--color-line) 0);
    border-radius: 50%;
  }

  &__initial {
    @include mixins.display-text;

    display: grid;
    place-items: center;
    width: 2.6rem;
    height: 2.6rem;
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: #fff;
    background: var(--color-teal);
    border-radius: 50%;
  }

  &__level {
    @include mixins.display-text;

    position: absolute;
    right: -0.35rem;
    bottom: -0.3rem;
    min-width: 1.6rem;
    padding: 0 0.3rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: #fff;
    text-align: center;
    background: var(--color-gem);
    border: 2px solid var(--color-paper);
    border-radius: var(--radius-full);
  }

  &__progress {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
  }

  &__name {
    @include mixins.display-text;

    font-size: 1.05rem;
  }

  &__xp {
    height: 0.8rem;
    overflow: hidden;
    background: var(--color-line);
    border-radius: var(--radius-full);
  }

  &__xp-fill {
    height: 100%;
    background: linear-gradient(var(--color-gem), var(--color-gem-dark));
    border-radius: inherit;
    transition: width var(--duration-slow) var(--easing-standard);
  }

  &__xp-text {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  &__stats {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  &__stat {
    @include mixins.display-text;

    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
    padding: 0.25rem 0.55rem 0.25rem 0.3rem;
    font-size: var(--font-size-md);
    font-weight: 700;
    background: var(--color-surface);
    border: 2px solid var(--color-line);
    border-radius: var(--radius-full);

    &--bump {
      animation: hud-bump 300ms;
    }
  }

  &__gear {
    display: grid;
    place-items: center;
    width: 2.4rem;
    height: 2.4rem;
    font-size: 1.3rem;
    color: var(--color-text-muted);
    border-radius: 50%;

    &--active {
      color: var(--color-teal-dark);
      background: var(--color-teal-soft);
    }
  }
}

@keyframes hud-bump {
  50% {
    transform: scale(1.18);
  }
}
</style>
