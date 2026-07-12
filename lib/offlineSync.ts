// Petite file d'attente locale : si l'envoi réseau échoue (coupure en salle),
// la donnée est gardée dans localStorage et renvoyée dès que possible.

function readQueue(queueKey: string): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(queueKey);
    return raw ? (JSON.parse(raw) as unknown[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queueKey: string, items: unknown[]) {
  window.localStorage.setItem(queueKey, JSON.stringify(items));
}

export async function submitWithOfflineFallback(
  endpoint: string,
  payload: unknown,
  queueKey: string
): Promise<{ ok: boolean; queued: boolean }> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return { ok: true, queued: false };
    return { ok: false, queued: false };
  } catch {
    const queue = readQueue(queueKey);
    queue.push({ endpoint, payload });
    writeQueue(queueKey, queue);
    return { ok: true, queued: true };
  }
}

export async function flushQueue(queueKey: string): Promise<{ sent: number; remaining: number }> {
  const queue = readQueue(queueKey) as { endpoint: string; payload: unknown }[];
  if (queue.length === 0) return { sent: 0, remaining: 0 };

  const stillPending: { endpoint: string; payload: unknown }[] = [];
  let sent = 0;

  for (const item of queue) {
    try {
      const res = await fetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) sent += 1;
      else stillPending.push(item);
    } catch {
      stillPending.push(item);
    }
  }

  writeQueue(queueKey, stillPending);
  return { sent, remaining: stillPending.length };
}

export function pendingCount(queueKey: string): number {
  return readQueue(queueKey).length;
}
