<script setup lang="ts">
import { BADGES, type LocalDate } from '#shared/domain'

useHead({ title: 'Trophées' })

type Tab = 'week' | 'feed' | 'badges'
const TABS: { key: Tab, label: string }[] = [
  { key: 'week', label: 'Semaine' },
  { key: 'feed', label: 'Historique' },
  { key: 'badges', label: 'Badges' },
]

const game = useGame()
const actions = useGameActions()
const tab = ref<Tab>('week')

const me = computed(() => game.currentMember.value)
const chartWeeks = computed(() => [...game.pastWeeks.value.slice(0, 5)].reverse().concat(game.weeklyGauge.value))
const myWeek = computed(() => game.weekCompletions.value.filter(c => c.memberId === me.value?.id))
const myWeekXp = computed(() => myWeek.value.reduce((sum, c) => sum + c.xp, 0))

const duel = computed({
  get: () => game.household.value?.settings.duel ?? false,
  set: value => void actions.saveHouseholdSettings({ ...(game.household.value?.settings ?? { duel: false }), duel: value }),
})

const feedDays = computed(() => {
  const groups = new Map<LocalDate, typeof game.feed.value>()
  for (const item of game.feed.value) {
    groups.set(item.day, [...groups.get(item.day) ?? [], item])
  }
  return [...groups.entries()]
})

const earned = computed(() => me.value ? game.earnedBadges(me.value.id) : new Set<string>())

function dayLabel(day: LocalDate) {
  const diff = Math.round((Date.parse(`${game.today.value}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86_400_000)
  if (diff === 0) {
    return 'Aujourd\'hui'
  }
  if (diff === 1) {
    return 'Hier'
  }
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const formatNumber = (value: number) => value.toLocaleString('fr-FR')
</script>

<template>
  <div class="trophies-page">
    <h1 class="trophies-page__title">
      Trophées
    </h1>

    <div
      class="tabs"
      role="tablist"
      aria-label="Trophées"
    >
      <button
        v-for="item in TABS"
        :id="`trophy-tab-${item.key}`"
        :key="item.key"
        class="tabs__tab"
        type="button"
        role="tab"
        :aria-selected="tab === item.key"
        aria-controls="trophy-panel"
        @click="tab = item.key"
      >
        {{ item.label }}
      </button>
    </div>

    <div
      id="trophy-panel"
      class="trophies-page__panel"
      role="tabpanel"
      :aria-labelledby="`trophy-tab-${tab}`"
    >
      <template v-if="tab === 'week'">
        <GamePanel
          title="XP de la maison"
          hint="6 dernières semaines"
        >
          <p class="trophies-page__muted">
            <svg
              class="trophies-page__legend"
              viewBox="0 0 22 8"
              aria-hidden="true"
            ><line
              x1="0"
              x2="22"
              y1="4"
              y2="4"
              stroke="#d9960a"
              stroke-width="2"
              stroke-dasharray="5 4"
            /></svg>
            Objectif hebdomadaire : <strong class="tabular-nums">{{ formatNumber(game.weeklyGauge.value.target) }} XP</strong>. Semaine en cours en clair.
          </p>
          <GameWeeklyChart
            :weeks="chartWeeks"
            :target="game.weeklyGauge.value.target"
          />
          <p class="trophies-page__muted">
            Série : <strong>{{ game.streak.value }} semaine{{ game.streak.value > 1 ? 's' : '' }}</strong> · un joker par mois protège la série.
          </p>
        </GamePanel>

        <section
          class="kpis"
          aria-label="Ta semaine"
        >
          <p class="kpis__item">
            <span class="kpis__value tabular-nums">{{ formatNumber(myWeekXp) }}</span>
            <span class="kpis__label">XP cette semaine</span>
          </p>
          <p class="kpis__item">
            <span class="kpis__value tabular-nums">{{ myWeek.length }}</span>
            <span class="kpis__label">quêtes faites</span>
          </p>
          <p class="kpis__item">
            <span class="kpis__value tabular-nums">{{ myWeek.filter(c => c.isHelp).length }}</span>
            <span class="kpis__label">coups de main</span>
          </p>
        </section>

        <GamePanel title="Duel de la semaine">
          <GameSwitch
            v-model="duel"
            label="Activer le duel"
            hint="Chacun sur ses propres pièces : % de sa part faite, bonus pour les coups de main."
          />
          <div
            v-if="duel"
            class="duel"
          >
            <div
              v-for="member in game.members.value"
              :key="member.id"
              class="duel__row"
            >
              <span class="duel__name">{{ member.displayName }}</span>
              <div
                class="duel__bar"
                role="meter"
                aria-valuemin="0"
                aria-valuemax="150"
                :aria-valuenow="game.duelScore(member.id)"
                :aria-label="`Score de ${member.displayName}`"
              >
                <div
                  class="duel__fill"
                  :class="{ 'duel__fill--me': member.id === me?.id }"
                  :style="{ width: `${Math.min(100, game.duelScore(member.id))}%` }"
                />
              </div>
              <span class="duel__value tabular-nums">{{ game.duelScore(member.id) }} %</span>
            </div>
          </div>
        </GamePanel>
      </template>

      <template v-else-if="tab === 'feed'">
        <p
          v-if="!feedDays.length"
          class="trophies-page__muted"
        >
          Rien cette semaine pour l'instant : la première quête ouvrira l'historique.
        </p>
        <section
          v-for="[day, items] in feedDays"
          :key="day"
          class="feed"
          :aria-label="dayLabel(day)"
        >
          <h2 class="feed__day">
            {{ dayLabel(day) }}
          </h2>
          <ul
            class="feed__items"
            role="list"
          >
            <li
              v-for="{ completion, thankedBy } in items"
              :key="completion.id"
              class="feed__item"
            >
              <p class="feed__text">
                {{ completion.memberId === me?.id ? 'Tu as fait' : `${game.memberName(completion.memberId)} a fait` }}
                « {{ game.tasksById.value.get(completion.taskId)?.name ?? 'une tâche' }} »
                <span class="feed__meta tabular-nums">{{ formatTime(completion.completedAt) }} · +{{ completion.xp }} XP<template v-if="completion.isHelp"> · coup de main</template></span>
              </p>
              <button
                v-if="completion.memberId !== me?.id"
                class="thanks"
                type="button"
                :aria-pressed="thankedBy.includes(me?.id ?? '')"
                :disabled="thankedBy.includes(me?.id ?? '')"
                @click="actions.sayThanks(completion.id, $event.currentTarget as HTMLElement)"
              >
                <GameIcon name="heart" />
                {{ thankedBy.includes(me?.id ?? '') ? 'Merci !' : 'Merci' }}
              </button>
              <span
                v-else-if="thankedBy.length"
                class="feed__thanked"
              ><GameIcon name="heart" /> Merci de {{ game.partner.value?.displayName }}</span>
            </li>
          </ul>
        </section>
      </template>

      <GamePanel
        v-else
        :title="`Badges de ${me?.displayName ?? ''}`"
        :hint="`${earned.size} / ${BADGES.length}`"
      >
        <ul
          class="badges"
          role="list"
        >
          <li
            v-for="badge in BADGES"
            :key="badge.id"
            class="badges__item"
            :class="{ 'badges__item--locked': !earned.has(badge.id) }"
          >
            <span
              class="badges__medal"
              aria-hidden="true"
            >
              <GameIcon :name="earned.has(badge.id) ? 'medal' : 'lock'" />
            </span>
            <span class="badges__name">{{ badge.name }}</span>
            <span class="badges__hint">{{ earned.has(badge.id) ? 'Obtenu' : badge.hint }}</span>
          </li>
        </ul>
      </GamePanel>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins';

.trophies-page {
  display: grid;
  gap: var(--space-5);

  &__title {
    font-size: var(--font-size-2xl);
  }

  &__panel {
    display: grid;
    gap: var(--space-5);
  }

  &__muted {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__legend {
    display: inline;
    width: 1.4rem;
    height: 0.5rem;
    vertical-align: middle;
  }
}

.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-paper);
  border: var(--border-width) solid var(--color-line);
  border-radius: var(--radius-full);

  &__tab {
    min-height: 2.5rem;
    font-weight: 800;
    color: var(--color-text-muted);
    border-radius: var(--radius-full);

    &[aria-selected='true'] {
      color: #fff;
      background: var(--color-teal);
    }
  }
}

.kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);

  &__item {
    display: grid;
    gap: 0.1rem;
    padding: var(--space-3);
    text-align: center;
    background: var(--color-surface);
    border: 2px solid var(--color-line);
    border-radius: var(--radius-md);
  }

  &__value {
    font-family: var(--font-display);
    font-size: 1.4rem;
    line-height: 1.1;
  }

  &__label {
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }
}

.duel {
  display: grid;
  gap: var(--space-2);

  &__row {
    display: grid;
    grid-template-columns: 5.5rem 1fr 3rem;
    gap: var(--space-2);
    align-items: center;
    font-size: var(--font-size-sm);
  }

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__bar {
    height: 1rem;
    overflow: hidden;
    background: var(--color-line);
    border-radius: var(--radius-full);
  }

  &__fill {
    height: 100%;
    background: linear-gradient(var(--color-gem), var(--color-gem-dark));
    border-radius: inherit;

    &--me {
      background: linear-gradient(var(--color-teal), var(--color-teal-dark));
    }
  }

  &__value {
    text-align: right;
  }
}

.feed {
  display: grid;
  gap: var(--space-2);

  &__day {
    font-family: var(--font-body);
    font-size: 0.75rem;
    font-weight: 900;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__items {
    display: grid;
    gap: var(--space-2);
    margin: 0;
  }

  &__item {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 2px solid var(--color-line);
    border-radius: var(--radius-md);
  }

  &__text {
    font-size: var(--font-size-sm);
    line-height: 1.3;
  }

  &__meta {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__thanked {
    display: inline-flex;
    flex: none;
    gap: 0.2rem;
    align-items: center;
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--color-red-dark);
  }
}

.thanks {
  display: inline-flex;
  flex: none;
  gap: 0.25rem;
  align-items: center;
  min-height: 2.5rem;
  padding: 0.2rem 0.7rem;
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

.badges {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  margin: 0;

  &__item {
    display: grid;
    gap: 0.3rem;
    justify-items: center;
    padding: var(--space-3) var(--space-1);
    font-size: 0.72rem;
    text-align: center;
    background: var(--color-surface);
    border: 2px solid var(--color-line);
    border-radius: var(--radius-md);

    &--locked .badges__medal {
      filter: grayscale(1);
      background: #eef0f6;
      border-color: var(--color-line-strong);
      opacity: 0.55;
    }
  }

  &__medal {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    font-size: 1.7rem;
    background: var(--color-gold-soft);
    border: 3px solid var(--color-gold);
    border-radius: 50%;
  }

  &__name {
    font-weight: 900;
    line-height: 1.15;
  }

  &__hint {
    font-weight: 600;
    color: var(--color-text-muted);
  }
}
</style>
