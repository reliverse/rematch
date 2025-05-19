const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

const int2alpha = (int: number): string => {
  let alpha = "";

  while (int > 0) {
    const reminder = (int - 1) % 26;

    alpha = ALPHABET[reminder] + alpha;

    int = Math.floor((int - 1) / 26);
  }

  return alpha;
};

const alpha2int = (str: string): number => {
  let int = 0;

  for (let i = 0, l = str.length; i < l; i++) {
    int = int * 26 + ALPHABET.indexOf(str[i]) + 1;
  }

  return int;
};

const makeRangeInt = (start: number, end: number): number[] => {
  if (end < start) return makeRangeInt(end, start);

  const range: number[] = [];

  while (start <= end) {
    range.push(start++);
  }

  return range;
};

const makeRangePaddedInt = (
  start: number,
  end: number,
  paddingLength: number,
): string[] => {
  return makeRangeInt(start, end).map((int) =>
    String(int).padStart(paddingLength, "0"),
  );
};

const makeRangeAlpha = (start: string, end: string): string[] => {
  return makeRangeInt(alpha2int(start), alpha2int(end)).map(int2alpha);
};

export { makeRangeInt, makeRangePaddedInt, makeRangeAlpha };
