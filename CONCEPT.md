# HouseholdApp — Concept

> Document de référence du concept produit. Il sert de base aux décisions d'architecture (étape 2) et au développement (étape 3).
> Toute évolution fonctionnelle doit être reportée ici.

**Statut :** concept figé pour le MVP — v0.2 (règles précisées lors de l'implémentation du domaine)
**Utilisateurs cibles :** un foyer de 2 personnes (usage privé, non publié sur les stores)

---

## 1. Vision

Rendre le ménage **ludique, organisé et équitable** pour un couple, sous forme de **PWA** installée sur deux téléphones Android.

L'app répond à deux problèmes distincts :

| Problème | Réponse |
|---|---|
| **Organisation** — qui fait quoi, et quand ? | Catégories réparties à l'avance, tâches récurrentes, quêtes du jour générées automatiquement |
| **Motivation** — se lancer, tenir dans la durée | Fraîcheur visuelle, points, jauge commune, récompenses réelles, notifications |

**Principes directeurs**

1. **Zéro friction** : valider une tâche = 1 tap.
2. **Jamais punitif** : pas de perte de points, pas de culpabilisation. On récompense l'anticipation, on ne sanctionne pas le retard.
3. **Coopératif d'abord** : on joue dans la même équipe ; la compétition est une couche légère et optionnelle.
4. **Sur l'honneur** : aucune preuve demandée ; la transparence (historique partagé) suffit.
5. **Sobre** : univers « jeu de gestion minimaliste ».

---

## 2. Glossaire

| Terme | Définition |
|---|---|
| **Foyer** | Le logement partagé. Contient les membres, les catégories et les tâches. |
| **Membre** | Un utilisateur du foyer (2 dans le MVP). |
| **Catégorie** | Groupe de tâches (Cuisine, Salle de bain…). A **un membre responsable**. |
| **Tâche** | Action ménagère récurrente, d'un des 3 types (§4). |
| **Fraîcheur** | Indicateur 0–100 % de l'état d'une tâche périodique. |
| **Quête** | Tâche proposée à un membre dans ses objectifs du jour. |
| **Signal** | Déclenchement manuel d'une tâche « sur signal » (« C'est plein »). |
| **XP** | Expérience cumulée, ne diminue jamais. Fait monter le niveau du foyer. |
| **Pièces** | Monnaie individuelle dépensable dans la boutique de récompenses. |
| **Coup de main** | Tâche validée par un membre qui n'en est pas responsable. |

---

## 3. Foyer, membres et répartition

- Un membre **crée le foyer**, puis **invite** le second (lien / code d'invitation).
- Le foyer définit ses **catégories** et ses **tâches** (un catalogue standard est proposé à la création, cf. §10).
- À la création, on indique pour chaque pièce son **état actuel** (propre / moyen / sale) : il initialise la fraîcheur des tâches, pour ne pas démarrer avec tout « À faire ».
- Chaque **catégorie est attribuée à un membre**. Les quêtes du jour d'un membre proviennent de ses catégories.
- **N'importe quel membre peut valider n'importe quelle tâche** : les points vont à celui qui l'a faite, et la validation est marquée « 🤝 Coup de main » si ce n'est pas sa catégorie.

> MVP : un seul foyer par utilisateur. Le modèle de données doit toutefois rattacher toutes les entités à un foyer, pour ne pas bloquer une évolution multi-foyers.

---

## 4. Types de tâches

| Type | Exemple | Fonctionnement | Affichage |
|---|---|---|---|
| **Périodique** | Draps tous les 7 j | Fenêtre **glissante** : l'échéance repart de la dernière validation | Barre de fraîcheur |
| **Quota hebdo** | Préparer 4 repas / semaine | Fenêtre **fixe** du lundi au dimanche, remise à zéro le lundi | Compteur « 2/4 cette semaine » |
| **Sur signal** | Sortir les poubelles | Invisible tant que personne ne signale. Un membre appuie sur **« C'est plein »** → une quête apparaît chez le responsable + notification. **Délai max** optionnel : la tâche se déclenche d'elle-même N jours après sa dernière réalisation (hygiène) ; une tâche jamais réalisée attend son premier signal manuel | Bouton de signal ; quête prioritaire une fois déclenchée |

Attributs communs d'une tâche : nom, catégorie, type, **taille** (§6), durée estimée (minutes), paramètres propres au type (intervalle, quota, délai max), active / inactive.

---

## 5. Fraîcheur (tâches périodiques)

```
fraîcheur = max(0, 1 − joursÉcoulésDepuisDernièreValidation / intervalle)
```

Exemple : draps (intervalle 7 j) changés il y a 5 j → fraîcheur **29 %**.

| Fraîcheur | État | Libellé | Couleur |
|---|---|---|---|
| > 50 % | Propre | « Nickel » | Vert |
| 20 – 50 % | Bientôt | « À prévoir » | Orange |
| < 20 % (jusqu'au jour d'échéance inclus) | À faire | « À faire » | Rouge |
| Échéance dépassée | En retard | « En retard de N j » | Rouge foncé |

- Une tâche est « À faire » le jour de son échéance et « En retard » seulement à partir du lendemain : une tâche quotidienne faite la veille s'affiche « À faire », pas « En retard ». Une tâche jamais réalisée est « À faire ».
- Les jours sont des **jours calendaires** dans le fuseau du foyer : l'heure de validation et les changements d'heure ne décalent jamais une échéance.
- **Aucune pénalité** en cas de retard ; seul l'affichage change.
- La couleur n'est **jamais** la seule information : libellé + pourcentage toujours présents (WCAG 1.4.1).
- **Reporter** : décaler une tâche de N jours.
- **Mode vacances** : gèle toutes les fraîcheurs et compteurs du foyer sur une période.
- Chaque **catégorie** affiche une santé agrégée (moyenne des fraîcheurs de ses tâches) — c'est la « carte » du jeu de gestion.

---

## 6. Points : XP et pièces

Chaque tâche a une **taille**, qui détermine sa récompense. Une validation rapporte le même montant en **XP** (progression) et en **pièces** (monnaie).

| Taille | Repère de durée | XP / pièces |
|---|---|---|
| **S** | < 5 min | 5 |
| **M** | 5 – 15 min | 15 |
| **L** | 15 – 45 min | 40 |
| **XL** | > 45 min | 80 |

- **Bonus d'anticipation** : +20 % si une tâche périodique est validée pendant qu'elle est « À prévoir » (fraîcheur entre 20 et 50 %). Pas de bonus sur une tâche encore « Nickel » : cela encouragerait à refaire des tâches propres pour gagner des points.
- Le barème est **global et ajustable** : on ne saisit jamais un nombre de points par tâche.

---

## 7. Quêtes du jour

Écran d'accueil : **« Aujourd'hui : N quêtes »** pour le membre connecté.

**Algorithme de génération (par membre, chaque jour)**

1. Prendre les tâches actives des catégories du membre.
2. Placer en tête les tâches **sur signal** déclenchées.
3. Ne retenir que les tâches qui **valent la peine** (urgence ≥ 0,5) et trier par **urgence**, un score commun aux types :
   - périodique : jours écoulés / intervalle (1 = échéance aujourd'hui, > 1 = en retard) ;
   - quota : réalisations restantes / jours restants dans la semaine ; une seule occurrence proposée par jour.
   - à urgence égale, la tâche **la plus fréquente** passe d'abord (la vaisselle avant le four), puis la plus courte.
4. Ajouter des quêtes jusqu'à atteindre le **budget quotidien** (défaut : **35 min**, réglable par membre). Les tâches déjà faites aujourd'hui restent affichées comme terminées et **consomment le budget** : terminer une quête n'en fait pas apparaître une nouvelle indéfiniment.
5. La tâche la plus urgente est **toujours proposée**, même si elle dépasse le budget restant : sinon une grosse tâche (four, vitres) ne serait jamais planifiée.

Pendant le **mode vacances**, aucune quête n'est proposée.

**Bouton « J'ai 10 min »** : parmi toutes les tâches du foyer, propose la plus urgente dont la durée est ≤ 10 min (une tâche de l'autre membre est présentée comme coup de main). Il est possible de passer à la suggestion suivante.

---

## 8. Motivation et progression

### 8.1 Jauge commune (cœur coopératif)

- Objectif hebdomadaire d'XP **commun au foyer**, calculé automatiquement : **80 % de l'XP théorique de la semaine** (somme des tâches attendues d'après le catalogue actif).
- Objectif atteint → la **récompense commune** de la semaine est débloquée et la **série** s'incrémente.
- **Série hebdomadaire** : nombre de semaines consécutives avec jauge atteinte. **1 joker par mois** pour la préserver. La semaine en cours ne compte qu'une fois la jauge atteinte et ne casse jamais la série ; une semaine entièrement en vacances est neutre.

### 8.2 Niveau du foyer

- L'XP cumulée des deux membres fait monter le **niveau du foyer** (« Appartement niveau 7 »).
- Courbe de progression : passer du niveau *n* au niveau *n + 1* demande **100 × n^1,5 XP** (100, 283, 520, 800…). Les premiers niveaux arrivent en quelques jours, les suivants en plusieurs semaines.
- Badges ponctuels (ex. « Première semaine parfaite », « 10 coups de main », « Four vaincu »).

### 8.3 Porte-monnaie individuel et boutique

- Chaque membre a **ses propres pièces**.
- **Boutique de récompenses réelles**, définie par le foyer (liste à construire ensemble). Exemples : « Je choisis le film » 100, « Petit-déjeuner au lit » 300, « Joker vaisselle » 150.
- Acheter une récompense débite les pièces et notifie l'autre membre, qui la marque comme **honorée**.
- Des **récompenses communes** (ex. restaurant) sont liées à la jauge / aux paliers, pas aux pièces.

### 8.4 Duel hebdomadaire (optionnel, désactivé par défaut)

- Compare les deux membres sur la semaine.
- Pour rester **équitable malgré des charges différentes**, le score n'est pas l'XP brute mais : **% des quêtes de ses catégories réalisées + bonus coups de main**.
- Le gagnant obtient un avantage défini par le foyer (ex. choisir le restaurant).

---

## 9. Transparence et confiance

- **Historique partagé** visible par les deux membres (« X a nettoyé la salle de bain · il y a 2 h »).
- **Annulation** possible pendant **5 min** après une validation (erreur de tap). Au-delà, la validation est définitive.
- **Réaction « Merci ❤️ »** sur une validation de l'autre membre (reconnaissance sociale, sans notification push pour ne pas saturer).

---

## 10. Catalogue standard initial

Proposé à la création du foyer ; chaque tâche peut être désactivée ou modifiée. Valeurs par défaut à ajuster après retours d'usage.

| Catégorie | Tâche | Type | Paramètre | Taille | Durée |
|---|---|---|---|---|---|
| **Cuisine** | Vaisselle / lancer le lave-vaisselle | Périodique | 1 j | M | 15 min |
| | Nettoyer le plan de travail | Périodique | 1 j | S | 5 min |
| | Nettoyer l'évier | Périodique | 3 j | S | 5 min |
| | Nettoyer les plaques | Périodique | 7 j | M | 10 min |
| | Trier le frigo (périmés) | Périodique | 7 j | S | 5 min |
| | Nettoyer le micro-ondes | Périodique | 14 j | M | 10 min |
| | Nettoyer le frigo | Périodique | 30 j | L | 30 min |
| | Nettoyer le four | Périodique | 60 j | XL | 60 min |
| | Préparer un repas maison *(désactivée par défaut)* | Quota | 4 / sem | L | 40 min |
| **Salle de bain & WC** | Nettoyer les WC | Périodique | 7 j | M | 10 min |
| | Lavabo et miroir | Périodique | 7 j | M | 10 min |
| | Douche / baignoire | Périodique | 7 j | M | 15 min |
| | Changer les serviettes | Périodique | 7 j | S | 5 min |
| | Détartrage complet | Périodique | 30 j | L | 30 min |
| **Chambre** | Changer les draps | Périodique | 7 j | M | 15 min |
| | Laver couette et oreillers | Périodique | 90 j | L | 20 min |
| **Linge** | Lancer une machine | Sur signal « Panier plein » | max 7 j | S | 5 min |
| | Étendre le linge | Sur signal « Machine terminée » | — | M | 10 min |
| | Plier et ranger | Quota | 2 / sem | M | 15 min |
| **Poubelles** | Sortir les ordures ménagères | Sur signal « Poubelle pleine » | max 4 j | S | 5 min |
| | Sortir le tri / recyclage | Sur signal « Tri plein » | max 7 j | S | 5 min |
| | Déposer le verre | Sur signal « Verre plein » | max 30 j | S | 10 min |
| **Séjour & sols** | Ranger le séjour | Périodique | 2 j | M | 10 min |
| | Passer le balai (pièces de vie) | Périodique | 1 j | M | 10 min |
| | Aspirateur complet | Périodique | 7 j | L | 30 min |
| | Serpillière | Périodique | 7 j | L | 20 min |
| | Dépoussiérer | Périodique | 7 j | M | 15 min |
| | Arroser les plantes | Périodique | 3 j | S | 5 min |
| | Laver les vitres | Périodique | 30 j | XL | 60 min |
| | Faire les courses *(désactivée par défaut)* | Quota | 1 / sem | XL | 60 min |

### Charge théorique et répartition proposée

Charge moyenne du catalogue actif par défaut (hors repas et courses) : **≈ 75 min / jour pour le foyer, soit ≈ 37 min / personne**, cohérent avec l'objectif « au moins une demi-heure par jour ».

Répartition équilibrée proposée (à attribuer entre vous) :

| Lot | Catégories | Charge estimée |
|---|---|---|
| **Lot A** | Cuisine, Salle de bain & WC, Chambre, Poubelles | ≈ 38 min / jour |
| **Lot B** | Séjour & sols, Linge | ≈ 37 min / jour |

> L'app affichera la **charge théorique** de chaque membre (issue du catalogue) face à son **budget quotidien**. Si la charge dépasse durablement le budget, les tâches glisseront vers le rouge : c'est le signal pour rééquilibrer ou alléger les fréquences.

---

## 11. Notifications

Plateforme cible : **Android** (Chrome) → Web Push pleinement supporté. Icône d'app **statique** (pas d'icône dynamique en PWA).

| Notification | Déclencheur | Fréquence |
|---|---|---|
| **Quêtes du jour** | Planifiée le matin (heure réglable, défaut 8 h) | 1 / jour |
| **Rappel du soir** | Planifiée (défaut 19 h), **uniquement s'il reste des quêtes** | 0–1 / jour |
| **Signal** | Instantanée, quand l'autre membre appuie sur « C'est plein » | À l'événement |

Règles :
- **Maximum 3 notifications planifiées / jour / membre** ; les signaux rapprochés sont regroupés.
- **Plage silencieuse** 22 h – 8 h (les signaux sont différés au matin).
- Ton léger et humoristique, façon Duolingo (« Les draps commencent à sentir le vécu 👀 »).
- Réglables par membre (activer / désactiver chaque type, heures).

---

## 12. Direction visuelle

**Jeu mobile « cosy » et familier** (maquette validée : [`docs/mockups/quetes.html`](./docs/mockups/quetes.html), détails techniques : ARCHITECTURE §10).

- **Chaque catégorie est une pièce** du plan de la maison, avec son illustration, sa barre de vie, de la poussière quand elle est sale et des étincelles quand elle est propre. Toucher une pièce filtre les quêtes.
- **HUD** façon jeu mobile : niveau du foyer, pièces, série.
- **Coffre de la semaine** pour la jauge commune ; il s'ouvre quand l'objectif est atteint.
- **Quêtes** avec difficulté en étoiles, récompenses visibles et gros bouton « C'est fait ! ».
- **Défi éclair** (« J'ai 10 min ») tiré au dé.
- **Célébrations** : confettis, pièces qui volent jusqu'au compteur, « +XP », fenêtres « Niveau supérieur ! » et « Coffre ouvert ! », vibration, sons optionnels (coupés par défaut).
- Thème de jour pour le MVP ; thème nuit plus tard.

---

## 13. Accessibilité (WCAG 2.2 AA / RGAA)

- Couleur jamais seule porteuse d'information (libellés + pourcentages sur les jauges).
- Contrastes AA (texte 4.5:1, composants d'interface 3:1).
- Cibles tactiles confortables (≥ 44 × 44 px, au-delà du minimum 2.5.8).
- Jauges exposées aux lecteurs d'écran (`role="progressbar"` / `<progress>` avec `aria-valuetext` explicite, ex. « Draps : 29 %, à faire »).
- Validations et gains annoncés via une région `aria-live="polite"`.
- Respect de `prefers-reduced-motion` (animations réduites ou supprimées).
- Focus visible, ordre de tabulation logique, HTML sémantique.

---

## 14. Périmètre

### MVP

- Foyer à 2 membres, invitation, attribution des catégories
- Catalogue standard + CRUD des tâches (3 types)
- Fraîcheur, report, mode vacances
- Quêtes du jour + « J'ai 10 min »
- Validation 1 tap, annulation 5 min, historique partagé, « Merci »
- XP, pièces, niveau du foyer, jauge commune, série hebdo
- Boutique de récompenses (CRUD + achat + « honorée »)
- Notifications push (matin, soir, signaux)
- Fonctionnement **hors ligne** avec synchronisation entre les deux téléphones

### Plus tard

- Duel hebdomadaire (conçu ici, implémentation après le MVP si le besoin est confirmé)
- Badges avancés, statistiques de répartition
- Chaînage de tâches (ex. « Lancer une machine » → signal automatique « Machine terminée »)
- Minuteur « Speed clean »
- Boss hebdomadaire, avatar / maison qui évolue

---

## 15. Contraintes pour l'architecture (étape 2)

- **Coût : 0 €** (hébergement, base de données, notifications).
- **Disponible en permanence** (pas d'hébergement sur un poste personnel).
- **PWA installable** sur Android, **local-first** : utilisable hors ligne, synchronisée entre 2 appareils.
- **Accès restreint** aux 2 membres du foyer.
- **Web Push** : nécessite un serveur (clés VAPID) et des **tâches planifiées** (matin / soir / délais max des signaux).
- Préférence technique : **Vue.js / Nuxt**, déploiement type **Vercel**.

---

## 16. Questions ouvertes

- Liste des récompenses de la boutique (à définir ensemble).
- Liste des badges.
- Nom de l'application.
- Valeurs du catalogue et du barème : à ajuster après 2 à 3 semaines d'usage réel.
