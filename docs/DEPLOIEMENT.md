# Déployer l'app

Tout est gratuit et sans carte bancaire. Compter **environ 45 minutes** la première fois.
Aucune valeur secrète ne doit être commitée : le dépôt est public.

Vue d'ensemble :

```
Neon (base Postgres) ◄── Vercel (app + API) ──► Google (connexion)
                              ▲
                 vos deux téléphones Android (PWA installée)
```

Garde un bloc-notes ouvert : tu vas y coller 5 valeurs au fil des étapes.

| Variable | Obtenue à l'étape |
|---|---|
| `NUXT_DATABASE_URL` | 1 — Neon |
| `NUXT_OAUTH_GOOGLE_CLIENT_ID` | 3 — Google |
| `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` | 3 — Google |
| `NUXT_SESSION_PASSWORD` | 2 — à générer |
| `NUXT_ALLOWED_EMAILS` | tes deux adresses Gmail, séparées par une virgule |

---

## 0. Mettre le code sur la branche de production

Vercel déploie la branche `main`. Le travail est sur `claude/eloquent-dijkstra-acwqe5` :
ouvre une pull request vers `main` sur GitHub et fusionne-la (ou demande-moi de l'ouvrir).

## 1. Base de données : Neon

1. Créer un compte sur [neon.tech](https://neon.tech) (connexion avec GitHub possible).
2. **Create project** : nom `quetes-maison`, Postgres 16 ou plus, région **AWS Europe Central 1 (Frankfurt)**.
3. Sur le tableau de bord du projet : **Connect** → cocher **Connection pooling** → copier la chaîne de connexion.
   Elle ressemble à `postgresql://neondb_owner:…@ep-…-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`
   (le mot `-pooler` doit y figurer). → `NUXT_DATABASE_URL`.
4. **Créer les tables.** Deux possibilités :
   - **Sans rien installer** : dans Neon, **SQL Editor**, coller puis exécuter le contenu de chaque fichier de
     [`server/db/migrations`](../server/db/migrations), **dans l'ordre** (`0000_…`, puis `0001_…`).
   - **Depuis ton poste** (Node 22 et pnpm installés) :
     ```bash
     git clone https://github.com/qgransart/HouseholdApp.git && cd HouseholdApp
     pnpm install
     NUXT_DATABASE_URL="postgresql://…" pnpm db:migrate
     ```
   À refaire à chaque nouvelle migration ajoutée dans `server/db/migrations`.

## 2. Mot de passe de session

Générer une chaîne aléatoire d'au moins 32 caractères, par exemple :

```bash
openssl rand -base64 32
```

(ou un générateur de mots de passe, 40 caractères). → `NUXT_SESSION_PASSWORD`.
Ne jamais le changer ensuite : cela déconnecterait tout le monde.

## 3. Hébergement : Vercel (première partie)

L'adresse de l'app est nécessaire pour configurer Google : on crée donc le projet Vercel d'abord.

1. Créer un compte sur [vercel.com](https://vercel.com) avec GitHub (offre **Hobby**).
2. **Add New → Project** → importer `HouseholdApp`. Le preset **Nuxt.js** est détecté ; ne rien changer
   aux commandes (pnpm est détecté grâce au `package.json`).
3. Avant de déployer, ouvrir **Environment Variables** et ajouter `NUXT_DATABASE_URL`,
   `NUXT_SESSION_PASSWORD` et `NUXT_ALLOWED_EMAILS` (ex. `toi@gmail.com,elle@gmail.com`).
4. **Deploy.** Noter l'adresse obtenue, par exemple `https://household-app.vercel.app`.
5. Dans **Settings** :
   - **General → Node.js Version** : `22.x`.
   - **Functions → Function Region** : `Frankfurt, Germany (fra1)`, au plus près de la base Neon.

## 4. Connexion Google

1. Sur [console.cloud.google.com](https://console.cloud.google.com), créer un projet « Quêtes de la maison ».
2. **API et services → Écran de consentement OAuth** (ou **Google Auth Platform**) :
   type **Externe**, nom de l'app, ton email ; laisser le statut **Test** et ajouter
   **vos deux adresses Gmail comme utilisateurs de test**. Le mode test suffit pour deux personnes :
   aucune validation Google n'est nécessaire.
3. **Identifiants → Créer des identifiants → ID client OAuth**, type **Application Web** :
   - Origines JavaScript autorisées : `https://household-app.vercel.app`
   - URI de redirection autorisés : `https://household-app.vercel.app/auth/google`

   (remplacer par ton adresse Vercel ; ajouter aussi `http://localhost:3000` et
   `http://localhost:3000/auth/google` pour le développement local).
4. Copier l'**ID client** et le **code secret**. → `NUXT_OAUTH_GOOGLE_CLIENT_ID` et `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`.

## 5. Vercel (fin)

1. **Settings → Environment Variables** : ajouter les deux variables Google.
2. **Deployments** → sur le dernier déploiement, **⋯ → Redeploy** (les variables ne s'appliquent qu'aux
   nouveaux déploiements).

## 6. Premier lancement

**Sur ton téléphone :**
1. Ouvrir l'adresse Vercel dans **Chrome**.
2. **Continuer avec Google** → choisir ton compte.
3. **Créer notre maison** : prénoms, qui s'occupe de quelle pièce, état actuel de chaque pièce.
4. Installer l'app : panneau **Installer l'app** de l'écran des quêtes, ou menu ⋮ → **Installer l'application**.
5. **Réglages** (roue dentée) → **Inviter Camille** → un code de 6 caractères s'affiche (valable 48 h).

**Sur son téléphone :**
1. Ouvrir la même adresse dans Chrome, **Continuer avec Google** avec son compte.
2. **Rejoindre avec un code** → saisir le code → la maison se télécharge.
3. Installer l'app de la même façon.

Vous jouez maintenant sur la même maison : chaque action se synchronise en quelques secondes quand le réseau
est là, et reste gardée sur le téléphone sinon.

**Téléphone changé ou app réinstallée ?** Se reconnecter avec le même compte Google : l'écran de bienvenue
propose **Retrouver ma maison**.

## 7. Vérifications

| Vérification | Attendu |
|---|---|
| `https://…/api/me` sans être connecté | Erreur 401 (normal : l'API est protégée) |
| Connexion avec un compte hors liste | Message « Ce compte Google n'est pas autorisé » |
| Réglages → Le foyer | Vos deux noms marqués « Connecté » |
| Réglages → Synchronisation | « À jour · hh:mm » |
| Mode avion puis réouverture de l'app | L'app s'ouvre et les quêtes se valident |

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Google affiche `redirect_uri_mismatch` | L'URI de redirection ne correspond pas exactement | Vérifier `https://<adresse>/auth/google` dans la console Google. Avec un domaine personnalisé, ajouter aussi la variable `NUXT_OAUTH_GOOGLE_REDIRECT_URL` |
| Google affiche « Accès bloqué » | Le compte n'est pas utilisateur de test | L'ajouter dans l'écran de consentement OAuth |
| Retour sur la page de connexion avec « non autorisé » | Email absent de `NUXT_ALLOWED_EMAILS` | Corriger la variable, puis **Redeploy** |
| Réglages → « Database not configured » ou erreurs 503 | `NUXT_DATABASE_URL` manquante | Ajouter la variable, puis **Redeploy** |
| Erreurs 500 à la synchronisation | Tables absentes | Appliquer les migrations (étape 1.4) |
| Pas de bouton « Installer » | Page ouverte hors de Chrome, ou déjà installée | Ouvrir dans Chrome ; vérifier l'écran d'accueil |

## Ce qui n'est pas encore actif

- **Notifications programmées** (quêtes du matin, rappel du soir, alertes envoyées à l'autre) : les réglages
  sont enregistrés et le bouton « Tester une notification » fonctionne, mais l'envoi automatique arrive avec
  le lot 6 (clés VAPID et cron-job.org, voir `.env.example`).

## Développement local

```bash
cp .env.example .env   # puis remplir les valeurs (une base Neon de test convient)
pnpm install
pnpm dev               # http://localhost:3000
```
