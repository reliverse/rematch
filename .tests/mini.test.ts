import { test, expect, describe } from "bun:test";

import type { RematchOptions } from "~/mod.js";

import rematch from "~/mod.js";

// Helper functions
const isMatchDefault = (
  pattern: string | string[],
  input: string,
  options?: RematchOptions,
): boolean => rematch(pattern, input, options);
const isMatchCompile = (pattern: string | string[], input: string): boolean => {
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  const matchers = patterns.map((p) => rematch.makeRe(p));
  return matchers.some((re) => re instanceof RegExp && re.test(input));
};

// Main test suite
for (const [name, isMatch] of [
  ["default", isMatchDefault],
  ["compile", isMatchCompile],
] as const) {
  describe(name, () => {
    test("native", () => {
      expect(isMatch([], "a")).toBe(false);
    });

    test("fuzz_tests", () => {
      const problem1 =
        "{*{??*{??**,Uz*zz}w**{*{**a,z***b*[!}w??*azzzzzzzz*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!z[za,z&zz}w**z*z*}";
      expect(isMatch(problem1, problem1)).toBe(false);

      const problem2 =
        "**** *{*{??*{??***\u{5} *{*{??*{??***\u{5},\0U\0}]*****\u{1},\0***\0,\0\0}w****,\0U\0}]*****\u{1},\0***\0,\0\0}w*****\u{1}***{}*.*\0\0*\0";
      expect(isMatch(problem2, problem2)).toBe(false);
    });
  });
}
