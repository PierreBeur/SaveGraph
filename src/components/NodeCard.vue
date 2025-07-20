<script setup lang="ts">
import { faviconUrl } from '@/utils/faviconUrl'
import { mdiFolderOutline } from '@mdi/js';

const { item } = defineProps<{
  item: chrome.bookmarks.BookmarkTreeNode & { thumbnailUrl?: string }
}>()
</script>

<template>
  <v-card
    :href="item.url"
  >
    <v-img
      v-if="item.thumbnailUrl"
      :src="item.thumbnailUrl"
      alt="Alt"
      aspect-ratio="16/9"
    />

    <v-card-title class="d-flex align-center ga-2">
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
      <div class="text-subtitle-1 text-truncate title-text">{{ item.title }}</div>
    </v-card-title>

    <v-tooltip
      activator="parent"
      location="bottom"
    >
      {{ item.title }}
    </v-tooltip>

    <v-card-text class="text-body-2 text-medium-emphasis text-truncate">
      {{ item.dateAdded && new Date(item.dateAdded).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }) }}
    </v-card-text>
  </v-card>
</template>
