# HouseholdApp — Architecture

> Document de référence technique. Complète [`CONCEPT.md`](./CONCEPT.md) (le « quoi ») en décrivant le « comment ».
> Toute décision structurante doit être ajoutée au journal des décisions (§12).

**Statut :** v0.6 — synchronisation (lot 5), notifications Web Push (lot 6) et lot « Couple » (prise en charge, troc, récap) en place, écrans complets d'après la maquette `docs/mockups`

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
| État UI | Composables Vue ; **Pinia** au premier besoin réel | Session et préférences uniquement ; les données métier vivent dans Dexie (une seule source de vérité locale) |
| Styles | **SCSS + BEM**, tokens en custom properties CSS | Design system « jeu cosy » sur mesure (§10), conventions de l'équipe |
| Polices | **Fredoka** (titres) + **Nunito** (texte), auto-hébergées via **Fontsource** (variable, sous-ensemble latin) | Identité « jeu » ; fichiers servis par l'app et précachés → fonctionnent hors ligne, aucun appel à Google Fonts |
| Dialogues | **`<dialog>` natif** (`showModal()`) | Piège de focus, `Escape`, fond inerte et restauration du focus fournis par le navigateur |
| Primitives accessibles | **Reka UI** (headless), au cas par cas | Voir §3.1 |
| Identifiants | **`uuid`** (v7) | Générés côté client, triables chronologiquement |
| Validation | **Zod** (schémas dans `shared/`) | Même validation client et serveur |
| ORM / migrations | **Drizzle** + **drizzle-kit** (migrations SQL versionnées dans `server/db/migrations`) | Léger, typé, compatible serverless, SQL lisible |
| Driver Postgres | **postgres.js** (`prepare: false`) | Transactions, TCP standard sur l'endpoint poolé de Neon : aucun couplage à un driver propriétaire |
| Base serveur | **Neon Postgres** (Free) | Postgres standard, mise en veille auto sans pause manuelle |
| Auth | **`nuxt-auth-utils`** + Google OAuth | Sessions en cookie scellé, pas de mot de passe ni d'emailing |
| Push | **`web-push`** + clés VAPID | Standard W3C ; FCM transparent sur Android |
| Planification | **cron-job.org** → `/api/cron/tick` toutes les 15 min | Heures de notification réglables par membre ; les crons Vercel Hobby sont trop limités |
| Tests | **Vitest** + **fake-indexeddb** + **PGlite** | Domaine pur, écritures locales, services serveur sur un vrai Postgres embarqué (mêmes migrations qu'en production) |
| Lint | **`@nuxt/eslint`** + Stylelint (SCSS / BEM) | |
| CI | **GitHub Actions** (gratuit en repo public) | Lint, typecheck, tests sur chaque push / PR |
| Hébergement | **Vercel Hobby** (preset Nitro `vercel`) | Déploiement automatique depuis GitHub |

### 3.1 Reka UI : pourquoi et quand

Reka UI (ex-Radix Vue) fournit des composants **headless** : comportement, gestion du focus, navigation clavier et attributs ARIA conformes aux patterns WAI-ARIA, **sans aucun style**. On garde donc 100 % de la maîtrise du rendu en SCSS / BEM.

Règle d'usage :
- **Composants simples** (boutons, cartes, jauges, listes) → HTML sémantique natif, pas de Reka UI.
- **Dialogues et bottom sheets** → `<dialog>` natif : le navigateur gère déjà le piège de focus, `Escape` et l'inertie du fond.
- **Composants à comportement complexe** où l'accessibilité est difficile à réussir soi-même → Reka UI : menus déroulants, onglets, sélecteurs, listes de choix.

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
docs/mockups/             # Maquettes HTML de référence
public/                   # Icônes, manifest assets
```

**`shared/domain` est le cœur métier** : fonctions **pures**, sans dépendance à Vue, Dexie, Drizzle ni à l'horloge système (le « maintenant » et le fuseau sont passés en paramètre → tests déterministes). Utilisé par le client (affichage hors ligne) et le serveur (notifications).

---

## 5. Modèle de données

### 5.1 Principe : événements + projections

| Catégorie | Tables | Écriture | Conflits |
|---|---|---|---|
| **Événements** | `completions`, `signals`, `purchases`, `reactions`, `claims` | Ajout ; seuls des champs d'état ultérieurs sont posés (`undone_at`, `honored_at`, `resolved_by_completion_id`) | Aucun (union) |
| **Configuration** | `households`, `members`, `categories`, `tasks`, `rewards`, `vacations`, `trades` (une proposition n'est modifiée que par sa réponse ou son annulation) | Modification rare | Last-write-wins par ligne |
| **Projections** | fraîcheur, XP, niveau, jauge, **solde de pièces**, quêtes du jour | **Jamais stockées** — calculées par `shared/domain` | — |

Règles :
- Le **solde de pièces** = `Σ completions.coins (non annulées) − Σ purchases.cost ± Σ trades.coins (acceptés)`. Jamais stocké → aucune incohérence possible entre appareils.
- L'**XP et les pièces sont figées** dans chaque `completion` au moment de la validation (barème et bonus d'anticipation inclus) : un changement de barème ne réécrit pas l'historique.

### 5.2 Tables

```
households          id, name, timezone, settings (jsonb)
members             id, household_id, email, display_name, daily_budget_min, notif_prefs (jsonb)
invitations         id, household_id, code_hash, expires_at, used_at          -- serveur uniquement
categories          id, household_id, name, icon, owner_member_id, sort_order   -- icon : clé d'une illustration de pièce (§10)
tasks               id, household_id, category_id, name,
                    type ('periodic' | 'quota' | 'signal'), size ('S' | 'M' | 'L' | 'XL'),
                    duration_min, interval_days, weekly_quota, max_delay_days,
                    signal_label, active, snoozed_until,
                    baseline_on        -- date de référence tant qu'aucune validation n'existe (état déclaré à l'onboarding)
completions    ⚡   id, household_id, task_id, member_id, completed_at, xp, coins, is_help, undone_at
signals        ⚡   id, household_id, task_id, raised_by, raised_at, is_automatic, resolved_by_completion_id
rewards             id, household_id, name, cost, kind ('personal' | 'common'), active
purchases      ⚡   id, household_id, reward_id, member_id, cost, purchased_at, honored_at
reactions      ⚡   id, household_id, completion_id, member_id, created_at
vacations           id, household_id, starts_on, ends_on
claims         ⚡   id, household_id, task_id, member_id, claimed_on, created_at, released_at, trade_id
trades              id, household_id, proposed_by, proposed_to, request_task_id, offer_task_id,
                    coins, due_on, created_at, accepted_at, declined_at, cancelled_at
push_subscriptions  id, household_id, member_id, endpoint (unique), p256dh, auth, created_at      -- serveur uniquement
notification_log    id, notification_id, household_id, member_id, kind, local_date,
                    dedupe_key (unique), sent_at                                               -- serveur uniquement
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
PUSH   POST /api/sync/push   { mutations: [{ table, row }] }   (≤ 1 000 par envoi)
       → validation Zod (shared/schemas/rows.ts) + contrôle d'appartenance au foyer
       → premier envoi d'un foyer inconnu : il est créé s'il liste le compte qui l'envoie
       → upsert idempotent par id ; last-write-wins sur updated_at ; une ligne ne change jamais de foyer
       → email des membres jamais modifié par un appareil (D16)
       → attribution d'un nouveau `rev` à chaque ligne écrite, sous verrou du foyer (D15)
       ← { accepted }

PULL   GET /api/sync/pull?since=<rev>
       ← { rows: [...], cursor: <rev max> }   (toutes les tables du foyer, rev > since)
```

- Le curseur repose sur le **`rev` serveur**, jamais sur l'horloge des téléphones.
- **Outbox locale** (table Dexie) : chaque écriture locale y ajoute une mutation dans la même transaction ; l'outbox est vidée après acquittement serveur.
- Une ligne locale modifiée et encore dans l'outbox n'est **pas écrasée** par un pull (l'écriture locale sera arbitrée côté serveur au push suivant).
- **Rejoindre / restaurer** : après une invitation acceptée, ou sur un nouveau téléphone d'un compte déjà membre (`/api/me`), l'appareil télécharge tout le foyer (`since=0`) puis l'adopte.
- Un foyer créé avant la connexion (anciens appareils) est rattaché au compte connecté avant son premier envoi.

### 6.2 Déclencheurs

Au démarrage · retour au premier plan (`visibilitychange`) · retour réseau (`online`) · après une écriture locale (debounce ~1 s) · toutes les 60 s tant que l'app est visible.

### 6.3 Robustesse

- `navigator.storage.persist()` demandé à l'installation pour éviter l'éviction d'IndexedDB.
- Le serveur reste la sauvegarde ; une réinstallation reconstruit l'état local par un pull complet (`since=0`).
- Versionnement du schéma Dexie ; toute évolution du modèle passe par une migration Drizzle **et** une version Dexie.

---

## 7. Notifications

```
cron-job.org ──(*/15 min, header Authorization: Bearer <NUXT_CRON_SECRET>)──► /api/cron/tick
  Pour chaque foyer ayant au moins un abonnement, dans le fuseau du foyer :
    • Matin   : fenêtre [heure choisie, +2 h) ouverte, au moins une quête → « N quêtes aujourd'hui »
    • Soir    : fenêtre [heure choisie, +2 h) ouverte, s'arrête à 22 h, quêtes restantes → rappel
    • Alertes : signaux manuels ouverts de moins de 24 h, différés par la plage silencieuse
  Rien pendant les vacances.

    • Récap   : le dimanche, fenêtre [18 h, +2 h), semaine de l'autre membre (s'il a fait au moins une quête)

Signal, « je m'en occupe », troc ──► /api/sync/push ──► notifyInstant() : push immédiat
```

Règles (logique pure : `shared/domain/notifications.ts`, orchestration : `server/services/notifications.ts`) :

- **Destinataire d'une alerte** : le responsable de la pièce de la tâche, s'il n'est pas celui qui l'a signalée. Les alertes en attente d'un membre sont **regroupées** en une notification.
- **« Je m'en occupe »** : notifié à l'autre membre si la tâche est dans ses pièces ou s'il avait lancé une alerte dessus ; pas pour une prise en charge issue d'un troc (le troc est déjà annoncé). **Troc** : la proposition au destinataire, la réponse au proposeur. Même préférence « alertes », même plage silencieuse, même âge maximal (24 h) que les signaux.
- **Plage silencieuse 22 h – 8 h** : elle retient les alertes (envoyées au premier tick après 8 h). Les notifications planifiées suivent l'heure choisie par le membre (un matin à 7 h 30 est un choix), mais aucune fenêtre ne déborde sur 22 h.
- **Signaux automatiques** (délai max dépassé) : pas de notification dédiée, ils ouvrent la notification du matin (« 🔔 Poubelle pleine · … »).
- **Idempotence et plafond** : chaque fait annoncé a une clé (`morning:<membre>:<date>`, `signal:<membre>:<signal>`) réservée dans `notification_log` **avant** l'envoi, sous le verrou du foyer (D15) ; un tick en double ou concurrent n'envoie rien de plus. Plafond **3 notifications / jour / membre** (`count(distinct notification_id)`, une alerte groupée compte pour une).
- **Au plus une fois** : une réservation n'est pas rejouée si le service push échoue (une notification perdue plutôt qu'un doublon).
- **Abonnements** : un par appareil, rafraîchi à chaque démarrage après la première synchronisation (les services push peuvent faire tourner l'endpoint). Un endpoint appartient au dernier compte qui l'enregistre. Réponse 404 / 410 du service push → abonnement supprimé.
- **Service worker** : `push` affiche la notification (`tag` : `quests` ou `signals`, qui se remplacent), `notificationclick` ramène sur l'app ouverte ou l'ouvre. Le `topic` Web Push fusionne aussi les notifications non encore livrées (téléphone hors ligne).
- **Test** : « Tester une notification » (Réglages) passe par le serveur, donc vérifie toute la chaîne.
- Secours possible si cron-job.org est indisponible : n'importe quel planificateur appelant la même route (le tick est idempotent).

---

## 8. Temps et calendrier

- Stockage en **UTC** ; calcul de « jour » et « semaine » dans le **fuseau du foyer** (`Europe/Paris` par défaut, gestion correcte des changements d'heure).
- Semaine = **lundi → dimanche**.
- Toutes les fonctions du domaine reçoivent `now` et `timezone` en paramètre.

---

## 9. Sécurité

| Sujet | Mesure |
|---|---|
| Authentification | Google OAuth via `nuxt-auth-utils` (`/auth/google`), email vérifié exigé, session en cookie scellé `HttpOnly`, `Secure`, `SameSite=Lax`, valable 90 jours |
| Identité | Un membre = un compte Google (`members.email`, unique, en minuscules). Le créateur du foyer est lié à l'onboarding, le second membre via une invitation |
| Usage hors ligne | Un appareil qui a déjà un foyer ouvre le jeu sans session : seule la synchronisation exige d'être connecté |
| Autorisation | Liste blanche d'emails (**variable d'environnement**, jamais dans le repo public), **revérifiée à chaque requête** (retirer un email coupe l'accès sans attendre l'expiration de la session) ; chaque route vérifie la session **et** l'appartenance au foyer ; toutes les requêtes filtrées par `household_id` |
| Invitation | Code de 6 caractères sans ambiguïté (pas de 0/O, 1/I/L), tiré uniformément (Web Crypto), stocké haché (SHA-256), à usage unique, valable 48 h ; un nouveau code invalide le précédent |
| Route cron | Secret comparé en temps constant ; réponse neutre sinon |
| Entrées | Validation Zod systématique côté serveur (le client n'est jamais digne de confiance, même en usage privé) |
| En-têtes | CSP (`default-src 'self'`, `frame-ancestors 'none'`…), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Limite connue : `script-src` autorise `'unsafe-inline'`, requis par la configuration inline du shell Nuxt ; à durcir avec des hashes |
| Secrets | `NUXT_SESSION_PASSWORD`, `NUXT_OAUTH_GOOGLE_CLIENT_ID` / `_SECRET`, `NUXT_DATABASE_URL`, `NUXT_ALLOWED_EMAILS`, `NUXT_VAPID_PRIVATE_KEY`, `NUXT_CRON_SECRET` → variables d'environnement Vercel ; `.env` ignoré par Git ; `.env.example` sans valeurs commité |

---

## 10. Interface : design system « jeu cosy »

Référence visuelle : [`docs/mockups/quetes.html`](./docs/mockups/quetes.html) (maquette validée). L'app doit **ressembler à un jeu mobile familier**, pas à un outil de productivité.

### 10.1 Éléments de jeu

| Élément | Rôle | Donnée du domaine |
|---|---|---|
| **HUD** (barre du haut) | Niveau du foyer (pastille + anneau d'XP), pièces, série | `computeLevel`, `computeCoinBalance`, `computeStreak` |
| **Plan de la maison** | Une **pièce par catégorie**, avec barre de vie, poussière (sale) ou étincelles (propre) ; filtre les quêtes | Moyenne des fraîcheurs des tâches périodiques de la catégorie |
| **Coffre de la semaine** | Jauge commune ; s'ouvre quand l'objectif est atteint | `computeWeeklyGauge` |
| **Quêtes du jour** | Cartes avec difficulté en étoiles (taille S → XL), récompenses, barre de vie | `generateDailyQuests` |
| **Défi éclair** | « J'ai 10 min », tirage façon dé / machine à sous | `suggestQuickTasks` |
| **Alertes** | Tâches « sur signal », cloche + « ! » sur la pièce | Signaux ouverts |
| **Célébrations** | Confettis, pièces qui volent vers le HUD, « +XP », modales niveau / coffre | Événements de validation |

### 10.2 Règles

- **Palette « jour »** unique pour le MVP (ciel, papier, bois ; teal / or / gemme violette / rouge d'alerte), en tokens CSS. Le thème nuit est reporté après le MVP (D10) : aucune couleur n'est codée en dur dans les composants, pour pouvoir l'ajouter sans les toucher.
- **Boutons « 3D »** (ombre portée qui s'écrase à l'appui) pour toutes les actions de jeu.
- **Sons** synthétisés en Web Audio (aucun fichier), **désactivés par défaut** ; **vibrations** courtes à la validation.
- **Mouvement** : chaque animation a un état final lisible sans elle ; toutes sont coupées sous `prefers-reduced-motion`.
- **Accessibilité inchangée** (§11) : les effets sont `aria-hidden`, l'information passe par le texte, les rôles ARIA (`meter`, `progressbar`) et une région `aria-live`.
- Une **icône de pièce** (clé stockée dans `categories.icon`) illustre chaque catégorie : cuisine, salle de bain, chambre, séjour, buanderie, poubelles, extensible.

---

## 11. Qualité, accessibilité, performance

- **Tests** : Vitest sur `shared/domain` (fraîcheur, quêtes, jauge, niveaux, calendrier) et sur le protocole de sync (idempotence, LWW, curseur). Pas de test d'UI superflu.
- **CI** : lint (ESLint + Stylelint), `nuxi typecheck`, tests — bloquants sur les PR.
- **Accessibilité** : WCAG 2.2 AA / RGAA (cf. CONCEPT §13) ; primitives Reka UI pour les composants complexes.
- **Performance** : app shell précaché, lecture locale instantanée (pas d'attente réseau sur l'UI), pas de dépendance lourde ; code splitting par page natif Nuxt.

---

## 12. Journal des décisions

| # | Décision | Alternatives écartées | Raison principale |
|---|---|---|---|
| D1 | Nuxt full stack (SPA + Nitro) sur Vercel | Supabase BaaS, moteurs de sync (InstantDB, PowerSync…), Firebase, backend .NET | Un seul langage, domaine partagé client / serveur, portabilité |
| D2 | Neon Postgres + Drizzle | Supabase, Turso, Firestore | Postgres standard, gratuit, pas de pause manuelle |
| D3 | Local-first par événements + sync push / pull maison | CRDT, sync engine tiers | Le modèle par événements élimine l'essentiel des conflits ; pas de dépendance jeune |
| D4 | Google OAuth + liste blanche | Magic link, Supabase Auth, mot de passe | Zéro friction sur Android, pas de service d'email |
| D5 | SCSS + BEM + Reka UI headless | Nuxt UI, Vuetify, Tailwind | Design sur mesure, conventions de l'équipe, accessibilité des composants complexes |
| D6 | cron-job.org toutes les 15 min | Vercel Cron (Hobby), GitHub Actions `schedule` (secours) | Précision et heures réglables par membre |
| D7 | Mode SPA (`ssr: false`) | SSR / hybride | Aucun besoin SEO ; PWA hors ligne plus simple |
| D8 | Direction visuelle « jeu cosy » (maquette validée) | Style minimaliste « outil » (première maquette) | Motivation et plaisir d'usage priment ; familier (codes des jeux mobiles) |
| D9 | Fredoka + Nunito auto-hébergées (Fontsource) | Police système, Google Fonts en ligne | Identité « jeu » ; hors ligne et sans dépendance réseau (~60 Ko précachés) |
| D10 | Thème clair unique au MVP, tokens prêts pour un thème nuit | Thème sombre dès le MVP | Un thème nuit « jeu » demande un vrai travail de design ; reporté sans dette grâce aux tokens |
| D11 | `<dialog>` natif pour modales et bottom sheets | Reka UI Dialog | Accessibilité fournie par la plateforme, zéro dépendance |
| D12 | `baseline_on` sur les tâches, renseigné à l'onboarding (état « propre / moyen / sale » par pièce) | Tout « à faire » au premier lancement, validations fictives | Démarrage réaliste sans XP artificielle ; donne aussi une référence au délai max des tâches sur signal |
| D13 | postgres.js + tests sur PGlite | Driver Neon serverless (HTTP) ; base de test Docker | Transactions et portabilité ; tests rapides, sans service externe, sur les vraies migrations |
| D14 | Le foyer naît sur l'appareil (local-first) et arrive sur le serveur par la **première synchronisation** ; l'invitation lie le second compte à une ligne `members` existante | Création du foyer par une API dédiée | Un seul chemin d'écriture (la sync) |
| D15 | Verrou consultatif Postgres par foyer (`pg_advisory_xact_lock`) sur push **et** pull | Curseur par horodatage, pull sans verrou | Une révision attribuée mais commitée plus tard ne peut pas être sautée par un pull concurrent |
| D16 | Les emails des membres ne sont jamais modifiés par un push : le créateur ne peut déclarer que le sien, le second arrive par invitation | Confiance dans l'appareil | Un appareil ne peut pas attribuer la seconde place à un compte arbitraire |
| D17 | Prix des récompenses calibrés sur ~250 pièces gagnées par semaine et par joueur | Prix symboliques (100–300) | La maquette a montré qu'on pouvait s'offrir une récompense chaque semaine sans effort réel |
| D18 | Réservation de la notification (`notification_log.dedupe_key` unique) **avant** l'envoi | Journaliser après l'envoi, file de messages | Idempotence du tick sans infrastructure en plus ; au pire une notification perdue, jamais un doublon |
| D19 | Alerte « c'est plein » envoyée pendant la requête de sync, le tick ne faisant que rattraper | Attendre le tick (jusqu'à 15 min), file de tâches | Instantané sans service supplémentaire ; un échec d'envoi ne fait pas échouer la sync |
| D20 | `web-push` (Node) pour le chiffrement et la signature VAPID | Implémentation maison (RFC 8291 / 8292), service tiers (OneSignal…) | Bibliothèque de référence, pas de compte externe ; le chiffrement à la main serait un risque inutile |
| D21 | « Je m'en occupe » **daté** (`claimed_on`), qui expire seul le soir ; en cas de course hors ligne, la première prise en charge gagne | Prise en charge sans échéance, verrou côté serveur | Jamais de promesse qui traîne ; aucune coordination réseau nécessaire |
| D22 | Un troc accepté crée **deux prises en charge** ; les pièces changent de main **à l'acceptation** | Nouveau mécanisme d'affectation, paiement à la réalisation | Réutilise les règles des quêtes ; « sur l'honneur » comme la boutique, sans lier le paiement aux validations |
| D23 | Le pull ignore les tables inconnues de l'appareil (à partir de cette version) ; les préférences sans `recap` sont complétées par le serveur | Version de protocole négociée | À la prochaine nouvelle table, un téléphone pas encore mis à jour continuera de se synchroniser. Cette fois, les appareils en version antérieure doivent accepter la mise à jour pour se resynchroniser |

---

## 13. Points à vérifier à la mise en place

- Limites exactes des offres gratuites (Vercel Hobby, Neon Free, cron-job.org) au moment du déploiement.
- Version stable courante de Nuxt et compatibilité de `@vite-pwa/nuxt`.
- Configuration de l'écran de consentement OAuth Google (mode « test » avec les 2 comptes suffit pour un usage privé).
