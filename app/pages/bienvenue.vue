<script setup lang="ts">
import { STANDARD_CATALOGUE } from '#shared/catalogue'
import type { RoomState } from '#shared/domain'
import { createHousehold } from '~/db/repository'

definePageMeta({ layout: 'bare' })
useHead({ title: 'Bienvenue' })

const STATES: { value: RoomState, label: string }[] = [
  { value: 'clean', label: 'Propre' },
  { value: 'average', label: 'Moyen' },
  { value: 'dirty', label: 'Sale' },
]

const db = useDatabase()
const { user } = useUserSession()

const householdName = ref('Appartement')
const memberNames = reactive<[string, string]>([user.value?.name.split(' ')[0] ?? '', ''])
const rooms = reactive(STANDARD_CATALOGUE.map(room => ({
  key: room.key,
  name: room.name,
  icon: room.icon,
  ownerIndex: (room.defaultLot === 'A' ? 0 : 1) as 0 | 1,
  state: 'average' as RoomState,
})))

const submitted = ref(false)
const saving = ref(false)
const saveError = ref('')

const errors = computed(() => ({
  household: householdName.value.trim() ? '' : 'Donne un nom à votre maison.',
  first: memberNames[0].trim() ? '' : 'Indique ton prénom.',
  second: !memberNames[1].trim()
    ? 'Indique le prénom de la deuxième personne.'
    : memberNames[1].trim().toLowerCase() === memberNames[0].trim().toLowerCase() ? 'Les deux prénoms doivent être différents.' : '',
}))
const hasErrors = computed(() => Object.values(errors.value).some(Boolean))
const ownerLabel = (index: 0 | 1) => memberNames[index].trim() || (index === 0 ? 'Joueur 1' : 'Joueur 2')

async function submit() {
  submitted.value = true
  if (hasErrors.value) {
    await nextTick()
    document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
    return
  }
  saving.value = true
  saveError.value = ''
  try {
    await createHousehold(db, {
      name: householdName.value,
      memberNames: [memberNames[0], memberNames[1]],
      firstMemberEmail: user.value?.email ?? null,
      rooms: rooms.map(({ key, ownerIndex, state }) => ({ key, ownerIndex, state })),
      now: new Date(),
    })
    await navigateTo('/', { replace: true })
  }
  catch (error) {
    console.error(error)
    saveError.value = 'La maison n\'a pas pu être créée. Vérifie l\'espace de stockage du téléphone puis réessaie.'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form
    class="onboarding"
    novalidate
    @submit.prevent="submit"
  >
    <header class="onboarding__intro">
      <h1 class="onboarding__title">
        Bienvenue !
      </h1>
      <p class="onboarding__lead">
        Préparez votre maison : qui s'occupe de quelle pièce, et dans quel état elle est aujourd'hui.
      </p>
    </header>

    <GamePanel title="Votre maison">
      <div class="field">
        <label
          class="field__label"
          for="household-name"
        >Nom de la maison</label>
        <input
          id="household-name"
          v-model="householdName"
          class="field__input"
          autocomplete="off"
          :aria-invalid="submitted && !!errors.household"
          :aria-describedby="submitted && errors.household ? 'household-name-error' : undefined"
        >
        <p
          v-if="submitted && errors.household"
          id="household-name-error"
          class="field__error"
        >
          {{ errors.household }}
        </p>
      </div>
      <div class="field">
        <label
          class="field__label"
          for="member-first"
        >Ton prénom</label>
        <input
          id="member-first"
          v-model="memberNames[0]"
          class="field__input"
          autocomplete="given-name"
          :aria-invalid="submitted && !!errors.first"
          :aria-describedby="submitted && errors.first ? 'member-first-error' : undefined"
        >
        <p
          v-if="submitted && errors.first"
          id="member-first-error"
          class="field__error"
        >
          {{ errors.first }}
        </p>
      </div>
      <div class="field">
        <label
          class="field__label"
          for="member-second"
        >Prénom de la deuxième personne</label>
        <input
          id="member-second"
          v-model="memberNames[1]"
          class="field__input"
          autocomplete="off"
          :aria-invalid="submitted && !!errors.second"
          :aria-describedby="submitted && errors.second ? 'member-second-error' : undefined"
        >
        <p
          v-if="submitted && errors.second"
          id="member-second-error"
          class="field__error"
        >
          {{ errors.second }}
        </p>
      </div>
    </GamePanel>

    <GamePanel
      title="Les pièces"
      hint="Modifiable plus tard"
    >
      <fieldset
        v-for="room in rooms"
        :key="room.key"
        class="room-setup"
      >
        <legend class="room-setup__legend">
          <GameIcon
            class="room-setup__icon"
            :name="room.icon"
          />
          {{ room.name }}
        </legend>

        <div
          class="choice-group"
          role="radiogroup"
          :aria-label="`Responsable de la pièce ${room.name}`"
        >
          <label
            v-for="index in ([0, 1] as const)"
            :key="index"
            class="choice"
          >
            <input
              v-model="room.ownerIndex"
              class="choice__input"
              type="radio"
              :name="`owner-${room.key}`"
              :value="index"
            >
            <span class="choice__label">{{ ownerLabel(index) }}</span>
          </label>
        </div>

        <div
          class="choice-group"
          role="radiogroup"
          :aria-label="`État actuel de la pièce ${room.name}`"
        >
          <label
            v-for="state in STATES"
            :key="state.value"
            class="choice"
            :class="`choice--${state.value}`"
          >
            <input
              v-model="room.state"
              class="choice__input"
              type="radio"
              :name="`state-${room.key}`"
              :value="state.value"
            >
            <span class="choice__label">{{ state.label }}</span>
          </label>
        </div>
      </fieldset>
    </GamePanel>

    <p
      v-if="saveError"
      class="onboarding__error"
      role="alert"
    >
      {{ saveError }}
    </p>

    <GameChunkyButton
      type="submit"
      variant="gold"
      size="lg"
      block
      :disabled="saving"
    >
      {{ saving ? 'Création…' : 'C\'est parti !' }}
    </GameChunkyButton>
  </form>
</template>

<style lang="scss" scoped>
.onboarding {
  display: grid;
  gap: var(--space-5);

  &__intro {
    display: grid;
    gap: var(--space-2);
    text-align: center;
  }

  &__title {
    font-size: 2.2rem;
    font-weight: 700;
  }

  &__lead {
    color: var(--color-text-muted);
  }

  &__error {
    padding: var(--space-3);
    color: var(--color-red-dark);
    background: var(--color-red-soft);
    border-radius: var(--radius-md);
  }
}

.field {
  display: grid;
  gap: var(--space-1);

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
}

.room-setup {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  margin: 0;
  background: var(--color-surface);
  border: 2px solid var(--color-line);
  border-radius: var(--radius-md);

  &__legend {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    padding-inline: var(--space-1);
    font-family: var(--font-display);
    font-size: var(--font-size-lg);
    font-weight: 600;
  }

  &__icon {
    width: 1.8rem;
    height: 1.8rem;
  }
}

.choice-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.choice {
  position: relative;
  flex: 1;

  &__input {
    position: absolute;
    opacity: 0;
  }

  &__label {
    display: grid;
    place-items: center;
    min-height: var(--touch-target-min);
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-sm);
    font-weight: 800;
    text-align: center;
    cursor: pointer;
    background: var(--color-paper);
    border: 2px solid var(--color-line);
    border-radius: var(--radius-full);
  }

  &__input:checked + &__label {
    color: var(--color-teal-dark);
    background: var(--color-teal-soft);
    border-color: var(--color-teal);
  }

  &--dirty &__input:checked + &__label {
    color: var(--color-red-dark);
    background: var(--color-red-soft);
    border-color: var(--color-red);
  }

  &--average &__input:checked + &__label {
    color: var(--color-gold-ink);
    background: var(--color-gold-soft);
    border-color: var(--color-gold-dark);
  }

  &__input:focus-visible + &__label {
    outline: 3px solid var(--color-gem);
    outline-offset: 2px;
  }
}
</style>
