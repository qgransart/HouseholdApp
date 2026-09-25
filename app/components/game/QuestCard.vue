<script setup lang="ts">
import { computeReward, type Freshness, type Task } from '#shared/domain'
import type { CategoryRow } from '#shared/types/entities'

const props = defineProps<{
  task: Task
  room: CategoryRow | undefined
  freshness?: Freshness
  triggeredBySignal?: boolean
  /** Name of the member whose room this is, when completing it is a help. */
  helpFor?: string
  /** Extra line for quota tasks or signals (e.g. "2 / 4 cette semaine"). */
  detail?: string
}>()

const emit = defineEmits<{ complete: [origin: HTMLElement] }>()

const DIFFICULTY = { S: 1, M: 2, L: 3, XL: 4 } as const

const reward = computed(() => computeReward(props.task, props.freshness?.status ?? null))
const hasBonus = computed(() => reward.value.xp > computeReward(props.task, null).xp)
const stars = computed(() => DIFFICULTY[props.task.size])
</script>

<template>
  <li
    class="quest-card"
    :class="{ 'quest-card--signal': triggeredBySignal }"
  >
    <span
      v-if="triggeredBySignal"
      class="quest-card__badge"
    >Alerte !</span>
    <span
      class="quest-card__icon"
      aria-hidden="true"
    >
      <GameIcon :name="room?.icon ?? 'sofa'" />
    </span>
    <div class="quest-card__main">
      <p class="quest-card__room">
        {{ room?.name }}
      </p>
      <h3 class="quest-card__name">
        {{ task.name }}
      </h3>
      <GameHpMeter
        v-if="freshness"
        :ratio="freshness.ratio"
        :status="freshness.status"
        :days-overdue="freshness.daysOverdue"
        :subject="task.name"
      />
      <p
        v-if="detail"
        class="quest-card__detail"
        :class="{ 'quest-card__detail--alert': triggeredBySignal }"
      >
        {{ detail }}
      </p>
      <p class="quest-card__meta">
        <span class="quest-card__chip quest-card__chip--xp">
          <GameIcon name="gem" />+{{ reward.xp }} XP
        </span>
        <span class="quest-card__chip quest-card__chip--coin">
          <GameIcon name="coin" />+{{ reward.coins }}<span class="visually-hidden"> pièces</span>
        </span>
        <span class="quest-card__chip">{{ task.durationMin }} min</span>
        <span
          class="quest-card__stars"
          role="img"
          :aria-label="`Difficulté ${stars} sur 4`"
        >{{ '★'.repeat(stars) }}<span class="quest-card__stars-off">{{ '★'.repeat(4 - stars) }}</span></span>
        <span
          v-if="helpFor"
          class="quest-card__chip quest-card__chip--help"
        >Coup de main à {{ helpFor }}</span>
        <span
          v-if="hasBonus"
          class="quest-card__chip quest-card__chip--coin"
        >Bonus anticipation</span>
      </p>
    </div>
    <GameChunkyButton
      class="quest-card__action"
      block
      :aria-label="`C'est fait : ${task.name}`"
      @click="emit('complete', $event.currentTarget as HTMLElement)"
    >
      <GameIcon name="check" /> C'est fait !
    </GameChunkyButton>
  </li>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins';

.quest-card {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-line);
  border-radius: var(--radius-md);

  &--signal {
    background: var(--color-red-soft);
    border-color: var(--color-red);
  }

  &__badge {
    @include mixins.display-text;

    position: absolute;
    top: -0.75rem;
    right: var(--space-3);
    padding: 0.1rem 0.55rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: #fff;
    background: var(--color-red);
    border-radius: var(--radius-full);
    box-shadow: 0 3px 0 var(--color-red-dark);
  }

  &__icon {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    font-size: 1.5rem;
    background: var(--color-cream);
    border: 2px solid var(--color-line);
    border-radius: 0.8rem;
  }

  &__main {
    display: grid;
    gap: 0.4rem;
    min-width: 0;
  }

  &__room {
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__name {
    font-size: 1.1rem;
  }

  &__detail {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);

    &--alert {
      color: var(--color-red-dark);
    }
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
  }

  &__chip {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
    padding: 0.1rem 0.5rem;
    font-size: 0.78rem;
    font-weight: 800;
    color: var(--color-text-muted);
    background: #eef0f6;
    border-radius: var(--radius-full);

    &--xp {
      color: var(--color-gem-dark);
      background: var(--color-gem-soft);
    }

    &--coin {
      color: var(--color-gold-ink);
      background: var(--color-gold-soft);
    }

    &--help {
      color: var(--color-teal-dark);
      background: var(--color-teal-soft);
    }
  }

  &__stars {
    font-size: 0.85rem;
    color: var(--color-gold-dark);
    letter-spacing: -1px;
  }

  &__stars-off {
    color: var(--color-line-strong);
  }

  &__action {
    grid-column: 1 / -1;
  }
}
</style>
