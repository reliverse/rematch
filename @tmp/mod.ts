import convert from "./convert/parser.js";
import normalize from "./normalize/parser.js";
import { memoize } from "./utils.js";

// Options type to be used across functions
type RematchOptions = {
  dot?: boolean; // If true, `*` will match dotfiles. Default: false
  nocase?: boolean; // If true, matching will be case-insensitive. Default: false
  ignore?: string | string[]; // Patterns to ignore
};

const rematch = (
  glob: string | string[],
  path: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: RematchOptions,
): boolean => {
  if (Array.isArray(glob)) {
    const res = glob.map(rematch.compile);
    const isMatch = res.some((re) => re.test(path));

    return isMatch;
  }
  const re = rematch.compile(glob);
  const isMatch = re.test(path);

  return isMatch;
};

rematch.compile = memoize((glob: string): RegExp => {
  return new RegExp(`^${convert(normalize(glob))}[\\\\/]?$`, "s");
});

export default rematch;
