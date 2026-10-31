self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = { title: event.data && event.data.text() } }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Lembrete', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/favicon.png',
      tag: data.url || undefined,
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      return clients.openWindow(url)
    }),
  )
})
