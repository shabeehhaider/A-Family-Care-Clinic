<template>
  <!-- App header: branding, page navigation, live clock, user -->
  <header class="app-header no-print">
    <div class="header-left">
      <router-link to="/" class="logo">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-4H6v-2h4V7h2v4h4v2h-4v4z"/>
        </svg>
        <span class="logo-text">Health Clinic POS</span>
      </router-link>

      <nav class="main-nav" aria-label="Main">
        <router-link to="/" class="nav-link" exact-active-class="active">
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span class="nav-label">POS</span>
        </router-link>
        <router-link to="/sales" class="nav-link" active-class="active">
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span class="nav-label">Sales History</span>
        </router-link>
      </nav>
    </div>

    <div class="header-right">
      <div class="datetime">
        <span class="date">{{ currentDate }}</span>
        <span class="time">{{ currentTime }}</span>
      </div>
      <div class="user-info">
        <div class="user-avatar">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <span class="user-name">Cashier</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const currentDate = ref('')
const currentTime = ref('')
let timeInterval = null

const updateDateTime = () => {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
  currentTime.value = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  updateDateTime()
  timeInterval = setInterval(updateDateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);
  position: relative;
  z-index: 10;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 2rem;
  min-width: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  flex-shrink: 0;
}

.logo-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}

/* Navigation */
.main-nav {
  display: flex;
  gap: 0.375rem;
  background: rgba(255, 255, 255, 0.15);
  padding: 0.25rem;
  border-radius: 0.75rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s, color 0.2s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.nav-link.active {
  background: white;
  color: #047857;
}

.nav-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-shrink: 0;
}

.datetime {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: white;
}

.date {
  font-size: 0.875rem;
  opacity: 0.9;
}

.time {
  font-size: 1.125rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 9999px;
}

.user-avatar {
  width: 2rem;
  height: 2rem;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #059669;
}

.user-name {
  color: white;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 1279px) {
  .header-left,
  .header-right {
    gap: 1.25rem;
  }
}

@media (max-width: 1023px) {
  .logo-text {
    display: none;
  }

  .header-left {
    gap: 1rem;
  }

  .header-right {
    gap: 1rem;
  }

  .user-name {
    display: none;
  }

  .user-info {
    padding: 0.25rem;
  }
}

@media (max-width: 640px) {
  .app-header {
    padding: 0.625rem 0.75rem;
    gap: 0.5rem;
  }

  .header-left {
    gap: 0.5rem;
  }

  .logo-icon {
    width: 2rem;
    height: 2rem;
  }

  .nav-link {
    padding: 0.5rem 0.625rem;
  }

  .date {
    display: none;
  }

  .time {
    font-size: 0.9375rem;
  }
}

@media (max-width: 480px) {
  .nav-label {
    display: none;
  }

  .nav-link {
    padding: 0.5rem 0.75rem;
  }
}

@media (max-width: 360px) {
  .datetime {
    display: none;
  }
}
</style>
