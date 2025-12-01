/**
 * API Keys Store
 * Manages API keys for LLM providers
 *
 * NOTE: For production, consider using Tauri's secure storage plugin:
 * @tauri-apps/plugin-store for encrypted key storage
 *
 * Current implementation stores keys in localStorage which is acceptable
 * for development but should be encrypted for production use.
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// ============================================
// Types
// ============================================

export interface ApiKeysState {
  googleApiKey: string
  groqApiKey: string
  openaiApiKey: string

  setGoogleApiKey: (key: string) => void
  setGroqApiKey: (key: string) => void
  setOpenaiApiKey: (key: string) => void
  clearAllKeys: () => void

  // Convenience method to check if any key is configured
  hasAnyKey: () => boolean
}

// ============================================
// Store Implementation
// ============================================

export const useApiKeysStore = create<ApiKeysState>()(
  devtools(
    persist(
      (set, get) => ({
        googleApiKey: '',
        groqApiKey: '',
        openaiApiKey: '',

        setGoogleApiKey: key => {
          set({ googleApiKey: key }, undefined, 'setGoogleApiKey')
        },

        setGroqApiKey: key => {
          set({ groqApiKey: key }, undefined, 'setGroqApiKey')
        },

        setOpenaiApiKey: key => {
          set({ openaiApiKey: key }, undefined, 'setOpenaiApiKey')
        },

        clearAllKeys: () => {
          set(
            { googleApiKey: '', groqApiKey: '', openaiApiKey: '' },
            undefined,
            'clearAllKeys'
          )
        },

        hasAnyKey: () => {
          const state = get()
          return (
            state.googleApiKey.length > 0 ||
            state.groqApiKey.length > 0 ||
            state.openaiApiKey.length > 0
          )
        },
      }),
      {
        name: 'api-keys-store',
        // TODO: For production, implement custom storage with encryption
        // storage: createSecureStorage(),
      }
    ),
    { name: 'api-keys-store' }
  )
)

// ============================================
// Selectors
// ============================================

export const selectHasGoogleKey = (state: ApiKeysState) =>
  state.googleApiKey.length > 0

export const selectHasGroqKey = (state: ApiKeysState) =>
  state.groqApiKey.length > 0

export const selectHasOpenaiKey = (state: ApiKeysState) =>
  state.openaiApiKey.length > 0

export const selectHasAnyKey = (state: ApiKeysState) =>
  state.googleApiKey.length > 0 ||
  state.groqApiKey.length > 0 ||
  state.openaiApiKey.length > 0
