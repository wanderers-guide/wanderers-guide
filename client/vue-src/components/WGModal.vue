<template>
  <teleport to="#modal-root">
    <div v-if="open" class="w-g-modal-background" tabindex="-1"></div>
    <div
      v-if="open"
      ref="wgModalCard"
      class="w-g-modal"
      :style="{ width: width ?? '640px', overflow: overflow ?? 'visible' }"
      @keydown.tab="keepTabFocused"
      @keydown.escape="open = false"
      role="dialog"
      :aria-labelledby="title"
    >
      <div class="w-g-modal__header">
        <slot name="header" />
        <button class="w-g-modal__close-button" @click="open = false">x</button>
      </div>
      <div class="w-g-modal__body">
        <slot name="body" />
      </div>
      <div class="w-g-modal__footer">
        <slot name="footer" />
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from "vue";

const props = defineProps<{
  title: string;
  width?: number | string;
  overflow?: string;
  modelValue?: boolean;
}>();

const emit = defineEmits(["update:modelValue"]);

let lastFocusedElement: HTMLElement | undefined | null = null;
const wgModalCard = ref<HTMLInputElement | null>();

// we can't destructure the modelValue prop for watching, so we'll use an open computed property to simplify the state

const open = computed({
  get() {
    return props.modelValue ?? false;
  },
  set(value: boolean) {
    emit("update:modelValue", value);
  },
});

watch(open, async (newVal) => {
  // wait until after the rendering for this tick so the refs exist
  await nextTick;

  // when the modal is turned on, start focus/unfocus behavior
  if (newVal) {
    lastFocusedElement = document.activeElement as HTMLElement | undefined;
    getAllFocusableElements()[0].focus();
  }
  // when the modal is turned off, end focus/unfocus behavior
  else {
    lastFocusedElement?.focus();
  }
});

function getAllFocusableElements() {
  let focusableElements = wgModalCard.value?.querySelectorAll(
    'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]',
  );
  return Array.prototype.slice.call(focusableElements);
}
function keepTabFocused(e: KeyboardEvent) {
  const allFocusableElements = getAllFocusableElements();
  const firstFocusabeElement = allFocusableElements[0];
  const lastFocusabeElement =
    allFocusableElements[allFocusableElements.length - 1];

  if (allFocusableElements.length === 1) {
    e.preventDefault();
  }
  //tabbing backwards
  if (e.shiftKey) {
    //if going backwards from first element, go to last modal element
    if (document.activeElement === firstFocusabeElement) {
      e.preventDefault();
      lastFocusabeElement.focus();
    }
    //tabbing forwards
  } else {
    //if going forwards from last element, go to first modal element
    if (document.activeElement === lastFocusabeElement) {
      e.preventDefault();
      firstFocusabeElement.focus();
    }
  }
  //otherwise tab normally
}
</script>

<style lang="scss">
.w-g-modal-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(10, 10, 10, 0.56);
  z-index: 9000;
}

.w-g-modal {
  position: absolute;
  border-radius: 8px;
  left: 50%;
  max-height: 95%;
  max-width: 90%;
  overflow: visible;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 10000;

  border-top-left-radius: 6px;
  border-top-right-radius: 6px;

  margin-bottom: 0px; //overwriting bootstrap style

  background-color: rgb(22, 22, 22);
  color: rgb(219, 219, 219);

  &__header {
    border-bottom: 1px solid #282828;
    display: flex;
    justify-content: space-between;
    font-family: "Proza Libre", sans-serif;
    font-size: 1.5rem;
    line-height: 1em;
    letter-spacing: 1px;
    padding: 20px;
  }
  &__close-button {
    font-size: 16px;
    font-weight: 500px;
    width: 20px;
    height: 20px;
  }

  &__body {
    padding: 20px;
    font-size: 14px;
    line-height: 22px;
    background-color: rgb(28, 28, 28);
  }

  &__footer {
    border-top: 1px solid #282828;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 100%;
    padding: 20px 0;
  }
}

.w-g-modal .w-g-modal__header {
}

.w-g-modal .w-g-modal__content {
  position: absolute;
  border-radius: 8px;
  max-height: 95%;
  max-width: 90%;
  overflow: auto;
  padding: 32px;

  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.w-g-modal__body {
  font-size: 14px;
  line-height: 22px;
}

.w-g-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.w-g-modal__header-actions {
  position: absolute;
  top: 0;
  right: 0;
}

.w-g-modal.-visible .w-g-modal__content {
  overflow: visible;
}
</style>
