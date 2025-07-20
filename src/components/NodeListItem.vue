<script setup lang="ts">
import { faviconUrl } from '@/utils/faviconUrl'
import { mdiFolderOutline } from '@mdi/js';

const { item } = defineProps<{
  item: chrome.bookmarks.BookmarkTreeNode
}>()
</script>

<template>
  <v-list-item
    :title="item.title"
    :href="item.url"
  >
    <template v-slot:prepend>
      <v-avatar
        v-if="item.url"
        :image="faviconUrl(item.url)"
        rounded="0"
        size="16"
      />

      <v-icon
        v-else
        :icon="mdiFolderOutline"
        size="16"
      />
    </template>

    <v-list-item-subtitle>
      {{ item.url || 'Folder' }}
    </v-list-item-subtitle>

    <template v-slot:append>
      {{ item.dateAdded && new Date(item.dateAdded).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }) }}
    </template>
  </v-list-item>
</template>
