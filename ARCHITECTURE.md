# HouseholdApp — Architecture

> Document de référence technique. Complète [`CONCEPT.md`](./CONCEPT.md) (le « quoi ») en décrivant le « comment ».
> Toute décision structurante doit être ajoutée au journal des décisions (§11).

**Statut :** v0.1 — validée, avant initialisation du projet

---

## 1. Contraintes

| Contrainte | Conséquence |
|---|---|
| Coût **0 €**, sans carte bancaire | Offres gratuites uniquement (Firebase exclu : planification = offre Blaze) |
| Disponible en permanence | Hébergement cloud |
| **Local-first**, hors ligne | Base locale (IndexedDB) + synchronisation |
| 2 appareils Android synchronisés | Serveur source de vérité |
| Accès limité aux 2 membres | Authentification + liste blanche |
| Notifications Web Push | Serveur (VAPID) + déclencheur planifié |
| Repo GitHub **public** | Aucun secret ni donnée personnelle (emails, etc.) dans le code |

---

## 2. Vue d'ensemble

```
┌─────────── Téléphone (PWA) ───────────┐        ┌──────────── Vercel (Hobby) ────────────┐
│ Nuxt SPA (Vue 3)                      │        │ Routes serveur Nitro                   │
│  ├─ UI  ←─ liveQuery ─┐               │ HTTPS  │  ├─ /api/auth/*   (Google OAuth)       │
│  ├─ shared/domain     │               │◄──────►│  ├─ /api/sync/push · /api/sync/pull    │
│  ├─ Dexie (IndexedDB) ┘ + outbox      │        │  ├─ /api/push/subscribe                │
│  └─ Service Worker (cache + push)     │        │  └─ /api/cron/tick  (secret)           │
└───────────────────────────────────────┘        │  shared/domain (même code)             │
          ▲  Web Push (FCM)                      └────────────┬───────────────────────────┘
          └───────────────────────────────────────────────────┤ Drizzle ORM
                         cron-job.org ── toutes les 15 min ──►│
                                                              ▼
                                                   Neon Postgres (gratuit)
```

**Principe :** l'UI lit et écrit **uniquement dans la base locale**. La synchronisation avec le serveur est un processus d'arrière-plan. L'app est donc instantanée et fonctionne hors ligne par construction.

---

## 3. Stack

| Couche | Choix | Justification |
|---|---|---|
| Framework | **Nuxt 4 — mode SPA** (`ssr: false`) | App privée : pas de SEO ; le SSR complique la PWA hors ligne sans bénéfice |
| Langage | **TypeScript `strict`** | Un seul langage client / serveur / domaine |
| PWA | **`@vite-pwa/nuxt`**, stratégie `injectManifest` | Service Worker personnalisé requis pour le push |
| Base locale | **Dexie.js** + `liveQuery` | Wrapper IndexedDB fiable, requêtes réactives |
| État UI | **Pinia** | Session et préférences uniquement ; les données métier vivent dans Dexie (une seule source de vérité locale) |
| Styles | **SCSS + BEM**, tokens en custom properties CSS | Design minimaliste sur mesure, conventions de l'équipe |
| Primitives accessibles | **Reka UI** (headless), au cas par cas | Voir §3.1 |
| Validation | **Zod** (schémas dans `shared/`) | Même validation client et serveur |
| ORM / migrations | **Drizzle** | Léger, typé, compatible serverless, SQL lisible |
| Base serveur | **Neon Postgres** (Free) | Postgres standard, mise en veille auto sans pause manuelle |
| Auth | **`nuxt-auth-utils`** + Google OAuth | Sessions en cookie scellé, pas de mot de passe ni d'emailing |
| Push | **`web-push`** + clés VAPID | Standard W3C ; FCM transparent sur Android |
| Planification | **cron-job.org** → `/api/cron/tick` toutes les 15 min | Heures de notification réglables par membre ; les crons Vercel Hobby sont trop limités |
| Tests | **Vitest** | Priorité au domaine pur et au protocole de sync |
| Lint | **`@nuxt/eslint`** + Stylelint (SCSS / BEM) | |
| CI | **GitHub Actions** (gratuit en repo public) | Lint, typecheck, tests sur chaque push / PR |
| Hébergement | **Vercel Hobby** (preset Nitro `vercel`) | Déploiement automatique depuis GitHub |

### 3.1 Reka UI : pourquoi et quand

Reka UI (ex-Radix Vue) fournit des composants **headless** : comportement, gestion du focus, navigation clavier et attributs ARIA conformes aux patterns WAI-ARIA, **sans aucun style**. On garde donc 100 % de la maîtrise du rendu en SCSS / BEM.

Règle d'usage :
- **Composants simples** (boutons, cartes, jauges, listes) → HTML sémantique natif, pas de Reka UI.
- **Composants à comportement complexe** où l'accessibilité est difficile à réussir soi-même → Reka UI : dialogues / bottom sheets (piège de focus, `Escape`, restauration du focus), menus déroulants, onglets, toasts, sélecteurs.

La dépendance n'est ajoutée qu'au premier besoin réel ; les composants importés sont tree-shakés.

---

## 4. Organisation du repo

```
app/                      # Client Nuxt (srcDir)
  components/             # Composants Vue, classes BEM
  composables/            # useLiveQuery, useQuests, useSync, useAuth…
  pages/                  # today, household, shop, history, settings
  layouts/
  db/                     # Schéma Dexie, outbox
  sync/                   # Client de synchronisation
  stores/                 # Pinia (session, préférences UI)
  assets/styles/          # tokens, mixins, base, utilitaires
  service-worker/         # sw.ts (précache + push + notificationclick)
server/
  api/                    # auth, sync, push, cron
  db/                     # Schéma Drizzle, migrations, client
  services/               # notifications, planificateur, synchronisation
  utils/                  # requireMember, garde cron…
shared/                   # Code partagé client ↔ serveur (convention Nuxt 4)
  domain/                 # freshness, quests, points, gauge, level, calendar
  schemas/                # Schémas Zod (entités, payloads de sync)
  types/
tests/
public/                   # Icônes, manifest assets
```

**`shared/domain` est le cœur métier** : fonctions **pures**, sans dépendance à Vue, Dexie, Drizzle ni à l'horloge système (le « maintenant » et le fuseau sont passés en paramètre → tests déterministes). Utilisé par le client (affichage hors ligne) et le serveur (notifications).

---

## 5. Modèle de données

### 5.1 Principe : événements + projections

| Catégorie | Tables | Écriture | Conflits |
|---|---|---|---|
| **Événements** | `completions`, `signals`, `purchases`, `reactions` | Ajout ; seuls des champs d'état ultérieurs sont posés (`undone_at`, `honored_at`, `resolved_by_completion_id`) | Aucun (union) |
| **Configuration** | `households`, `members`, `categories`, `tasks`, `rewards`, `vacations` | Modification rare | Last-write-wins par ligne |
| **Projections** | fraîcheur, XP, niveau, jauge, **solde de pièces**, quêtes du jour | **Jamais stockées** — calculées par `shared/domain` | — |

Règles :
- Le **solde de pièces** = `Σ completions.coins (non annulées) − Σ purchases.cost`. Jamais stocké → aucune incohérence possible entre appareils.
- L'**XP et les pièces sont figées** dans chaque `completion` au moment de la validation (barème et bonus d'anticipation inclus) : un changement de barème ne réécrit pas l'historique.

### 5.2 Tables

```
households          id, name, timezone, settings (jsonb)
members             id, household_id, email, display_name, daily_budget_min, notif_prefs (jsonb)
invitations         id, household_id, code_hash, expires_at, used_at          -- serveur uniquement
categories          id, household_id, name, icon, owner_member_id, sort_order
tasks               id, household_id, category_id, name,
                    type ('periodic' | 'quota' | 'signal'), size ('S' | 'M' | 'L' | 'XL'),
                    duration_min, interval_days, weekly_quota, max_delay_days,
                    signal_label, active, snoozed_until
completions    ⚡   id, household_id, task_id, member_id, completed_at, xp, coins, is_help, undone_at
signals        ⚡   id, household_id, task_id, raised_by, raised_at, is_automatic, resolved_by_completion_id
rewards             id, household_id, name, cost, kind ('personal' | 'common'), active
purchases      ⚡   id, household_id, reward_id, member_id, cost, purchased_at, honored_at
reactions      ⚡   id, household_id, completion_id, member_id, created_at
vacations           id, household_id, starts_on, ends_on
push_subscriptions  id, member_id, endpoint, p256dh, auth, created_at         -- serveur uniquement
notification_log    id, member_id, kind, local_date, sent_at                  -- serveur uniquement
```

Colonnes techniques de **toutes les tables synchronisées** :

| Colonne | Rôle |
|---|---|
| `id` | **UUID v7 généré côté client** → création hors ligne, idempotence, tri chronologique |
| `updated_at` | Horodatage client de la dernière modification (information, arbitrage LWW) |
| `deleted_at` | Suppression logique (propagée par la sync) |
| `rev` | Révision **serveur** (séquence Postgres), attribuée à chaque écriture — curseur de sync |

`household_id` est dénormalisé sur toutes les tables synchronisées pour filtrer la sync et contrôler l'accès sans jointure.

---

## 6. Synchronisation

### 6.1 Protocole

```
PUSH   POST /api/sync/push   { mutations: [{ table, row }] }
       → validation Zod + contrôle d'appartenance au foyer
       → upsert idempotent par id ; LWW sur updated_at pour la configuration
       → attribution d'un nouveau `rev` à chaque ligne écrite
       → effets de bord serveur (ex. push immédiat lors d'un signal)
       ← { acceptedIds, rev }

PULL   GET /api/sync/pull?since=<rev>
       ← { rows: [...], cursor: <rev max> }   (toutes les tables du foyer, rev > since)
```

- Le curseur repose sur le **`rev` serveur**, jamais sur l'horloge des téléphones.
- **Outbox locale** (table Dexie) : chaque écriture locale y ajoute une mutation dans la même transaction ; l'outbox est vidée après acquittement serveur.
- Une ligne locale modifiée et encore dans l'outbox n'est **pas écrasée** par un pull (l'écriture locale sera arbitrée côté serveur au push suivant).

### 6.2 Déclencheurs

Au démarrage · retour au premier plan (`visibilitychange`) · retour réseau (`online`) · après une écriture locale (debounce ~1 s) · toutes les 60 s tant que l'app est visible.

### 6.3 Robustesse

- `navigator.storage.persist()` demandé à l'installation pour éviter l'éviction d'IndexedDB.
- Le serveur reste la sauvegarde ; une réinstallation reconstruit l'état local par un pull complet (`since=0`).
- Versionnement du schéma Dexie ; toute évolution du modèle passe par une migration Drizzle **et** une version Dexie.

---

## 7. Notifications

```
cron-job.org ──(*/15 min, header Authorization: Bearer <CRON_SECRET>)──► /api/cron/tick
  Pour chaque membre, dans le fuseau du foyer :
    • Matin   : heure atteinte et non envoyée aujourd'hui           → « N quêtes aujourd'hui »
    • Soir    : heure atteinte ET quêtes restantes                  → rappel
    • Signaux : tâche « sur signal » dont max_delay_days est dépassé → signal automatique
  notification_log : idempotence (1 envoi par type et par jour) + plafond 3 / jour / membre
  Plage silencieuse 22 h – 8 h

Signal manuel ──► /api/sync/push ──► push immédiat à l'autre membre (hors plage silencieuse)
```

- Abonnements invalides (HTTP 404 / 410 du service push) supprimés automatiquement.
- `notificationclick` ouvre l'app sur l'écran concerné.
- Le tick est **idempotent** : un appel en double ou en retard ne produit ni doublon ni envoi hors fenêtre.
- Secours si cron-job.org est indisponible : workflow GitHub Actions `schedule` appelant la même route.

---

## 8. Temps et calendrier

- Stockage en **UTC** ; calcul de « jour » et « semaine » dans le **fuseau du foyer** (`Europe/Paris` par défaut, gestion correcte des changements d'heure).
- Semaine = **lundi → dimanche**.
- Toutes les fonctions du domaine reçoivent `now` et `timezone` en paramètre.

---

## 9. Sécurité

| Sujet | Mesure |
|---|---|
| Authentification | Google OAuth via `nuxt-auth-utils`, session en cookie scellé `HttpOnly`, `Secure`, `SameSite=Lax` |
| Autorisation | Liste blanche d'emails (**variable d'environnement**, jamais dans le repo public) ; chaque route vérifie la session **et** l'appartenance au foyer ; toutes les requêtes filtrées par `household_id` |
| Invitation | Code à usage unique, stocké haché, avec expiration |
| Route cron | Secret comparé en temps constant ; réponse neutre sinon |
| Entrées | Validation Zod systématique côté serveur (le client n'est jamais digne de confiance, même en usage privé) |
| En-têtes | CSP stricte, HSTS, `X-Content-Type-Options`, `Referrer-Policy` |
| Secrets | `NUXT_SESSION_PASSWORD`, `NUXT_OAUTH_GOOGLE_*`, `DATABASE_URL`, `VAPID_*`, `CRON_SECRET`, `ALLOWED_EMAILS` → variables d'environnement Vercel ; `.env` ignoré par Git ; `.env.example` sans valeurs commité |

---

## 10. Qualité, accessibilité, performance

- **Tests** : Vitest sur `shared/domain` (fraîcheur, quêtes, jauge, niveaux, calendrier) et sur le protocole de sync (idempotence, LWW, curseur). Pas de test d'UI superflu.
- **CI** : lint (ESLint + Stylelint), `nuxi typecheck`, tests — bloquants sur les PR.
- **Accessibilité** : WCAG 2.2 AA / RGAA (cf. CONCEPT §13) ; primitives Reka UI pour les composants complexes.
- **Performance** : app shell précaché, lecture locale instantanée (pas d'attente réseau sur l'UI), pas de dépendance lourde ; code splitting par page natif Nuxt.

---

## 11. Journal des décisions

| # | Décision | Alternatives écartées | Raison principale |
|---|---|---|---|
| D1 | Nuxt full stack (SPA + Nitro) sur Vercel | Supabase BaaS, moteurs de sync (InstantDB, PowerSync…), Firebase, backend .NET | Un seul langage, domaine partagé client / serveur, portabilité |
| D2 | Neon Postgres + Drizzle | Supabase, Turso, Firestore | Postgres standard, gratuit, pas de pause manuelle |
| D3 | Local-first par événements + sync push / pull maison | CRDT, sync engine tiers | Le modèle par événements élimine l'essentiel des conflits ; pas de dépendance jeune |
| D4 | Google OAuth + liste blanche | Magic link, Supabase Auth, mot de passe | Zéro friction sur Android, pas de service d'email |
| D5 | SCSS + BEM + Reka UI headless | Nuxt UI, Vuetify, Tailwind | Design sur mesure, conventions de l'équipe, accessibilité des composants complexes |
| D6 | cron-job.org toutes les 15 min | Vercel Cron (Hobby), GitHub Actions `schedule` (secours) | Précision et heures réglables par membre |
| D7 | Mode SPA (`ssr: false`) | SSR / hybride | Aucun besoin SEO ; PWA hors ligne plus simple |

---

## 12. Points à vérifier à la mise en place

- Limites exactes des offres gratuites (Vercel Hobby, Neon Free, cron-job.org) au moment du déploiement.
- Version stable courante de Nuxt et compatibilité de `@vite-pwa/nuxt`.
- Configuration de l'écran de consentement OAuth Google (mode « test » avec les 2 comptes suffit pour un usage privé).
