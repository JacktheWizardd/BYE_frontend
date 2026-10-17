export class FormError extends Error {
  constructor(readonly code:string, message:string, readonly retryAfter=0) { super(message) }
}
export async function api<T>(path:string, body?:unknown, signal?:AbortSignal): Promise<T> {
  let response:Response
  try {
    response = await fetch('/api/reviews/' + path, {
      method:body === undefined ? 'GET':'POST', credentials:'same-origin', cache:'no-store', signal,
      ...(body === undefined ? {} : { headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body) }),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new FormError(path === 'submit' ? 'SAVE_UNCONFIRMED':'NETWORK_ERROR', path === 'submit' ? 'The save could not be confirmed. Do not submit again yet; check back shortly.' : 'Could not connect to BYE. Check your connection and try again.')
  }
  let result: { data?: unknown; error?: { code?: string; message?: string; retryAfter?: number } }
  try { result = await response.json() as typeof result; if (!result || typeof result !== 'object') throw new Error() } catch { throw new FormError(path === 'submit' ? 'SAVE_UNCONFIRMED':'NETWORK_ERROR', path === 'submit' ? 'The save could not be confirmed. Do not submit again yet; check back shortly.' : 'BYE returned an unreadable response. Try again shortly.') }
  if (!response.ok) throw new FormError(result.error?.code ?? 'REQUEST_FAILED', result.error?.message ?? 'This request could not be completed.', result.error?.retryAfter ?? 0)
  return result.data as T
}
