import { beforeEach, afterEach, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.clearAllMocks()
  vi.clearAllTimers()
  if (vi.isFakeTimers()) {
    vi.useRealTimers()
  }
})
