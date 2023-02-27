<template>
  <button
    :class="{ 'wg-button': true, 'wg-button--dark': true ?? dark ?? darkMode }"
  >
    <span class="wg-button__content"><slot></slot></span>
    <span v-if="iconClass" class="wg-button__icon">
      <i :class="iconClass"></i>
    </span>
  </button>
</template>

<script setup lang="ts">
import { useSettings } from "../stores/settings";

const { darkMode } = useSettings();

// the dark prop optionally overwrites the darkMode setting
defineProps<{
  dark?: boolean;
  text?: string;
  iconClass?: string;
}>();
</script>

<style lang="scss">
.wg-button {
  $self: &;

  // most of this CSS is copied directly from existing styles to match them as well as I can
  margin-left: 0.25rem;
  margin-right: 0.25rem;
  margin-bottom: 0.5rem;
  border-width: 1px;
  border-radius: 4px;
  font-size: 1rem;
  height: 2.5em;
  box-shadow: none;
  cursor: pointer;
  justify-content: center;
  line-height: 1.5;
  padding-bottom: calc(0.5em - 1px);
  padding-left: 1em;
  padding-right: 1em;
  padding-top: calc(0.5em - 1px);
  position: relative;
  text-align: center;
  white-space: nowrap;

  display: inline-flex;

  background-color: #fff;
  border-color: #dbdbdb;
  color: #363636;

  &:hover {
    opacity: 0.8;
  }
  &:active {
    opacity: 0.5;
  }

  &--dark {
    background-color: #3e8ed0;
    border-color: transparent;
    color: #fff;
  }

  &--danger {
    background-color: #f14668;
  }

  &__content {
    flex-grow: 1;
  }

  &__icon {
    flex-shrink: 1;
    margin-left: 0.25em;
    margin-right: calc(-0.5em - 1px);

    width: 1.5em;
    height: 1.5em;
  }
}
</style>
