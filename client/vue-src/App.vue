<template>
  <div id="modal-root"></div>
  <RouterView></RouterView>
</template>

<script setup lang="ts">
import CharacterList from "./views/dashboard/character-list/character-list.vue";
</script>

<style>
#modal-root {
  width: 0;
  height: 0;
}
</style>
