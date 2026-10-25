export const ACCESS_UNLOCK_AT = new Date("2026-10-27T00:00:00+07:00").getTime();

export function isAccessUnlocked(now = Date.now()) {
  return now >= ACCESS_UNLOCK_AT;
}

export function getCountdownParts(now = Date.now()) {
  const diff = Math.max(0, ACCESS_UNLOCK_AT - now);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds };
}
