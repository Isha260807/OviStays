const WELCOME_SEEN_KEY = 'ovistays-welcome-seen'

export function hasSeenWelcome() {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) === 'true'
  } catch {
    // If storage is unavailable, keep the onboarding available for this visit.
    return false
  }
}

const POST_LOGIN_KEY = 'ovistays-post-login'

// Where a guest was heading (e.g. a villa's booking page) when login interrupted them
export function setPostLoginPath(path) {
  try {
    window.sessionStorage.setItem(POST_LOGIN_KEY, path)
  } catch {
    // Without storage the guest simply lands on the home page after login.
  }
}

export function takePostLoginPath() {
  try {
    const path = window.sessionStorage.getItem(POST_LOGIN_KEY)
    window.sessionStorage.removeItem(POST_LOGIN_KEY)
    return path && path.startsWith('/') && !path.startsWith('//') ? path : '/'
  } catch {
    return '/'
  }
}

export function markWelcomeSeen() {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(WELCOME_SEEN_KEY, 'true')
  } catch {
    // Private browsing/storage restrictions should not block the auth flow.
  }
}
