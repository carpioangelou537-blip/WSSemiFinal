const staleActionMessage = 'An unexpected response was received from the server.'

export function getActionErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback
  if (error.message.includes(staleActionMessage)) {
    return 'The app and server are out of sync. Refresh this page; if the issue continues, restart the Next.js server and retry.'
  }
  return error.message || fallback
}
