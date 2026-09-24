# HouseholdApp

PWA local-first qui rend le ménage ludique pour un foyer de deux personnes.

- Concept produit : [`CONCEPT.md`](./CONCEPT.md)
- Architecture et décisions techniques : [`ARCHITECTURE.md`](./ARCHITECTURE.md)

## Prérequis

- Node.js ≥ 22.19 (voir `.nvmrc`)
- pnpm 10 (`corepack enable`)

## Démarrage

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Scripts

| Script | Rôle |
|---|---|
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build de production |
| `pnpm preview` | Prévisualisation du build |
| `pnpm lint` | ESLint (TS / Vue, style inclus) + Stylelint (SCSS, convention BEM) |
| `pnpm typecheck` | Vérification des types (`vue-tsc`) |
| `pnpm test` | Tests unitaires (Vitest) |

## Variables d'environnement

Voir [`.env.example`](./.env.example). Le dépôt est public : aucune valeur réelle ne doit être commitée.
