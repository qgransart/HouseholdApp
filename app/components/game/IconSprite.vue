<template>
  <!-- Mounted once: every GameIcon references these symbols, so each icon costs a single <use>. -->
  <svg
    class="icon-sprite"
    aria-hidden="true"
  >
    <defs>
      <symbol
        id="icon-coin"
        viewBox="0 0 24 24"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="#ffc53d"
          stroke="#d9960a"
          stroke-width="2"
        />
        <path
          d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4"
          fill="none"
          stroke="#9a6400"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </symbol>
      <symbol
        id="icon-gem"
        viewBox="0 0 24 24"
      >
        <path
          d="M6 3h12l4 6-10 12L2 9z"
          fill="#7b5cff"
          stroke="#5638d6"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <path
          d="M2 9h20M9 3l3 18 3-18"
          fill="none"
          stroke="#c9bcff"
          stroke-width="1.2"
        />
      </symbol>
      <symbol
        id="icon-flame"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z"
          fill="#ff8a00"
          stroke="#d9480f"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <path
          d="M12 13c1 1.5 3 2.5 3 4.5a3 3 0 0 1-6 0c0-1.5 1-2.5 3-4.5z"
          fill="#ffd43b"
        />
      </symbol>
      <symbol
        id="icon-star"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"
          stroke-linejoin="round"
          stroke-width="1.5"
        />
      </symbol>
      <symbol
        id="icon-check"
        viewBox="0 0 24 24"
      >
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          fill="none"
          stroke="currentColor"
          stroke-width="3.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </symbol>
      <symbol
        id="icon-bell"
        viewBox="0 0 24 24"
      >
        <path
          d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </symbol>
      <symbol
        id="icon-dice"
        viewBox="0 0 24 24"
      >
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="4"
          fill="#fff"
        />
        <circle
          v-for="([cx, cy], index) in [[8, 8], [16, 16], [12, 12], [16, 8], [8, 16]]"
          :key="index"
          :cx="cx"
          :cy="cy"
          r="1.7"
          fill="#5638d6"
        />
      </symbol>
      <symbol
        id="icon-kitchen"
        viewBox="0 0 32 32"
      >
        <rect
          x="5"
          y="13"
          width="22"
          height="13"
          rx="2"
          fill="#ffd8a8"
          stroke="#2b2d42"
          stroke-width="2"
        />
        <path
          d="M3 13h26M11 13V9a5 5 0 0 1 10 0v4"
          fill="none"
          stroke="#2b2d42"
          stroke-width="2"
          stroke-linecap="round"
        />
        <path
          d="M12 5c0-1 1-1 1-2M16 5c0-1 1-1 1-2M20 5c0-1 1-1 1-2"
          stroke="#8a8fa8"
          stroke-width="1.5"
          fill="none"
          stroke-linecap="round"
        />
      </symbol>
      <symbol
        id="icon-bath"
        viewBox="0 0 32 32"
      >
        <path
          d="M4 16h24v3a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7z"
          fill="#a5d8ff"
          stroke="#2b2d42"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M8 16V7a3 3 0 0 1 6 0M10 26l-1 3M22 26l1 3"
          fill="none"
          stroke="#2b2d42"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle
          cx="18"
          cy="12"
          r="1.5"
          fill="#74c0fc"
        />
        <circle
          cx="22"
          cy="10"
          r="1"
          fill="#74c0fc"
        />
      </symbol>
      <symbol
        id="icon-bed"
        viewBox="0 0 32 32"
      >
        <path
          d="M3 24V8M3 18h26v6M29 24v-6"
          fill="none"
          stroke="#2b2d42"
          stroke-width="2"
          stroke-linecap="round"
        />
        <rect
          x="5"
          y="12"
          width="7"
          height="5"
          rx="2"
          fill="#fff"
          stroke="#2b2d42"
          stroke-width="2"
        />
        <path
          d="M13 17v-4h12a4 4 0 0 1 4 4v1"
          fill="#d0bfff"
          stroke="#2b2d42"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </symbol>
      <symbol
        id="icon-sofa"
        viewBox="0 0 32 32"
      >
        <path
          d="M6 15V11a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v4"
          fill="#b2f2bb"
          stroke="#2b2d42"
          stroke-width="2"
        />
        <path
          d="M3 16a2 2 0 0 1 4 0v3h18v-3a2 2 0 0 1 4 0v7H3z"
          fill="#8ce99a"
          stroke="#2b2d42"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M6 23v3M26 23v3"
          stroke="#2b2d42"
          stroke-width="2"
          stroke-linecap="round"
        />
      </symbol>
      <symbol
        id="icon-laundry"
        viewBox="0 0 32 32"
      >
        <rect
          x="5"
          y="3"
          width="22"
          height="26"
          rx="3"
          fill="#e9ecef"
          stroke="#2b2d42"
          stroke-width="2"
        />
        <circle
          cx="16"
          cy="18"
          r="6.5"
          fill="#a5d8ff"
          stroke="#2b2d42"
          stroke-width="2"
        />
        <path
          d="M11 19c2 1.5 4-1 6 0s3 1 4 0"
          fill="none"
          stroke="#1c7ed6"
          stroke-width="1.5"
        />
        <circle
          cx="10"
          cy="7.5"
          r="1.3"
          fill="#2b2d42"
        />
        <path
          d="M15 7.5h8"
          stroke="#2b2d42"
          stroke-width="2"
          stroke-linecap="round"
        />
      </symbol>
      <symbol
        id="icon-trash"
        viewBox="0 0 32 32"
      >
        <path
          d="M8 10h16l-1.5 17a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z"
          fill="#c0eb75"
          stroke="#2b2d42"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M5 10h22M13 10V6h6v4M13 15v9M19 15v9"
          fill="none"
          stroke="#2b2d42"
          stroke-width="2"
          stroke-linecap="round"
        />
      </symbol>
      <symbol
        id="icon-heart"
        viewBox="0 0 24 24"
      ><path
        d="M12 20s-7.5-4.6-9.2-9.2C1.6 7.4 3.8 4 7.2 4c2 0 3.4 1.1 4.8 2.8C13.4 5.1 14.8 4 16.8 4c3.4 0 5.6 3.4 4.4 6.8C19.5 15.4 12 20 12 20z"
        fill="currentColor"
      /></symbol>
      <symbol
        id="icon-gear"
        viewBox="0 0 24 24"
      ><circle
        cx="12"
        cy="12"
        r="3.2"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      /><path
        d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
      /></symbol>
      <symbol
        id="icon-plane"
        viewBox="0 0 24 24"
      ><path
        d="M21 15.5l-8.5-4.8V4.5a1.5 1.5 0 0 0-3 0v6.2L1 15.5v2l8.5-2.5v4.2L7 21v1.5l4-1 4 1V21l-2.5-1.8v-4.2L21 17.5z"
        fill="currentColor"
      /></symbol>
      <symbol
        id="icon-medal"
        viewBox="0 0 24 24"
      ><path
        d="M8 2h3l1 5-3 1zM16 2h-3l-1 5 3 1z"
        fill="#7b5cff"
      /><circle
        cx="12"
        cy="14.5"
        r="6.5"
        fill="#ffc53d"
        stroke="#d9960a"
        stroke-width="1.6"
      /><path
        d="M12 11l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z"
        fill="#fff8e0"
      /></symbol>
      <symbol
        id="icon-lock"
        viewBox="0 0 24 24"
      ><rect
        x="5"
        y="10.5"
        width="14"
        height="10"
        rx="2"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      /><path
        d="M8 10.5V7.5a4 4 0 0 1 8 0v3"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      /></symbol>
      <symbol
        id="icon-plus"
        viewBox="0 0 24 24"
      ><path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
      /></symbol>
      <symbol
        id="icon-copy"
        viewBox="0 0 24 24"
      ><rect
        x="8"
        y="8"
        width="12"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      /><path
        d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      /></symbol>
    </defs>
  </svg>
</template>

<style lang="scss" scoped>
.icon-sprite {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>
