import {
  REGEX_BACKSLASH,
  REGEX_REMOVE_BACKSLASH,
  REGEX_SPECIAL_CHARS,
  REGEX_SPECIAL_CHARS_GLOBAL,
} from "./constants.js";

export const isObject = (val) =>
  val !== null && typeof val === "object" && !Array.isArray(val);
export const hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
export const isRegexChar = (str) => str.length === 1 && hasRegexChars(str);
export const escapeRegex = (str) =>
  str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
export const toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");

export const isWindows = () => {
  if (typeof navigator !== "undefined" && navigator.platform) {
    const platform = navigator.platform.toLowerCase();
    return platform === "win32" || platform === "windows";
  }

  if (typeof process !== "undefined" && process.platform) {
    return process.platform === "win32";
  }

  return false;
};

export const removeBackslashes = (str) => {
  return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
    return match === "\\" ? "" : match;
  });
};

export const escapeLast = (input, char, lastIdx) => {
  const idx = input.lastIndexOf(char, lastIdx);
  if (idx === -1) return input;
  if (input[idx - 1] === "\\") return escapeLast(input, char, idx - 1);
  return `${input.slice(0, idx)}\\${input.slice(idx)}`;
};

type RemovePrefixState = {
  prefix?: string;
};

type WrapOutputState = {
  negated?: boolean;
};

type WrapOutputOptions = {
  contains?: boolean;
};

export const removePrefix = (input: string, state: RemovePrefixState = {}) => {
  let output = input;
  if (output.startsWith("./")) {
    output = output.slice(2);
    state.prefix = "./";
  }
  return output;
};

export const wrapOutput = (
  input: string,
  state: WrapOutputState = {},
  options: WrapOutputOptions = {},
) => {
  const prepend = options.contains ? "" : "^";
  const append = options.contains ? "" : "$";

  let output = `${prepend}(?:${input})${append}`;
  if (state.negated === true) {
    output = `(?:^(?!${output}).*$)`;
  }
  return output;
};

type BasenameOptions = {
  windows?: boolean;
};

export const basename = (path: string, { windows }: BasenameOptions = {}) => {
  const segs = path.split(windows ? /[\\/]/ : "/");
  const last = segs[segs.length - 1];

  if (last === "") {
    return segs[segs.length - 2];
  }

  return last;
};
