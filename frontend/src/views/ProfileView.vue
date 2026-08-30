<script setup lang="ts">
import { ref } from 'vue'
import { createUser, findUserByName } from '../api/users'
import { useCurrentUser } from '../composables/useCurrentUser'

const { userId, setUserId, clearUserId } = useCurrentUser()

const name = ref('')
const loading = ref(false)
const error = ref('')

const createProfile = async () => {
  const trimmedName = name.value.trim()

  if (!trimmedName) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    // Cherche d'abord un utilisateur existant
    const existingUser = await findUserByName(trimmedName)

    if (existingUser) {

      // Utilisateur déjà présent
      setUserId(existingUser.id)

    } else {

      // Nouveau utilisateur
      const newUser = await createUser(trimmedName)

      setUserId(newUser.id)

    }
    name.value = ''
  } catch (err) {
    console.error(err)
    error.value = 'Impossible de retrouver ou créer le profil.'
  } finally {
    loading.value = false
  }
}

const removeUser = () => {
  clearUserId()
  name.value = ''
  error.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-[#fdf8f5] pb-28 px-5 pt-6">

    <h1 class="text-2xl font-bold text-gray-900">
      Profil
    </h1>

    <main class="mt-6 space-y-4">

      <!-- =====================================================
           PAS DE PROFIL
      ====================================================== -->

      <section
        v-if="!userId"
        class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs"
      >

        <h2 class="text-lg font-bold text-gray-800">
          Créer votre profil
        </h2>

        <p class="mt-1 text-sm text-gray-500">
          Entrez simplement votre nom pour commencer.
        </p>

        <!-- Nom -->
        <div class="mt-5">

          <label
            for="name"
            class="text-xs font-semibold text-gray-500 block mb-2"
          >
            Nom
          </label>

          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Lionel"
            autocomplete="name"
            class="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            @keyup.enter="createProfile"
          />

        </div>

        <!-- Erreur -->
        <p
          v-if="error"
          class="mt-3 text-sm text-red-600"
        >
          {{ error }}
        </p>

        <!-- Création -->
        <button
          @click="createProfile"
          :disabled="loading || !name.trim()"
          class="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-amber-200 transition-all active:scale-[0.98]"
        >
          {{ loading ? 'Création...' : 'Créer mon profil' }}
        </button>

      </section>


      <!-- =====================================================
           PROFIL ACTIF
      ====================================================== -->

      <section
        v-else
        class="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-xs"
      >

        <div class="flex items-center gap-3">

          <!-- Avatar -->
          <div
            class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"
          >
            👤
          </div>

          <!-- Informations -->
          <div class="min-w-0">

            <p class="text-sm font-semibold text-gray-800">
              Profil actif
            </p>

            <p class="text-xs text-gray-500 font-mono truncate">
              {{ userId }}
            </p>

          </div>

        </div>

        <!-- Changer de profil -->
        <button
          @click="removeUser"
          class="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-2xl transition-colors"
        >
          Changer de profil
        </button>

      </section>

    </main>

  </div>
</template>
