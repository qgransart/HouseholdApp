// BEM : block, block__element, block--modifier, block__element--modifier (kebab-case).
const BEM_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$/

/** @type {import('stylelint').Config} */
export default {
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-recommended-vue/scss',
  ],
  rules: {
    'selector-class-pattern': [
      BEM_PATTERN,
      { message: selector => `La classe "${selector}" doit respecter la convention BEM (block__element--modifier)` },
    ],
  },
}
