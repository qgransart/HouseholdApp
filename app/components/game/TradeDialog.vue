<script setup lang="ts">
import { describeTrade, TRADE_MAX_COINS, tradeDays, type Task } from '#shared/domain'

/**
 * Proposes a trade around one task (CONCEPT §9 bis): a task of my rooms is asked to the other
 * member, a task of theirs is offered in exchange. Coins can complete or replace the offer.
 */
const props = defineProps<{ task: Task | null }>()
const open = defineModel<boolean>('open', { required: true })

const game = useGame()
const { proposeSwap } = useGameActions()
const titleId = useId()
const COIN_STEP = 10

const me = computed(() => game.currentMember.value)
const partner = computed(() => game.partner.value)
const ownerOf = (task: Task) => game.categoriesById.value.get(task.categoryId)?.ownerMemberId
/** `ask`: the task is mine, the other would do it; `offer`: the task is theirs, I would do it. */
const mode = computed(() => props.task && ownerOf(props.task) === me.value?.id ? 'ask' : 'offer')

const tasksOf = (memberId: string | undefined) => game.tasks.value
  .filter(task => task.active && ownerOf(task) === memberId)
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
const choices = computed(() => tasksOf(mode.value === 'ask' ? partner.value?.id : me.value?.id))

const draft = reactive({ otherTaskId: '', coins: 0, dueOn: game.today.value })
const maxCoins = computed(() => Math.max(0, Math.min(TRADE_MAX_COINS, game.coins.value)))
const days = computed(() => tradeDays(game.today.value))

watch(open, (isOpen) => {
  if (isOpen) {
    Object.assign(draft, { otherTaskId: '', coins: 0, dueOn: game.today.value })
  }
})

const proposal = computed(() => {
  if (!props.task) {
    return null
  }
  const other = draft.otherTaskId || null
  return mode.value === 'ask'
    ? { requestTaskId: props.task.id, offerTaskId: other, coins: draft.coins, dueOn: draft.dueOn }
    : other ? { requestTaskId: other, offerTaskId: props.task.id, coins: draft.coins, dueOn: draft.dueOn } : null
})
const isValid = computed(() => proposal.value !== null && (proposal.value.offerTaskId !== null || proposal.value.coins > 0))

const preview = computed(() => {
  if (!proposal.value || !isValid.value || !me.value || !partner.value) {
    return ''
  }
  const text = describeTrade({ ...proposal.value, proposedBy: me.value.id, proposedTo: partner.value.id }, me.value.id, {
    taskName: id => game.tasksById.value.get(id)?.name ?? '',
    memberName: game.memberName,
  })
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}, ${draft.dueOn === game.today.value ? 'aujourd\'hui' : 'demain'}.`
})

function stepCoins(delta: number) {
  draft.coins = Math.min(maxCoins.value, Math.max(0, draft.coins + delta))
}

async function submit() {
  if (proposal.value && isValid.value && await proposeSwap(proposal.value)) {
    open.value = false
  }
}
</script>

<template>
  <GameDialog
    v-model:open="open"
    variant="sheet"
    :labelledby="titleId"
  >
    <form
      v-if="task && partner"
      class="trade-dialog"
      @submit.prevent="submit"
    >
      <h2
        :id="titleId"
        class="trade-dialog__title"
      >
        Proposer un échange
      </h2>
      <p class="trade-dialog__lead">
        <template v-if="mode === 'ask'">
          {{ partner.displayName }} fait <strong>{{ task.name }}</strong> pour toi. Et toi, en échange ?
        </template>
        <template v-else>
          Tu fais <strong>{{ task.name }}</strong> pour {{ partner.displayName }}. Que lui demandes-tu en échange ?
        </template>
      </p>

      <label class="trade-dialog__field">
        <span class="trade-dialog__label">
          {{ mode === 'ask' ? `Une tâche de ${partner.displayName} que tu fais` : `Une de tes tâches que ${partner.displayName} fait` }}
        </span>
        <select
          v-model="draft.otherTaskId"
          class="trade-dialog__input"
          :required="mode === 'offer'"
        >
          <option value="">
            {{ mode === 'ask' ? 'Aucune, seulement des pièces' : 'Choisir une tâche' }}
          </option>
          <option
            v-for="choice in choices"
            :key="choice.id"
            :value="choice.id"
          >
            {{ choice.name }} ({{ choice.durationMin }} min)
          </option>
        </select>
      </label>

      <div
        class="trade-dialog__field"
        role="group"
        :aria-labelledby="`${titleId}-coins`"
      >
        <span
          :id="`${titleId}-coins`"
          class="trade-dialog__label"
        >Pièces offertes <span class="trade-dialog__hint">(tu en as {{ game.coins.value }})</span></span>
        <div class="trade-dialog__stepper">
          <GameChunkyButton
            variant="ghost"
            aria-label="10 pièces de moins"
            :disabled="draft.coins === 0"
            @click="stepCoins(-COIN_STEP)"
          >
            −
          </GameChunkyButton>
          <output
            class="trade-dialog__value tabular-nums"
            aria-live="polite"
          >{{ draft.coins }} pièces</output>
          <GameChunkyButton
            variant="ghost"
            aria-label="10 pièces de plus"
            :disabled="draft.coins + COIN_STEP > maxCoins"
            @click="stepCoins(COIN_STEP)"
          >
            +
          </GameChunkyButton>
        </div>
      </div>

      <fieldset class="trade-dialog__field trade-dialog__days">
        <legend class="trade-dialog__label">
          Quand ?
        </legend>
        <label
          v-for="(day, index) in days"
          :key="day"
          class="trade-dialog__day"
        >
          <input
            v-model="draft.dueOn"
            class="trade-dialog__day-input"
            type="radio"
            :name="`${titleId}-day`"
            :value="day"
          >
          <span class="trade-dialog__day-label">{{ index === 0 ? 'Aujourd\'hui' : 'Demain' }}</span>
        </label>
      </fieldset>

      <p
        class="trade-dialog__preview"
        aria-live="polite"
      >
        {{ preview || (mode === 'ask' ? 'Propose une tâche ou des pièces en échange.' : 'Choisis la tâche que tu demandes.') }}
      </p>

      <div class="trade-dialog__actions">
        <GameChunkyButton
          variant="ghost"
          @click="open = false"
        >
          Annuler
        </GameChunkyButton>
        <GameChunkyButton
          type="submit"
          variant="gold"
          :disabled="!isValid"
        >
          Envoyer
        </GameChunkyButton>
      </div>
    </form>
  </GameDialog>
</template>

<style lang="scss" scoped>
.trade-dialog {
  display: grid;
  gap: var(--space-4);

  &__title {
    font-size: var(--font-size-xl);
  }

  &__lead,
  &__preview {
    font-size: var(--font-size-sm);
  }

  &__preview {
    padding: var(--space-3);
    font-weight: 700;
    background: var(--color-gem-soft);
    border-radius: var(--radius-md);
  }

  &__field {
    display: grid;
    gap: var(--space-2);
    padding: 0;
    margin: 0;
    border: 0;
  }

  &__label {
    font-weight: 800;
  }

  &__hint {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__input {
    min-height: var(--touch-target-min);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 2px solid var(--color-line-strong);
    border-radius: var(--radius-sm);
  }

  &__stepper {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-2);
    align-items: center;
  }

  &__value {
    font-weight: 900;
    text-align: center;
  }

  &__days {
    grid-template-columns: 1fr 1fr;
  }

  &__days &__label {
    grid-column: 1 / -1;
    margin-bottom: var(--space-2);
  }

  &__day {
    position: relative;
  }

  &__day-input {
    position: absolute;
    opacity: 0;
  }

  &__day-label {
    display: grid;
    place-items: center;
    min-height: var(--touch-target-min);
    font-weight: 800;
    cursor: pointer;
    background: var(--color-paper);
    border: 2px solid var(--color-line);
    border-radius: var(--radius-md);
  }

  &__day-input:checked + &__day-label {
    color: var(--color-teal-dark);
    background: var(--color-teal-soft);
    border-color: var(--color-teal);
  }

  &__day-input:focus-visible + &__day-label {
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
