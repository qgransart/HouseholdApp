<script setup lang="ts">
import { isEffective, POINTS_BY_SIZE, toLocalDate, type Task, type TaskSize } from '#shared/domain'

const props = defineProps<{ task: Task | null }>()
const open = defineModel<boolean>('open', { required: true })

const game = useGame()
const { snapshot } = useHousehold()
const actions = useGameActions()
const titleId = useId()

const SIZES: TaskSize[] = ['S', 'M', 'L', 'XL']
const STARS: Record<TaskSize, number> = { S: 1, M: 2, L: 3, XL: 4 }

const draft = reactive({ intervalDays: 1, weeklyQuota: 1, durationMin: 5, size: 'S' as TaskSize, active: true })

watch(() => [open.value, props.task] as const, ([isOpen, task]) => {
  if (isOpen && task) {
    Object.assign(draft, {
      intervalDays: task.type === 'periodic' ? task.intervalDays : 1,
      weeklyQuota: task.type === 'quota' ? task.weeklyQuota : 1,
      durationMin: task.durationMin,
      size: task.size,
      active: task.active,
    })
  }
}, { immediate: true })

const history = computed(() => props.task
  ? (snapshot.value?.completions ?? []).filter(c => c.taskId === props.task!.id && isEffective(c)).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  : [])

const lastLine = computed(() => {
  const last = history.value[0]
  if (!last) {
    return 'Pas encore faite'
  }
  const day = toLocalDate(last.completedAt, game.timeZone.value)
  const when = day === game.today.value ? 'aujourd\'hui' : new Date(last.completedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return `Faite ${when} par ${game.memberName(last.memberId)}`
})

const monthCount = computed(() => history.value.filter(c => Date.now() - new Date(c.completedAt).getTime() < 30 * 86_400_000).length)
const freshness = computed(() => props.task ? game.freshnessByTask.value.get(props.task.id) : undefined)

function step(key: 'intervalDays' | 'weeklyQuota' | 'durationMin', delta: number, min: number, max: number) {
  draft[key] = Math.min(max, Math.max(min, draft[key] + delta))
}

async function complete(event: MouseEvent) {
  if (props.task) {
    const origin = event.currentTarget as HTMLElement
    open.value = false
    await actions.complete(props.task, origin)
  }
}

async function snooze(days: number) {
  if (props.task) {
    await actions.snooze(props.task, days)
    open.value = false
  }
}

async function save() {
  const task = props.task
  if (!task) {
    return
  }
  await actions.saveTask(task, {
    size: draft.size,
    durationMin: draft.durationMin,
    active: draft.active,
    ...(task.type === 'periodic' ? { intervalDays: draft.intervalDays } : {}),
    ...(task.type === 'quota' ? { weeklyQuota: draft.weeklyQuota } : {}),
  })
  open.value = false
}
</script>

<template>
  <GameDialog
    v-model:open="open"
    variant="sheet"
    :labelledby="titleId"
  >
    <template v-if="task">
      <h2
        :id="titleId"
        class="task-sheet__title"
      >
        {{ task.name }}
      </h2>
      <p class="task-sheet__meta">
        {{ game.categoriesById.value.get(task.categoryId)?.name }} · {{ lastLine }} · {{ monthCount }} fois en 30 jours
      </p>
      <GameHpMeter
        v-if="freshness && task.active"
        :ratio="freshness.ratio"
        :status="freshness.status"
        :days-overdue="freshness.daysOverdue"
        :subject="task.name"
        :cells="10"
      />

      <template v-if="task.active">
        <GameChunkyButton
          block
          @click="complete"
        >
          <GameIcon name="check" /> C'est fait !
        </GameChunkyButton>
        <div
          class="task-sheet__group"
          role="group"
          :aria-labelledby="`${titleId}-snooze`"
        >
          <p
            :id="`${titleId}-snooze`"
            class="task-sheet__label"
          >
            Reporter
          </p>
          <div class="task-sheet__row">
            <GameChunkyButton
              v-for="days in [1, 2, 3, 7]"
              :key="days"
              variant="ghost"
              @click="snooze(days)"
            >
              {{ days }} j
            </GameChunkyButton>
          </div>
        </div>
      </template>

      <div class="task-sheet__group">
        <p class="task-sheet__label">
          Réglages de la tâche
        </p>
        <div
          v-if="task.type === 'periodic'"
          class="task-sheet__stepper"
        >
          <span class="task-sheet__muted">Fréquence</span>
          <GameChunkyButton
            variant="ghost"
            aria-label="Plus souvent"
            @click="step('intervalDays', -1, 1, 365)"
          >
            −
          </GameChunkyButton>
          <span
            class="task-sheet__value tabular-nums"
            aria-live="polite"
          >tous les {{ draft.intervalDays }} j</span>
          <GameChunkyButton
            variant="ghost"
            aria-label="Moins souvent"
            @click="step('intervalDays', 1, 1, 365)"
          >
            +
          </GameChunkyButton>
        </div>
        <div
          v-if="task.type === 'quota'"
          class="task-sheet__stepper"
        >
          <span class="task-sheet__muted">Objectif</span>
          <GameChunkyButton
            variant="ghost"
            aria-label="Moins par semaine"
            @click="step('weeklyQuota', -1, 1, 21)"
          >
            −
          </GameChunkyButton>
          <span
            class="task-sheet__value tabular-nums"
            aria-live="polite"
          >{{ draft.weeklyQuota }} / semaine</span>
          <GameChunkyButton
            variant="ghost"
            aria-label="Plus par semaine"
            @click="step('weeklyQuota', 1, 1, 21)"
          >
            +
          </GameChunkyButton>
        </div>
        <div class="task-sheet__stepper">
          <span class="task-sheet__muted">Durée</span>
          <GameChunkyButton
            variant="ghost"
            aria-label="Moins de temps"
            @click="step('durationMin', -5, 5, 240)"
          >
            −
          </GameChunkyButton>
          <span
            class="task-sheet__value tabular-nums"
            aria-live="polite"
          >{{ draft.durationMin }} min</span>
          <GameChunkyButton
            variant="ghost"
            aria-label="Plus de temps"
            @click="step('durationMin', 5, 5, 240)"
          >
            +
          </GameChunkyButton>
        </div>
        <div
          class="task-sheet__sizes"
          role="radiogroup"
          aria-label="Difficulté et récompense"
        >
          <label
            v-for="size in SIZES"
            :key="size"
            class="task-sheet__size"
          >
            <input
              v-model="draft.size"
              class="task-sheet__size-input"
              type="radio"
              :name="`${titleId}-size`"
              :value="size"
            >
            <span class="task-sheet__size-label">{{ '★'.repeat(STARS[size]) }} {{ POINTS_BY_SIZE[size] }} XP</span>
          </label>
        </div>
        <GameSwitch
          v-model="draft.active"
          label="Tâche active"
          hint="Une tâche désactivée ne donne plus de quêtes."
        />
      </div>

      <div class="task-sheet__actions">
        <GameChunkyButton
          variant="ghost"
          @click="open = false"
        >
          Fermer
        </GameChunkyButton>
        <GameChunkyButton
          variant="gold"
          @click="save"
        >
          Enregistrer
        </GameChunkyButton>
      </div>
    </template>
  </GameDialog>
</template>

<style lang="scss" scoped>
.task-sheet {
  &__title {
    font-size: var(--font-size-xl);
  }

  &__meta,
  &__muted {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__group {
    display: grid;
    gap: var(--space-3);
  }

  &__label {
    font-weight: 800;
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  &__stepper {
    display: grid;
    grid-template-columns: 5.5rem auto 1fr auto;
    gap: var(--space-2);
    align-items: center;
  }

  &__value {
    font-weight: 900;
    text-align: center;
  }

  &__sizes {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-2);
  }

  &__size {
    position: relative;
  }

  &__size-input {
    position: absolute;
    opacity: 0;
  }

  &__size-label {
    display: grid;
    place-items: center;
    min-height: var(--touch-target-min);
    padding: var(--space-1);
    font-size: var(--font-size-xs);
    font-weight: 800;
    text-align: center;
    cursor: pointer;
    background: var(--color-paper);
    border: 2px solid var(--color-line);
    border-radius: var(--radius-md);
  }

  &__size-input:checked + &__size-label {
    color: var(--color-teal-dark);
    background: var(--color-teal-soft);
    border-color: var(--color-teal);
  }

  &__size-input:focus-visible + &__size-label {
    outline: 3px solid var(--color-gem);
    outline-offset: 2px;
  }

  &__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }
}
</style>
