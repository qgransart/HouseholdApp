<script setup lang="ts">
import { rewardUnlockState } from '#shared/domain'
import type { RewardRow } from '#shared/types/entities'

useHead({ title: 'Boutique' })

type Tab = 'personal' | 'common' | 'history'
const TABS: { key: Tab, label: string }[] = [
  { key: 'personal', label: 'Pour moi' },
  { key: 'common', label: 'À deux' },
  { key: 'history', label: 'Mes achats' },
]
const EMOJIS = ['🎁', '🎬', '☕', '🍕', '🎮', '🛁', '🌹', '🎵', '📚', '🍫']
const PRICES = [100, 200, 300, 400, 500, 700, 1000]

const game = useGame()
const actions = useGameActions()

const tab = ref<Tab>('personal')
const coins = computed(() => game.coins.value)
const personal = computed(() => game.rewards.value.filter(r => r.kind === 'personal').sort((a, b) => a.cost - b.cost))
const common = computed(() => game.rewards.value.filter(r => r.kind === 'common'))
const myPurchases = computed(() => game.purchases.value
  .filter(p => p.memberId === game.currentMember.value?.id)
  .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)))

const rewardOf = (id: string) => game.rewardsById.value.get(id)
const formatNumber = (value: number) => value.toLocaleString('fr-FR')
const formatDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

function unlockText(reward: RewardRow) {
  const state = rewardUnlockState(reward.unlock, game.unlockContext.value)
  if (state.unlocked) {
    return reward.unlock === 'chest' ? 'Débloquée cette semaine : profitez-en !' : 'Débloquée'
  }
  switch (state.condition) {
    case 'chest': return `Coffre de la semaine : ${Math.round(state.progress * 100)} %`
    case 'level': return `Maison niveau ${state.target} (actuel : ${game.level.value.level})`
    case 'streak': return `${state.target} semaines de série (actuel : ${game.streak.value})`
    default: return 'Condition inconnue'
  }
}

/* Purchase confirmation */
const pending = ref<RewardRow | null>(null)
const confirmOpen = ref(false)
const confirmTitleId = useId()

function askBuy(reward: RewardRow) {
  pending.value = reward
  confirmOpen.value = true
}

async function confirmBuy() {
  if (pending.value && await actions.buy(pending.value.id)) {
    tab.value = 'history'
  }
  confirmOpen.value = false
}

/* New reward */
const createOpen = ref(false)
const createTitleId = useId()
const form = reactive({ name: '', emoji: EMOJIS[0]!, cost: 300, submitted: false })
const nameError = computed(() => form.submitted && !form.name.trim() ? 'Donne un nom à la récompense.' : '')

function openCreate() {
  Object.assign(form, { name: '', emoji: EMOJIS[0]!, cost: 300, submitted: false })
  createOpen.value = true
}

async function submitCreate() {
  form.submitted = true
  if (nameError.value) {
    document.getElementById('reward-name')?.focus()
    return
  }
  if (await actions.addReward(form.name, form.emoji, form.cost)) {
    createOpen.value = false
    tab.value = 'personal'
  }
}
</script>

<template>
  <div class="shop-page">
    <h1 class="shop-page__title">
      Boutique
    </h1>

    <section
      class="wallet"
      aria-label="Porte-monnaie"
    >
      <GameIcon
        class="wallet__coin"
        name="coin"
      />
      <div>
        <p class="wallet__amount tabular-nums">
          {{ formatNumber(coins) }}
        </p>
        <p class="shop-page__muted">
          pièces à dépenser · gagnées en faisant tes quêtes
        </p>
      </div>
    </section>

    <GamePanel
      v-if="game.toHonor.value.length"
      title="À honorer"
      :hint="`${game.partner.value?.displayName ?? 'L\'autre joueur'} compte sur toi`"
    >
      <ul
        class="reward-list"
        role="list"
      >
        <li
          v-for="purchase in game.toHonor.value"
          :key="purchase.id"
          class="reward"
        >
          <span
            class="reward__art"
            aria-hidden="true"
          >{{ rewardOf(purchase.rewardId)?.emoji ?? '🎁' }}</span>
          <div>
            <p class="reward__name">
              {{ rewardOf(purchase.rewardId)?.name ?? 'Récompense' }}
            </p>
            <p class="reward__meta">
              Achetée par {{ game.memberName(purchase.memberId) }} · {{ formatDay(purchase.purchasedAt) }}
            </p>
          </div>
          <GameChunkyButton
            variant="gold"
            @click="actions.honor(purchase.id)"
          >
            C'est fait
          </GameChunkyButton>
        </li>
      </ul>
    </GamePanel>

    <div
      class="tabs"
      role="tablist"
      aria-label="Récompenses"
    >
      <button
        v-for="item in TABS"
        :id="`shop-tab-${item.key}`"
        :key="item.key"
        class="tabs__tab"
        type="button"
        role="tab"
        :aria-selected="tab === item.key"
        aria-controls="shop-panel"
        @click="tab = item.key"
      >
        {{ item.label }}
      </button>
    </div>

    <section
      id="shop-panel"
      class="shop-page__panel"
      role="tabpanel"
      :aria-labelledby="`shop-tab-${tab}`"
    >
      <template v-if="tab === 'personal'">
        <ul
          class="reward-list"
          role="list"
        >
          <li
            v-for="reward in personal"
            :key="reward.id"
            class="reward"
          >
            <span
              class="reward__art"
              aria-hidden="true"
            >{{ reward.emoji }}</span>
            <div>
              <p class="reward__name">
                {{ reward.name }}
              </p>
              <p class="reward__meta tabular-nums">
                {{ formatNumber(reward.cost) }} pièces<template v-if="coins < reward.cost">
                  · encore {{ formatNumber(reward.cost - coins) }}
                </template>
              </p>
            </div>
            <GameChunkyButton
              variant="gold"
              :disabled="coins < reward.cost"
              :aria-label="`Acheter ${reward.name} pour ${reward.cost} pièces`"
              @click="askBuy(reward)"
            >
              {{ formatNumber(reward.cost) }}
            </GameChunkyButton>
          </li>
        </ul>
        <GameChunkyButton
          variant="ghost"
          block
          @click="openCreate"
        >
          <GameIcon name="plus" /> Nouvelle récompense
        </GameChunkyButton>
      </template>

      <template v-else-if="tab === 'common'">
        <p class="shop-page__muted">
          Les récompenses du couple se débloquent en jouant ensemble, sans dépenser de pièces.
        </p>
        <ul
          class="reward-list"
          role="list"
        >
          <li
            v-for="reward in common"
            :key="reward.id"
            class="reward"
            :class="{ 'reward--locked': !rewardUnlockState(reward.unlock, game.unlockContext.value).unlocked }"
          >
            <span
              class="reward__art reward__art--common"
              aria-hidden="true"
            >{{ reward.emoji }}</span>
            <div>
              <p class="reward__name">
                {{ reward.name }}
              </p>
              <p class="reward__meta">
                {{ unlockText(reward) }}
              </p>
            </div>
            <span
              v-if="rewardUnlockState(reward.unlock, game.unlockContext.value).unlocked"
              class="chip chip--green"
            >Débloquée</span>
            <span
              v-else
              class="chip"
            ><GameIcon name="lock" /><span class="visually-hidden">Verrouillée</span></span>
          </li>
        </ul>
      </template>

      <template v-else>
        <ul
          v-if="myPurchases.length"
          class="reward-list"
          role="list"
        >
          <li
            v-for="purchase in myPurchases"
            :key="purchase.id"
            class="reward"
          >
            <span
              class="reward__art"
              aria-hidden="true"
            >{{ rewardOf(purchase.rewardId)?.emoji ?? '🎁' }}</span>
            <div>
              <p class="reward__name">
                {{ rewardOf(purchase.rewardId)?.name ?? 'Récompense' }}
              </p>
              <p class="reward__meta tabular-nums">
                {{ formatNumber(purchase.cost) }} pièces · {{ formatDay(purchase.purchasedAt) }}
              </p>
            </div>
            <span
              v-if="purchase.honoredAt"
              class="chip chip--green"
            >Honorée</span>
            <span
              v-else
              class="chip chip--coin"
            >Chez {{ game.partner.value?.displayName }}</span>
          </li>
        </ul>
        <p
          v-else
          class="shop-page__muted"
        >
          Aucun achat pour l'instant. Tes pièces t'attendent !
        </p>
      </template>
    </section>

    <GameDialog
      v-model:open="confirmOpen"
      :labelledby="confirmTitleId"
    >
      <template v-if="pending">
        <span
          class="reward__art reward__art--big"
          aria-hidden="true"
        >{{ pending.emoji }}</span>
        <h2
          :id="confirmTitleId"
          class="shop-page__dialog-title"
        >
          {{ pending.name }}
        </h2>
        <p class="shop-page__muted">
          Pour <strong class="tabular-nums">{{ formatNumber(pending.cost) }} pièces</strong>. {{ game.partner.value?.displayName ?? 'L\'autre joueur' }} la verra dans « À honorer ».
        </p>
        <div class="shop-page__actions">
          <GameChunkyButton
            variant="ghost"
            @click="confirmOpen = false"
          >
            Annuler
          </GameChunkyButton>
          <GameChunkyButton
            variant="gold"
            @click="confirmBuy"
          >
            Acheter
          </GameChunkyButton>
        </div>
      </template>
    </GameDialog>

    <GameDialog
      v-model:open="createOpen"
      variant="sheet"
      :labelledby="createTitleId"
    >
      <h2
        :id="createTitleId"
        class="shop-page__dialog-title"
      >
        Nouvelle récompense
      </h2>
      <form
        class="reward-form"
        novalidate
        @submit.prevent="submitCreate"
      >
        <div class="reward-form__field">
          <label
            class="reward-form__label"
            for="reward-name"
          >Nom</label>
          <input
            id="reward-name"
            v-model="form.name"
            class="reward-form__input"
            maxlength="60"
            placeholder="Ex. : choisir la musique en voiture"
            :aria-invalid="!!nameError"
            :aria-describedby="nameError ? 'reward-name-error' : undefined"
          >
          <p
            v-if="nameError"
            id="reward-name-error"
            class="reward-form__error"
          >
            {{ nameError }}
          </p>
        </div>
        <fieldset class="reward-form__emojis">
          <legend class="reward-form__label">
            Illustration
          </legend>
          <label
            v-for="emoji in EMOJIS"
            :key="emoji"
            class="reward-form__emoji"
          >
            <input
              v-model="form.emoji"
              class="reward-form__emoji-input"
              type="radio"
              name="reward-emoji"
              :value="emoji"
            >
            <span class="reward-form__emoji-label">{{ emoji }}</span>
          </label>
        </fieldset>
        <div class="reward-form__field">
          <label
            class="reward-form__label"
            for="reward-cost"
          >Prix</label>
          <select
            id="reward-cost"
            v-model.number="form.cost"
            class="reward-form__input"
          >
            <option
              v-for="price in PRICES"
              :key="price"
              :value="price"
            >
              {{ formatNumber(price) }} pièces
            </option>
          </select>
          <p class="shop-page__muted">
            Repère : environ 250 pièces par semaine en suivant tes quêtes.
          </p>
        </div>
        <div class="shop-page__actions">
          <GameChunkyButton
            variant="ghost"
            @click="createOpen = false"
          >
            Annuler
          </GameChunkyButton>
          <GameChunkyButton
            type="submit"
            variant="gold"
          >
            Ajouter
          </GameChunkyButton>
        </div>
      </form>
    </GameDialog>
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins';

.shop-page {
  display: grid;
  gap: var(--space-5);

  &__title {
    font-size: var(--font-size-2xl);
  }

  &__muted {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__panel {
    @include mixins.panel;

    display: grid;
    gap: var(--space-3);
    padding: var(--space-4);
  }

  &__dialog-title {
    font-size: var(--font-size-xl);
  }

  &__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    width: 100%;
  }
}

.wallet {
  @include mixins.panel;

  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);

  &__coin {
    width: 3.6rem;
    height: 3.6rem;
  }

  &__amount {
    font-family: var(--font-display);
    font-size: 2rem;
    line-height: 1;
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

.reward-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.reward {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 2px solid var(--color-line);
  border-radius: var(--radius-md);

  &--locked {
    opacity: 0.6;
  }

  &__art {
    display: grid;
    place-items: center;
    width: 2.6rem;
    height: 2.6rem;
    font-size: 1.3rem;
    background: var(--color-gold-soft);
    border-radius: 0.75rem;

    &--common {
      background: var(--color-gem-soft);
    }

    &--big {
      width: 4rem;
      height: 4rem;
      font-size: 2rem;
    }
  }

  &__name {
    font-family: var(--font-display);
    font-weight: 600;
    line-height: 1.2;
  }

  &__meta {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
  }
}

.chip {
  display: inline-flex;
  gap: 0.2rem;
  align-items: center;
  padding: 0.1rem 0.55rem;
  font-size: var(--font-size-xs);
  font-weight: 800;
  color: var(--color-text-muted);
  background: #eef0f6;
  border-radius: var(--radius-full);

  &--green {
    color: var(--color-success);
    background: var(--color-success-soft);
  }

  &--coin {
    color: var(--color-gold-ink);
    background: var(--color-gold-soft);
  }
}

.reward-form {
  display: grid;
  gap: var(--space-4);

  &__field {
    display: grid;
    gap: var(--space-1);
  }

  &__label {
    font-size: var(--font-size-sm);
    font-weight: 800;
  }

  &__input {
    min-height: var(--touch-target-min);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 2px solid var(--color-line-strong);
    border-radius: var(--radius-sm);

    &[aria-invalid='true'] {
      border-color: var(--color-red);
    }
  }

  &__error {
    font-size: var(--font-size-sm);
    color: var(--color-red-dark);
  }

  &__emojis {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: 0;
    margin: 0;
    border: 0;
  }

  &__emoji {
    position: relative;
  }

  &__emoji-input {
    position: absolute;
    opacity: 0;
  }

  &__emoji-label {
    display: grid;
    place-items: center;
    width: var(--touch-target-min);
    height: var(--touch-target-min);
    font-size: 1.3rem;
    cursor: pointer;
    background: var(--color-paper);
    border: 2px solid var(--color-line);
    border-radius: var(--radius-sm);
  }

  &__emoji-input:checked + &__emoji-label {
    background: var(--color-gold-soft);
    border-color: var(--color-gold-dark);
  }

  &__emoji-input:focus-visible + &__emoji-label {
    outline: 3px solid var(--color-gem);
    outline-offset: 2px;
  }
}
</style>
