<script setup lang="ts">
const LINKS = [
  { to: '/', label: 'Quêtes', path: 'M5 4h11l3 3v13H5zM9 12l2 2 4-4' },
  { to: '/maison', label: 'Maison', path: 'M3 11L12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { to: '/boutique', label: 'Boutique', path: 'M4 9h16l-1.5 11h-13zM8 9a4 4 0 0 1 8 0' },
  { to: '/trophees', label: 'Trophées', path: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4' },
] as const

const { toHonor } = useGame()
</script>

<template>
  <nav
    class="bottom-nav"
    aria-label="Navigation principale"
  >
    <ul
      class="bottom-nav__list"
      role="list"
    >
      <li
        v-for="link in LINKS"
        :key="link.to"
      >
        <NuxtLink
          :to="link.to"
          class="bottom-nav__link"
          active-class=""
          exact-active-class="bottom-nav__link--active"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path :d="link.path" />
          </svg>
          {{ link.label }}
          <span
            v-if="link.to === '/boutique' && toHonor.length"
            class="bottom-nav__badge tabular-nums"
          >{{ toHonor.length }}<span class="visually-hidden"> à honorer</span></span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style lang="scss" scoped>
.bottom-nav {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  justify-content: center;
  padding: 0.4rem var(--gutter) calc(0.5rem + env(safe-area-inset-bottom, 0));
  background: var(--color-paper);
  border-top: var(--border-width) solid var(--color-line);

  &__list {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    width: 100%;
    max-width: var(--content-max-width);
    margin: 0;
  }

  &__link {
    position: relative;
    display: grid;
    gap: 0.1rem;
    place-items: center;
    min-height: 3.25rem;
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: 0.75rem;

    svg {
      width: 1.6rem;
      height: 1.6rem;
    }

    &--active {
      color: var(--color-teal-dark);
      background: var(--color-teal-soft);
    }
  }

  &__badge {
    position: absolute;
    top: 0.2rem;
    right: calc(50% - 1.4rem);
    min-width: 1.1rem;
    padding: 0 0.25rem;
    font-size: 0.65rem;
    color: #fff;
    text-align: center;
    background: var(--color-red);
    border-radius: var(--radius-full);
  }
}
</style>
