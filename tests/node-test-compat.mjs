import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { afterEach, beforeEach, describe, it } from 'node:test';

const mocks = new Set();
let fakeTimersInstalled = false;
let realSetTimeout = globalThis.setTimeout;
let realClearTimeout = globalThis.clearTimeout;
let fakeNow = 0;
let nextTimerId = 1;
let timers = new Map();

function createMock(implementation = () => undefined) {
  let currentImplementation = implementation;

  const fn = (...args) => {
    fn.mock.calls.push(args);
    return currentImplementation(...args);
  };

  fn.mock = { calls: [] };
  fn.mockClear = () => {
    fn.mock.calls.length = 0;
    return fn;
  };
  fn.mockReset = () => {
    fn.mockClear();
    currentImplementation = () => undefined;
    return fn;
  };
  fn.mockImplementation = (nextImplementation) => {
    currentImplementation = nextImplementation;
    return fn;
  };
  fn.mockReturnValue = (value) => {
    currentImplementation = () => value;
    return fn;
  };

  mocks.add(fn);
  return fn;
}

function installFakeTimers() {
  if (!fakeTimersInstalled) {
    realSetTimeout = globalThis.setTimeout;
    realClearTimeout = globalThis.clearTimeout;
    globalThis.setTimeout = (callback, delay = 0, ...args) => {
      const id = nextTimerId++;
      timers.set(id, {
        due: fakeNow + Math.max(0, Number(delay) || 0),
        callback,
        args
      });
      return id;
    };
    globalThis.clearTimeout = (id) => {
      timers.delete(id);
    };
    fakeTimersInstalled = true;
  }
  fakeNow = 0;
  nextTimerId = 1;
  timers = new Map();
}

function advanceTimersByTime(milliseconds) {
  if (!fakeTimersInstalled) throw new Error('Fake timers are not enabled');
  const target = fakeNow + Math.max(0, Number(milliseconds) || 0);

  while (true) {
    const dueTimers = [...timers.entries()]
      .filter(([, timer]) => timer.due <= target)
      .sort((a, b) => a[1].due - b[1].due || a[0] - b[0]);
    if (!dueTimers.length) break;

    const [id, timer] = dueTimers[0];
    timers.delete(id);
    fakeNow = timer.due;
    timer.callback(...timer.args);
  }

  fakeNow = target;
}

function restoreTimers() {
  if (!fakeTimersInstalled) return;
  globalThis.setTimeout = realSetTimeout;
  globalThis.clearTimeout = realClearTimeout;
  fakeTimersInstalled = false;
  fakeNow = 0;
  timers = new Map();
}

function calledWith(received, expectedArgs) {
  return Boolean(received?.mock?.calls?.some((args) => isDeepStrictEqual(args, expectedArgs)));
}

function evaluate(received, matcher, args) {
  switch (matcher) {
    case 'toBe': return Object.is(received, args[0]);
    case 'toEqual': return isDeepStrictEqual(received, args[0]);
    case 'toContain': return typeof received?.includes === 'function' && received.includes(args[0]);
    case 'toHaveLength': return received?.length === args[0];
    case 'toBeNull': return received === null;
    case 'toBeUndefined': return received === undefined;
    case 'toBeDefined': return received !== undefined;
    case 'toBeTypeOf': return typeof received === args[0];
    case 'toBeGreaterThan': return received > args[0];
    case 'toBeGreaterThanOrEqual': return received >= args[0];
    case 'toBeLessThan': return received < args[0];
    case 'toBeLessThanOrEqual': return received <= args[0];
    case 'toBeCloseTo': {
      const precision = args[1] ?? 2;
      return Math.abs(received - args[0]) < (10 ** -precision) / 2;
    }
    case 'toThrow': {
      if (typeof received !== 'function') return false;
      try {
        received();
        return false;
      } catch {
        return true;
      }
    }
    case 'toHaveBeenCalled': return Boolean(received?.mock?.calls?.length);
    case 'toHaveBeenCalledTimes': return received?.mock?.calls?.length === args[0];
    case 'toHaveBeenCalledWith': return calledWith(received, args);
    default: throw new Error(`Unsupported test matcher: ${matcher}`);
  }
}

function matcherSet(received, negate = false) {
  const invoke = (matcher, ...args) => {
    const passed = evaluate(received, matcher, args);
    assert.ok(negate ? !passed : passed, `${negate ? 'not ' : ''}${matcher} assertion failed`);
  };

  return {
    toBe: (...args) => invoke('toBe', ...args),
    toEqual: (...args) => invoke('toEqual', ...args),
    toContain: (...args) => invoke('toContain', ...args),
    toHaveLength: (...args) => invoke('toHaveLength', ...args),
    toBeNull: (...args) => invoke('toBeNull', ...args),
    toBeUndefined: (...args) => invoke('toBeUndefined', ...args),
    toBeDefined: (...args) => invoke('toBeDefined', ...args),
    toBeTypeOf: (...args) => invoke('toBeTypeOf', ...args),
    toBeGreaterThan: (...args) => invoke('toBeGreaterThan', ...args),
    toBeGreaterThanOrEqual: (...args) => invoke('toBeGreaterThanOrEqual', ...args),
    toBeLessThan: (...args) => invoke('toBeLessThan', ...args),
    toBeLessThanOrEqual: (...args) => invoke('toBeLessThanOrEqual', ...args),
    toBeCloseTo: (...args) => invoke('toBeCloseTo', ...args),
    toThrow: (...args) => invoke('toThrow', ...args),
    toHaveBeenCalled: (...args) => invoke('toHaveBeenCalled', ...args),
    toHaveBeenCalledTimes: (...args) => invoke('toHaveBeenCalledTimes', ...args),
    toHaveBeenCalledWith: (...args) => invoke('toHaveBeenCalledWith', ...args),
    get not() {
      return matcherSet(received, !negate);
    }
  };
}

export function expect(received) {
  return matcherSet(received);
}

export const vi = Object.freeze({
  fn: createMock,
  clearAllMocks() {
    for (const fn of mocks) fn.mockClear();
  },
  resetAllMocks() {
    for (const fn of mocks) fn.mockReset();
  },
  restoreAllMocks() {
    for (const fn of mocks) fn.mockClear();
  },
  useFakeTimers: installFakeTimers,
  useRealTimers: restoreTimers,
  advanceTimersByTime
});

export { afterEach, beforeEach, describe, it };
