<template>
  <div
    v-if="visibleFailures.length"
    class="backup-banner"
    role="alert"
    aria-live="polite"
  >
    <div class="banner-content">
      <div class="banner-icon" aria-hidden="true">⚠️</div>
      <div class="banner-messages">
        <p
          v-for="failure in visibleFailures"
          :key="failure.type"
          class="banner-message"
        >
          <strong>{{ failure.label }} backup failed</strong>
          at {{ failure.timeLabel }} — {{ failure.message }}
          <span v-if="failure.details" class="banner-details">
            ({{ failure.details }})
          </span>
        </p>
      </div>
      <button class="banner-dismiss" @click="dismiss" aria-label="Dismiss backup warning">
        ✕
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { systemAPI } from '../api/api.js'

const status = ref(null)
const dismissedFailures = ref({})
const pollIntervalMs = 60_000
let intervalId = null

const failureLabels = {
  cloud: 'Cloud',
  postgres: 'Database'
}

function formatTimestamp(value) {
  if (!value) return 'unknown time'
  try {
    return new Date(value).toLocaleString()
  } catch (error) {
    return value
  }
}

const visibleFailures = computed(() => {
  if (!status.value) return []

  return Object.entries(status.value)
    .filter(([, entry]) => entry?.status === 'failed' && entry.lastFailure)
    .map(([type, entry]) => ({
      type,
      label: failureLabels[type] || type,
      time: entry.lastFailure,
      timeLabel: formatTimestamp(entry.lastFailure),
      message: entry.message || 'Backup failed',
      details: entry.errorMessage && entry.errorMessage !== entry.message
        ? entry.errorMessage
        : null
    }))
    .filter((failure) => dismissedFailures.value[failure.type] !== failure.time)
})

async function loadStatus() {
  try {
    const { data } = await systemAPI.getBackupStatus()
    status.value = data
    resetDismissedEntries(data)
  } catch (error) {
    console.error('Failed to load backup status:', error)
  }
}

function resetDismissedEntries(latestStatus) {
  if (!latestStatus) return

  const next = { ...dismissedFailures.value }
  let changed = false

  Object.entries(latestStatus).forEach(([type, entry]) => {
    if (!entry || entry.status !== 'failed') {
      if (next[type]) {
        delete next[type]
        changed = true
      }
    } else if (next[type] && entry.lastFailure && next[type] !== entry.lastFailure) {
      delete next[type]
      changed = true
    }
  })

  if (changed) {
    dismissedFailures.value = next
  }
}

function dismiss() {
  visibleFailures.value.forEach((failure) => {
    dismissedFailures.value = {
      ...dismissedFailures.value,
      [failure.type]: failure.time
    }
  })
}

onMounted(() => {
  loadStatus()
  intervalId = setInterval(loadStatus, pollIntervalMs)
})

onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
})
</script>

<style scoped>
.backup-banner {
  background: #fff3cd;
  border: 1px solid #ffe08a;
  color: #856404;
  border-radius: 12px;
  padding: 14px 20px;
  margin: 16px auto 0;
  max-width: 1400px;
  box-shadow: 0 10px 25px rgba(133, 100, 4, 0.15);
}

.banner-content {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.banner-icon {
  font-size: 24px;
  line-height: 1;
  margin-top: 2px;
}

.banner-messages {
  flex: 1;
}

.banner-message {
  margin: 0;
  font-size: 0.95rem;
}

.banner-details {
  font-style: italic;
  margin-left: 4px;
}

.banner-dismiss {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 6px;
  line-height: 1;
}

.banner-dismiss:hover,
.banner-dismiss:focus-visible {
  color: #533f03;
}
</style>


