import type { State } from "./parse.js";

import * as constants from "./constants.js";
import parse from "./parse.js";
import scan from "./scan.js";
import * as utils from "./utils.js";

// Define a type for the scan result
type ScanResult = {
  prefix: string;
  input: string;
  start: number;
  base: string;
  glob: string;
  isBrace: boolean;
  isBracket: boolean;
  isGlob: boolean;
  isExtglob: boolean;
  isGlobstar: boolean;
  negated: boolean;
  [key: string]: any; // For other potential properties
};

const isObject = (val) => val && typeof val === "object" && !Array.isArray(val);

// Define a type for the matcher function
type Matcher = {
  (input: string, returnObject?: boolean): boolean | Record<string, unknown>;
  state?: unknown;
};

// Define the main interface for the rematch object
export type RematchAPI = {
  // Call signature for the main rematch function
  (
    pattern: string | string[],
    input: string,
    options?: Record<string, unknown>,
  ): boolean;
  (
    pattern: string | string[],
    options: Record<string, unknown>,
  ): (input: string) => boolean;

  // Properties
  test: (
    input: string,
    regex: RegExp,
    options: Record<string, unknown>,
    extra?: { glob?: any; posix?: boolean },
  ) => { isMatch: boolean; match: any; output: string };

  matchBase: (
    input: string,
    glob: RegExp | string,
    options: Record<string, unknown>,
    posix?: boolean,
  ) => boolean;

  isMatch: (
    str: string,
    patterns: string | string[] | Matcher,
    options?: Record<string, unknown>,
  ) => boolean;

  parse(pattern: string, options?: Record<string, unknown>): State;
  parse(pattern: readonly string[], options?: Record<string, unknown>): State[];
  parse(
    pattern: string | readonly string[],
    options?: Record<string, unknown>,
  ): State | State[];

  scan: (input: string, options?: Record<string, unknown>) => ScanResult;

  compileRe: (
    state: State | { output: string; negated?: boolean },
    options?: Record<string, unknown>,
    returnOutput?: boolean,
    returnState?: boolean,
  ) => RegExp | string;

  makeRe: (
    input: string,
    options?: Record<string, unknown>,
    returnOutput?: boolean,
    returnState?: boolean,
  ) => RegExp | string;

  toRegex: (source: string, options?: Record<string, unknown>) => RegExp;

  constants: typeof constants;
};

/**
 * Creates a matcher function from one or more glob patterns. The
 * returned function takes a string to match as its first argument,
 * and returns true if the string is a match. The returned matcher
 * function also takes a boolean as the second argument that, when true,
 * returns an object with additional information.
 *
 * ```js
 * import rematch from '@chance/rematch';
 * // rematch(glob[, options]);
 *
 * const isMatch = rematch('*.!(*a)');
 * console.log(isMatch('a.a')); //=> false
 * console.log(isMatch('a.b')); //=> true
 * ```
 * @name rematch
 * @param {String|Array} `globs` One or more glob patterns.
 * @param {Object=} `options`
 * @return {Function=} Returns a matcher function.
 * @api public
 */
const rematchInternal = (glob, options, returnState = false) => {
  if (Array.isArray(glob)) {
    const fns = glob.map((input) =>
      rematchInternal(input, options, returnState),
    );
    const arrayMatcher = (str) => {
      for (const isMatch of fns) {
        const state = isMatch(str);
        if (state) return state;
      }
      return false;
    };
    return arrayMatcher;
  }

  const isState = isObject(glob) && glob.tokens && glob.input;

  if (glob === "" || (typeof glob !== "string" && !isState)) {
    throw new TypeError("Expected pattern to be a non-empty string");
  }

  const opts = options || {};
  const posix = opts.windows;
  const regex = isState
    ? rematchInternal.compileRe(glob, options)
    : rematchInternal.makeRe(glob, options, false, true);

  let state: State | undefined = undefined;
  if (regex instanceof RegExp && "state" in regex) {
    state = (regex as any).state;
    delete (regex as any).state;
  }

  let isIgnored: Matcher | (() => boolean) = () => false;
  if (opts.ignore) {
    const ignoreOpts = {
      ...options,
      ignore: null,
      onMatch: null,
      onResult: null,
    };
    isIgnored = rematchInternal(
      opts.ignore,
      ignoreOpts,
      returnState,
    ) as Matcher;
  }

  const matcher = (input: string, returnObject = false) => {
    // Ensure safeRegex is always a RegExp
    const safeRegex: RegExp =
      regex instanceof RegExp
        ? regex
        : (rematchInternal.makeRe(String(regex), options) as RegExp);
    const { isMatch, match, output } = rematchInternal.test(
      input,
      safeRegex,
      options,
      {
        glob,
        posix,
      },
    );
    const result = { glob, state, regex, posix, input, output, match, isMatch };

    // ensure consistency with makeRe
    if (isMatch && safeRegex instanceof RegExp && !safeRegex.test(input)) {
      result.isMatch = false;
      return returnObject ? result : false;
    }

    if (typeof opts.onResult === "function") {
      opts.onResult(result);
    }

    if (isMatch === false) {
      result.isMatch = false;
      return returnObject ? result : false;
    }

    // Type guard for matcher
    let ignored = false;
    if (typeof isIgnored === "function" && isIgnored.length > 0) {
      ignored = (isIgnored as Matcher)(input) as boolean;
    } else if (typeof isIgnored === "function") {
      ignored = (isIgnored as () => boolean)();
    }

    if (ignored) {
      if (typeof opts.onIgnore === "function") {
        opts.onIgnore(result);
      }
      result.isMatch = false;
      return returnObject ? result : false;
    }

    if (typeof opts.onMatch === "function") {
      opts.onMatch(result);
    }
    return returnObject ? result : true;
  };

  if (returnState) {
    (matcher as any).state = state;
  }

  return matcher;
};

/**
 * Test `input` with the given `regex`. This is used by the main
 * `rematch()` function to test the input string.
 *
 * ```js
 * import rematch from '@chance/rematch';
 * // rematch.test(input, regex[, options]);
 *
 * console.log(rematch.test('foo/bar', /^(?:([^/]*?)\/([^/]*?))$/));
 * // { isMatch: true, match: [ 'foo/', 'foo', 'bar' ], output: 'foo/bar' }
 * ```
 * @param {String} `input` String to test.
 * @param {RegExp} `regex`
 * @return {Object} Returns an object with matching info.
 * @api public
 */
rematchInternal.test = (
  input: string,
  regex: RegExp,
  options: Record<string, unknown>,
  extra: { glob?: any; posix?: boolean } = {},
) => {
  if (typeof input !== "string") {
    throw new TypeError("Expected input to be a string");
  }

  if (input === "") {
    return { isMatch: false, output: "" };
  }

  const opts = options || {};
  const format = opts.format || (extra.posix ? utils.toPosixSlashes : null);
  let match = input === extra.glob;
  let output = match && typeof format === "function" ? format(input) : input;

  if (match === false) {
    output = typeof format === "function" ? format(input) : input;
    match = output === extra.glob;
  }

  if (match === false || opts.capture === true) {
    let safeRegex = regex;
    if (!(regex instanceof RegExp)) {
      safeRegex = rematchInternal.makeRe(String(regex), options) as RegExp;
    }
    if (opts.matchBase === true || opts.basename === true) {
      match = rematchInternal.matchBase(input, safeRegex, options, extra.posix);
    } else {
      match =
        safeRegex instanceof RegExp ? safeRegex.exec(output) !== null : false;
    }
  }

  return { isMatch: Boolean(match), match, output };
};

/**
 * Match the basename of a filepath.
 *
 * ```js
 * import rematch from '@chance/rematch';
 * // rematch.matchBase(input, glob[, options]);
 * console.log(rematch.matchBase('foo/bar.js', '*.js'); // true
 * ```
 * @param {String} `input` String to test.
 * @param {RegExp|String} `glob` Glob pattern or regex created by [.makeRe](#makeRe).
 * @return {Boolean}
 * @api public
 */
rematchInternal.matchBase = (
  input: string,
  glob: RegExp | string,
  options: Record<string, unknown>,
  posix?: boolean,
) => {
  const regex =
    glob instanceof RegExp
      ? glob
      : rematchInternal.makeRe(String(glob), options);
  return regex instanceof RegExp
    ? regex.test(utils.basename(input, { windows: posix }))
    : false;
};

/**
 * Returns true if **any** of the given glob `patterns` match the specified `string`.
 *
 * ```js
 * import rematch from '@chance/rematch';
 * // rematch.isMatch(string, patterns[, options]);
 *
 * console.log(rematch.isMatch('a.a', ['b.*', '*.a'])); //=> true
 * console.log(rematch.isMatch('a.a', 'b.*')); //=> false
 * ```
 * @param {String|Array} str The string to test.
 * @param {String|Array} patterns One or more glob patterns to use for matching.
 * @param {Object} [options] See available [options](#options).
 * @return {Boolean} Returns true if any patterns match `str`
 * @api public
 */
rematchInternal.isMatch = (str, patterns, options) => {
  const matcher =
    typeof patterns === "function"
      ? patterns
      : rematchInternal(patterns, options);
  return matcher(str);
};

/**
 * Parse a glob pattern to create the source string for a regular
 * expression.
 *
 * ```js
 * import rematch from '@chance/rematch';
 * const result = rematch.parse(pattern[, options]);
 * ```
 * @param {String} `pattern`
 * @param {Object} `options`
 * @return {Object} Returns an object with useful properties and output to be used as a regex source string.
 * @api public
 */
rematchInternal.parse = (pattern, options) => {
  if (Array.isArray(pattern))
    return pattern.map((p) => rematchInternal.parse(p, options));
  return parse(pattern, { ...options, fastpaths: false });
};

/**
 * Scan a glob pattern to separate the pattern into segments.
 *
 * ```js
 * import rematch from '@chance/rematch';
 * // rematch.scan(input[, options]);
 *
 * const result = rematch.scan('!./foo/*.js');
 * console.log(result);
 * { prefix: '!./',
 *   input: '!./foo/*.js',
 *   start: 3,
 *   base: 'foo',
 *   glob: '*.js',
 *   isBrace: false,
 *   isBracket: false,
 *   isGlob: true,
 *   isExtglob: false,
 *   isGlobstar: false,
 *   negated: true }
 * ```
 * @param {String} `input` Glob pattern to scan.
 * @param {Object} `options`
 * @return {Object} Returns an object with
 * @api public
 */
rematchInternal.scan = (input, options) => scan(input, options);

/**
 * Compile a regular expression from the `state` object returned by the
 * [parse()](#parse) method.
 *
 * @param {Object} `state`
 * @param {Object} `options`
 * @param {Boolean} `returnOutput` Intended for implementors, this argument allows you to return the raw output from the parser.
 * @param {Boolean} `returnState` Adds the state to a `state` property on the returned regex. Useful for implementors and debugging.
 * @return {RegExp}
 * @api public
 */
rematchInternal.compileRe = (
  state: { output: string; negated?: boolean },
  options: Record<string, unknown>,
  returnOutput = false,
  returnState = false,
) => {
  if (returnOutput === true) {
    return state.output;
  }

  const opts = options || {};
  const prepend = opts.contains ? "" : "^";
  const append = opts.contains ? "" : "$";

  let source = `${prepend}(?:${state.output})${append}`;
  if (state && state.negated === true) {
    source = `^(?!${source}).*$`;
  }

  const regex = rematchInternal.toRegex(source, options);
  if (returnState === true && regex instanceof RegExp) {
    (regex as any).state = state;
  }

  return regex;
};

/**
 * Create a regular expression from a parsed glob pattern.
 *
 * ```js
 * import rematch from '@chance/rematch';
 * const state = rematch.parse('*.js');
 * // rematch.compileRe(state[, options]);
 *
 * console.log(rematch.compileRe(state));
 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
 * ```
 * @param {String} `state` The object returned from the `.parse` method.
 * @param {Object} `options`
 * @param {Boolean} `returnOutput` Implementors may use this argument to return the compiled output, instead of a regular expression. This is not exposed on the options to prevent end-users from mutating the result.
 * @param {Boolean} `returnState` Implementors may use this argument to return the state from the parsed glob with the returned regular expression.
 * @return {RegExp} Returns a regex created from the given pattern.
 * @api public
 */
rematchInternal.makeRe = (
  input: string,
  options: Record<string, unknown> = {},
  returnOutput = false,
  returnState = false,
): RegExp | string => {
  if (!input || typeof input !== "string") {
    throw new TypeError("Expected a non-empty string");
  }

  let parsed:
    | { negated: boolean; fastpaths: boolean; output?: string }
    | State = { negated: false, fastpaths: true };

  if (
    options.fastpaths !== false &&
    (input.startsWith(".") || input.startsWith("*"))
  ) {
    (parsed as { output?: string }).output = parse.fastpaths(input, options);
  }

  if (!(parsed as { output?: string }).output) {
    parsed = parse(input, options) as State & { fastpaths: boolean };
    (parsed as { fastpaths: boolean }).fastpaths = false;
  }

  return rematchInternal.compileRe(
    parsed as any,
    options,
    returnOutput,
    returnState,
  );
};

/**
 * Create a regular expression from the given regex source string.
 *
 * ```js
 * import rematch from '@chance/rematch';
 * // rematch.toRegex(source[, options]);
 *
 * const { output } = rematch.parse('*.js');
 * console.log(rematch.toRegex(output));
 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
 * ```
 * @param {String} `source` Regular expression source string.
 * @param {Object} `options`
 * @return {RegExp}
 * @api public
 */
rematchInternal.toRegex = (source, options) => {
  try {
    const opts = options || {};
    return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
  } catch (err) {
    if (options && options.debug === true) throw err;
    return /$^/;
  }
};

/**
 * rematch constants.
 * @return {Object}
 */
rematchInternal.constants = constants;

/**
 * Expose "@chance/rematch"
 */
const rematch: RematchAPI = rematchInternal as any; // Cast to ensure full type coverage
export default rematch;
