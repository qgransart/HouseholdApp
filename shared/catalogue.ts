import type { TaskSize } from '#shared/domain/types'
import type { RoomIcon } from '#shared/types/entities'

/**
 * Standard catalogue offered when a household is created (CONCEPT §10).
 * Every value can be changed afterwards; this is only a sensible starting point.
 */

interface CatalogueTaskBase {
  name: string
  size: TaskSize
  durationMin: number
  /** Disabled by default: offered, but not counted until the household turns it on. */
  optional?: true
}

export type CatalogueTask
  = | CatalogueTaskBase & { type: 'periodic', intervalDays: number }
    | CatalogueTaskBase & { type: 'quota', weeklyQuota: number }
    | CatalogueTaskBase & { type: 'signal', signalLabel: string, maxDelayDays: number | null }

export interface CatalogueRoom {
  key: string
  name: string
  icon: RoomIcon
  /** Default split in two balanced lots of about 37 min / day each. */
  defaultLot: 'A' | 'B'
  tasks: CatalogueTask[]
}

export const STANDARD_CATALOGUE: readonly CatalogueRoom[] = [
  {
    key: 'kitchen',
    name: 'Cuisine',
    icon: 'kitchen',
    defaultLot: 'A',
    tasks: [
      { name: 'Faire la vaisselle', type: 'periodic', intervalDays: 1, size: 'M', durationMin: 15 },
      { name: 'Nettoyer le plan de travail', type: 'periodic', intervalDays: 1, size: 'S', durationMin: 5 },
      { name: 'Nettoyer l\'évier', type: 'periodic', intervalDays: 3, size: 'S', durationMin: 5 },
      { name: 'Nettoyer les plaques', type: 'periodic', intervalDays: 7, size: 'M', durationMin: 10 },
      { name: 'Trier le frigo', type: 'periodic', intervalDays: 7, size: 'S', durationMin: 5 },
      { name: 'Nettoyer le micro-ondes', type: 'periodic', intervalDays: 14, size: 'M', durationMin: 10 },
      { name: 'Nettoyer le frigo', type: 'periodic', intervalDays: 30, size: 'L', durationMin: 30 },
      { name: 'Nettoyer le four', type: 'periodic', intervalDays: 60, size: 'XL', durationMin: 60 },
      { name: 'Préparer un repas maison', type: 'quota', weeklyQuota: 4, size: 'L', durationMin: 40, optional: true },
    ],
  },
  {
    key: 'bath',
    name: 'Salle de bain',
    icon: 'bath',
    defaultLot: 'A',
    tasks: [
      { name: 'Nettoyer les WC', type: 'periodic', intervalDays: 7, size: 'M', durationMin: 10 },
      { name: 'Lavabo et miroir', type: 'periodic', intervalDays: 7, size: 'M', durationMin: 10 },
      { name: 'Douche / baignoire', type: 'periodic', intervalDays: 7, size: 'M', durationMin: 15 },
      { name: 'Changer les serviettes', type: 'periodic', intervalDays: 7, size: 'S', durationMin: 5 },
      { name: 'Détartrage complet', type: 'periodic', intervalDays: 30, size: 'L', durationMin: 30 },
    ],
  },
  {
    key: 'bedroom',
    name: 'Chambre',
    icon: 'bed',
    defaultLot: 'A',
    tasks: [
      { name: 'Changer les draps', type: 'periodic', intervalDays: 7, size: 'M', durationMin: 15 },
      { name: 'Laver couette et oreillers', type: 'periodic', intervalDays: 90, size: 'L', durationMin: 20 },
    ],
  },
  {
    key: 'living',
    name: 'Séjour & sols',
    icon: 'sofa',
    defaultLot: 'B',
    tasks: [
      { name: 'Ranger le séjour', type: 'periodic', intervalDays: 2, size: 'M', durationMin: 10 },
      { name: 'Passer le balai', type: 'periodic', intervalDays: 1, size: 'M', durationMin: 10 },
      { name: 'Aspirateur complet', type: 'periodic', intervalDays: 7, size: 'L', durationMin: 30 },
      { name: 'Serpillière', type: 'periodic', intervalDays: 7, size: 'L', durationMin: 20 },
      { name: 'Dépoussiérer', type: 'periodic', intervalDays: 7, size: 'M', durationMin: 15 },
      { name: 'Arroser les plantes', type: 'periodic', intervalDays: 3, size: 'S', durationMin: 5 },
      { name: 'Laver les vitres', type: 'periodic', intervalDays: 30, size: 'XL', durationMin: 60 },
      { name: 'Faire les courses', type: 'quota', weeklyQuota: 1, size: 'XL', durationMin: 60, optional: true },
    ],
  },
  {
    key: 'laundry',
    name: 'Linge',
    icon: 'laundry',
    defaultLot: 'B',
    tasks: [
      { name: 'Lancer une machine', type: 'signal', signalLabel: 'Panier plein', maxDelayDays: 7, size: 'S', durationMin: 5 },
      { name: 'Étendre le linge', type: 'signal', signalLabel: 'Machine terminée', maxDelayDays: null, size: 'M', durationMin: 10 },
      { name: 'Plier et ranger', type: 'quota', weeklyQuota: 2, size: 'M', durationMin: 15 },
    ],
  },
  {
    key: 'bins',
    name: 'Poubelles',
    icon: 'trash',
    defaultLot: 'A',
    tasks: [
      { name: 'Sortir les ordures', type: 'signal', signalLabel: 'Poubelle pleine', maxDelayDays: 4, size: 'S', durationMin: 5 },
      { name: 'Sortir le tri', type: 'signal', signalLabel: 'Tri plein', maxDelayDays: 7, size: 'S', durationMin: 5 },
      { name: 'Déposer le verre', type: 'signal', signalLabel: 'Verre plein', maxDelayDays: 30, size: 'S', durationMin: 10 },
    ],
  },
]

export interface CatalogueReward {
  name: string
  emoji: string
  kind: 'personal' | 'common'
  cost: number
  unlock: string | null
}

/**
 * Starting rewards. Prices are set so that a personal reward costs one to two weeks of effort:
 * a member earns roughly 250 coins a week with the standard catalogue.
 */
export const STANDARD_REWARDS: readonly CatalogueReward[] = [
  { name: 'Je choisis le film', emoji: '🎬', kind: 'personal', cost: 250, unlock: null },
  { name: 'Joker vaisselle', emoji: '🃏', kind: 'personal', cost: 300, unlock: null },
  { name: 'Grasse matinée garantie', emoji: '😴', kind: 'personal', cost: 400, unlock: null },
  { name: 'Massage de 15 minutes', emoji: '💆', kind: 'personal', cost: 500, unlock: null },
  { name: 'Petit-déjeuner au lit', emoji: '🥐', kind: 'personal', cost: 700, unlock: null },
  { name: 'Soirée resto', emoji: '🍝', kind: 'common', cost: 0, unlock: 'chest' },
  { name: 'Sortie ciné', emoji: '🍿', kind: 'common', cost: 0, unlock: 'level:12' },
  { name: 'Week-end en amoureux', emoji: '🧳', kind: 'common', cost: 0, unlock: 'streak:8' },
]
