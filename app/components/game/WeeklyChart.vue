<script setup lang="ts">
import type { WeeklyGauge } from '#shared/domain'

/** Household XP per week, oldest first; the last week is the current one. Single series + target line. */
const props = defineProps<{ weeks: WeeklyGauge[], target: number }>()

const WIDTH = 320
const HEIGHT = 150
const PAD_LEFT = 34
const PAD_BOTTOM = 22
const PAD_TOP = 10

const max = computed(() => Math.max(1, ...props.weeks.map(w => Math.max(w.earned, w.target)), props.target) * 1.1)
const y = (value: number) => PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * (1 - value / max.value)
const step = computed(() => (WIDTH - PAD_LEFT) / Math.max(1, props.weeks.length))
const barWidth = computed(() => Math.min(26, step.value * 0.5))
const ticks = computed(() => {
  const size = [50, 100, 200, 250, 500, 1000, 2000].find(v => max.value / v <= 4) ?? 5000
  return Array.from({ length: Math.floor(max.value / size) + 1 }, (_, i) => i * size)
})

const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`
const bars = computed(() => props.weeks.map((week, index) => {
  const x = PAD_LEFT + step.value * index + (step.value - barWidth.value) / 2
  const top = y(week.earned)
  const height = Math.max(0, y(0) - top)
  const w = barWidth.value
  // Rounded top corners, square base anchored to the axis.
  const path = height > 4
    ? `M${x},${y(0)} V${top + 4} q0,-4 4,-4 h${w - 8} q4,0 4,4 V${y(0)} Z`
    : `M${x},${y(0)} h${w} v${-height} h${-w} Z`
  const current = index === props.weeks.length - 1
  return {
    key: week.weekStart,
    path,
    current,
    label: shortDate(week.weekStart),
    hitX: PAD_LEFT + step.value * index,
    centerX: x + w / 2,
    top,
    tip: `Semaine du ${shortDate(week.weekStart)} : ${week.earned.toLocaleString('fr-FR')} XP${current ? ' (en cours)' : week.achieved ? ' · coffre ouvert' : ''}`,
  }
}))

const tooltip = ref<{ text: string, left: string, top: string } | null>(null)
const svg = useTemplateRef<SVGSVGElement>('svg')

function show(bar: (typeof bars.value)[number]) {
  const scale = (svg.value?.getBoundingClientRect().width ?? WIDTH) / WIDTH
  tooltip.value = { text: bar.tip, left: `${bar.centerX * scale}px`, top: `${bar.top * scale}px` }
}
</script>

<template>
  <div class="weekly-chart">
    <svg
      ref="svg"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      role="img"
      :aria-label="`XP de la maison par semaine, objectif ${target} XP : ${bars.map(b => b.tip).join(' ; ')}`"
    >
      <g
        v-for="tick in ticks"
        :key="tick"
      >
        <line
          class="weekly-chart__grid"
          :x1="PAD_LEFT"
          :x2="WIDTH"
          :y1="y(tick)"
          :y2="y(tick)"
        />
        <text
          class="weekly-chart__label"
          :x="PAD_LEFT - 6"
          :y="y(tick) + 4"
          text-anchor="end"
        >{{ tick }}</text>
      </g>
      <g
        v-for="bar in bars"
        :key="bar.key"
      >
        <rect
          class="weekly-chart__hit"
          :x="bar.hitX"
          :y="PAD_TOP"
          :width="step"
          :height="HEIGHT - PAD_TOP - PAD_BOTTOM"
          tabindex="0"
          @pointerenter="show(bar)"
          @pointerleave="tooltip = null"
          @focus="show(bar)"
          @blur="tooltip = null"
        />
        <path
          class="weekly-chart__bar"
          :class="{ 'weekly-chart__bar--current': bar.current }"
          :d="bar.path"
        />
        <text
          class="weekly-chart__label"
          :x="bar.centerX"
          :y="HEIGHT - 6"
          text-anchor="middle"
        >{{ bar.label }}</text>
      </g>
      <line
        class="weekly-chart__target"
        :x1="PAD_LEFT"
        :x2="WIDTH"
        :y1="y(target)"
        :y2="y(target)"
      />
    </svg>
    <p
      v-if="tooltip"
      class="weekly-chart__tooltip"
      :style="{ left: tooltip.left, top: tooltip.top }"
      aria-hidden="true"
    >
      {{ tooltip.text }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.weekly-chart {
  position: relative;

  svg {
    width: 100%;
    height: auto;
    overflow: visible;
  }

  &__grid {
    stroke: var(--color-line);
    stroke-width: 1;
  }

  &__label {
    font-size: 11px;
    font-weight: 700;
    fill: var(--color-text-muted);
  }

  &__bar {
    fill: var(--color-gem);

    &--current {
      fill: #a893ff;
    }
  }

  &__hit {
    cursor: pointer;
    fill: transparent;
    outline: none;

    &:hover + .weekly-chart__bar,
    &:focus-visible + .weekly-chart__bar {
      fill: var(--color-gem-dark);
    }
  }

  &__target {
    stroke: var(--color-gold-dark);
    stroke-dasharray: 5 4;
    stroke-width: 2;
  }

  &__tooltip {
    position: absolute;
    z-index: 2;
    padding: 0.35rem 0.55rem;
    font-size: var(--font-size-xs);
    color: #fff;
    white-space: nowrap;
    pointer-events: none;
    background: var(--color-text);
    border-radius: var(--radius-sm);
    transform: translate(-50%, -115%);
  }
}
</style>
