<script setup lang="ts">
import type { Quest } from '#shared/domain'

/** Only the most urgent short tasks are drawn: the dice adds fun, not randomness in priorities. */
const DRAW_POOL_SIZE = 3
const SPINS = 12

const { quickTasks, categoriesById, freshnessByTask, currentMember } = useGame()
const { snapshot } = useHousehold()
const { complete } = useGameActions()
const sound = useSound()

const open = ref(false)
const rolling = ref(false)
const slotText = ref('')
const challenge = ref<Quest | null>(null)
const titleId = useId()

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function roll() {
  const pool = quickTasks.value
  challenge.value = null
  if (!pool.length) {
    slotText.value = 'Rien d\'urgent : la maison brille !'
    return
  }
  rolling.value = true
  if (!reducedMotion()) {
    for (let spin = 0; spin < SPINS; spin++) {
      slotText.value = pool[spin % pool.length]!.task.name
      sound.play('tick')
      await wait(60 + spin * 12)
    }
  }
  const candidates = pool.slice(0, DRAW_POOL_SIZE)
  challenge.value = candidates[Math.floor(Math.random() * candidates.length)]!
  slotText.value = `Défi : ${challenge.value.task.name}`
  rolling.value = false
}

function start() {
  open.value = true
  void roll()
}

async function onComplete(origin: HTMLElement) {
  if (!challenge.value) {
    return
  }
  const task = challenge.value.task
  open.value = false
  await complete(task, origin)
}

const helpFor = (quest: Quest) => quest.isHelp
  ? snapshot.value?.members.find(m => m.id === categoriesById.value.get(quest.task.categoryId)?.ownerMemberId && m.id !== currentMember.value?.id)?.displayName
  : undefined
</script>

<template>
  <GamePanel
    title="Défi éclair"
    hint="J'ai 10 min"
  >
    <GameChunkyButton
      variant="gem"
      size="lg"
      block
      @click="start"
    >
      <GameIcon name="dice" /> Lancer le dé
    </GameChunkyButton>

    <GameDialog
      v-model:open="open"
      variant="sheet"
      :labelledby="titleId"
    >
      <h2
        :id="titleId"
        class="flash-challenge__title"
      >
        Défi éclair
      </h2>
      <p
        class="flash-challenge__slot"
        :class="{ 'flash-challenge__slot--rolling': rolling }"
        aria-live="polite"
      >
        {{ slotText }}
      </p>
      <ul
        v-if="challenge"
        class="flash-challenge__list"
        role="list"
      >
        <GameQuestCard
          :task="challenge.task"
          :room="categoriesById.get(challenge.task.categoryId)"
          :freshness="freshnessByTask.get(challenge.task.id)"
          :triggered-by-signal="challenge.urgency.triggeredBySignal"
          :help-for="helpFor(challenge)"
          @complete="onComplete"
        />
      </ul>
      <div class="flash-challenge__actions">
        <GameChunkyButton
          variant="ghost"
          :disabled="rolling"
          @click="roll"
        >
          Relancer
        </GameChunkyButton>
        <GameChunkyButton
          variant="ghost"
          @click="open = false"
        >
          Plus tard
        </GameChunkyButton>
      </div>
    </GameDialog>
  </GamePanel>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins';

.flash-challenge {
  &__title {
    font-size: var(--font-size-xl);
  }

  &__slot {
    @include mixins.display-text;

    display: grid;
    place-items: center;
    min-height: 3rem;
    padding: var(--space-2);
    font-size: var(--font-size-lg);
    text-align: center;
    background: var(--color-surface);
    border: var(--border-width) dashed var(--color-gem);
    border-radius: var(--radius-md);

    &--rolling {
      color: var(--color-text-muted);
    }
  }

  &__list {
    display: grid;
    margin: 0;
  }

  &__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }
}
</style>
