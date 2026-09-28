<script setup lang="ts">
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '#shared/types/entities'
import { errorMessage } from '~/composables/useSync'

useHead({ title: 'Réglages' })

const game = useGame()
const actions = useGameActions()
const sound = useSound()
const sync = useSync()
const { loggedIn } = useUserSession()
const toast = useToast()

const me = computed(() => game.currentMember.value)
const partner = computed(() => game.partner.value)

/* Rhythm */
const budget = ref(me.value?.dailyBudgetMin ?? 35)
watch(() => me.value?.dailyBudgetMin, value => value && (budget.value = value))

/* Notifications */
const prefs = computed<NotificationPrefs>(() => me.value?.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS)
const savePrefs = (changes: Partial<NotificationPrefs>) => actions.saveMember({ notificationPrefs: { ...prefs.value, ...changes } })
const prefModel = (key: 'morning' | 'evening' | 'alerts') => computed({
  get: () => prefs.value[key],
  set: value => void savePrefs({ [key]: value }),
})
const morning = prefModel('morning')
const evening = prefModel('evening')
const alerts = prefModel('alerts')
const MORNING_TIMES = ['07:00', '07:30', '08:00', '08:30', '09:00']
const EVENING_TIMES = ['18:00', '19:00', '20:00', '21:00']

const permission = ref<NotificationPermission | 'unsupported'>('default')
onMounted(() => {
  permission.value = 'Notification' in window ? Notification.permission : 'unsupported'
})

async function enableNotifications() {
  if (!('Notification' in window)) {
    return
  }
  permission.value = await Notification.requestPermission()
  if (permission.value === 'granted') {
    const registration = await navigator.serviceWorker?.getRegistration()
    const body = `${game.pendingQuests.value.length} quête(s) aujourd'hui. On s'y met ?`
    if (registration) {
      await registration.showNotification('Quêtes de la maison', { body, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png' })
    }
    else {
      new Notification('Quêtes de la maison', { body, icon: '/pwa-192x192.png' })
    }
  }
}

/* Game */
const soundOn = computed({ get: () => sound.enabled.value, set: () => void sound.toggle() })
const vibrationOn = computed({ get: () => sound.vibrationEnabled.value, set: () => void sound.toggleVibration() })
const duel = computed({
  get: () => game.household.value?.settings.duel ?? false,
  set: value => void actions.saveHouseholdSettings({ ...(game.household.value?.settings ?? { duel: false }), duel: value }),
})

/* Invitation */
const inviteOpen = ref(false)
const inviteTitleId = useId()
const invitation = ref<{ code: string, expiresAt: string } | null>(null)
const inviting = ref(false)

async function invite() {
  inviting.value = true
  try {
    // The household must exist on the server before someone can join it.
    await sync.now()
    invitation.value = await $fetch<{ code: string, expiresAt: string }>('/api/invitations', { method: 'POST' })
    inviteOpen.value = true
  }
  catch (error) {
    toast.show(errorMessage(error, 'Le code n\'a pas pu être créé. Vérifie ta connexion et réessaie.'))
  }
  finally {
    inviting.value = false
  }
}

async function copyCode() {
  if (!invitation.value) {
    return
  }
  try {
    await navigator.clipboard.writeText(invitation.value.code)
    toast.show('Code copié')
  }
  catch {
    toast.show(`Code : ${invitation.value.code}`)
  }
}

const syncLabel = computed(() => {
  switch (sync.status.value) {
    case 'syncing': return 'Synchronisation…'
    case 'offline': return 'Hors ligne : tout est gardé sur ce téléphone et partira au retour du réseau.'
    case 'signed-out': return 'Connecte-toi pour partager la maison entre vos téléphones.'
    case 'error': return sync.lastError.value || 'La dernière synchronisation a échoué, nouvel essai dans une minute.'
    default: return sync.lastSyncedAt.value
      ? `À jour · ${sync.lastSyncedAt.value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      : 'En attente de la première synchronisation.'
  }
})
</script>

<template>
  <div class="settings-page">
    <h1 class="settings-page__title">
      Réglages
    </h1>

    <GamePanel title="Mon rythme">
      <div class="field">
        <label
          class="field__label"
          for="daily-budget"
        >Temps de ménage par jour : <span class="tabular-nums">{{ budget }} min</span></label>
        <input
          id="daily-budget"
          v-model.number="budget"
          class="field__range"
          type="range"
          min="15"
          max="60"
          step="5"
          @change="actions.saveMember({ dailyBudgetMin: budget })"
        >
        <p class="field__hint">
          Les quêtes du jour s'arrêtent à ce temps. La charge moyenne du catalogue est d'environ 37 min par personne.
        </p>
      </div>
    </GamePanel>

    <GamePanel title="Notifications">
      <div class="settings-list">
        <div
          v-if="permission !== 'granted'"
          class="settings-list__item"
        >
          <p class="field__hint">
            <template v-if="permission === 'denied'">
              Les notifications sont bloquées : autorise-les dans les réglages du navigateur pour ce site.
            </template>
            <template v-else-if="permission === 'unsupported'">
              Ce navigateur ne gère pas les notifications. Installe l'app depuis Chrome.
            </template>
            <template v-else>
              Autorise les notifications pour recevoir les quêtes du matin et les alertes.
            </template>
          </p>
          <GameChunkyButton
            v-if="permission === 'default'"
            variant="gold"
            block
            @click="enableNotifications"
          >
            Activer les notifications
          </GameChunkyButton>
        </div>
        <div class="settings-list__item">
          <GameSwitch
            v-model="morning"
            label="Quêtes du matin"
            hint="Le programme du jour, une fois par jour."
          />
          <select
            v-if="morning"
            class="field__input"
            aria-label="Heure des quêtes du matin"
            :value="prefs.morningTime"
            @change="savePrefs({ morningTime: ($event.target as HTMLSelectElement).value })"
          >
            <option
              v-for="time in MORNING_TIMES"
              :key="time"
              :value="time"
            >
              {{ time.replace(':', ' h ') }}
            </option>
          </select>
        </div>
        <div class="settings-list__item">
          <GameSwitch
            v-model="evening"
            label="Rappel du soir"
            hint="Seulement s'il te reste des quêtes."
          />
          <select
            v-if="evening"
            class="field__input"
            aria-label="Heure du rappel du soir"
            :value="prefs.eveningTime"
            @change="savePrefs({ eveningTime: ($event.target as HTMLSelectElement).value })"
          >
            <option
              v-for="time in EVENING_TIMES"
              :key="time"
              :value="time"
            >
              {{ time.replace(':', ' h ') }}
            </option>
          </select>
        </div>
        <GameSwitch
          v-model="alerts"
          class="settings-list__item"
          label="Alertes instantanées"
          hint="Quand l'autre signale « c'est plein »."
        />
        <p class="field__hint settings-list__item">
          Jamais plus de 3 par jour, et rien entre 22 h et 8 h.
        </p>
        <GameChunkyButton
          v-if="permission === 'granted'"
          class="settings-list__item"
          variant="ghost"
          block
          @click="enableNotifications"
        >
          Tester une notification
        </GameChunkyButton>
      </div>
    </GamePanel>

    <GamePanel title="Jeu">
      <div class="settings-list">
        <GameSwitch
          v-model="soundOn"
          class="settings-list__item"
          label="Effets sonores"
          hint="Petits sons à la validation et à l'ouverture du coffre."
        />
        <GameSwitch
          v-model="vibrationOn"
          class="settings-list__item"
          label="Vibrations"
          hint="Un petit retour quand tu valides une quête."
        />
        <GameSwitch
          v-model="duel"
          class="settings-list__item"
          label="Duel de la semaine"
          hint="Optionnel : une compétition amicale, visible dans Trophées."
        />
      </div>
    </GamePanel>

    <GamePanel title="Le foyer">
      <ul
        class="settings-list"
        role="list"
      >
        <li
          v-for="member in game.members.value"
          :key="member.id"
          class="member settings-list__item"
        >
          <span>
            <strong>{{ member.displayName }}</strong><template v-if="member.id === me?.id">
              (toi)
            </template>
            <span class="field__hint member__email">{{ member.email ?? 'Pas encore connecté(e)' }}</span>
          </span>
          <span
            class="member__status"
            :class="{ 'member__status--on': member.email }"
          >{{ member.email ? 'Connecté' : 'Invitation' }}</span>
        </li>
      </ul>
      <GameChunkyButton
        v-if="partner && !partner.email && loggedIn"
        variant="gold"
        block
        :disabled="inviting"
        @click="invite"
      >
        {{ inviting ? 'Préparation…' : `Inviter ${partner.displayName}` }}
      </GameChunkyButton>
      <p class="field__hint">
        Synchronisation : {{ syncLabel }}
      </p>
      <GameChunkyButton
        v-if="loggedIn"
        variant="ghost"
        block
        :disabled="sync.status.value === 'syncing'"
        @click="sync.now()"
      >
        Synchroniser maintenant
      </GameChunkyButton>
    </GamePanel>

    <GameAccountPanel />

    <GameDialog
      v-model:open="inviteOpen"
      :labelledby="inviteTitleId"
    >
      <h2
        :id="inviteTitleId"
        class="settings-page__dialog-title"
      >
        Inviter {{ partner?.displayName }}
      </h2>
      <p class="field__hint">
        Sur son téléphone : ouvrir l'app, se connecter avec Google, puis « Rejoindre avec un code ».
      </p>
      <div
        v-if="invitation"
        class="code-box"
      >
        <p
          class="code-box__code tabular-nums"
          :aria-label="`Code ${invitation.code.split('').join(' ')}`"
        >
          {{ invitation.code.slice(0, 3) }} {{ invitation.code.slice(3) }}
        </p>
        <GameChunkyButton
          variant="ghost"
          @click="copyCode"
        >
          <GameIcon name="copy" /> Copier
        </GameChunkyButton>
      </div>
      <p class="field__hint">
        Valable 48 h, utilisable une seule fois.
      </p>
      <GameChunkyButton
        variant="gold"
        block
        @click="inviteOpen = false"
      >
        Fermer
      </GameChunkyButton>
    </GameDialog>
  </div>
</template>

<style lang="scss" scoped>
.settings-page {
  display: grid;
  gap: var(--space-5);

  &__title {
    font-size: var(--font-size-2xl);
  }

  &__dialog-title {
    font-size: var(--font-size-xl);
  }
}

.settings-list {
  display: grid;
  margin: 0;

  &__item + &__item {
    padding-top: var(--space-3);
    margin-top: var(--space-3);
    border-top: 2px solid var(--color-line);
  }

  &__item {
    display: grid;
    gap: var(--space-2);
  }
}

.field {
  display: grid;
  gap: var(--space-2);

  &__label {
    font-weight: 800;
  }

  &__hint {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__range {
    width: 100%;
    accent-color: var(--color-teal);
  }

  &__input {
    min-height: var(--touch-target-min);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 2px solid var(--color-line-strong);
    border-radius: var(--radius-sm);
  }
}

.member {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: space-between;

  &__email {
    display: block;
    overflow-wrap: anywhere;
  }

  &__status {
    flex: none;
    padding: 0.1rem 0.55rem;
    font-size: var(--font-size-xs);
    font-weight: 800;
    color: var(--color-gold-ink);
    background: var(--color-gold-soft);
    border-radius: var(--radius-full);

    &--on {
      color: var(--color-success);
      background: var(--color-success-soft);
    }
  }
}

.code-box {
  display: grid;
  gap: var(--space-3);
  justify-items: center;
  width: 100%;
  padding: var(--space-4);
  background: var(--color-gem-soft);
  border: var(--border-width) dashed var(--color-gem);
  border-radius: var(--radius-md);

  &__code {
    font-family: var(--font-display);
    font-size: 2.2rem;
    letter-spacing: 0.18em;
  }
}
</style>
