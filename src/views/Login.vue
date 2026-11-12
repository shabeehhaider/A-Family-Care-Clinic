<template>
  <div class="login-page">
    <main class="login-card" :aria-labelledby="headingId">
      <img :src="logoUrl" alt="" class="login-logo" />

      <!-- Server not reachable -->
      <template v-if="offline">
        <h1 :id="headingId" class="login-title">Can't connect</h1>
        <p class="login-subtitle">{{ offlineMessage }}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-success" :disabled="retrying" @click="retry">
            {{ retrying ? 'Connecting…' : 'Try Again' }}
          </button>
        </div>
      </template>

      <!-- First run: create the admin -->
      <template v-else-if="!hasUsers">
        <h1 :id="headingId" class="login-title">Welcome</h1>
        <p class="login-subtitle">Create your account to get started.</p>

        <form novalidate @submit.prevent="setup">
          <div class="form-group">
            <label for="setup-name" class="form-label">Your name</label>
            <input id="setup-name" v-model="setupForm.name" type="text" class="form-input" autocomplete="name" data-autofocus required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="setup-pin" class="form-label">Choose a PIN</label>
              <PasswordInput id="setup-pin" v-model="setupForm.pin" inputmode="numeric" maxlength="6" autocomplete="new-password" class="form-input" required />
            </div>
            <div class="form-group">
              <label for="setup-pin2" class="form-label">Enter PIN again</label>
              <PasswordInput id="setup-pin2" v-model="setupForm.pin2" inputmode="numeric" maxlength="6" autocomplete="new-password" class="form-input" required />
            </div>
          </div>
          <p class="form-hint pin-hint">PIN is 4 to 6 numbers. You'll use it to log in.</p>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <div class="form-actions">
            <button type="submit" class="btn btn-success" :disabled="busy">Get Started</button>
          </div>
        </form>
      </template>

      <!-- Login -->
      <template v-else>
        <h1 :id="headingId" class="login-title">Who's working?</h1>
        <p class="login-subtitle">Tap your name and enter your PIN.</p>

        <div class="user-list" role="radiogroup" aria-label="User">
          <button
            v-for="u in users"
            :key="u.id"
            type="button"
            role="radio"
            :aria-checked="selectedId === u.id"
            :class="['user-btn', { active: selectedId === u.id }]"
            @click="selectUser(u.id)"
          >
            <span class="avatar" aria-hidden="true">{{ initials(u.name) }}</span>
            <span class="user-meta">
              <span class="name">{{ u.name }}</span>
              <span class="role">{{ u.role === 'admin' ? 'Admin' : 'Cashier' }}</span>
            </span>
          </button>
        </div>

        <form v-if="selectedId" novalidate @submit.prevent="submitLogin">
          <div class="form-group">
            <label for="login-pin" class="form-label">PIN for {{ selectedUser?.name }}</label>
            <PasswordInput
              id="login-pin"
              ref="pinInput"
              v-model="pin"
              inputmode="numeric"
              maxlength="6"
              autocomplete="current-password"
              class="form-input pin-input"
              required
            />
          </div>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <div class="form-actions">
            <button type="submit" class="btn btn-success" :disabled="pin.length < 4 || busy">
              {{ busy ? 'Checking…' : 'Unlock' }}
            </button>
          </div>
        </form>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { apiError } from '@/api/client'
import PasswordInput from '@/components/PasswordInput.vue'
import logoUrl from '@/assets/logo.jpeg'

const router = useRouter()
const route = useRoute()
const { users, hasUsers, init, setup: setupAdmin, login } = useAuth()

const headingId = 'login-heading'
const error = ref('')
const busy = ref(false)

// ---------- Server connection ----------
const offline = ref(false)
const offlineMessage = ref('')
const retrying = ref(false)

const checkServer = async () => {
  try {
    await init()
    offline.value = false
  } catch (err) {
    offline.value = true
    offlineMessage.value = apiError(err)
  }
}

const retry = async () => {
  retrying.value = true
  await checkServer()
  retrying.value = false
  if (!offline.value) preselect()
}

const goNext = () => {
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
    ? route.query.redirect
    : '/'
  router.replace(redirect)
}

// ---------- Setup ----------
const setupForm = reactive({ name: '', pin: '', pin2: '' })

const setup = async () => {
  error.value = ''
  if (setupForm.pin !== setupForm.pin2) {
    error.value = "PINs don't match. Please try again."
    return
  }
  busy.value = true
  const result = await setupAdmin(setupForm.name, setupForm.pin)
  busy.value = false
  if (!result.ok) {
    error.value = result.error
    return
  }
  goNext()
}

// ---------- Login ----------
const selectedId = ref(null)
const pin = ref('')
const pinInput = ref(null)

const selectedUser = computed(() => users.value.find(u => u.id === selectedId.value))

const selectUser = async (id) => {
  selectedId.value = id
  pin.value = ''
  error.value = ''
  await nextTick()
  pinInput.value?.focus()
}

const submitLogin = async () => {
  error.value = ''
  busy.value = true
  const result = await login(selectedId.value, pin.value)
  busy.value = false
  if (!result.ok) {
    error.value = result.error
    pin.value = ''
    pinInput.value?.focus()
    return
  }
  goNext()
}

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')

const preselect = async () => {
  await nextTick()
  // Single user: preselect
  if (users.value.length === 1) selectUser(users.value[0].id)
  else document.querySelector('[data-autofocus]')?.focus()
}

onMounted(async () => {
  await checkServer() // init() is cached, so this is instant when already connected
  if (!offline.value) preselect()
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%);
}

.login-card {
  width: 100%;
  max-width: 440px;
  padding: 2rem;
  background: white;
  border-radius: 1.25rem;
  box-shadow: 0 10px 40px rgba(5, 150, 105, 0.15);
}

.login-logo {
  display: block;
  width: 100%;
  max-width: 260px;
  height: auto;
  margin: 0 auto 1.25rem;
}

.login-title {
  font-size: 1.375rem;
  font-weight: 700;
  color: #064e3b;
  text-align: center;
}

.pin-hint {
  margin: -0.5rem 0 0;
}

.login-subtitle {
  margin: 0.375rem 0 1.25rem;
  font-size: 0.875rem;
  color: #4b5563;
  text-align: center;
}

.user-list {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  max-height: 16rem;
  overflow-y: auto;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.user-btn:hover {
  border-color: #10b981;
}

.user-btn.active {
  border-color: #059669;
  background: #ecfdf5;
}

.avatar {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  font-size: 0.8125rem;
  font-weight: 700;
}

.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.name {
  font-weight: 600;
  color: #111827;
}

.role {
  font-size: 0.75rem;
  color: #6b7280;
}

/* the input lives inside PasswordInput, so reach it with :deep */
:deep(.pin-input) {
  font-size: 1.5rem;
  letter-spacing: 0.5em;
  text-align: center;
  /* equal padding both sides keeps the digits centred next to the eye button */
  padding-left: 2.75rem;
}

@media (max-width: 480px) {
  .login-card {
    padding: 1.25rem;
  }
}
</style>
