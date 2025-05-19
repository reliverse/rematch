import type { RematchAPI } from "./rematch.js";

import pico from "./rematch.js";

export type RematchOptions = Record<string, unknown>;

function rematchFn(
  pattern: string | string[],
  input: string,
  options?: RematchOptions,
): boolean;
function rematchFn(
  pattern: string | string[],
  options: RematchOptions,
): (input: string) => boolean;
function rematchFn(
  pattern: string | string[],
  inputOrOptions?: string | RematchOptions,
  maybeOptions?: RematchOptions,
): boolean | ((input: string) => boolean) {
  const options =
    typeof inputOrOptions === "object" ? inputOrOptions : maybeOptions || {};
  const input = typeof inputOrOptions === "string" ? inputOrOptions : undefined;

  // Set windows option based on platform
  if (options.windows === null || options.windows === undefined) {
    options.windows = process.platform === "win32";
  }

  try {
    const matcher = pico(pattern, options);
    if (input === undefined) {
      return (str: string) => !!matcher(str);
    }
    return !!matcher(input);
  } catch (_error) {
    // If pattern parsing fails, treat it as a literal string match
    if (input === undefined) {
      return (str: string) => str === pattern;
    }
    return input === pattern;
  }
}

const rematch = rematchFn as unknown as RematchAPI;
Object.assign(rematch, pico);
export default rematch;
