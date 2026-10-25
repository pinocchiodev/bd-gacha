import test from "node:test";
import assert from "node:assert/strict";
import { getCountdownParts, isAccessUnlocked } from "./countdown";

test("counts down until the unlock time", () => {
  const now = new Date("2026-10-26T12:00:00+07:00").getTime();
  const result = getCountdownParts(now);

  assert.equal(result.days, 0);
  assert.equal(result.hours, 12);
  assert.equal(result.minutes, 0);
  assert.equal(result.seconds, 0);
});

test("treats the unlock moment as active", () => {
  const unlockMoment = new Date("2026-10-27T00:00:00+07:00").getTime();
  assert.equal(isAccessUnlocked(unlockMoment), true);
});
