// TODO: this rematch@next should pass all tests

const ALPHABET_LOW = "abcdefghijklmnopqrstuvwxyz";
const ALPHABET_UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function alphaToInt(str: string, alphabet: string): number {
  let num = 0;
  for (const char of str) {
    const charIndex = alphabet.indexOf(char);
    if (charIndex === -1) return Number.NaN; // Invalid character for this alphabet
    num = num * alphabet.length + charIndex + 1; // 1-based index
  }
  return num;
}

function intToAlpha(num: number, alphabet: string): string {
  if (num === 0) return ""; // Should be 1-based, but guard
  let str = "";
  while (num > 0) {
    const remainder = (num - 1) % alphabet.length;
    str = alphabet[remainder] + str;
    num = Math.floor((num - 1) / alphabet.length);
  }
  return str;
}

function makeNumericRange(
  startNum: number,
  endNum: number,
  padLength: number,
): string[] {
  const alternatives = [];
  if (startNum <= endNum) {
    for (let val = startNum; val <= endNum; val++) {
      alternatives.push(
        padLength > 0 ? String(val).padStart(padLength, "0") : String(val),
      );
    }
  } else {
    // Decreasing range
    for (let val = startNum; val >= endNum; val--) {
      alternatives.push(
        padLength > 0 ? String(val).padStart(padLength, "0") : String(val),
      );
    }
  }
  return alternatives;
}

function makeAlphabeticalRange(startStr: string, endStr: string): string[] {
  let alphabet = ALPHABET_LOW;
  if (ALPHABET_UP.includes(startStr[0]) && ALPHABET_UP.includes(endStr[0])) {
    alphabet = ALPHABET_UP;
  } else if (
    !ALPHABET_LOW.includes(startStr[0]) ||
    !ALPHABET_LOW.includes(endStr[0])
  ) {
    return [];
  }

  const numStart = alphaToInt(startStr, alphabet);
  const numEnd = alphaToInt(endStr, alphabet);

  if (Number.isNaN(numStart) || Number.isNaN(numEnd)) {
    return []; // Invalid alpha strings
  }

  const alternatives = [];
  if (numStart <= numEnd) {
    for (let i = numStart; i <= numEnd; i++) {
      alternatives.push(intToAlpha(i, alphabet));
    }
  } else {
    // Decreasing range e.g. {z..a}
    for (let i = numStart; i >= numEnd; i--) {
      alternatives.push(intToAlpha(i, alphabet));
    }
  }
  return alternatives;
}

// Options type to be used across functions
type RematchOptions = {
  dot?: boolean; // If true, `*` will match dotfiles. Default: false
  nocase?: boolean; // If true, matching will be case-insensitive. Default: false
  ignore?: string | string[]; // Patterns to ignore
};

// Scan result type
type ScanResult = {
  isGlob: boolean;
  negated: boolean;
  glob: string; // The core glob pattern, without leading !
  parts?: string[]; // Segments of the pattern, if options.parts is true
};

// Core logic for glob to regex string conversion
function makeRegexStringInternal(
  pattern: string,
  isRecursiveCall: boolean, // True if called from within brace expansion
  isPathSegmentStart: boolean, // True if current position is effectively start of a path segment
  options?: RematchOptions,
): string {
  let regexPart = "";
  let i = 0;
  const n = pattern.length;
  let currentPathSegmentStart = isPathSegmentStart;
  const dot = options?.dot ?? false;

  while (i < n) {
    const char = pattern[i];
    i++;

    const atEffectiveSegmentStart = currentPathSegmentStart;
    currentPathSegmentStart = false;

    switch (char) {
      case "*":
        if (pattern[i] === "*") {
          // Globstar **
          i++; // Consumed second '*'
          if (pattern[i] === "/") {
            // Pattern is `**/...`
            i++; // Consumed '/'
            // `**/` means zero or more directory segments. (e.g., `a/`, `a/b/`, or empty)
            regexPart += "(?:(?:[^/]+/)*)";
            currentPathSegmentStart = true; // After `**/`, next thing is at segment start
          } else {
            // `**` not followed by `/`. Matches any characters, including slashes.
            // (e.g., `**`, `foo/**`, `foo/**bar`)
            // Dotfiles are matched by `**` by default.
            regexPart += ".*";
            // currentPathSegmentStart remains false, as `.*` can consume `/`
          }
        } else {
          // Regular *
          if (
            !dot &&
            atEffectiveSegmentStart &&
            (i === 1 || pattern[i - 2] !== ".")
          ) {
            regexPart += "(?!\\.)"; // Don't match leading dot if * is at segment start and not like `.*`
          }
          regexPart += "[^/]*"; // Match anything except path separator
        }
        break;
      case "?":
        if (
          !dot &&
          atEffectiveSegmentStart &&
          (i === 1 || pattern[i - 2] !== ".")
        ) {
          regexPart += "(?!\\.)"; // Don't match leading dot
        }
        regexPart += "[^/]"; // Match one non-separator char
        break;
      case "[": {
        let charClass = "[";
        const charClassStartIdx = i;
        if (i < n && (pattern[i] === "!" || pattern[i] === "^")) {
          charClass += "^";
          i++;
        }

        let content = "";
        let closingBracketFound = false;
        let k = i;
        while (k < n) {
          if (pattern[k] === "\\" && k + 1 < n) {
            content += pattern[k] + pattern[k + 1];
            k += 2;
          } else if (pattern[k] === "]") {
            closingBracketFound = true;
            break;
          } else {
            content += pattern[k];
            k++;
          }
        }

        if (closingBracketFound) {
          charClass += `${content}]`;
          i = k + 1;
        } else {
          charClass = "\\[";
          i = charClassStartIdx;
          if (charClass.startsWith("[^")) i--;
        }
        regexPart += charClass;
        break;
      }
      case "{": {
        let groupContent = "";
        let openBraces = 1;
        const groupContentStartIndex = i;
        let k_brace = i;
        while (k_brace < n) {
          if (pattern[k_brace] === "\\" && k_brace + 1 < n) {
            k_brace += 2;
            continue;
          }
          if (pattern[k_brace] === "{") openBraces++;
          if (pattern[k_brace] === "}") openBraces--;
          if (openBraces === 0) break;
          k_brace++;
        }

        if (openBraces === 0 && k_brace < n) {
          groupContent = pattern.substring(groupContentStartIndex, k_brace);
          i = k_brace + 1;

          const simpleRangeMatch = /^([^.,{}]+)\.\.([^.,{}]+)$/.exec(
            groupContent,
          );

          let isRangeProcessed = false;
          if (simpleRangeMatch) {
            const [, startStr, endStr] = simpleRangeMatch;
            const startNum = Number.parseInt(startStr, 10);
            const endNum = Number.parseInt(endStr, 10);

            let alternatives: string[] = [];
            if (!Number.isNaN(startNum) && !Number.isNaN(endNum)) {
              const padLength =
                (startStr.length > 1 && startStr.startsWith("0")) ||
                (endStr.length > 1 && endStr.startsWith("0"))
                  ? Math.max(startStr.length, endStr.length)
                  : 0;
              alternatives = makeNumericRange(startNum, endNum, padLength);
            } else {
              alternatives = makeAlphabeticalRange(startStr, endStr);
            }

            if (alternatives.length > 0) {
              regexPart += `(?:${alternatives.map((s) => s.replace(/[.+(){}|[\]^$]/g, "\\$&")).join("|")})`;
              isRangeProcessed = true;
            }
          }

          if (!isRangeProcessed) {
            const parts = [];
            let currentPart = "";
            let innerBraceLevel = 0;
            for (let cIdx = 0; cIdx < groupContent.length; cIdx++) {
              const gcChar = groupContent[cIdx];
              if (gcChar === "\\" && cIdx + 1 < groupContent.length) {
                currentPart += gcChar + groupContent[cIdx + 1];
                cIdx++;
                continue;
              }
              if (gcChar === "{") innerBraceLevel++;
              if (gcChar === "}") innerBraceLevel--;
              if (gcChar === "," && innerBraceLevel === 0) {
                parts.push(currentPart);
                currentPart = "";
              } else {
                currentPart += gcChar;
              }
            }
            parts.push(currentPart);

            const processedParts = parts.map(
              (p) =>
                makeRegexStringInternal(
                  p,
                  true,
                  atEffectiveSegmentStart,
                  options,
                ), // Pass options
            );
            if (processedParts.length > 0) {
              regexPart += `(?:${processedParts.join("|")})`;
            } else {
              regexPart += `\\{${groupContent.replace(/[.+(){}|[\]^$]/g, "\\$&")}\\}`;
            }
          }
        } else {
          regexPart += "\\{";
        }
        break;
      }
      case "\\": {
        if (i < n) {
          const nextChar = pattern[i];
          if (".*+?^${}()[]|\\".includes(nextChar)) {
            regexPart += `\\${nextChar}`;
          } else {
            regexPart += nextChar;
          }
          i++;
        } else {
          regexPart += "\\\\"; // Trailing literal backslash
        }
        break;
      }
      case "/":
        regexPart += "/";
        currentPathSegmentStart = true;
        break;
      case ".":
        regexPart += "\\.";
        break;
      case "+":
        regexPart += "\\+";
        break;
      case "(":
        regexPart += "\\(";
        break;
      case ")":
        regexPart += "\\)";
        break;
      case "|":
        regexPart += "\\|";
        break;
      case "^":
        regexPart += "\\^";
        break;
      case "$":
        regexPart += "\\$";
        break;
      default:
        regexPart += char;
        break;
    }
  }

  if (!isRecursiveCall) {
    return `^${regexPart}$`;
  }
  return regexPart;
}

// --- Public API ---

type Matcher = (input: string) => boolean;

const regexCache = new Map<string, RegExp>();
const compiledFnCache = new Map<string, Matcher>();

// Replace the multiple export default declarations with function declarations
function rematch(
  patternOrPatterns: string | string[],
  options: RematchOptions,
): Matcher;
function rematch(
  patternOrPatterns: string | string[],
  input: string,
  options?: RematchOptions,
): boolean;
function rematch(pattern: string): Matcher;
function rematch(
  patternOrPatterns: string | string[],
  inputOrOptions?: string | RematchOptions,
  optionsForSinglePattern?: RematchOptions,
): boolean | Matcher {
  // Case 1: rematch(pattern: string, options: RematchOptions) -> returns Matcher
  if (
    typeof patternOrPatterns === "string" &&
    typeof inputOrOptions === "object" &&
    !optionsForSinglePattern
  ) {
    return compile(patternOrPatterns, inputOrOptions);
  }

  // Case 2: rematch(patterns: string[], options: RematchOptions) -> returns Matcher
  // This is what reglob uses: rematch(processed.match, { dot, nocase, ignore })
  if (
    Array.isArray(patternOrPatterns) &&
    typeof inputOrOptions === "object" &&
    !optionsForSinglePattern
  ) {
    const patterns = patternOrPatterns;
    const options = inputOrOptions;

    const positiveMatchers = patterns
      .filter((p) => !p.startsWith("!") || p === "!")
      .map((p) => compile(p, { dot: options.dot, nocase: options.nocase }));

    let ignoreMatchers: Matcher[] = [];
    if (options.ignore) {
      const ignorePatterns = Array.isArray(options.ignore)
        ? options.ignore
        : [options.ignore];
      ignoreMatchers = ignorePatterns.map((p) =>
        compile(p, { dot: options.dot, nocase: options.nocase }),
      );
    }

    return (input: string): boolean => {
      const normalizedInput = normalizePath(input);
      for (const ignoreMatcher of ignoreMatchers) {
        if (ignoreMatcher(normalizedInput)) return false;
      }
      // If any positive pattern matches, it's a match, unless an ignore pattern also matched (handled above)
      // This part needs to align with how multiple patterns are handled in the direct match case.
      // For now, simple OR for positive, AND NOT for ignore.
      if (positiveMatchers.length === 0 && ignoreMatchers.length > 0)
        return true; // Only ignore patterns, none excluded it
      if (positiveMatchers.some((matcher) => matcher(normalizedInput)))
        return true;
      return false;
    };
  }

  // Case 3: rematch(pattern: string, input: string, options?: RematchOptions) -> returns boolean
  // Case 4: rematch(patterns: string[], input: string, options?: RematchOptions) -> returns boolean
  if (typeof inputOrOptions === "string") {
    const input = inputOrOptions;
    const options =
      optionsForSinglePattern ??
      (typeof patternOrPatterns === "string" &&
      typeof inputOrOptions !== "object" &&
      inputOrOptions !== undefined
        ? undefined
        : (inputOrOptions as RematchOptions));
    const normalizedInput = normalizePath(input);

    if (Array.isArray(patternOrPatterns)) {
      const patterns = patternOrPatterns;
      if (patterns.length === 0) return false;

      let matched = false;
      let isPositivePatternPresent = false;
      for (const p of patterns) {
        if (!p.startsWith("!") || p === "!") isPositivePatternPresent = true;
        // We need a way to pass options to this internal compile call if they exist.
        // The `compile` method itself should handle these options.
        const currentPatternMatcher = compile(p, options); // Pass options
        const currentMatch = currentPatternMatcher(normalizedInput);

        if (p.startsWith("!") && p !== "!") {
          if (!currentMatch) {
            return false;
          }
        } else {
          if (currentMatch) {
            matched = true;
          }
        }
      }
      if (!isPositivePatternPresent) return true;
      return matched;
    }

    // Single pattern string
    const singlePattern = patternOrPatterns; // It's a string here
    if (singlePattern === "") return normalizedInput === "";
    if (normalizedInput === "") {
      if (singlePattern === "*" || singlePattern === "**") return true;
      if (singlePattern === "!*" || singlePattern === "!**") return false;
    }

    const corePatternMatcher = compile(singlePattern, options); // Pass options
    return corePatternMatcher(normalizedInput);
  }

  // Fallback or error for unhandled signatures
  if (
    typeof patternOrPatterns === "string" &&
    !inputOrOptions &&
    !optionsForSinglePattern
  ) {
    //This could be rematch("pattern_string_only") which picomatch might interpret as options only.
    //For now, it means compile with default options.
    return compile(patternOrPatterns, {});
  }

  console.warn(
    "rematch: Unhandled function signature",
    patternOrPatterns,
    inputOrOptions,
    optionsForSinglePattern,
  );
  return false; // Should be unreachable if overloads and logic are correct
}

function compile(pattern: string, options?: RematchOptions): Matcher {
  const cacheKey = `${pattern}_${options?.dot ?? false}_${options?.nocase ?? false}`;
  const cachedFn = compiledFnCache.get(cacheKey);
  if (cachedFn) {
    return cachedFn;
  }

  let negationCount = 0;
  let patternToCompile = pattern;
  while (patternToCompile.startsWith("!") && patternToCompile.length > 0) {
    if (patternToCompile === "!") break;
    negationCount++;
    patternToCompile = patternToCompile.substring(1);
  }
  const isEffectivelyNegated = negationCount % 2 === 1;

  const regex = makeRegex(patternToCompile, options);

  const matcher: Matcher = (input: string): boolean => {
    const result = regex.test(input); // input is already normalized by caller if direct match
    // or should be normalized by this matcher if it's a returned matcher
    return isEffectivelyNegated ? !result : result;
  };

  compiledFnCache.set(cacheKey, matcher);
  return matcher;
}

function makeRegex(pattern: string, options?: RematchOptions): RegExp {
  const cacheKey = `${pattern}_${options?.dot ?? false}_${options?.nocase ?? false}`;
  const cachedRegex = regexCache.get(cacheKey);
  if (cachedRegex) {
    return cachedRegex;
  }

  const regexString = makeRegexStringInternal(pattern, false, true, options);
  const regexFlags = options?.nocase ? "i" : "";
  const regex = new RegExp(regexString, regexFlags);

  regexCache.set(cacheKey, regex);
  return regex;
}
const makeRe = makeRegex; // Alias for picomatch compatibility

function normalizePath(pathStr: string): string {
  return pathStr.replace(/\\/g, "/");
}

function escapeGlob(str: string): string {
  // Replaces special glob characters: \ * ? [ ] { } ( ) ! ^ $ + |
  // with their escaped versions, e.g., [ becomes \[
  return str.replace(/[\\*?[\]{}()!^$+|]/g, "\\$&");
}

function unescapeGlob(str: string): string {
  // Replaces an escaped character sequence \[char] with [char]
  return str.replace(/\\([*?[\]{}()!^$+|])/g, "$1");
}

function isStatic(
  pattern: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: { dot?: boolean },
): boolean {
  // The `dot` option could affect static determination if `*` was considered static when `dot` is true.
  // For now, we keep existing logic, but this might need refinement for full picomatch compatibility.
  if (pattern === "") return true;
  let corePattern = pattern;
  while (corePattern.startsWith("!") && corePattern.length > 1) {
    corePattern = corePattern.substring(1);
  }
  if (corePattern === "!") return true;
  if (corePattern === "") return true;

  let isEscaped = false;
  for (const char of corePattern) {
    if (char === "\\\\") {
      isEscaped = !isEscaped;
      continue;
    }
    if (
      !isEscaped &&
      (char === "*" ||
        char === "?" ||
        char === "[" ||
        char === "{" ||
        char === "(" ||
        char === ")")
    ) {
      return false;
    }
    isEscaped = false;
  }
  return true;
}

function scan(pattern: string, options?: { parts?: boolean }): ScanResult {
  let negated = false;
  let glob = pattern;
  if (pattern.startsWith("!") && pattern !== "!") {
    negated = true;
    glob = pattern.substring(1);
  }
  // For `isGlob`, we use the refined pattern `glob` (without leading !)
  const isGlobResult = !isStatic(glob);
  let parts: string[] | undefined;
  if (options?.parts) {
    // Basic split, picomatch does more advanced parsing to not split within braces etc.
    // This is a simplification for now.
    parts = glob.split("/");
  }
  return { isGlob: isGlobResult, negated, glob, parts };
}

function explode(pattern: string): {
  static: string[];
  dynamic: string[];
} {
  let staticPrefix = "";
  let i = 0;
  const corePattern = pattern;

  for (; i < corePattern.length; i++) {
    const char = corePattern[i];
    if (char === "\\\\") {
      if (i + 1 < corePattern.length) {
        staticPrefix += char + corePattern[i + 1];
        i++;
      } else {
        staticPrefix += char;
      }
      continue;
    }
    if (
      char === "*" ||
      char === "?" ||
      char === "[" ||
      char === "{" ||
      char === "(" ||
      char === ")"
    ) {
      break;
    }
    staticPrefix += char;
  }
  const dynamicPart = corePattern.substring(i);
  return {
    static: staticPrefix ? [staticPrefix] : [],
    dynamic: dynamicPart ? [dynamicPart] : [],
  };
}

// Attach utility functions to rematch
const enhancedRematch = rematch as typeof rematch & {
  compile: typeof compile;
  makeRegex: typeof makeRegex;
  makeRe: typeof makeRe;
  normalizePath: typeof normalizePath;
  escapeGlob: typeof escapeGlob;
  unescapeGlob: typeof unescapeGlob;
  isStatic: typeof isStatic;
  scan: typeof scan;
  explode: typeof explode;
};

enhancedRematch.compile = compile;
enhancedRematch.makeRegex = makeRegex;
enhancedRematch.makeRe = makeRe;
enhancedRematch.normalizePath = normalizePath;
enhancedRematch.escapeGlob = escapeGlob;
enhancedRematch.unescapeGlob = unescapeGlob;
enhancedRematch.isStatic = isStatic;
enhancedRematch.scan = scan;
enhancedRematch.explode = explode;

export default enhancedRematch;

export {
  compile,
  makeRegex,
  makeRe,
  normalizePath,
  escapeGlob,
  unescapeGlob,
  isStatic,
  scan,
  explode,
  type RematchOptions,
  type Matcher,
  type ScanResult,
};
