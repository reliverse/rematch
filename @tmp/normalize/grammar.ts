import { match, or, star } from "grammex";

import { identity } from "../utils.js";

const Escaped = match(/\\./, identity);
const Passthrough = match(/./, identity);

const StarStarStar = match(/\*\*\*+/, "*");

const StarStarNoLeft = match(/([^/{[(!])\*\*/, (_, $1) => `${$1}*`);
const StarStarNoRight = match(/(^|.)\*\*(?=[^*/)\]}])/, (_, $1) => `${$1}*`);

const Grammar = star(
  or([Escaped, StarStarStar, StarStarNoLeft, StarStarNoRight, Passthrough]),
);

export default Grammar;
