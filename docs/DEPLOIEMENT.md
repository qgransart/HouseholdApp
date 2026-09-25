# Mise en place des services

Tout est gratuit, sans carte bancaire. Compter environ 30 minutes la première fois.
Aucune valeur ci-dessous ne doit être commitée : le dépôt est public.

## 1. Base de données : Neon

1. Créer un compte sur [neon.tech](https://neon.tech) (connexion GitHub possible) et un projet, région **Europe (Frankfurt)**.
2. Dans **Connection Details**, activer **Connection pooling** et copier la chaîne de connexion (elle contient `-pooler`).
3. La garder pour `NUXT_DATABASE_URL`.
4. Créer les tables, depuis ton poste :

   ```bash
   NUXT_DATABASE_URL="postgresql://…" pnpm db:migrate
   ```

   À refaire à chaque nouvelle migration (`server/db/migrations`).

## 2. Connexion Google

1. Sur [console.cloud.google.com](https://console.cloud.google.com), créer un projet « Quêtes de la maison ».
2. **API et services → Écran de consentement OAuth** : type **Externe**, statut **Test**, ajouter vos deux adresses Gmail comme **utilisateurs de test**. (Le mode test suffit pour deux personnes : pas de validation Google nécessaire.)
3. **Identifiants → Créer des identifiants → ID client OAuth**, type **Application Web** :
   - Origines JavaScript autorisées : `https://<ton-domaine>.vercel.app` (et `http://localhost:3000` pour le développement)
   - URI de redirection autorisés : `https://<ton-domaine>.vercel.app/auth/google` (et `http://localhost:3000/auth/google`)
4. Copier l'ID client et le code secret pour `NUXT_OAUTH_GOOGLE_CLIENT_ID` / `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`.

## 3. Hébergement : Vercel

1. Créer un compte sur [vercel.com](https://vercel.com) avec GitHub, **Add New → Project**, importer le dépôt. Le preset Nuxt est détecté.
2. Dans **Settings → Environment Variables**, ajouter :

   | Variable | Valeur |
   |---|---|
   | `NUXT_SESSION_PASSWORD` | Résultat de `openssl rand -base64 32` |
   | `NUXT_DATABASE_URL` | Chaîne Neon (étape 1) |
   | `NUXT_OAUTH_GOOGLE_CLIENT_ID` | Étape 2 |
   | `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` | Étape 2 |
   | `NUXT_ALLOWED_EMAILS` | `toi@gmail.com,elle@gmail.com` |

3. Déployer, puis reporter l'URL obtenue dans la console Google (étape 2.3) si elle n'y est pas encore.

## 4. Développement local

```bash
cp .env.example .env   # puis remplir les valeurs
pnpm dev
```
