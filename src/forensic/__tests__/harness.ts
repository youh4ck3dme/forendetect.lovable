import assert from "node:assert";

type TestFn = () => void | Promise<void>;

let currentDescribe = "";

export function describe(name: string, fn: () => void) {
  const prev = currentDescribe;
  currentDescribe = name;
  console.log(`\n📦 ${name}`);
  try {
    fn();
  } finally {
    currentDescribe = prev;
  }
}

export function it(name: string, fn: TestFn) {
  try {
    const res = fn();
    if (res && typeof res.then === "function") {
      res.then(
        () => console.log(`  ✓ ${name}`),
        (err: Error) => {
          console.error(`  ✗ ${name}`);
          console.error(err);
          process.exitCode = 1;
        },
      );
    } else {
      console.log(`  ✓ ${name}`);
    }
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

export function expect<T>(actual: T) {
  return {
    toBe(expected: unknown) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected: unknown) {
      assert.deepStrictEqual(actual, expected);
    },
    toThrow() {
      assert.throws(actual as unknown as () => void);
    },
    toContain(expected: unknown) {
      if (typeof actual === "string") {
        assert.ok(
          actual.includes(expected as string),
          `Expected "${actual}" to contain "${expected}"`,
        );
      } else if (Array.isArray(actual)) {
        assert.ok(
          actual.includes(expected),
          `Expected array to contain ${JSON.stringify(expected)}`,
        );
      } else {
        assert.fail("toContain target is not string or array");
      }
    },
    toContainEqual(expected: unknown) {
      assert.ok(
        Array.isArray(actual) &&
          actual.some(
            (item) => JSON.stringify(item) === JSON.stringify(expected),
          ),
        `Expected array to contain equal item ${JSON.stringify(expected)}`,
      );
    },
    toBeDefined() {
      assert.notStrictEqual(actual, undefined);
    },
    toBeGreaterThan(expected: number) {
      assert.ok((actual as unknown as number) > expected);
    },
    toBeGreaterThanOrEqual(expected: number) {
      assert.ok((actual as unknown as number) >= expected);
    },
    not: {
      toContain(expected: unknown) {
        if (typeof actual === "string") {
          assert.ok(
            !actual.includes(expected as string),
            `Expected "${actual}" NOT to contain "${expected}"`,
          );
        }
      },
    },
  };
}
