<script setup lang="ts">
import { useUserStore } from "@/stores/user";
import { storeToRefs } from "pinia";

const props = defineProps(["reply"]);
//const emit = defineEmits(["editPost", "refreshPosts"]);
const { currentUsername } = storeToRefs(useUserStore());
</script>

<template>
  <p class="author">{{ props.reply.author }}</p>
  <p>{{ props.reply.content }}</p>
</template>

<style scoped>
p {
  margin: 0em;
}

.author {
  font-weight: bold;
  font-size: 1.2em;
}

menu {
  list-style-type: none;
  display: flex;
  flex-direction: row;
  gap: 1em;
  padding: 0;
  margin: 0;
}

.timestamp {
  display: flex;
  justify-content: flex-end;
  font-size: 0.9em;
  font-style: italic;
}

.base {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.base article:only-child {
  margin-left: auto;
}
</style>
