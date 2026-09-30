<script setup lang="ts">
import { addDays, formatMinutes, startOfWeek } from '#shared/domain'

useHead({ title: 'Notre semaine' })

/**
 * Weekly recap (CONCEPT §9 bis): the other member's week first, to recognise it, then one line
 * about one's own. No score face to face.
 */
const route = useRoute()
const game = useGame()
const actions = useGameActions()

const previous = ref(route.query.semaine === 'precedente')
const weekStart = computed(() => addDays(startOfWeek(game.today.value), previous.value ? -7 : 0))
const weekLabel = computed(() => {
  const format = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  return `du ${format(weekStart.value)} au ${format(addDays(weekStart.value, 6))}`
})

const me = computed(() => game.currentMember.value)
const partner = computed(() => game.partner.value)
const partnerWeek = computed(() => partner.value ? game.memberWeek(partner.value.id, weekStart.value) : null)
const myWeek = computed(() => me.value ? game.memberWeek(me.value.id, weekStart.value) : null)
const gauge = computed(() => previous.value ? game.pastWeeks.value[0] ?? null : game.weeklyGauge.value)

const thanked = (completionId: string) => game.reactions.value.some(r => r.completionId === completionId && r.memberId === me.value?.id)
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`
</script>

<template>
  <div class="recap-page">
    <h1 class="recap-page__title">
      Notre semaine
    </h1>

    <div
      class="recap-page__weeks"
      role="group"
      aria-label="Semaine affichée"
    >
      <button
        class="recap-page__week"
        type="button"
        :aria-pressed="!previous"
        @click="previous = false"
      >
        Cette semaine
      </button>
      <button
        class="recap-page__week"
        type="button"
        :aria-pressed="previous"
        @click="previous = true"
      >
        Semaine dernière
      </button>
    </div>
    <p class="recap-page__muted">
      Semaine {{ weekLabel }}
    </p>

    <GamePanel
      v-if="partner && partnerWeek"
      :title="`Ce que ${partner.displayName} a fait`"
    >
      <template v-if="partnerWeek.count">
        <p class="recap-page__headline tabular-nums">
          {{ plural(partnerWeek.count, 'quête') }} · {{ formatMinutes(partnerWeek.minutes) }}
        </p>
        <ul
          class="recap-list"
          role="list"
        >
          <li
            v-for="{ completion, task } in partnerWeek.highlights"
            :key="completion.id"
            class="recap-list__item"
          >
            <span class="recap-list__text">
              {{ task.name }}
              <span class="recap-list__meta tabular-nums">{{ task.durationMin }} min · {{ new Date(completion.completedAt).toLocaleDateString('fr-FR', { weekday: 'long' }) }}</span>
            </span>
            <button
              class="recap-list__thanks"
              type="button"
              :aria-pressed="thanked(completion.id)"
              :disabled="thanked(completion.id)"
              :aria-label="thanked(completion.id) ? `Merci envoyé pour ${task.name}` : `Dire merci pour ${task.name}`"
              @click="actions.sayThanks(completion.id, $event.currentTarget as HTMLElement)"
            >
              <GameIcon name="heart" />
              {{ thanked(completion.id) ? 'Merci !' : 'Merci' }}
            </button>
          </li>
        </ul>
      </template>
      <p
        v-else
        class="recap-page__muted"
      >
        Rien d'enregistré pour {{ partner.displayName }} sur cette semaine.
      </p>
    </GamePanel>

    <GamePanel title="De ton côté">
      <p
        v-if="myWeek"
        class="recap-page__muted tabular-nums"
      >
        {{ myWeek.count ? `${plural(myWeek.count, 'quête')} · ${formatMinutes(myWeek.minutes)}` : 'Aucune quête sur cette semaine.' }}
      </p>
      <p
        v-if="gauge"
        class="recap-page__muted"
      >
        Coffre commun :
        <strong>{{ gauge.achieved ? 'ouvert 🎉' : `rempli à ${Math.round(gauge.ratio * 100)} %` }}</strong>
      </p>
    </GamePanel>
  </div>
</template>

<style lang="scss" scoped>
.recap-page {
  display: grid;
  gap: var(--space-4);

  &__title {
    font-size: var(--font-size-xl);
  }

  &__weeks {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  &__week {
    min-height: var(--touch-target-min);
    font-weight: 800;
    background: var(--color-paper);
    border: 2px solid var(--color-line);
    border-radius: var(--radius-md);

    &[aria-pressed='true'] {
      color: var(--color-teal-dark);
      background: var(--color-teal-soft);
      border-color: var(--color-teal);
    }
  }

  &__headline {
    font-size: var(--font-size-lg);
    font-weight: 900;
  }

  &__muted {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }
}

.recap-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;

  &__item {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 2px solid var(--color-line);
    border-radius: var(--radius-md);
  }

  &__text {
    flex: 1;
    min-width: 0;
    font-weight: 800;
  }

  &__meta {
    display: block;
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__thanks {
    display: inline-flex;
    flex: none;
    gap: 0.25rem;
    align-items: center;
    min-height: var(--touch-target-min);
    padding: 0.2rem 0.8rem;
    font-size: var(--font-size-xs);
    font-weight: 800;
    color: var(--color-red-dark);
    background: var(--color-red-soft);
    border: 2px solid #f6c9ca;
    border-radius: var(--radius-full);

    &[aria-pressed='true'] {
      color: #fff;
      background: var(--color-red);
      border-color: var(--color-red);
    }
  }
}
</style>
