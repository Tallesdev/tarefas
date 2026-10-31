import { supabase } from './supabase'

// Chave pública VAPID (pode ficar no app; a privada fica só no servidor)
const VAPID_PUBLIC = 'BGYRgYL3YlkgI-AWHH-qfrPmbKphH2y57hxFma8YMYClbxCXraBq1OKpSfDMiiNWigCi4eQ2_jluAjr_RVQ2ti8'

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

function toUint8(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function pushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // no iPhone o push só existe com o app instalado na tela inicial
    return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

export async function enablePush(userId: string): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(VAPID_PUBLIC) }))
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
  return 'off'
}

// Aviso local (ex.: fim do foco) mesmo com o app em segundo plano
export async function localNotify(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.getRegistration()
  if (reg) reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/favicon.png' })
  else new Notification(title, { body })
}
