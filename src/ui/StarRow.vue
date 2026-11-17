<script setup lang="ts">
// Three stars, each filled from the bottom as far as its share: the same look in the menu and after a round.
defineProps<{ fills: readonly number[] }>();
</script>

<template>
  <span class="star-row" aria-hidden="true">
    <span v-for="(fill, i) in fills" :key="i" class="star" :style="{ '--cut': `${(1 - fill) * 100}%` }">★<i>★</i></span>
  </span>
</template>

<style scoped>
.star-row {
  display: inline-flex;
  gap: 0.1em;
  line-height: 1;
}

.star {
  position: relative;
  color: var(--star-empty, rgba(120, 130, 140, 0.35));
  -webkit-text-stroke: 1px var(--star-line, transparent);
}

.star i {
  position: absolute;
  inset: 0;
  color: var(--star-fill, var(--geo-asked));
  -webkit-text-stroke: 1px var(--star-line, transparent);
  font-style: normal;
  clip-path: inset(var(--cut) 0 0 0);
}
</style>
