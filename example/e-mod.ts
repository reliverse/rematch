import rematch, {
  escapeGlob,
  unescapeGlob,
  isStatic,
  explode,
  compile,
  makeRegex,
} from "@next/mod.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ${message}`);
    return false;
  }
  console.log(`✅ ${message}`);
  return true;
}

function main() {
  console.log("🧪 Testing @reliverse/rematch...\n");

  // Basic matching
  assert(rematch("*.js", "file.js"), "Basic wildcard match");
  assert(!rematch("*.js", "file.ts"), "Basic wildcard non-match");
  assert(rematch("**/*.js", "src/utils/file.js"), "Globstar match");
  assert(!rematch("*.js", ".hidden.js"), "Dot-file handling");
  assert(rematch(".*.js", ".hidden.js"), "Explicit dot-file match");

  // Character classes
  assert(rematch("[abc].js", "a.js"), "Character class match");
  assert(rematch("[a-z].js", "x.js"), "Character range match");
  assert(rematch("[!a-z].js", "9.js"), "Negated character class match");
  assert(!rematch("[a-z].js", "9.js"), "Character range non-match");

  // Brace expansion
  assert(rematch("file.{js,ts}", "file.js"), "Brace alternation match");
  assert(rematch("file.{js,ts}", "file.ts"), "Brace alternation second match");
  assert(!rematch("file.{js,ts}", "file.css"), "Brace alternation non-match");

  // Numeric ranges
  assert(rematch("file{1..3}.js", "file1.js"), "Numeric range match start");
  assert(rematch("file{1..3}.js", "file2.js"), "Numeric range match middle");
  assert(rematch("file{1..3}.js", "file3.js"), "Numeric range match end");
  assert(!rematch("file{1..3}.js", "file4.js"), "Numeric range non-match");
  assert(rematch("file{01..03}.js", "file01.js"), "Padded numeric range match");

  // Alphabetic ranges
  assert(rematch("file{a..c}.js", "filea.js"), "Alpha range match start");
  assert(rematch("file{a..c}.js", "fileb.js"), "Alpha range match middle");
  assert(!rematch("file{a..c}.js", "filed.js"), "Alpha range non-match");
  assert(rematch("file{A..C}.js", "fileB.js"), "Uppercase alpha range match");

  // Question mark
  assert(rematch("?.js", "a.js"), "Question mark match");
  assert(!rematch("?.js", "ab.js"), "Question mark non-match");

  // Negation
  assert(!rematch("!*.js", "file.js"), "Basic negation");
  assert(rematch("!*.js", "file.ts"), "Basic negation match non-pattern");
  assert(rematch("!!*.js", "file.js"), "Double negation");

  // Multiple patterns
  assert(
    rematch(["*.js", "*.ts"], "file.js"),
    "Multiple patterns - first match",
  );
  assert(
    rematch(["*.js", "*.ts"], "file.ts"),
    "Multiple patterns - second match",
  );
  assert(
    !rematch(["*.js", "*.ts"], "file.css"),
    "Multiple patterns - no match",
  );
  assert(
    !rematch(["*.js", "!file.js"], "file.js"),
    "Multiple patterns with negation",
  );

  // Utility functions
  assert(isStatic("file.js"), "Static pattern detection - literal");
  assert(!isStatic("*.js"), "Static pattern detection - wildcard");
  assert(
    escapeGlob("file[1].js") === "file\\[1\\].js",
    "Escape glob characters",
  );
  assert(
    unescapeGlob("file\\[1\\].js") === "file[1].js",
    "Unescape glob characters",
  );

  // Pattern splitting
  const { static: staticParts, dynamic: dynamicParts } = explode("src/*.js");
  assert(staticParts[0] === "src/", "Explode static part");
  assert(dynamicParts[0] === "*.js", "Explode dynamic part");

  // Compiled patterns
  const matcher = compile("**/*.{js,ts}");
  assert(matcher("src/file.js"), "Compiled pattern - js match");
  assert(matcher("deep/nested/file.ts"), "Compiled pattern - ts match");
  assert(!matcher("file.css"), "Compiled pattern - non-match");

  // RegExp access
  const regex = makeRegex("*.js");
  assert(regex instanceof RegExp, "RegExp creation");
  assert(regex.test("file.js"), "Direct RegExp usage");

  console.log("\n✨ All tests completed!");
}

main();
