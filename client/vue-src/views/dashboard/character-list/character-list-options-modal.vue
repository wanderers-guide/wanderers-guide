<template>
  <w-g-modal title="Character Options " v-model="open">
    <template #header>Character Options</template>
    <template #body>
      <div class="buttons is-centered">
        <w-g-button
          :class="{ 'button--danger': !canMakeCharacter }"
          :disabled="!canMakeCharacter && !isLoading"
          icon-class="fas fa-user-friends"
          @click="copyCharacter()"
          >Create Copy</w-g-button
        >
        <w-g-button icon-class="fas fa-download" @click="exportCharacter()"
          >Export</w-g-button
        >
        <w-g-button icon-class="fas fa-file-pdf" @click="exportCharacterPdf()"
          >Export to PDF</w-g-button
        >
      </div></template
    >
  </w-g-modal>
</template>
<script setup lang="ts">
import WGButton from "../../../components/WGButton.vue";
import WGModal from "../../../components/WGModal.vue";
import {
  initCharacterExport,
  initCharacterExportToPDF,
} from "./../../../legacy-js/character-list";
import { useCharacters, character } from "../../../stores/characters";
import { computed, ref } from "vue";

const props = defineProps<{
  character: character;
  canMakeCharacter?: boolean;
  modelValue: boolean;
}>();

const emit = defineEmits(["update:modelValue"]);

let open = computed({
  get() {
    return props.modelValue ?? false;
  },
  set(value: boolean) {
    emit("update:modelValue", value);
  },
});

const characterStore = useCharacters();
let isLoading = ref(false);

async function copyCharacter() {
  isLoading.value = true;
  await characterStore.copy(props.character);
  isLoading.value = false;
  open.value = false;
}
function exportCharacter() {
  isLoading.value = true;
  initCharacterExport(props.character?.id);
  isLoading.value = false;
  open.value = false;
}
function exportCharacterPdf() {
  isLoading.value = true;
  initCharacterExportToPDF(props.character?.id);
  isLoading.value = false;
  open.value = false;
}
</script>
