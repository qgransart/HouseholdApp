<script setup lang="ts">
import type { TradeRow } from '#shared/types/entities'

/** Trades waiting for an answer and deals agreed for today or tomorrow (CONCEPT §9 bis). */
const game = useGame()
const { answerSwap, cancelSwap } = useGameActions()

const visible = computed(() => game.tradesReceived.value.length + game.tradesSent.value.length + game.tradesAgreed.value.length > 0)
const partnerName = computed(() => game.partner.value?.displayName ?? 'L\'autre joueur')

const dayLabel = (trade: TradeRow) => trade.dueOn === game.today.value ? 'aujourd\'hui' : 'demain'
const sentence = (trade: TradeRow) => {
  const text = game.describeTrade(trade)
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}, ${dayLabel(trade)}.`
}
</script>

<template>
  <GamePanel
    v-if="visible"
    title="Échanges"
    :hint="`Entre toi et ${partnerName}`"
  >
    <ul
      class="trade-board"
      role="list"
    >
      <li
        v-for="trade in game.tradesReceived.value"
        :key="trade.id"
        class="trade-board__item trade-board__item--received"
      >
        <p class="trade-board__title">
          {{ partnerName }} te propose
        </p>
        <p class="trade-board__text">
          {{ sentence(trade) }}
        </p>
        <div class="trade-board__actions">
          <GameChunkyButton
            variant="ghost"
            @click="answerSwap(trade.id, false)"
          >
            Pas cette fois
          </GameChunkyButton>
          <GameChunkyButton @click="answerSwap(trade.id, true)">
            Accepter
          </GameChunkyButton>
        </div>
      </li>
      <li
        v-for="trade in game.tradesSent.value"
        :key="trade.id"
        class="trade-board__item"
      >
        <p class="trade-board__title">
          En attente de {{ partnerName }}
        </p>
        <p class="trade-board__text">
          {{ sentence(trade) }}
        </p>
        <div class="trade-board__actions">
          <GameChunkyButton
            variant="ghost"
            @click="cancelSwap(trade.id)"
          >
            Annuler la proposition
          </GameChunkyButton>
        </div>
      </li>
      <li
        v-for="trade in game.tradesAgreed.value"
        :key="trade.id"
        class="trade-board__item trade-board__item--agreed"
      >
        <p class="trade-board__title">
          Marché conclu
        </p>
        <p class="trade-board__text">
          {{ sentence(trade) }}
        </p>
      </li>
    </ul>
  </GamePanel>
</template>

<style lang="scss" scoped>
.trade-board {
  display: grid;
  gap: var(--space-3);
  margin: 0;

  &__item {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-line);
    border-radius: var(--radius-md);

    &--received {
      background: var(--color-gem-soft);
      border-color: var(--color-gem);
    }

    &--agreed {
      background: var(--color-success-soft);
    }
  }

  &__title {
    font-weight: 800;
  }

  &__text {
    font-size: var(--font-size-sm);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    justify-content: flex-end;
  }
}
</style>
