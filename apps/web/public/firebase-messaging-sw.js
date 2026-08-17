// Firebase Cloud Messaging Background Service Worker

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const notificationTitle =
      payload.notification?.title || payload.data?.title || "Pocketly Notification";
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || "",
      icon: payload.notification?.icon || "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        actionUrl: payload.data?.actionUrl || payload.fcmOptions?.link || "/dashboard",
        notificationId: payload.data?.notificationId,
      },
      tag: payload.data?.notificationId || "pocketly-notification",
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (err) {
    console.error("[firebase-messaging-sw.js] Error parsing push data:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const actionUrl = event.notification.data?.actionUrl || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(actionUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(actionUrl);
        }
      })
  );
});
