/**
 * Shared web-push utility.
 * Used by games/scores, user/favorites, push/track-click, etc.
 */
import webpush from 'web-push';

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:hola@hotelelencino.com', VAPID_PUBLIC, VAPID_PRIVATE);
}

export interface PushSub { endpoint: string; p256dh: string; auth: string }

export async function sendPushNotification(sub: PushSub, payload: string): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    payload,
    { urgency: 'normal' }
  );
}
