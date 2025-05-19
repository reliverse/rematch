import type { ExplicitRule } from "grammex";

import { parse } from "grammex";

const identity = <T>(value: T): T => {
  return value;
};

const makeParser = (grammar: ExplicitRule<string>) => {
  return (input: string): string => {
    return parse(input, grammar, { memoization: false }).join("");
  };
};

const memoize = <T>(fn: (arg: string) => T): ((arg: string) => T) => {
  const cache: Record<string, T> = {};

  return (arg: string): T => {
    return (cache[arg] ??= fn(arg));
  };
};

export { identity, makeParser, memoize };
