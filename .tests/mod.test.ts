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

      expect(isMatch(["*.md", "*.js"], "foo.md")).toBe(true);
      expect(isMatch(["*.md", "*.js"], "foo.js")).toBe(true);
      expect(isMatch(["*.md", "*.js"], "foo.txt")).toBe(false);

      expect(isMatch("*/**foo", "foo/bar/foo")).toBe(false);
      expect(isMatch("*/**foo", "foo/barfoo")).toBe(true);

      expect(isMatch("*/**foo", "foo\\bar\\foo")).toBe(false);
      expect(isMatch("*/**foo", "foo\\barfoo")).toBe(true);

      expect(isMatch("*.js", "abcd")).toBe(false);
      expect(isMatch("*.js", "a.js")).toBe(true);
      expect(isMatch("*.js", "a.md")).toBe(false);
      expect(isMatch("*.js", "a/b.js")).toBe(false);

      expect(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "aaa")).toBe(true);
      expect(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "aab")).toBe(true);
      expect(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "aba")).toBe(true);
      expect(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "abb")).toBe(true);
      expect(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "baa")).toBe(true);
      expect(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "bab")).toBe(true);
      expect(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "bba")).toBe(true);
      expect(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "bbb")).toBe(true);
      expect(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "a")).toBe(false);
      expect(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "b")).toBe(false);
      expect(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "aa")).toBe(false);
      expect(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "bb")).toBe(false);
    });

    test("native_range", () => {
      // Numeric

      expect(isMatch("{1..20}", "1")).toBe(true);
      expect(isMatch("{1..20}", "10")).toBe(true);
      expect(isMatch("{1..20}", "20")).toBe(true);

      expect(isMatch("{20..1}", "1")).toBe(true);
      expect(isMatch("{20..1}", "10")).toBe(true);
      expect(isMatch("{20..1}", "20")).toBe(true);

      expect(isMatch("{1..20}", "0")).toBe(false);
      expect(isMatch("{1..20}", "22")).toBe(false);

      expect(isMatch("{20..1}", "0")).toBe(false);
      expect(isMatch("{20..1}", "22")).toBe(false);

      // Numeric padded

      expect(isMatch("{01..20}", "01")).toBe(true);
      expect(isMatch("{01..20}", "10")).toBe(true);
      expect(isMatch("{01..20}", "20")).toBe(true);

      expect(isMatch("{20..01}", "01")).toBe(true);
      expect(isMatch("{20..01}", "10")).toBe(true);
      expect(isMatch("{20..01}", "20")).toBe(true);

      expect(isMatch("{01..20}", "00")).toBe(false);
      expect(isMatch("{01..20}", "1")).toBe(false);
      expect(isMatch("{01..20}", "22")).toBe(false);

      expect(isMatch("{20..01}", "00")).toBe(false);
      expect(isMatch("{20..01}", "1")).toBe(false);
      expect(isMatch("{20..01}", "22")).toBe(false);

      // Alphabetic

      expect(isMatch("{a..zz}", "a")).toBe(true);
      expect(isMatch("{a..zz}", "bb")).toBe(true);
      expect(isMatch("{a..zz}", "za")).toBe(true);

      expect(isMatch("{zz..a}", "a")).toBe(true);
      expect(isMatch("{zz..a}", "bb")).toBe(true);
      expect(isMatch("{zz..a}", "za")).toBe(true);

      expect(isMatch("{a..zz}", "aaa")).toBe(false);
      expect(isMatch("{a..zz}", "A")).toBe(false);

      expect(isMatch("{zz..a}", "aaa")).toBe(false);
      expect(isMatch("{zz..a}", "A")).toBe(false);

      // Alphabetic uppercase

      expect(isMatch("{A..ZZ}", "A")).toBe(true);
      expect(isMatch("{A..ZZ}", "BB")).toBe(true);
      expect(isMatch("{A..ZZ}", "ZA")).toBe(true);

      expect(isMatch("{ZZ..A}", "A")).toBe(true);
      expect(isMatch("{ZZ..A}", "BB")).toBe(true);
      expect(isMatch("{ZZ..A}", "ZA")).toBe(true);

      expect(isMatch("{A..ZZ}", "AAA")).toBe(false);
      expect(isMatch("{A..ZZ}", "a")).toBe(false);

      expect(isMatch("{ZZ..A}", "AAA")).toBe(false);
      expect(isMatch("{ZZ..A}", "a")).toBe(false);
    });

    test("multiple_patterns", () => {
      expect(isMatch([".", "foo"], ".")).toBe(true);
      expect(isMatch(["a", "foo"], "a")).toBe(true);
      expect(isMatch(["*", "foo", "bar"], "ab")).toBe(true);
      expect(isMatch(["*b", "foo", "bar"], "ab")).toBe(true);
      expect(isMatch(["./*", "foo", "bar"], "ab")).toBe(false);
      expect(isMatch(["a*", "foo", "bar"], "ab")).toBe(true);
      expect(isMatch(["ab", "foo"], "ab")).toBe(true);

      expect(isMatch(["/a", "foo"], "/ab")).toBe(false);
      expect(isMatch(["?/?", "foo", "bar"], "/ab")).toBe(false);
      expect(isMatch(["a/*", "foo", "bar"], "/ab")).toBe(false);
      expect(isMatch(["a/b", "foo"], "a/b/c")).toBe(false);
      expect(isMatch(["*/*", "foo", "bar"], "ab")).toBe(false);
      expect(isMatch(["/a", "foo", "bar"], "ab")).toBe(false);
      expect(isMatch(["a", "foo"], "ab")).toBe(false);
      expect(isMatch(["b", "foo"], "ab")).toBe(false);
      expect(isMatch(["c", "foo", "bar"], "ab")).toBe(false);
      expect(isMatch(["ab", "foo"], "abcd")).toBe(false);
      expect(isMatch(["bc", "foo"], "abcd")).toBe(false);
      expect(isMatch(["c", "foo"], "abcd")).toBe(false);
      expect(isMatch(["cd", "foo"], "abcd")).toBe(false);
      expect(isMatch(["d", "foo"], "abcd")).toBe(false);
      expect(isMatch(["f", "foo", "bar"], "abcd")).toBe(false);
      expect(isMatch(["/*", "foo", "bar"], "ef")).toBe(false);
    });

    test("file_extensions", () => {
      expect(isMatch("*.md", ".c.md")).toBe(true);
      expect(isMatch(".c.", ".c.md")).toBe(false);
      expect(isMatch(".md", ".c.md")).toBe(false);
      expect(isMatch("*.md", ".md")).toBe(true);
      expect(isMatch(".m", ".md")).toBe(false);
      expect(isMatch("*.md", "a/b/c.md")).toBe(false);
      expect(isMatch(".md", "a/b/c.md")).toBe(false);
      expect(isMatch("a/*.md", "a/b/c.md")).toBe(false);
      expect(isMatch("*.md", "a/b/c/c.md")).toBe(false);
      expect(isMatch("c.js", "a/b/c/c.md")).toBe(false);
      expect(isMatch(".*.md", ".c.md")).toBe(true);
      expect(isMatch(".md", ".md")).toBe(true);
      expect(isMatch("a/**/*.*", "a/b/c.js")).toBe(true);
      expect(isMatch("**/*.md", "a/b/c.md")).toBe(true);
      expect(isMatch("a/*/*.md", "a/b/c.md")).toBe(true);
      expect(isMatch("*.md", "c.md")).toBe(true);
    });

    test("dot_files", () => {
      expect(isMatch(".*.md", "a/b/c/.xyz.md")).toBe(false);
      expect(isMatch("*.md", ".c.md")).toBe(true);
      expect(isMatch(".*", ".c.md")).toBe(true);
      expect(isMatch("**/*.md", "a/b/c/.xyz.md")).toBe(true);
      expect(isMatch("**/.*.md", "a/b/c/.xyz.md")).toBe(true);
      expect(isMatch("a/b/c/*.md", "a/b/c/.xyz.md")).toBe(true);
      expect(isMatch("a/b/c/.*.md", "a/b/c/.xyz.md")).toBe(true);
    });

    test("matching", () => {
      expect(isMatch("a+b/src/*.js", "a+b/src/glimini.js")).toBe(true);
      expect(isMatch("+b/src/*.js", "+b/src/glimini.js")).toBe(true);
      expect(isMatch("coffee+/src/*.js", "coffee+/src/glimini.js")).toBe(true);
      expect(isMatch("coffee+/src/*", "coffee+/src/glimini.js")).toBe(true);

      expect(isMatch(".", ".")).toBe(true);
      expect(isMatch("/a", "/a")).toBe(true);
      expect(isMatch("/a", "/ab")).toBe(false);
      expect(isMatch("a", "a")).toBe(true);
      expect(isMatch("/a", "ab")).toBe(false);
      expect(isMatch("a", "ab")).toBe(false);
      expect(isMatch("ab", "ab")).toBe(true);
      expect(isMatch("cd", "abcd")).toBe(false);
      expect(isMatch("bc", "abcd")).toBe(false);
      expect(isMatch("ab", "abcd")).toBe(false);

      expect(isMatch("a.b", "a.b")).toBe(true);
      expect(isMatch("*.b", "a.b")).toBe(true);
      expect(isMatch("a.*", "a.b")).toBe(true);
      expect(isMatch("*.*", "a.b")).toBe(true);
      expect(isMatch("a*.c*", "a-b.c-d")).toBe(true);
      expect(isMatch("*b.*d", "a-b.c-d")).toBe(true);
      expect(isMatch("*.*", "a-b.c-d")).toBe(true);
      expect(isMatch("*.*-*", "a-b.c-d")).toBe(true);
      expect(isMatch("*-*.*-*", "a-b.c-d")).toBe(true);
      expect(isMatch("*.c-*", "a-b.c-d")).toBe(true);
      expect(isMatch("*.*-d", "a-b.c-d")).toBe(true);
      expect(isMatch("a-*.*-d", "a-b.c-d")).toBe(true);
      expect(isMatch("*-b.c-*", "a-b.c-d")).toBe(true);
      expect(isMatch("*-b*c-*", "a-b.c-d")).toBe(true);
      expect(isMatch("*-bc-*", "a-b.c-d")).toBe(false);

      expect(isMatch("./*/", "/ab")).toBe(false);
      expect(isMatch("*", "/ef")).toBe(false);
      expect(isMatch("./*/", "ab")).toBe(false);
      expect(isMatch("/*", "ef")).toBe(false);
      expect(isMatch("/*", "/ab")).toBe(true);
      expect(isMatch("/*", "/cd")).toBe(true);
      expect(isMatch("*", "ab")).toBe(true);
      expect(isMatch("./*", "ab")).toBe(false);
      expect(isMatch("ab", "ab")).toBe(true);
      expect(isMatch("./*/", "ab/")).toBe(false);

      expect(isMatch("*.js", "a/b/c/z.js")).toBe(false);
      expect(isMatch("*.js", "a/b/z.js")).toBe(false);
      expect(isMatch("*.js", "a/z.js")).toBe(false);
      expect(isMatch("*.js", "z.js")).toBe(true);

      expect(isMatch("z*.js", "z.js")).toBe(true);
      expect(isMatch("a/z*.js", "a/z.js")).toBe(true);
      expect(isMatch("*/z*.js", "a/z.js")).toBe(true);

      expect(isMatch("**/*.js", "a/b/c/z.js")).toBe(true);
      expect(isMatch("**/*.js", "a/b/z.js")).toBe(true);
      expect(isMatch("**/*.js", "a/z.js")).toBe(true);
      expect(isMatch("a/b/**/*.js", "a/b/c/d/e/z.js")).toBe(true);
      expect(isMatch("a/b/**/*.js", "a/b/c/d/z.js")).toBe(true);
      expect(isMatch("a/b/c/**/*.js", "a/b/c/z.js")).toBe(true);
      expect(isMatch("a/b/c**/*.js", "a/b/c/z.js")).toBe(true);
      expect(isMatch("a/b/**/*.js", "a/b/c/z.js")).toBe(true);
      expect(isMatch("a/b/**/*.js", "a/b/z.js")).toBe(true);

      expect(isMatch("a/b/**/*.js", "a/z.js")).toBe(false);
      expect(isMatch("a/b/**/*.js", "z.js")).toBe(false);

      expect(isMatch("z*", "z.js")).toBe(true);
      expect(isMatch("**/z*", "z.js")).toBe(true);
      expect(isMatch("**/z*.js", "z.js")).toBe(true);
      expect(isMatch("**/*.js", "z.js")).toBe(true);
      expect(isMatch("**/foo", "foo")).toBe(true);

      expect(isMatch("z*.js", "zzjs")).toBe(false);
      expect(isMatch("*z.js", "zzjs")).toBe(false);

      expect(isMatch("a/b/**/f", "a/b/c/d/")).toBe(false);
      expect(isMatch("a/**", "a")).toBe(true);
      expect(isMatch("**", "a")).toBe(true);
      expect(isMatch("**", "a/")).toBe(true);
      expect(isMatch("a/b-*/**/z.js", "a/b-c/d/e/z.js")).toBe(true);
      expect(isMatch("a/b-*/**/z.js", "a/b-c/z.js")).toBe(true);
      expect(isMatch("**", "a/b/c/d")).toBe(true);
      expect(isMatch("**", "a/b/c/d/")).toBe(true);
      expect(isMatch("**/**", "a/b/c/d/")).toBe(true);
      expect(isMatch("**/b/**", "a/b/c/d/")).toBe(true);
      expect(isMatch("a/b/**", "a/b/c/d/")).toBe(true);
      expect(isMatch("a/b/**/", "a/b/c/d/")).toBe(true);
      expect(isMatch("a/b/**/c/**/", "a/b/c/d/")).toBe(true);
      expect(isMatch("a/b/**/c/**/d/", "a/b/c/d/")).toBe(true);
      expect(isMatch("a/b/**/**/*.*", "a/b/c/d/e.f")).toBe(true);
      expect(isMatch("a/b/**/*.*", "a/b/c/d/e.f")).toBe(true);
      expect(isMatch("a/b/**/c/**/d/*.*", "a/b/c/d/e.f")).toBe(true);
      expect(isMatch("a/b/**/d/**/*.*", "a/b/c/d/e.f")).toBe(true);
      expect(isMatch("a/b/**/d/**/*.*", "a/b/c/d/g/e.f")).toBe(true);
      expect(isMatch("a/b/**/d/**/*.*", "a/b/c/d/g/g/e.f")).toBe(true);

      expect(isMatch("*/foo", "bar/baz/foo")).toBe(false);
      expect(isMatch("**/bar/*", "deep/foo/bar")).toBe(false);
      expect(isMatch("*/bar/**", "deep/foo/bar/baz/x")).toBe(false);
      expect(isMatch("foo?bar", "foo/bar")).toBe(false);
      expect(isMatch("**/bar*", "foo/bar/baz")).toBe(false);
      expect(isMatch("**/bar**", "foo/bar/baz")).toBe(false);
      expect(isMatch("foo**bar", "foo/baz/bar")).toBe(false);
      expect(isMatch("foo*bar", "foo/baz/bar")).toBe(false);
      expect(isMatch("**/bar/*/", "deep/foo/bar/baz")).toBe(false);
      expect(isMatch("**/bar/*", "deep/foo/bar/baz/")).toBe(true);
      expect(isMatch("**/bar/*", "deep/foo/bar/baz")).toBe(true);
      expect(isMatch("foo/**", "foo")).toBe(true);
      expect(isMatch("**/bar/*{,/}", "deep/foo/bar/baz/")).toBe(true);
      expect(isMatch("a/**/j/**/z/*.md", "a/b/j/c/z/x.md")).toBe(true);
      expect(isMatch("a/**/j/**/z/*.md", "a/j/z/x.md")).toBe(true);
      expect(isMatch("**/foo", "bar/baz/foo")).toBe(true);
      expect(isMatch("**/bar/**", "deep/foo/bar/")).toBe(true);
      expect(isMatch("**/bar/*", "deep/foo/bar/baz")).toBe(true);
      expect(isMatch("**/bar/*/", "deep/foo/bar/baz/")).toBe(true);
      expect(isMatch("**/bar/**", "deep/foo/bar/baz/")).toBe(true);
      expect(isMatch("**/bar/*/*", "deep/foo/bar/baz/x")).toBe(true);
      expect(isMatch("foo/**/**/bar", "foo/b/a/z/bar")).toBe(true);
      expect(isMatch("foo/**/bar", "foo/b/a/z/bar")).toBe(true);
      expect(isMatch("foo/**/**/bar", "foo/bar")).toBe(true);
      expect(isMatch("foo/**/bar", "foo/bar")).toBe(true);
      expect(isMatch("foo[/]bar", "foo/bar")).toBe(true);
      expect(isMatch("*/bar/**", "foo/bar/baz/x")).toBe(true);
      expect(isMatch("foo/**/**/bar", "foo/baz/bar")).toBe(true);
      expect(isMatch("foo/**/bar", "foo/baz/bar")).toBe(true);
      expect(isMatch("foo**bar", "foobazbar")).toBe(true);
      expect(isMatch("**/foo", "XXX/foo")).toBe(true);

      expect(isMatch("foo//baz.md", "foo//baz.md")).toBe(true);
      expect(isMatch("foo//*baz.md", "foo//baz.md")).toBe(true);
      expect(isMatch("foo{/,//}baz.md", "foo//baz.md")).toBe(true);
      expect(isMatch("foo{/,//}baz.md", "foo/baz.md")).toBe(true);
      expect(isMatch("foo/+baz.md", "foo//baz.md")).toBe(false);
      expect(isMatch("foo//+baz.md", "foo//baz.md")).toBe(false);
      expect(isMatch("foo/baz.md", "foo//baz.md")).toBe(false);
      expect(isMatch("foo//baz.md", "foo/baz.md")).toBe(false);

      expect(isMatch("aaa?bbb", "aaa/bbb")).toBe(false);

      expect(isMatch("*.md", ".c.md")).toBe(true);
      expect(isMatch("*.md", "a/.c.md")).toBe(false);
      expect(isMatch("a/.c.md", "a/.c.md")).toBe(true);
      expect(isMatch("*.md", ".a")).toBe(false);
      expect(isMatch("*.md", ".verb.txt")).toBe(false);
      expect(isMatch("a/b/c/.*.md", "a/b/c/.xyz.md")).toBe(true);
      expect(isMatch(".md", ".md")).toBe(true);
      expect(isMatch(".md", ".txt")).toBe(false);
      expect(isMatch(".md", ".md")).toBe(true);
      expect(isMatch(".a", ".a")).toBe(true);
      expect(isMatch(".b*", ".b")).toBe(true);
      expect(isMatch(".a*", ".ab")).toBe(true);
      expect(isMatch(".*", ".ab")).toBe(true);
      expect(isMatch("*.*", ".ab")).toBe(true);
      expect(isMatch("a/b/c/*.md", ".md")).toBe(false);
      expect(isMatch("a/b/c/*.md", ".a.md")).toBe(false);
      expect(isMatch("a/b/c/*.md", "a/b/c/d.a.md")).toBe(true);
      expect(isMatch("a/b/c/*.md", "a/b/d/.md")).toBe(false);

      expect(isMatch("*.md", ".c.md")).toBe(true);
      expect(isMatch(".*", ".c.md")).toBe(true);
      expect(isMatch("a/b/c/*.md", "a/b/c/.xyz.md")).toBe(true);
      expect(isMatch("a/b/c/.*.md", "a/b/c/.xyz.md")).toBe(true);
    });

    test("brackets", () => {
      expect(isMatch("foo[/]bar", "foo/bar")).toBe(true);
      expect(isMatch("foo[/]bar[/]", "foo/bar/")).toBe(true);
      expect(isMatch("foo[/]bar[/]baz", "foo/bar/baz")).toBe(true);
    });

    test("ranges", () => {
      expect(isMatch("a/{a..c}", "a/c")).toBe(true);
      expect(isMatch("a/{a..c}", "a/z")).toBe(false);
      expect(isMatch("a/{1..100}", "a/99")).toBe(true);
      expect(isMatch("a/{1..100}", "a/101")).toBe(false);
      expect(isMatch("a/{01..10}", "a/02")).toBe(true);
      expect(isMatch("a/{01..10}", "a/2")).toBe(false);
    });

    test("exploits", () => {
      expect(isMatch(`${"\\".repeat(65500)}A`, "\\A")); // This matches in picomatch, but why though.toBe(false)?
      expect(isMatch(`!${"\\".repeat(65500)}A`, "A")).toBe(true);
      expect(isMatch(`!(${"\\".repeat(65500)}A)`, "A")).toBe(true);
      expect(isMatch(`[!(${"\\".repeat(65500)}A`, "A")).toBe(false);
    });

    test("wildmat", () => {
      expect(isMatch("*f", "foo")).toBe(false);
      expect(isMatch("??", "foo")).toBe(false);
      expect(isMatch("bar", "foo")).toBe(false);
      expect(isMatch("foo\\*bar", "foobar")).toBe(false);
      expect(isMatch("\\??\\?b", "?a?b")).toBe(true);
      expect(isMatch("*ab", "aaaaaaabababab")).toBe(true);
      expect(isMatch("*", "foo")).toBe(true);
      expect(isMatch("*foo*", "foo")).toBe(true);
      expect(isMatch("???", "foo")).toBe(true);
      expect(isMatch("f*", "foo")).toBe(true);
      expect(isMatch("foo", "foo")).toBe(true);
      expect(isMatch("*ob*a*r*", "foobar")).toBe(true);

      expect(
        isMatch(
          "-*-*-*-*-*-*-12-*-*-*-m-*-*-*",
          "-adobe-courier-bold-o-normal--12-120-75-75-/-70-iso8859-1",
        ),
      ).toBe(false);
      expect(
        isMatch(
          "-*-*-*-*-*-*-12-*-*-*-m-*-*-*",
          "-adobe-courier-bold-o-normal--12-120-75-75-X-70-iso8859-1",
        ),
      ).toBe(false);
      expect(isMatch("*X*i", "ab/cXd/efXg/hi")).toBe(false);
      expect(isMatch("*Xg*i", "ab/cXd/efXg/hi")).toBe(false);
      expect(
        isMatch(
          "**/*a*b*g*n*t",
          "abcd/abcdefg/abcdefghijk/abcdefghijklmnop.txtz",
        ),
      ).toBe(false);
      expect(isMatch("*/*/*", "foo")).toBe(false);
      expect(isMatch("fo", "foo")).toBe(false);
      expect(isMatch("*/*/*", "foo/bar")).toBe(false);
      expect(isMatch("foo?bar", "foo/bar")).toBe(false);
      expect(isMatch("*/*/*", "foo/bb/aa/rr")).toBe(false);
      expect(isMatch("foo*", "foo/bba/arr")).toBe(false);
      expect(isMatch("foo**", "foo/bba/arr")).toBe(false);
      expect(isMatch("foo/*", "foo/bba/arr")).toBe(false);
      expect(isMatch("foo/**arr", "foo/bba/arr")).toBe(false);
      expect(isMatch("foo/**z", "foo/bba/arr")).toBe(false);
      expect(isMatch("foo/*arr", "foo/bba/arr")).toBe(false);
      expect(isMatch("foo/*z", "foo/bba/arr")).toBe(false);
      expect(
        isMatch(
          "XXX/*/*/*/*/*/*/12/*/*/*/m/*/*/*",
          "XXX/adobe/courier/bold/o/normal//12/120/75/75/X/70/iso8859/1",
        ),
      ).toBe(false);
      expect(
        isMatch(
          "-*-*-*-*-*-*-12-*-*-*-m-*-*-*",
          "-adobe-courier-bold-o-normal--12-120-75-75-m-70-iso8859-1",
        ),
      ).toBe(true);
      expect(isMatch("**/*X*/**/*i", "ab/cXd/efXg/hi")).toBe(true);
      expect(isMatch("*/*X*/*/*i", "ab/cXd/efXg/hi")).toBe(true);
      expect(
        isMatch(
          "**/*a*b*g*n*t",
          "abcd/abcdefg/abcdefghijk/abcdefghijklmnop.txt",
        ),
      ).toBe(true);
      expect(isMatch("*X*i", "abcXdefXghi")).toBe(true);
      expect(isMatch("foo", "foo")).toBe(true);
      expect(isMatch("foo/*", "foo/bar")).toBe(true);
      expect(isMatch("foo/bar", "foo/bar")).toBe(true);
      expect(isMatch("foo[/]bar", "foo/bar")).toBe(true);
      expect(isMatch("**/**/**", "foo/bb/aa/rr")).toBe(true);
      expect(isMatch("*/*/*", "foo/bba/arr")).toBe(true);
      expect(isMatch("foo/**", "foo/bba/arr")).toBe(true);
    });

    test.skip("posix_classes", () => {
      expect(isMatch("[[:xdigit:]]", "e")).toBe(true);

      expect(isMatch("[[:alpha:]123]", "a")).toBe(true);
      expect(isMatch("[[:alpha:]123]", "1")).toBe(true);
      expect(isMatch("[[:alpha:]123]", "5")).toBe(false);
      expect(isMatch("[[:alpha:]123]", "A")).toBe(true);

      expect(isMatch("[[:alpha:]]", "A")).toBe(true);
      expect(isMatch("[[:alpha:]]", "9")).toBe(false);
      expect(isMatch("[[:alpha:]]", "b")).toBe(true);

      expect(isMatch("[![:alpha:]]", "A")).toBe(false);
      expect(isMatch("[![:alpha:]]", "9")).toBe(true);
      expect(isMatch("[![:alpha:]]", "b")).toBe(false);

      expect(isMatch("[^[:alpha:]]", "A")).toBe(false);
      expect(isMatch("[^[:alpha:]]", "9")).toBe(true);
      expect(isMatch("[^[:alpha:]]", "b")).toBe(false);

      expect(isMatch("[[:digit:]]", "A")).toBe(false);
      expect(isMatch("[[:digit:]]", "9")).toBe(true);
      expect(isMatch("[[:digit:]]", "b")).toBe(false);

      expect(isMatch("[^[:digit:]]", "A")).toBe(true);
      expect(isMatch("[^[:digit:]]", "9")).toBe(false);
      expect(isMatch("[^[:digit:]]", "b")).toBe(true);

      expect(isMatch("[![:digit:]]", "A")).toBe(true);
      expect(isMatch("[![:digit:]]", "9")).toBe(false);
      expect(isMatch("[![:digit:]]", "b")).toBe(true);

      expect(isMatch("[[:lower:]]", "a")).toBe(true);
      expect(isMatch("[[:lower:]]", "A")).toBe(false);
      expect(isMatch("[[:lower:]]", "9")).toBe(false);

      expect(isMatch("[:alpha:]", "a")).toBe(true);
      expect(isMatch("[:alpha:]", "l")).toBe(true);
      expect(isMatch("[:alpha:]", "p")).toBe(true);
      expect(isMatch("[:alpha:]", "h")).toBe(true);
      expect(isMatch("[:alpha:]", ":")).toBe(true);
      expect(isMatch("[:alpha:]", "b")).toBe(false);

      expect(isMatch("[[:lower:][:digit:]]", "9")).toBe(true);
      expect(isMatch("[[:lower:][:digit:]]", "a")).toBe(true);
      expect(isMatch("[[:lower:][:digit:]]", "A")).toBe(false);
      expect(isMatch("[[:lower:][:digit:]]", "aa")).toBe(false);
      expect(isMatch("[[:lower:][:digit:]]", "99")).toBe(false);
      expect(isMatch("[[:lower:][:digit:]]", "a9")).toBe(false);
      expect(isMatch("[[:lower:][:digit:]]", "9a")).toBe(false);
      expect(isMatch("[[:lower:][:digit:]]", "aA")).toBe(false);
      expect(isMatch("[[:lower:][:digit:]]", "9A")).toBe(false);
      expect(isMatch("[[:lower:][:digit:]]+", "aa")).toBe(true);
      expect(isMatch("[[:lower:][:digit:]]+", "99")).toBe(true);
      expect(isMatch("[[:lower:][:digit:]]+", "a9")).toBe(true);
      expect(isMatch("[[:lower:][:digit:]]+", "9a")).toBe(true);
      expect(isMatch("[[:lower:][:digit:]]+", "aA")).toBe(false);
      expect(isMatch("[[:lower:][:digit:]]+", "9A")).toBe(false);
      expect(isMatch("[[:lower:][:digit:]]*", "a")).toBe(true);
      expect(isMatch("[[:lower:][:digit:]]*", "A")).toBe(false);
      expect(isMatch("[[:lower:][:digit:]]*", "AA")).toBe(false);
      expect(isMatch("[[:lower:][:digit:]]*", "aa")).toBe(true);
      expect(isMatch("[[:lower:][:digit:]]*", "aaa")).toBe(true);
      expect(isMatch("[[:lower:][:digit:]]*", "999")).toBe(true);

      expect(isMatch("a[[:word:]]+c", "a c")).toBe(false);
      expect(isMatch("a[[:word:]]+c", "a.c")).toBe(false);
      expect(isMatch("a[[:word:]]+c", "a.xy.zc")).toBe(false);
      expect(isMatch("a[[:word:]]+c", "a.zc")).toBe(false);
      expect(isMatch("a[[:word:]]+c", "abq")).toBe(false);
      expect(isMatch("a[[:word:]]+c", "axy zc")).toBe(false);
      expect(isMatch("a[[:word:]]+c", "axy")).toBe(false);
      expect(isMatch("a[[:word:]]+c", "axy.zc")).toBe(false);
      expect(isMatch("a[[:word:]]+c", "a123c")).toBe(true);
      expect(isMatch("a[[:word:]]+c", "a1c")).toBe(true);
      expect(isMatch("a[[:word:]]+c", "abbbbc")).toBe(true);
      expect(isMatch("a[[:word:]]+c", "abbbc")).toBe(true);
      expect(isMatch("a[[:word:]]+c", "abbc")).toBe(true);
      expect(isMatch("a[[:word:]]+c", "abc")).toBe(true);

      expect(isMatch("a[[:word:]]+", "a c")).toBe(false);
      expect(isMatch("a[[:word:]]+", "a.c")).toBe(false);
      expect(isMatch("a[[:word:]]+", "a.xy.zc")).toBe(false);
      expect(isMatch("a[[:word:]]+", "a.zc")).toBe(false);
      expect(isMatch("a[[:word:]]+", "axy zc")).toBe(false);
      expect(isMatch("a[[:word:]]+", "axy.zc")).toBe(false);
      expect(isMatch("a[[:word:]]+", "a123c")).toBe(true);
      expect(isMatch("a[[:word:]]+", "a1c")).toBe(true);
      expect(isMatch("a[[:word:]]+", "abbbbc")).toBe(true);
      expect(isMatch("a[[:word:]]+", "abbbc")).toBe(true);
      expect(isMatch("a[[:word:]]+", "abbc")).toBe(true);
      expect(isMatch("a[[:word:]]+", "abc")).toBe(true);
      expect(isMatch("a[[:word:]]+", "abq")).toBe(true);
      expect(isMatch("a[[:word:]]+", "axy")).toBe(true);
      expect(isMatch("a[[:word:]]+", "axyzc")).toBe(true);
      expect(isMatch("a[[:word:]]+", "axyzc")).toBe(true);

      expect(isMatch("[[:lower:]]", "a")).toBe(true);
      expect(isMatch("[[:upper:]]", "A")).toBe(true);
      expect(isMatch("[[:digit:][:upper:][:space:]]", "A")).toBe(true);
      expect(isMatch("[[:digit:][:upper:][:space:]]", "1")).toBe(true);
      expect(isMatch("[[:digit:][:upper:][:space:]]", " ")).toBe(true);
      expect(isMatch("[[:xdigit:]]", "5")).toBe(true);
      expect(isMatch("[[:xdigit:]]", "f")).toBe(true);
      expect(isMatch("[[:xdigit:]]", "D")).toBe(true);
      expect(
        isMatch(
          "[[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:graph:][:lower:][:print:][:punct:][:space:][:upper:][:xdigit:]]",
          "_",
        ),
      ).toBe(true);
      expect(
        isMatch(
          "[[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:graph:][:lower:][:print:][:punct:][:space:][:upper:][:xdigit:]]",
          "_",
        ),
      ).toBe(true);
      expect(
        isMatch(
          "[^[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:lower:][:space:][:upper:][:xdigit:]]",
          ".",
        ),
      ).toBe(true);
      expect(isMatch("[a-c[:digit:]x-z]", "5")).toBe(true);
      expect(isMatch("[a-c[:digit:]x-z]", "b")).toBe(true);
      expect(isMatch("[a-c[:digit:]x-z]", "y")).toBe(true);

      expect(isMatch("[[:lower:]]", "A")).toBe(false);
      expect(isMatch("[![:lower:]]", "A")).toBe(true);
      expect(isMatch("[[:upper:]]", "a")).toBe(false);
      expect(isMatch("[[:digit:][:upper:][:space:]]", "a")).toBe(false);
      expect(isMatch("[[:digit:][:upper:][:space:]]", ".")).toBe(false);
      expect(
        isMatch(
          "[[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:lower:][:space:][:upper:][:xdigit:]]",
          ".",
        ),
      ).toBe(false);
      expect(isMatch("[a-c[:digit:]x-z]", "q")).toBe(false);

      expect(isMatch("a [b]", "a [b]")).toBe(true);
      expect(isMatch("a [b]", "a b")).toBe(true);

      expect(isMatch("a [b] c", "a [b] c")).toBe(true);
      expect(isMatch("a [b] c", "a b c")).toBe(true);

      expect(isMatch("a \\[b\\]", "a [b]")).toBe(true);
      expect(isMatch("a \\[b\\]", "a b")).toBe(false);

      expect(isMatch("a ([b])", "a [b]")).toBe(true);
      expect(isMatch("a ([b])", "a b")).toBe(true);

      expect(isMatch("a (\\[b\\]|[b])", "a b")).toBe(true);
      expect(isMatch("a (\\[b\\]|[b])", "a [b]")).toBe(true);

      expect(isMatch("[[:xdigit:]]", "e")).toBe(true);
      expect(isMatch("[[:xdigit:]]", "1")).toBe(true);
      expect(isMatch("[[:alpha:]123]", "a")).toBe(true);
      expect(isMatch("[[:alpha:]123]", "1")).toBe(true);

      expect(isMatch("[![:alpha:]]", "9")).toBe(true);
      expect(isMatch("[^[:alpha:]]", "9")).toBe(true);

      expect(isMatch("[[:word:]]", "A")).toBe(true);
      expect(isMatch("[[:word:]]", "B")).toBe(true);
      expect(isMatch("[[:word:]]", "a")).toBe(true);
      expect(isMatch("[[:word:]]", "b")).toBe(true);

      expect(isMatch("[[:word:]]", "1")).toBe(true);
      expect(isMatch("[[:word:]]", "2")).toBe(true);

      expect(isMatch("[[:digit:]]", "1")).toBe(true);
      expect(isMatch("[[:digit:]]", "2")).toBe(true);

      expect(isMatch("[[:digit:]]", "a")).toBe(false);
      expect(isMatch("[[:digit:]]", "A")).toBe(false);

      expect(isMatch("[[:upper:]]", "A")).toBe(true);
      expect(isMatch("[[:upper:]]", "B")).toBe(true);

      expect(isMatch("[[:upper:]]", "a")).toBe(false);
      expect(isMatch("[[:upper:]]", "b")).toBe(false);

      expect(isMatch("[[:upper:]]", "1")).toBe(false);
      expect(isMatch("[[:upper:]]", "2")).toBe(false);

      expect(isMatch("[[:lower:]]", "a")).toBe(true);
      expect(isMatch("[[:lower:]]", "b")).toBe(true);

      expect(isMatch("[[:lower:]]", "A")).toBe(false);
      expect(isMatch("[[:lower:]]", "B")).toBe(false);

      expect(isMatch("[[:lower:]][[:upper:]]", "aA")).toBe(true);
      expect(isMatch("[[:lower:]][[:upper:]]", "AA")).toBe(false);
      expect(isMatch("[[:lower:]][[:upper:]]", "Aa")).toBe(false);

      expect(isMatch("[[:xdigit:]]*", "ababab")).toBe(true);
      expect(isMatch("[[:xdigit:]]*", "020202")).toBe(true);
      expect(isMatch("[[:xdigit:]]*", "900")).toBe(true);

      expect(isMatch("[[:punct:]]", "!")).toBe(true);
      expect(isMatch("[[:punct:]]", "?")).toBe(true);
      expect(isMatch("[[:punct:]]", "#")).toBe(true);
      expect(isMatch("[[:punct:]]", "&")).toBe(true);
      expect(isMatch("[[:punct:]]", "@")).toBe(true);
      expect(isMatch("[[:punct:]]", "+")).toBe(true);
      expect(isMatch("[[:punct:]]", "*")).toBe(true);
      expect(isMatch("[[:punct:]]", ":")).toBe(true);
      expect(isMatch("[[:punct:]]", "=")).toBe(true);
      expect(isMatch("[[:punct:]]", "|")).toBe(true);
      expect(isMatch("[[:punct:]]*", "|++")).toBe(true);

      expect(isMatch("[[:punct:]]", "?*+")).toBe(false);

      expect(isMatch("[[:punct:]]*", "?*+")).toBe(true);
      expect(isMatch("foo[[:punct:]]*", "foo")).toBe(true);
      expect(isMatch("foo[[:punct:]]*", "foo?*+")).toBe(true);

      expect(isMatch("[:al:]", "a")).toBe(true);
      expect(isMatch("[[:al:]", "a")).toBe(true);
      expect(isMatch("[abc[:punct:][0-9]", "!")).toBe(true);

      expect(isMatch("[_[:alpha:]]*", "PATH")).toBe(true);

      expect(isMatch("[_[:alpha:]][_[:alnum:]]*", "PATH")).toBe(true);

      expect(isMatch("[[:alpha:]][[:digit:]][[:upper:]]", "a1B")).toBe(true);
      expect(isMatch("[[:alpha:]][[:digit:]][[:upper:]]", "a1b")).toBe(false);
      expect(isMatch("[[:digit:][:punct:][:space:]]", ".")).toBe(true);
      expect(isMatch("[[:digit:][:punct:][:space:]]", "a")).toBe(false);
      expect(isMatch("[[:digit:][:punct:][:space:]]", "!")).toBe(true);
      expect(isMatch("[[:digit:]][[:punct:]][[:space:]]", "!")).toBe(false);
      expect(isMatch("[[:digit:]][[:punct:]][[:space:]]", "1! ")).toBe(true);
      expect(isMatch("[[:digit:]][[:punct:]][[:space:]]", "1!  ")).toBe(false);

      expect(isMatch("[[:digit:]]", "9")).toBe(true);
      expect(isMatch("[[:digit:]]", "X")).toBe(false);
      expect(isMatch("[[:lower:]][[:upper:]]", "aB")).toBe(true);
      expect(isMatch("[[:alpha:][:digit:]]", "a")).toBe(true);
      expect(isMatch("[[:alpha:][:digit:]]", "3")).toBe(true);
      expect(isMatch("[[:alpha:][:digit:]]", "aa")).toBe(false);
      expect(isMatch("[[:alpha:][:digit:]]", "a3")).toBe(false);
      expect(isMatch("[[:alpha:]\\]", "a")).toBe(false);
      expect(isMatch("[[:alpha:]\\]", "b")).toBe(false);

      expect(isMatch("[[:blank:]]", "\t")).toBe(true);
      expect(isMatch("[[:space:]]", "\t")).toBe(true);
      expect(isMatch("[[:space:]]", " ")).toBe(true);

      expect(isMatch("[[:ascii:]]", "\\377")).toBe(false);
      expect(isMatch("[1[:alpha:]123]", "9")).toBe(false);

      expect(isMatch("[[:punct:]]", " ")).toBe(false);

      expect(isMatch("[[:graph:]]", "A")).toBe(true);
      expect(isMatch("[[:graph:]]", "\\b")).toBe(false);
      expect(isMatch("[[:graph:]]", "\\n")).toBe(false);
      expect(isMatch("[[:graph:]]", "\\s")).toBe(false);
    });

    test.skip("extglobs", () => {
      expect(isMatch("c!(.)z", "cbz")).toBe(true);
      expect(isMatch("c!(*)z", "cbz")).toBe(false);
      expect(isMatch("c!(b*)z", "cccz")).toBe(true);
      expect(isMatch("c!(+)z", "cbz")).toBe(true);
      expect(isMatch("c!(?)z", "cbz")).toBe(true); // This matches in picomatch, but why though.toBe(false)?
      expect(isMatch("c!(@)z", "cbz")).toBe(true);

      expect(isMatch("c!(?:foo)?z", "c/z")).toBe(false);
      expect(isMatch("c!(?:foo)?z", "c!fooz")).toBe(true);
      expect(isMatch("c!(?:foo)?z", "c!z")).toBe(true);

      // expect ( isMatch ( '!(abc)', 'abc' ) ) . toBe(false);
      // expect ( isMatch ( '!(a)', 'a' ) ) . toBe(false);
      // expect ( isMatch ( '!(a)', 'aa' ) );
      // expect ( isMatch ( '!(a)', 'b' ) );

      expect(isMatch("a!(b)c", "aac")).toBe(true);
      expect(isMatch("a!(b)c", "abc")).toBe(false);
      expect(isMatch("a!(b)c", "acc")).toBe(true);
      expect(isMatch("a!(z)", "abz")).toBe(true);
      expect(isMatch("a!(z)", "az")).toBe(false);

      expect(isMatch("a!(.)", "a.")).toBe(false);
      expect(isMatch("!(.)a", ".a")).toBe(false);
      expect(isMatch("a!(.)c", "a.c")).toBe(false);
      expect(isMatch("a!(.)c", "abc")).toBe(true);

      expect(isMatch("/!(*.d).ts", "/file.d.ts")).toBe(false);
      expect(isMatch("/!(*.d).ts", "/file.ts")).toBe(true);
      expect(isMatch("/!(*.d).ts", "/file.something.ts")).toBe(true);
      // expect ( isMatch ( '/!(*.d).ts', '/file.d.something.ts' ) );
      // expect ( isMatch ( '/!(*.d).ts', '/file.dhello.ts' ) );

      // expect ( isMatch ( '**/!(*.d).ts', '/file.d.ts' ) ) . toBe(false);
      // expect ( isMatch ( '**/!(*.d).ts', '/file.ts' ) );
      // expect ( isMatch ( '**/!(*.d).ts', '/file.something.ts' ) );
      // expect ( isMatch ( '**/!(*.d).ts', '/file.d.something.ts' ) );
      // expect ( isMatch ( '**/!(*.d).ts', '/file.dhello.ts' ) );

      // expect ( isMatch ( '/!(*.d).{ts,tsx}', '/file.d.ts' ) ) . toBe(false);
      // expect ( isMatch ( '/!(*.d).{ts,tsx}', '/file.ts' ) );
      // expect ( isMatch ( '/!(*.d).{ts,tsx}', '/file.something.ts' ) );
      // expect ( isMatch ( '/!(*.d).{ts,tsx}', '/file.d.something.ts' ) );
      // expect ( isMatch ( '/!(*.d).{ts,tsx}', '/file.dhello.ts' ) );

      // expect ( isMatch ( '/!(*.d).@(ts)', '/file.d.ts' ) ) . toBe(false);
      // expect ( isMatch ( '/!(*.d).@(ts)', '/file.ts' ) );
      // expect ( isMatch ( '/!(*.d).@(ts)', '/file.something.ts' ) );
      // expect ( isMatch ( '/!(*.d).@(ts)', '/file.d.something.ts' ) );
      // expect ( isMatch ( '/!(*.d).@(ts)', '/file.dhello.ts' ) );

      expect(isMatch("foo/!(abc)", "foo/abc")).toBe(false);
      expect(isMatch("foo/!(abc)", "foo/bar")).toBe(true);

      expect(isMatch("a/!(z)", "a/z")).toBe(false);
      expect(isMatch("a/!(z)", "a/b")).toBe(true);

      expect(isMatch("c/!(z)/v", "c/z/v")).toBe(false);
      expect(isMatch("c/!(z)/v", "c/a/v")).toBe(true);

      expect(isMatch("!(b/a)", "a/a")).toBe(true);
      expect(isMatch("!(b/a)", "b/a")).toBe(false);

      // expect ( isMatch ( '!(!(foo))*', 'foo/bar' ) ) . toBe(false);
      expect(isMatch("!(b/a)", "a/a")).toBe(true);
      expect(isMatch("!(b/a)", "b/a")).toBe(false);

      // expect ( isMatch ( '(!(b/a))', 'a/a' ) );
      // expect ( isMatch ( '!((b/a))', 'a/a' ) );
      // expect ( isMatch ( '!((b/a))', 'b/a' ) ) . toBe(false);

      expect(isMatch("(!(?:b/a))", "a/a")).toBe(false);
      expect(isMatch("!((?:b/a))", "b/a")).toBe(false);

      // expect ( isMatch ( '!(b/(a))', 'a/a' ) );
      // expect ( isMatch ( '!(b/(a))', 'b/a' ) ) . toBe(false);

      expect(isMatch("!(b/a)", "a/a")).toBe(true);
      expect(isMatch("!(b/a)", "b/a")).toBe(false);

      // expect ( isMatch ( 'c!(z)', 'c/z' ) ) . toBe(false);
      // expect ( isMatch ( 'c!(z)z', 'c/z' ) ) . toBe(false);
      // expect ( isMatch ( 'c!(.)z', 'c/z' ) ) . toBe(false);
      // expect ( isMatch ( 'c!(*)z', 'c/z' ) ) . toBe(false);
      // expect ( isMatch ( 'c!(+)z', 'c/z' ) ) . toBe(false);
      // expect ( isMatch ( 'c!(?)z', 'c/z' ) ) . toBe(false);
      // expect ( isMatch ( 'c!(@)z', 'c/z' ) ) . toBe(false);

      // expect ( isMatch ( 'a!(z)', 'c/z' ) ) . toBe(false);
      // expect ( isMatch ( 'c!(.)z', 'c/z' ) ) . toBe(false);
      // expect ( isMatch ( 'c!(/)z', 'c/z' ) ) . toBe(false);
      // expect ( isMatch ( 'c!(/z)z', 'c/z' ) ) . toBe(false);
      // expect ( isMatch ( 'c!(/z)z', 'c/b' ) ) . toBe(false);
      // expect ( isMatch ( 'c!(/z)z', 'c/b/z' ) );

      // expect ( isMatch ( '!!(abc)', 'abc' ) );
      // expect ( isMatch ( '!!!(abc)', 'abc' ) ) . toBe(false);
      // expect ( isMatch ( '!!!!(abc)', 'abc' ) );
      // expect ( isMatch ( '!!!!!(abc)', 'abc' ) ) . toBe(false);
      // expect ( isMatch ( '!!!!!!(abc)', 'abc' ) );
      // expect ( isMatch ( '!!!!!!!(abc)', 'abc' ) ) . toBe(false);
      // expect ( isMatch ( '!!!!!!!!(abc)', 'abc' ) );

      // expect ( isMatch ( '!(!(abc))', 'abc' ) );
      // expect ( isMatch ( '!(!(!(abc)))', 'abc' ) ) . toBe(false);
      // expect ( isMatch ( '!(!(!(!(abc))))', 'abc' ) );
      // expect ( isMatch ( '!(!(!(!(!(abc)))))', 'abc' ) ) . toBe(false);
      // expect ( isMatch ( '!(!(!(!(!(!(abc))))))', 'abc' ) );
      // expect ( isMatch ( '!(!(!(!(!(!(!(abc)))))))', 'abc' ) ) . toBe(false);
      // expect ( isMatch ( '!(!(!(!(!(!(!(!(abc))))))))', 'abc' ) );

      // expect ( isMatch ( 'foo/!(!(abc))', 'foo/abc' ) );
      // expect ( isMatch ( 'foo/!(!(!(abc)))', 'foo/abc' ) ) . toBe(false);
      // expect ( isMatch ( 'foo/!(!(!(!(abc))))', 'foo/abc' ) );
      // expect ( isMatch ( 'foo/!(!(!(!(!(abc)))))', 'foo/abc' ) ) . toBe(false);
      // expect ( isMatch ( 'foo/!(!(!(!(!(!(abc))))))', 'foo/abc' ) );
      // expect ( isMatch ( 'foo/!(!(!(!(!(!(!(abc)))))))', 'foo/abc' ) ) . toBe(false);
      // expect ( isMatch ( 'foo/!(!(!(!(!(!(!(!(abc))))))))', 'foo/abc' ) );

      expect(isMatch("!(moo).!(cow)", "moo.cow")).toBe(false);
      expect(isMatch("!(moo).!(cow)", "foo.cow")).toBe(false);
      expect(isMatch("!(moo).!(cow)", "moo.bar")).toBe(false);
      expect(isMatch("!(moo).!(cow)", "foo.bar")).toBe(true);

      // expect ( isMatch ( '@(!(a) )*', 'a   ' ) ) . toBe(false);
      // expect ( isMatch ( '@(!(a) )*', 'a   b' ) ) . toBe(false);
      // expect ( isMatch ( '@(!(a) )*', 'a  b' ) ) . toBe(false);
      // expect ( isMatch ( '@(!(a) )*', 'a  ' ) ) . toBe(false);
      // expect ( isMatch ( '@(!(a) )*', 'a ' ) ) . toBe(false);
      // expect ( isMatch ( '@(!(a) )*', 'a' ) ) . toBe(false);
      // expect ( isMatch ( '@(!(a) )*', 'aa' ) ) . toBe(false);
      // expect ( isMatch ( '@(!(a) )*', 'b' ) ) . toBe(false);
      // expect ( isMatch ( '@(!(a) )*', 'bb' ) ) . toBe(false);
      // expect ( isMatch ( '@(!(a) )*', ' a ' ) );
      // expect ( isMatch ( '@(!(a) )*', 'b  ' ) );
      // expect ( isMatch ( '@(!(a) )*', 'b ' ) );

      expect(isMatch("a*!(z)", "c/z")).toBe(false);
      expect(isMatch("a*!(z)", "abz")).toBe(true);
      expect(isMatch("a*!(z)", "az")).toBe(true);

      expect(isMatch("!(a*)", "a")).toBe(false);
      expect(isMatch("!(a*)", "aa")).toBe(false);
      expect(isMatch("!(a*)", "ab")).toBe(false);
      expect(isMatch("!(a*)", "b")).toBe(true);

      expect(isMatch("!(*a*)", "a")).toBe(false);
      expect(isMatch("!(*a*)", "aa")).toBe(false);
      expect(isMatch("!(*a*)", "ab")).toBe(false);
      expect(isMatch("!(*a*)", "ac")).toBe(false);
      expect(isMatch("!(*a*)", "b")).toBe(true);

      // expect ( isMatch ( '!(*a)', 'a' ) ) . toBe(false);
      // expect ( isMatch ( '!(*a)', 'aa' ) ) . toBe(false);
      // expect ( isMatch ( '!(*a)', 'bba' ) ) . toBe(false);
      // expect ( isMatch ( '!(*a)', 'ab' ) );
      // expect ( isMatch ( '!(*a)', 'ac' ) );
      // expect ( isMatch ( '!(*a)', 'b' ) );

      expect(isMatch("!(*a)*", "a")).toBe(false);
      expect(isMatch("!(*a)*", "aa")).toBe(false);
      expect(isMatch("!(*a)*", "bba")).toBe(false);
      expect(isMatch("!(*a)*", "ab")).toBe(false);
      expect(isMatch("!(*a)*", "ac")).toBe(false);
      expect(isMatch("!(*a)*", "b")).toBe(true);

      expect(isMatch("!(a)*", "a")).toBe(false);
      expect(isMatch("!(a)*", "abb")).toBe(false);
      expect(isMatch("!(a)*", "ba")).toBe(true);

      expect(isMatch("a!(b)*", "aa")).toBe(true);
      expect(isMatch("a!(b)*", "ab")).toBe(false);
      expect(isMatch("a!(b)*", "aba")).toBe(false);
      expect(isMatch("a!(b)*", "ac")).toBe(true);

      // expect ( isMatch ( '!(!(moo)).!(!(cow))', 'moo.cow' ) );

      expect(isMatch("!(a|b)c", "ac")).toBe(false);
      expect(isMatch("!(a|b)c", "bc")).toBe(false);
      expect(isMatch("!(a|b)c", "cc")).toBe(true);

      expect(isMatch("!(a|b)c.!(d|e)", "ac.d")).toBe(false);
      expect(isMatch("!(a|b)c.!(d|e)", "bc.d")).toBe(false);
      expect(isMatch("!(a|b)c.!(d|e)", "cc.d")).toBe(false);
      expect(isMatch("!(a|b)c.!(d|e)", "ac.e")).toBe(false);
      expect(isMatch("!(a|b)c.!(d|e)", "bc.e")).toBe(false);
      expect(isMatch("!(a|b)c.!(d|e)", "cc.e")).toBe(false);
      expect(isMatch("!(a|b)c.!(d|e)", "ac.f")).toBe(false);
      expect(isMatch("!(a|b)c.!(d|e)", "bc.f")).toBe(false);
      expect(isMatch("!(a|b)c.!(d|e)", "cc.f")).toBe(true);
      expect(isMatch("!(a|b)c.!(d|e)", "dc.g")).toBe(true);

      // expect ( isMatch ( '!(!(a|b)c.!(d|e))', 'ac.d' ) );
      // expect ( isMatch ( '!(!(a|b)c.!(d|e))', 'bc.d' ) );
      // expect ( isMatch ( '!(a|b)c.!(d|e)', 'cc.d' ) ) . toBe(false);
      // expect ( isMatch ( '!(!(a|b)c.!(d|e))', 'cc.d' ) );
      // expect ( isMatch ( '!(!(a|b)c.!(d|e))', 'cc.d' ) );
      // expect ( isMatch ( '!(!(a|b)c.!(d|e))', 'ac.e' ) );
      // expect ( isMatch ( '!(!(a|b)c.!(d|e))', 'bc.e' ) );
      // expect ( isMatch ( '!(!(a|b)c.!(d|e))', 'cc.e' ) );
      // expect ( isMatch ( '!(!(a|b)c.!(d|e))', 'ac.f' ) );
      // expect ( isMatch ( '!(!(a|b)c.!(d|e))', 'bc.f' ) );
      // expect ( isMatch ( '!(!(a|b)c.!(d|e))', 'cc.f' ) ) . toBe(false);
      // expect ( isMatch ( '!(!(a|b)c.!(d|e))', 'dc.g' ) ) . toBe(false);

      // expect ( isMatch ( '@(a|b).md', '.md' ) ) . toBe(false);
      // expect ( isMatch ( '@(a|b).md', 'a.js' ) ) . toBe(false);
      // expect ( isMatch ( '@(a|b).md', 'c.md' ) ) . toBe(false);
      // expect ( isMatch ( '@(a|b).md', 'a.md' ) );
      // expect ( isMatch ( '@(a|b).md', 'b.md' ) );

      expect(isMatch("+(a|b).md", ".md")).toBe(false);
      expect(isMatch("+(a|b).md", "a.js")).toBe(false);
      expect(isMatch("+(a|b).md", "c.md")).toBe(false);
      expect(isMatch("+(a|b).md", "a.md")).toBe(true);
      expect(isMatch("+(a|b).md", "aa.md")).toBe(true);
      expect(isMatch("+(a|b).md", "ab.md")).toBe(true);
      expect(isMatch("+(a|b).md", "b.md")).toBe(true);
      expect(isMatch("+(a|b).md", "bb.md")).toBe(true);

      expect(isMatch("*(a|b).md", "a.js")).toBe(false);
      expect(isMatch("*(a|b).md", "c.md")).toBe(false);
      expect(isMatch("*(a|b).md", ".md")).toBe(true);
      expect(isMatch("*(a|b).md", "a.md")).toBe(true);
      expect(isMatch("*(a|b).md", "aa.md")).toBe(true);
      expect(isMatch("*(a|b).md", "ab.md")).toBe(true);
      expect(isMatch("*(a|b).md", "b.md")).toBe(true);
      expect(isMatch("*(a|b).md", "bb.md")).toBe(true);

      expect(isMatch("?(a|b).md", "a.js")).toBe(false);
      expect(isMatch("?(a|b).md", "bb.md")).toBe(false);
      expect(isMatch("?(a|b).md", "c.md")).toBe(false);
      expect(isMatch("?(a|b).md", ".md")).toBe(true);
      expect(isMatch("?(a|ab|b).md", "a.md")).toBe(true);
      expect(isMatch("?(a|b).md", "a.md")).toBe(true);
      expect(isMatch("?(a|aa|b).md", "aa.md")).toBe(true);
      expect(isMatch("?(a|ab|b).md", "ab.md")).toBe(true);
      expect(isMatch("?(a|ab|b).md", "b.md")).toBe(true);

      expect(isMatch("+(a)?(b)", "ab")).toBe(true);
      expect(isMatch("+(a)?(b)", "aab")).toBe(true);
      expect(isMatch("+(a)?(b)", "aa")).toBe(true);
      expect(isMatch("+(a)?(b)", "a")).toBe(true);

      expect(isMatch("a?(b*)", "ax")).toBe(false);
      expect(isMatch("?(a*|b)", "ax")).toBe(true);

      expect(isMatch("a*(b*)", "ax")).toBe(false);
      expect(isMatch("*(a*|b)", "ax")).toBe(true);

      expect(isMatch("a@(b*)", "ax")).toBe(false);
      expect(isMatch("@(a*|b)", "ax")).toBe(true);

      expect(isMatch("a?(b*)", "ax")).toBe(false);
      expect(isMatch("?(a*|b)", "ax")).toBe(true);

      expect(isMatch("a!(b*)", "ax")).toBe(true);
      expect(isMatch("!(a*|b)", "ax")).toBe(false);

      // expect ( isMatch ( '!(a/**)', 'a' ) );
      // expect ( isMatch ( '!(a/**)', 'a/' ) ) . toBe(false);
      // expect ( isMatch ( '!(a/**)', 'a/b' ) ) . toBe(false);
      // expect ( isMatch ( '!(a/**)', 'a/b/c' ) ) . toBe(false);
      // expect ( isMatch ( '!(a/**)', 'b' ) );
      // expect ( isMatch ( '!(a/**)', 'b/c' ) );

      expect(isMatch("a/!(b*)", "a/a")).toBe(true);
      expect(isMatch("a/!(b*)", "a/b")).toBe(false);
      expect(isMatch("a/!(b/*)", "a/b/c")).toBe(false);
      expect(isMatch("a/!(b*)", "a/b/c")).toBe(false);
      expect(isMatch("a/!(b*)", "a/c")).toBe(true);

      expect(isMatch("a/!(b*)/**", "a/a/")).toBe(true);
      expect(isMatch("a/!(b*)", "a/a")).toBe(true);
      expect(isMatch("a/!(b*)/**", "a/a")).toBe(true);
      expect(isMatch("a/!(b*)/**", "a/b")).toBe(false);
      expect(isMatch("a/!(b*)/**", "a/b/c")).toBe(false);
      expect(isMatch("a/!(b*)/**", "a/c")).toBe(true);
      expect(isMatch("a/!(b*)", "a/c")).toBe(true);
      expect(isMatch("a/!(b*)/**", "a/c/")).toBe(true);

      expect(isMatch("a*(z)", "a")).toBe(true);
      expect(isMatch("a*(z)", "az")).toBe(true);
      expect(isMatch("a*(z)", "azz")).toBe(true);
      expect(isMatch("a*(z)", "azzz")).toBe(true);
      expect(isMatch("a*(z)", "abz")).toBe(false);
      expect(isMatch("a*(z)", "cz")).toBe(false);

      expect(isMatch("*(b/a)", "a/a")).toBe(false);
      expect(isMatch("*(b/a)", "a/b")).toBe(false);
      expect(isMatch("*(b/a)", "a/c")).toBe(false);
      expect(isMatch("*(b/a)", "b/a")).toBe(true);
      expect(isMatch("*(b/a)", "b/b")).toBe(false);
      expect(isMatch("*(b/a)", "b/c")).toBe(false);

      // expect ( isMatch ( 'a**(z)', 'cz' ) ) . toBe(false);
      // expect ( isMatch ( 'a**(z)', 'abz' ) );
      // expect ( isMatch ( 'a**(z)', 'az' ) );

      expect(isMatch("*(z)", "c/z/v")).toBe(false);
      expect(isMatch("*(z)", "z")).toBe(true);
      expect(isMatch("*(z)", "zf")).toBe(false);
      expect(isMatch("*(z)", "fz")).toBe(false);

      expect(isMatch("c/*(z)/v", "c/a/v")).toBe(false);
      expect(isMatch("c/*(z)/v", "c/z/v")).toBe(true);

      expect(isMatch("*.*(js).js", "a.md.js")).toBe(false);
      expect(isMatch("*.*(js).js", "a.js.js")).toBe(true);

      expect(isMatch("a+(z)", "a")).toBe(false);
      expect(isMatch("a+(z)", "az")).toBe(true);
      expect(isMatch("a+(z)", "cz")).toBe(false);
      expect(isMatch("a+(z)", "abz")).toBe(false);
      expect(isMatch("a+(z)", "a+z")).toBe(false);
      expect(isMatch("a++(z)", "a+z")).toBe(true);
      expect(isMatch("a+(z)", "c+z")).toBe(false);
      expect(isMatch("a+(z)", "a+bz")).toBe(false);
      expect(isMatch("+(z)", "az")).toBe(false);
      expect(isMatch("+(z)", "cz")).toBe(false);
      expect(isMatch("+(z)", "abz")).toBe(false);
      expect(isMatch("+(z)", "fz")).toBe(false);
      expect(isMatch("+(z)", "z")).toBe(true);
      expect(isMatch("+(z)", "zz")).toBe(true);
      expect(isMatch("c/+(z)/v", "c/z/v")).toBe(true);
      expect(isMatch("c/+(z)/v", "c/zz/v")).toBe(true);
      expect(isMatch("c/+(z)/v", "c/a/v")).toBe(false);

      expect(isMatch("a??(z)", "a?z")).toBe(true);
      expect(isMatch("a??(z)", "a.z")).toBe(true);
      expect(isMatch("a??(z)", "a/z")).toBe(false);
      expect(isMatch("a??(z)", "a?")).toBe(true);
      expect(isMatch("a??(z)", "ab")).toBe(true);
      expect(isMatch("a??(z)", "a/")).toBe(false);

      expect(isMatch("a?(z)", "a?z")).toBe(false);
      expect(isMatch("a?(z)", "abz")).toBe(false);
      expect(isMatch("a?(z)", "z")).toBe(false);
      expect(isMatch("a?(z)", "a")).toBe(true);
      expect(isMatch("a?(z)", "az")).toBe(true);

      expect(isMatch("?(z)", "abz")).toBe(false);
      expect(isMatch("?(z)", "az")).toBe(false);
      expect(isMatch("?(z)", "cz")).toBe(false);
      expect(isMatch("?(z)", "fz")).toBe(false);
      expect(isMatch("?(z)", "zz")).toBe(false);
      expect(isMatch("?(z)", "z")).toBe(true);

      expect(isMatch("c/?(z)/v", "c/a/v")).toBe(false);
      expect(isMatch("c/?(z)/v", "c/zz/v")).toBe(false);
      expect(isMatch("c/?(z)/v", "c/z/v")).toBe(true);

      expect(isMatch("c/@(z)/v", "c/z/v")).toBe(true);
      expect(isMatch("c/@(z)/v", "c/a/v")).toBe(false);
      expect(isMatch("@(*.*)", "moo.cow")).toBe(true);

      expect(isMatch("a*@(z)", "cz")).toBe(false);
      expect(isMatch("a*@(z)", "abz")).toBe(true);
      expect(isMatch("a*@(z)", "az")).toBe(true);

      expect(isMatch("a@(z)", "cz")).toBe(false);
      expect(isMatch("a@(z)", "abz")).toBe(false);
      expect(isMatch("a@(z)", "az")).toBe(true);

      expect(isMatch("(b|a).(a)", "aa.aa")).toBe(false);
      expect(isMatch("(b|a).(a)", "a.bb")).toBe(false);
      expect(isMatch("(b|a).(a)", "a.aa.a")).toBe(false);
      expect(isMatch("(b|a).(a)", "cc.a")).toBe(false);
      // expect ( isMatch ( '(b|a).(a)', 'a.a' ) );
      expect(isMatch("(b|a).(a)", "c.a")).toBe(false);
      expect(isMatch("(b|a).(a)", "dd.aa.d")).toBe(false);
      // expect ( isMatch ( '(b|a).(a)', 'b.a' ) );

      // expect ( isMatch ( '@(b|a).@(a)', 'aa.aa' ) ) . toBe(false);
      // expect ( isMatch ( '@(b|a).@(a)', 'a.bb' ) ) . toBe(false);
      // expect ( isMatch ( '@(b|a).@(a)', 'a.aa.a' ) ) . toBe(false);
      // expect ( isMatch ( '@(b|a).@(a)', 'cc.a' ) ) . toBe(false);
      // expect ( isMatch ( '@(b|a).@(a)', 'a.a' ) );
      // expect ( isMatch ( '@(b|a).@(a)', 'c.a' ) ) . toBe(false);
      // expect ( isMatch ( '@(b|a).@(a)', 'dd.aa.d' ) ) . toBe(false);
      // expect ( isMatch ( '@(b|a).@(a)', 'b.a' ) );

      // expect ( isMatch ( '*(0|1|3|5|7|9)', '' ) ) . toBe(false);

      expect(isMatch("*(0|1|3|5|7|9)", "137577991")).toBe(true);
      expect(isMatch("*(0|1|3|5|7|9)", "2468")).toBe(false);

      expect(isMatch("*.c?(c)", "file.c")).toBe(true);
      expect(isMatch("*.c?(c)", "file.C")).toBe(false);
      expect(isMatch("*.c?(c)", "file.cc")).toBe(true);
      expect(isMatch("*.c?(c)", "file.ccc")).toBe(false);

      expect(isMatch("!(*.c|*.h|Makefile.in|config*|README)", "parse.y")).toBe(
        true,
      );
      expect(isMatch("!(*.c|*.h|Makefile.in|config*|README)", "shell.c")).toBe(
        false,
      );
      expect(isMatch("!(*.c|*.h|Makefile.in|config*|README)", "Makefile")).toBe(
        true,
      );
      expect(
        isMatch("!(*.c|*.h|Makefile.in|config*|README)", "Makefile.in"),
      ).toBe(false);

      expect(isMatch("*\\;[1-9]*([0-9])", "VMS.FILE;")).toBe(false);
      expect(isMatch("*\\;[1-9]*([0-9])", "VMS.FILE;0")).toBe(false);
      expect(isMatch("*\\;[1-9]*([0-9])", "VMS.FILE;1")).toBe(true);
      expect(isMatch("*\\;[1-9]*([0-9])", "VMS.FILE;139")).toBe(true);
      expect(isMatch("*\\;[1-9]*([0-9])", "VMS.FILE;1N")).toBe(false);

      expect(isMatch("!([*)*", "abcx")).toBe(true);
      expect(isMatch("!([*)*", "abcz")).toBe(true);
      expect(isMatch("!([*)*", "bbc")).toBe(true);

      expect(isMatch("!([[*])*", "abcx")).toBe(true);
      expect(isMatch("!([[*])*", "abcz")).toBe(true);
      expect(isMatch("!([[*])*", "bbc")).toBe(true);

      expect(isMatch("+(a|b\\[)*", "abcx")).toBe(true);
      expect(isMatch("+(a|b\\[)*", "abcz")).toBe(true);
      expect(isMatch("+(a|b\\[)*", "bbc")).toBe(false);

      expect(isMatch("+(a|b[)*", "abcx")).toBe(true);
      expect(isMatch("+(a|b[)*", "abcz")).toBe(true);
      expect(isMatch("+(a|b[)*", "bbc")).toBe(false);

      expect(isMatch("[a*(]*z", "abcx")).toBe(false);
      expect(isMatch("[a*(]*z", "abcz")).toBe(true);
      expect(isMatch("[a*(]*z", "bbc")).toBe(false);
      expect(isMatch("[a*(]*z", "aaz")).toBe(true);
      expect(isMatch("[a*(]*z", "aaaz")).toBe(true);

      expect(isMatch("[a*(]*)z", "abcx")).toBe(false);
      expect(isMatch("[a*(]*)z", "abcz")).toBe(false);
      expect(isMatch("[a*(]*)z", "bbc")).toBe(false);

      expect(isMatch("+()c", "abc")).toBe(false);
      expect(isMatch("+()x", "abc")).toBe(false);
      expect(isMatch("+(*)c", "abc")).toBe(true);
      expect(isMatch("+(*)x", "abc")).toBe(false);
      expect(isMatch("no-file+(a|b)stuff", "abc")).toBe(false);
      expect(isMatch("no-file+(a*(c)|b)stuff", "abc")).toBe(false);

      expect(isMatch("a+(b|c)d", "abd")).toBe(true);
      expect(isMatch("a+(b|c)d", "acd")).toBe(true);

      expect(isMatch("a+(b|c)d", "abc")).toBe(false);

      // expect ( isMatch ( 'a!(b|B)', 'abd' ) );
      // expect ( isMatch ( 'a!(@(b|B))', 'acd' ) );
      // expect ( isMatch ( 'a!(@(b|B))', 'ac' ) );
      // expect ( isMatch ( 'a!(@(b|B))', 'ab' ) ) . toBe(false);

      // expect ( isMatch ( 'a!(@(b|B))d', 'abc' ) ) . toBe(false);
      // expect ( isMatch ( 'a!(@(b|B))d', 'abd' ) ) . toBe(false);
      // expect ( isMatch ( 'a!(@(b|B))d', 'acd' ) );

      expect(isMatch("a[b*(foo|bar)]d", "abd")).toBe(true);
      expect(isMatch("a[b*(foo|bar)]d", "abc")).toBe(false);
      expect(isMatch("a[b*(foo|bar)]d", "acd")).toBe(false);

      // expect ( isMatch ( 'para+([0-9])', 'para' ) ) . toBe(false);
      // expect ( isMatch ( 'para?([345]|99)1', 'para381' ) ) . toBe(false);
      // expect ( isMatch ( 'para*([0-9])', 'paragraph' ) ) . toBe(false);
      // expect ( isMatch ( 'para@(chute|graph)', 'paramour' ) ) . toBe(false);
      // expect ( isMatch ( 'para*([0-9])', 'para' ) );
      // expect ( isMatch ( 'para!(*.[0-9])', 'para.38' ) );
      // expect ( isMatch ( 'para!(*.[00-09])', 'para.38' ) );
      // expect ( isMatch ( 'para!(*.[0-9])', 'para.graph' ) );
      // expect ( isMatch ( 'para*([0-9])', 'para13829383746592' ) );
      // expect ( isMatch ( 'para!(*.[0-9])', 'para39' ) );
      // expect ( isMatch ( 'para+([0-9])', 'para987346523' ) );
      // expect ( isMatch ( 'para?([345]|99)1', 'para991' ) );
      // expect ( isMatch ( 'para!(*.[0-9])', 'paragraph' ) );
      // expect ( isMatch ( 'para@(chute|graph)', 'paragraph' ) );

      expect(isMatch("*(a|b[)", "foo")).toBe(false);
      expect(isMatch("*(a|b[)", "(")).toBe(false);
      expect(isMatch("*(a|b[)", ")")).toBe(false);
      expect(isMatch("*(a|b[)", "|")).toBe(false);
      expect(isMatch("*(a|b)", "a")).toBe(true);
      expect(isMatch("*(a|b)", "b")).toBe(true);
      expect(isMatch("*(a|b\\[)", "b[")).toBe(true);
      expect(isMatch("+(a|b\\[)", "ab[")).toBe(true);
      expect(isMatch("+(a|b\\[)", "ab[cde")).toBe(false);
      expect(isMatch("+(a|b\\[)*", "ab[cde")).toBe(true);

      // expect ( isMatch ( '*(a|b|f)*', 'foo' ) );
      // expect ( isMatch ( '*(a|b|o)*', 'foo' ) );
      // expect ( isMatch ( '*(a|b|f|o)', 'foo' ) );
      // expect ( isMatch ( '\\*\\(a\\|b\\[\\)', '*(a|b[)' ) );
      // expect ( isMatch ( '*(a|b)', 'foo' ) ) . toBe(false);
      // expect ( isMatch ( '*(a|b\\[)', 'foo' ) ) . toBe(false);
      // expect ( isMatch ( '*(a|b\\[)|f*', 'foo' ) );

      // expect ( isMatch ( '@(*).@(*)', 'moo.cow' ) );
      // expect ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'a.a' ) );
      // expect ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'a.b' ) );
      // expect ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'a.c' ) ) . toBe(false);
      // expect ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'a.c.d' ) ) . toBe(false);
      // expect ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'c.c' ) ) . toBe(false);
      // expect ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'a.' ) ) . toBe(false);
      // expect ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'd.d' ) ) . toBe(false);
      // expect ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'e.e' ) ) . toBe(false);
      // expect ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'f.f' ) ) . toBe(false);
      // expect ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'a.abcd' ) );

      // expect ( isMatch ( '!(*.a|*.b|*.c)', 'a.a' ) ) . toBe(false);
      // expect ( isMatch ( '!(*.a|*.b|*.c)', 'a.b' ) ) . toBe(false);
      // expect ( isMatch ( '!(*.a|*.b|*.c)', 'a.c' ) ) . toBe(false);
      // expect ( isMatch ( '!(*.a|*.b|*.c)', 'a.c.d' ) );
      // expect ( isMatch ( '!(*.a|*.b|*.c)', 'c.c' ) ) . toBe(false);
      // expect ( isMatch ( '!(*.a|*.b|*.c)', 'a.' ) );
      // expect ( isMatch ( '!(*.a|*.b|*.c)', 'd.d' ) );
      // expect ( isMatch ( '!(*.a|*.b|*.c)', 'e.e' ) );
      // expect ( isMatch ( '!(*.a|*.b|*.c)', 'f.f' ) );
      // expect ( isMatch ( '!(*.a|*.b|*.c)', 'a.abcd' ) );

      expect(isMatch("!(*.[^a-c])", "a.a")).toBe(true);
      expect(isMatch("!(*.[^a-c])", "a.b")).toBe(true);
      expect(isMatch("!(*.[^a-c])", "a.c")).toBe(true);
      expect(isMatch("!(*.[^a-c])", "a.c.d")).toBe(false);
      expect(isMatch("!(*.[^a-c])", "c.c")).toBe(true);
      expect(isMatch("!(*.[^a-c])", "a.")).toBe(true);
      expect(isMatch("!(*.[^a-c])", "d.d")).toBe(false);
      expect(isMatch("!(*.[^a-c])", "e.e")).toBe(false);
      expect(isMatch("!(*.[^a-c])", "f.f")).toBe(false);
      expect(isMatch("!(*.[^a-c])", "a.abcd")).toBe(true);

      // expect ( isMatch ( '!(*.[a-c])', 'a.a' ) ) . toBe(false);
      // expect ( isMatch ( '!(*.[a-c])', 'a.b' ) ) . toBe(false);
      // expect ( isMatch ( '!(*.[a-c])', 'a.c' ) ) . toBe(false);
      // expect ( isMatch ( '!(*.[a-c])', 'a.c.d' ) );
      // expect ( isMatch ( '!(*.[a-c])', 'c.c' ) ) . toBe(false);
      // expect ( isMatch ( '!(*.[a-c])', 'a.' ) );
      // expect ( isMatch ( '!(*.[a-c])', 'd.d' ) );
      // expect ( isMatch ( '!(*.[a-c])', 'e.e' ) );
      // expect ( isMatch ( '!(*.[a-c])', 'f.f' ) );
      // expect ( isMatch ( '!(*.[a-c])', 'a.abcd' ) );

      expect(isMatch("!(*.[a-c]*)", "a.a")).toBe(false);
      expect(isMatch("!(*.[a-c]*)", "a.b")).toBe(false);
      expect(isMatch("!(*.[a-c]*)", "a.c")).toBe(false);
      expect(isMatch("!(*.[a-c]*)", "a.c.d")).toBe(false);
      expect(isMatch("!(*.[a-c]*)", "c.c")).toBe(false);
      expect(isMatch("!(*.[a-c]*)", "a.")).toBe(true);
      expect(isMatch("!(*.[a-c]*)", "d.d")).toBe(true);
      expect(isMatch("!(*.[a-c]*)", "e.e")).toBe(true);
      expect(isMatch("!(*.[a-c]*)", "f.f")).toBe(true);
      expect(isMatch("!(*.[a-c]*)", "a.abcd")).toBe(false);

      // expect ( isMatch ( '*.!(a|b|c)', 'a.a' ) ) . toBe(false);
      // expect ( isMatch ( '*.!(a|b|c)', 'a.b' ) ) . toBe(false);
      // expect ( isMatch ( '*.!(a|b|c)', 'a.c' ) ) . toBe(false);
      // expect ( isMatch ( '*.!(a|b|c)', 'a.c.d' ) );
      // expect ( isMatch ( '*.!(a|b|c)', 'c.c' ) ) . toBe(false);
      // expect ( isMatch ( '*.!(a|b|c)', 'a.' ) );
      // expect ( isMatch ( '*.!(a|b|c)', 'd.d' ) );
      // expect ( isMatch ( '*.!(a|b|c)', 'e.e' ) );
      // expect ( isMatch ( '*.!(a|b|c)', 'f.f' ) );
      // expect ( isMatch ( '*.!(a|b|c)', 'a.abcd' ) );

      expect(isMatch("*!(.a|.b|.c)", "a.a")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)", "a.b")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)", "a.c")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)", "a.c.d")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)", "c.c")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)", "a.")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)", "d.d")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)", "e.e")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)", "f.f")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)", "a.abcd")).toBe(true);

      expect(isMatch("!(*.[a-c])*", "a.a")).toBe(false);
      expect(isMatch("!(*.[a-c])*", "a.b")).toBe(false);
      expect(isMatch("!(*.[a-c])*", "a.c")).toBe(false);
      expect(isMatch("!(*.[a-c])*", "a.c.d")).toBe(false);
      expect(isMatch("!(*.[a-c])*", "c.c")).toBe(false);
      expect(isMatch("!(*.[a-c])*", "a.")).toBe(true);
      expect(isMatch("!(*.[a-c])*", "d.d")).toBe(true);
      expect(isMatch("!(*.[a-c])*", "e.e")).toBe(true);
      expect(isMatch("!(*.[a-c])*", "f.f")).toBe(true);
      expect(isMatch("!(*.[a-c])*", "a.abcd")).toBe(false);

      expect(isMatch("*!(.a|.b|.c)*", "a.a")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)*", "a.b")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)*", "a.c")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)*", "a.c.d")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)*", "c.c")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)*", "a.")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)*", "d.d")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)*", "e.e")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)*", "f.f")).toBe(true);
      expect(isMatch("*!(.a|.b|.c)*", "a.abcd")).toBe(true);

      expect(isMatch("*.!(a|b|c)*", "a.a")).toBe(false);
      expect(isMatch("*.!(a|b|c)*", "a.b")).toBe(false);
      expect(isMatch("*.!(a|b|c)*", "a.c")).toBe(false);
      expect(isMatch("*.!(a|b|c)*", "a.c.d")).toBe(true);
      expect(isMatch("*.!(a|b|c)*", "c.c")).toBe(false);
      expect(isMatch("*.!(a|b|c)*", "a.")).toBe(true);
      expect(isMatch("*.!(a|b|c)*", "d.d")).toBe(true);
      expect(isMatch("*.!(a|b|c)*", "e.e")).toBe(true);
      expect(isMatch("*.!(a|b|c)*", "f.f")).toBe(true);
      expect(isMatch("*.!(a|b|c)*", "a.abcd")).toBe(false);

      // expect ( isMatch ( '@()ef', 'def' ) ) . toBe(false);
      // expect ( isMatch ( '@()ef', 'ef' ) );

      // expect ( isMatch ( '()ef', 'def' ) ) . toBe(false);
      // expect ( isMatch ( '()ef', 'ef' ) );

      // expect ( isMatch ( 'a\\\\\\(b', 'a\\(b' ) );
      // expect ( isMatch ( 'a(b', 'a(b' ) );
      // expect ( isMatch ( 'a\\(b', 'a(b' ) );
      // expect ( isMatch ( 'a(b', 'a((b' ) ) . toBe(false);
      // expect ( isMatch ( 'a(b', 'a((((b' ) ) . toBe(false);
      // expect ( isMatch ( 'a(b', 'ab' ) ) . toBe(false);

      expect(isMatch("a\\(b", "a(b")).toBe(true);
      expect(isMatch("a\\(b", "a((b")).toBe(false);
      expect(isMatch("a\\(b", "a((((b")).toBe(false);
      expect(isMatch("a\\(b", "ab")).toBe(false);

      expect(isMatch("a(*b", "a(b")).toBe(true);
      expect(isMatch("a\\(*b", "a(ab")).toBe(true);
      expect(isMatch("a(*b", "a((b")).toBe(true);
      expect(isMatch("a(*b", "a((((b")).toBe(true);
      expect(isMatch("a(*b", "ab")).toBe(false);

      expect(isMatch("a\\(b", "a(b")).toBe(true);
      expect(isMatch("a\\(\\(b", "a((b")).toBe(true);
      expect(isMatch("a\\(\\(\\(\\(b", "a((((b")).toBe(true);

      expect(isMatch("a\\\\(b", "a(b")).toBe(false);
      expect(isMatch("a\\\\(b", "a((b")).toBe(false);
      expect(isMatch("a\\\\(b", "a((((b")).toBe(false);
      expect(isMatch("a\\\\(b", "ab")).toBe(false);

      expect(isMatch("a\\\\b", "a/b")).toBe(false);
      expect(isMatch("a\\\\b", "ab")).toBe(false);
    });

    test("basic", () => {
      expect(isMatch("abc", "abc")).toBe(true);
      expect(isMatch("*", "abc")).toBe(true);
      expect(isMatch("*", "")).toBe(true);
      expect(isMatch("**", "")).toBe(true);
      expect(isMatch("*c", "abc")).toBe(true);
      expect(isMatch("*b", "abc")).toBe(false);
      expect(isMatch("a*", "abc")).toBe(true);
      expect(isMatch("b*", "abc")).toBe(false);
      expect(isMatch("a*", "a")).toBe(true);
      expect(isMatch("*a", "a")).toBe(true);
      expect(isMatch("a*b*c*d*e*", "axbxcxdxe")).toBe(true);
      expect(isMatch("a*b*c*d*e*", "axbxcxdxexxx")).toBe(true);
      expect(isMatch("a*b?c*x", "abxbbxdbxebxczzx")).toBe(true);
      expect(isMatch("a*b?c*x", "abxbbxdbxebxczzy")).toBe(false);

      expect(isMatch("a/*/test", "a/foo/test")).toBe(true);
      expect(isMatch("a/*/test", "a/foo/bar/test")).toBe(false);
      expect(isMatch("a/**/test", "a/foo/test")).toBe(true);
      expect(isMatch("a/**/test", "a/foo/bar/test")).toBe(true);
      expect(isMatch("a/**/b/c", "a/foo/bar/b/c")).toBe(true);
      expect(isMatch("a\\*b", "a*b")).toBe(true);
      expect(isMatch("a\\*b", "axb")).toBe(false);

      expect(isMatch("[abc]", "a")).toBe(true);
      expect(isMatch("[abc]", "b")).toBe(true);
      expect(isMatch("[abc]", "c")).toBe(true);
      expect(isMatch("[abc]", "d")).toBe(false);
      expect(isMatch("x[abc]x", "xax")).toBe(true);
      expect(isMatch("x[abc]x", "xbx")).toBe(true);
      expect(isMatch("x[abc]x", "xcx")).toBe(true);
      expect(isMatch("x[abc]x", "xdx")).toBe(false);
      expect(isMatch("x[abc]x", "xay")).toBe(false);
      expect(isMatch("[?]", "?")).toBe(true);
      expect(isMatch("[?]", "a")).toBe(false);
      expect(isMatch("[*]", "*")).toBe(true);
      expect(isMatch("[*]", "a")).toBe(false);

      expect(isMatch("[a-cx]", "a")).toBe(true);
      expect(isMatch("[a-cx]", "b")).toBe(true);
      expect(isMatch("[a-cx]", "c")).toBe(true);
      expect(isMatch("[a-cx]", "d")).toBe(false);
      expect(isMatch("[a-cx]", "x")).toBe(true);

      expect(isMatch("[^abc]", "a")).toBe(false);
      expect(isMatch("[^abc]", "b")).toBe(false);
      expect(isMatch("[^abc]", "c")).toBe(false);
      expect(isMatch("[^abc]", "d")).toBe(true);
      expect(isMatch("[!abc]", "a")).toBe(false);
      expect(isMatch("[!abc]", "b")).toBe(false);
      expect(isMatch("[!abc]", "c")).toBe(false);
      expect(isMatch("[!abc]", "d")).toBe(true);
      expect(isMatch("[\\!]", "!")).toBe(true);

      expect(isMatch("a*b*[cy]*d*e*", "axbxcxdxexxx")).toBe(true);
      expect(isMatch("a*b*[cy]*d*e*", "axbxyxdxexxx")).toBe(true);
      expect(isMatch("a*b*[cy]*d*e*", "axbxxxyxdxexxx")).toBe(true);

      expect(isMatch("test.{jpg,png}", "test.jpg")).toBe(true);
      expect(isMatch("test.{jpg,png}", "test.png")).toBe(true);
      expect(isMatch("test.{j*g,p*g}", "test.jpg")).toBe(true);
      expect(isMatch("test.{j*g,p*g}", "test.jpxxxg")).toBe(true);
      expect(isMatch("test.{j*g,p*g}", "test.jxg")).toBe(true);
      expect(isMatch("test.{j*g,p*g}", "test.jnt")).toBe(false);
      expect(isMatch("test.{j*g,j*c}", "test.jnc")).toBe(true);
      expect(isMatch("test.{jpg,p*g}", "test.png")).toBe(true);
      expect(isMatch("test.{jpg,p*g}", "test.pxg")).toBe(true);
      expect(isMatch("test.{jpg,p*g}", "test.pnt")).toBe(false);
      expect(isMatch("test.{jpeg,png}", "test.jpeg")).toBe(true);
      expect(isMatch("test.{jpeg,png}", "test.jpg")).toBe(false);
      expect(isMatch("test.{jpeg,png}", "test.png")).toBe(true);
      expect(isMatch("test.{jp\\,g,png}", "test.jp,g")).toBe(true);
      expect(isMatch("test.{jp\\,g,png}", "test.jxg")).toBe(false);
      expect(isMatch("test/{foo,bar}/baz", "test/foo/baz")).toBe(true);
      expect(isMatch("test/{foo,bar}/baz", "test/bar/baz")).toBe(true);
      expect(isMatch("test/{foo,bar}/baz", "test/baz/baz")).toBe(false);
      expect(isMatch("test/{foo*,bar*}/baz", "test/foooooo/baz")).toBe(true);
      expect(isMatch("test/{foo*,bar*}/baz", "test/barrrrr/baz")).toBe(true);
      expect(isMatch("test/{*foo,*bar}/baz", "test/xxxxfoo/baz")).toBe(true);
      expect(isMatch("test/{*foo,*bar}/baz", "test/xxxxbar/baz")).toBe(true);
      expect(isMatch("test/{foo/**,bar}/baz", "test/bar/baz")).toBe(true);
      expect(isMatch("test/{foo/**,bar}/baz", "test/bar/test/baz")).toBe(false);

      expect(isMatch("*.txt", "some/big/path/to/the/needle.txt")).toBe(false);
      expect(
        isMatch(
          "some/**/needle.{js,tsx,mdx,ts,jsx,txt}",
          "some/a/bigger/path/to/the/crazy/needle.txt",
        ),
      ).toBe(true);
      expect(
        isMatch(
          "some/**/{a,b,c}/**/needle.txt",
          "some/foo/a/bigger/path/to/the/crazy/needle.txt",
        ),
      ).toBe(true);
      expect(
        isMatch(
          "some/**/{a,b,c}/**/needle.txt",
          "some/foo/d/bigger/path/to/the/crazy/needle.txt",
        ),
      ).toBe(false);

      expect(isMatch("a/{a{a,b},b}", "a/aa")).toBe(true);
      expect(isMatch("a/{a{a,b},b}", "a/ab")).toBe(true);
      expect(isMatch("a/{a{a,b},b}", "a/ac")).toBe(false);
      expect(isMatch("a/{a{a,b},b}", "a/b")).toBe(true);
      expect(isMatch("a/{a{a,b},b}", "a/c")).toBe(false);
      expect(isMatch("a/{b,c[}]*}", "a/b")).toBe(true);
      expect(isMatch("a/{b,c[}]*}", "a/c}xx")).toBe(true);
    });

    test("bash", () => {
      expect(isMatch("a*", "*")).toBe(false);
      expect(isMatch("a*", "**")).toBe(false);
      expect(isMatch("a*", "\\*")).toBe(false);
      expect(isMatch("a*", "a/*")).toBe(false);
      expect(isMatch("a*", "b")).toBe(false);
      expect(isMatch("a*", "bc")).toBe(false);
      expect(isMatch("a*", "bcd")).toBe(false);
      expect(isMatch("a*", "bdir/")).toBe(false);
      expect(isMatch("a*", "Beware")).toBe(false);
      expect(isMatch("a*", "a")).toBe(true);
      expect(isMatch("a*", "ab")).toBe(true);
      expect(isMatch("a*", "abc")).toBe(true);

      expect(isMatch("\\a*", "*")).toBe(false);
      expect(isMatch("\\a*", "**")).toBe(false);
      expect(isMatch("\\a*", "\\*")).toBe(false);

      expect(isMatch("\\a*", "a")).toBe(true);
      expect(isMatch("\\a*", "a/*")).toBe(false);
      expect(isMatch("\\a*", "abc")).toBe(true);
      expect(isMatch("\\a*", "abd")).toBe(true);
      expect(isMatch("\\a*", "abe")).toBe(true);
      expect(isMatch("\\a*", "b")).toBe(false);
      expect(isMatch("\\a*", "bb")).toBe(false);
      expect(isMatch("\\a*", "bcd")).toBe(false);
      expect(isMatch("\\a*", "bdir/")).toBe(false);
      expect(isMatch("\\a*", "Beware")).toBe(false);
      expect(isMatch("\\a*", "c")).toBe(false);
      expect(isMatch("\\a*", "ca")).toBe(false);
      expect(isMatch("\\a*", "cb")).toBe(false);
      expect(isMatch("\\a*", "d")).toBe(false);
      expect(isMatch("\\a*", "dd")).toBe(false);
      expect(isMatch("\\a*", "de")).toBe(false);
    });

    test("bash_directories", () => {
      expect(isMatch("b*/", "*")).toBe(false);
      expect(isMatch("b*/", "**")).toBe(false);
      expect(isMatch("b*/", "\\*")).toBe(false);
      expect(isMatch("b*/", "a")).toBe(false);
      expect(isMatch("b*/", "a/*")).toBe(false);
      expect(isMatch("b*/", "abc")).toBe(false);
      expect(isMatch("b*/", "abd")).toBe(false);
      expect(isMatch("b*/", "abe")).toBe(false);
      expect(isMatch("b*/", "b")).toBe(false);
      expect(isMatch("b*/", "bb")).toBe(false);
      expect(isMatch("b*/", "bcd")).toBe(false);
      expect(isMatch("b*/", "bdir/")).toBe(true);
      expect(isMatch("b*/", "Beware")).toBe(false);
      expect(isMatch("b*/", "c")).toBe(false);
      expect(isMatch("b*/", "ca")).toBe(false);
      expect(isMatch("b*/", "cb")).toBe(false);
      expect(isMatch("b*/", "d")).toBe(false);
      expect(isMatch("b*/", "dd")).toBe(false);
      expect(isMatch("b*/", "de")).toBe(false);
    });

    test("bash_escaping", () => {
      expect(isMatch("\\^", "*")).toBe(false);
      expect(isMatch("\\^", "**")).toBe(false);
      expect(isMatch("\\^", "\\*")).toBe(false);
      expect(isMatch("\\^", "a")).toBe(false);
      expect(isMatch("\\^", "a/*")).toBe(false);
      expect(isMatch("\\^", "abc")).toBe(false);
      expect(isMatch("\\^", "abd")).toBe(false);
      expect(isMatch("\\^", "abe")).toBe(false);
      expect(isMatch("\\^", "b")).toBe(false);
      expect(isMatch("\\^", "bb")).toBe(false);
      expect(isMatch("\\^", "bcd")).toBe(false);
      expect(isMatch("\\^", "bdir/")).toBe(false);
      expect(isMatch("\\^", "Beware")).toBe(false);
      expect(isMatch("\\^", "c")).toBe(false);
      expect(isMatch("\\^", "ca")).toBe(false);
      expect(isMatch("\\^", "cb")).toBe(false);
      expect(isMatch("\\^", "d")).toBe(false);
      expect(isMatch("\\^", "dd")).toBe(false);
      expect(isMatch("\\^", "de")).toBe(false);

      expect(isMatch("\\*", "*")).toBe(true);
      expect(isMatch("\\*", "\\*")).toBe(true); // Why would this match? https://github.com/micromatch/picomatch/issues/11.toBe(false)7
      expect(isMatch("\\*", "**")).toBe(false);
      expect(isMatch("\\*", "a")).toBe(false);
      expect(isMatch("\\*", "a/*")).toBe(false);
      expect(isMatch("\\*", "abc")).toBe(false);
      expect(isMatch("\\*", "abd")).toBe(false);
      expect(isMatch("\\*", "abe")).toBe(false);
      expect(isMatch("\\*", "b")).toBe(false);
      expect(isMatch("\\*", "bb")).toBe(false);
      expect(isMatch("\\*", "bcd")).toBe(false);
      expect(isMatch("\\*", "bdir/")).toBe(false);
      expect(isMatch("\\*", "Beware")).toBe(false);
      expect(isMatch("\\*", "c")).toBe(false);
      expect(isMatch("\\*", "ca")).toBe(false);
      expect(isMatch("\\*", "cb")).toBe(false);
      expect(isMatch("\\*", "d")).toBe(false);
      expect(isMatch("\\*", "dd")).toBe(false);
      expect(isMatch("\\*", "de")).toBe(false);

      expect(isMatch("a\\*", "*")).toBe(false);
      expect(isMatch("a\\*", "**")).toBe(false);
      expect(isMatch("a\\*", "\\*")).toBe(false);
      expect(isMatch("a\\*", "a")).toBe(false);
      expect(isMatch("a\\*", "a/*")).toBe(false);
      expect(isMatch("a\\*", "abc")).toBe(false);
      expect(isMatch("a\\*", "abd")).toBe(false);
      expect(isMatch("a\\*", "abe")).toBe(false);
      expect(isMatch("a\\*", "b")).toBe(false);
      expect(isMatch("a\\*", "bb")).toBe(false);
      expect(isMatch("a\\*", "bcd")).toBe(false);
      expect(isMatch("a\\*", "bdir/")).toBe(false);
      expect(isMatch("a\\*", "Beware")).toBe(false);
      expect(isMatch("a\\*", "c")).toBe(false);
      expect(isMatch("a\\*", "ca")).toBe(false);
      expect(isMatch("a\\*", "cb")).toBe(false);
      expect(isMatch("a\\*", "d")).toBe(false);
      expect(isMatch("a\\*", "dd")).toBe(false);
      expect(isMatch("a\\*", "de")).toBe(false);

      expect(isMatch("*q*", "aqa")).toBe(true);
      expect(isMatch("*q*", "aaqaa")).toBe(true);
      expect(isMatch("*q*", "*")).toBe(false);
      expect(isMatch("*q*", "**")).toBe(false);
      expect(isMatch("*q*", "\\*")).toBe(false);
      expect(isMatch("*q*", "a")).toBe(false);
      expect(isMatch("*q*", "a/*")).toBe(false);
      expect(isMatch("*q*", "abc")).toBe(false);
      expect(isMatch("*q*", "abd")).toBe(false);
      expect(isMatch("*q*", "abe")).toBe(false);
      expect(isMatch("*q*", "b")).toBe(false);
      expect(isMatch("*q*", "bb")).toBe(false);
      expect(isMatch("*q*", "bcd")).toBe(false);
      expect(isMatch("*q*", "bdir/")).toBe(false);
      expect(isMatch("*q*", "Beware")).toBe(false);
      expect(isMatch("*q*", "c")).toBe(false);
      expect(isMatch("*q*", "ca")).toBe(false);
      expect(isMatch("*q*", "cb")).toBe(false);
      expect(isMatch("*q*", "d")).toBe(false);
      expect(isMatch("*q*", "dd")).toBe(false);
      expect(isMatch("*q*", "de")).toBe(false);

      expect(isMatch("\\**", "*")).toBe(true);
      expect(isMatch("\\**", "**")).toBe(true);
      expect(isMatch("\\**", "\\*")).toBe(false);
      expect(isMatch("\\**", "a")).toBe(false);
      expect(isMatch("\\**", "a/*")).toBe(false);
      expect(isMatch("\\**", "abc")).toBe(false);
      expect(isMatch("\\**", "abd")).toBe(false);
      expect(isMatch("\\**", "abe")).toBe(false);
      expect(isMatch("\\**", "b")).toBe(false);
      expect(isMatch("\\**", "bb")).toBe(false);
      expect(isMatch("\\**", "bcd")).toBe(false);
      expect(isMatch("\\**", "bdir/")).toBe(false);
      expect(isMatch("\\**", "Beware")).toBe(false);
      expect(isMatch("\\**", "c")).toBe(false);
      expect(isMatch("\\**", "ca")).toBe(false);
      expect(isMatch("\\**", "cb")).toBe(false);
      expect(isMatch("\\**", "d")).toBe(false);
      expect(isMatch("\\**", "dd")).toBe(false);
      expect(isMatch("\\**", "de")).toBe(false);
    });

    test("bash_classes", () => {
      expect(isMatch("a*[^c]", "*")).toBe(false);
      expect(isMatch("a*[^c]", "**")).toBe(false);
      expect(isMatch("a*[^c]", "\\*")).toBe(false);
      expect(isMatch("a*[^c]", "a")).toBe(false);
      expect(isMatch("a*[^c]", "a/*")).toBe(false);
      expect(isMatch("a*[^c]", "abc")).toBe(false);
      expect(isMatch("a*[^c]", "abd")).toBe(true);
      expect(isMatch("a*[^c]", "abe")).toBe(true);
      expect(isMatch("a*[^c]", "b")).toBe(false);
      expect(isMatch("a*[^c]", "bb")).toBe(false);
      expect(isMatch("a*[^c]", "bcd")).toBe(false);
      expect(isMatch("a*[^c]", "bdir/")).toBe(false);
      expect(isMatch("a*[^c]", "Beware")).toBe(false);
      expect(isMatch("a*[^c]", "c")).toBe(false);
      expect(isMatch("a*[^c]", "ca")).toBe(false);
      expect(isMatch("a*[^c]", "cb")).toBe(false);
      expect(isMatch("a*[^c]", "d")).toBe(false);
      expect(isMatch("a*[^c]", "dd")).toBe(false);
      expect(isMatch("a*[^c]", "de")).toBe(false);
      expect(isMatch("a*[^c]", "baz")).toBe(false);
      expect(isMatch("a*[^c]", "bzz")).toBe(false);
      expect(isMatch("a*[^c]", "BZZ")).toBe(false);
      expect(isMatch("a*[^c]", "beware")).toBe(false);
      expect(isMatch("a*[^c]", "BewAre")).toBe(false);

      expect(isMatch("a[X-]b", "a-b")).toBe(true);
      expect(isMatch("a[X-]b", "aXb")).toBe(true);

      expect(isMatch("[a-y]*[^c]", "*")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "a*")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "**")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "\\*")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "a")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "a123b")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "a123c")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "ab")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "a/*")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "abc")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "abd")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "abe")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "b")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "bd")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "bb")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "bcd")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "bdir/")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "Beware")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "c")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "ca")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "cb")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "d")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "dd")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "dd")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "dd")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "de")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "baz")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "bzz")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "bzz")).toBe(true);
      expect(isMatch("bzz", "[a-y]*[^c]")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "BZZ")).toBe(false);
      expect(isMatch("[a-y]*[^c]", "beware")).toBe(true);
      expect(isMatch("[a-y]*[^c]", "BewAre")).toBe(false);

      expect(isMatch("a\\*b/*", "a*b/ooo")).toBe(true);
      expect(isMatch("a\\*?/*", "a*b/ooo")).toBe(true);

      expect(isMatch("a[b]c", "*")).toBe(false);
      expect(isMatch("a[b]c", "**")).toBe(false);
      expect(isMatch("a[b]c", "\\*")).toBe(false);
      expect(isMatch("a[b]c", "a")).toBe(false);
      expect(isMatch("a[b]c", "a/*")).toBe(false);
      expect(isMatch("a[b]c", "abc")).toBe(true);
      expect(isMatch("a[b]c", "abd")).toBe(false);
      expect(isMatch("a[b]c", "abe")).toBe(false);
      expect(isMatch("a[b]c", "b")).toBe(false);
      expect(isMatch("a[b]c", "bb")).toBe(false);
      expect(isMatch("a[b]c", "bcd")).toBe(false);
      expect(isMatch("a[b]c", "bdir/")).toBe(false);
      expect(isMatch("a[b]c", "Beware")).toBe(false);
      expect(isMatch("a[b]c", "c")).toBe(false);
      expect(isMatch("a[b]c", "ca")).toBe(false);
      expect(isMatch("a[b]c", "cb")).toBe(false);
      expect(isMatch("a[b]c", "d")).toBe(false);
      expect(isMatch("a[b]c", "dd")).toBe(false);
      expect(isMatch("a[b]c", "de")).toBe(false);
      expect(isMatch("a[b]c", "baz")).toBe(false);
      expect(isMatch("a[b]c", "bzz")).toBe(false);
      expect(isMatch("a[b]c", "BZZ")).toBe(false);
      expect(isMatch("a[b]c", "beware")).toBe(false);
      expect(isMatch("a[b]c", "BewAre")).toBe(false);

      expect(isMatch('a["b"]c', "*")).toBe(false);
      expect(isMatch('a["b"]c', "**")).toBe(false);
      expect(isMatch('a["b"]c', "\\*")).toBe(false);
      expect(isMatch('a["b"]c', "a")).toBe(false);
      expect(isMatch('a["b"]c', "a/*")).toBe(false);
      expect(isMatch('a["b"]c', "abc")).toBe(true);
      expect(isMatch('a["b"]c', "abd")).toBe(false);
      expect(isMatch('a["b"]c', "abe")).toBe(false);
      expect(isMatch('a["b"]c', "b")).toBe(false);
      expect(isMatch('a["b"]c', "bb")).toBe(false);
      expect(isMatch('a["b"]c', "bcd")).toBe(false);
      expect(isMatch('a["b"]c', "bdir/")).toBe(false);
      expect(isMatch('a["b"]c', "Beware")).toBe(false);
      expect(isMatch('a["b"]c', "c")).toBe(false);
      expect(isMatch('a["b"]c', "ca")).toBe(false);
      expect(isMatch('a["b"]c', "cb")).toBe(false);
      expect(isMatch('a["b"]c', "d")).toBe(false);
      expect(isMatch('a["b"]c', "dd")).toBe(false);
      expect(isMatch('a["b"]c', "de")).toBe(false);
      expect(isMatch('a["b"]c', "baz")).toBe(false);
      expect(isMatch('a["b"]c', "bzz")).toBe(false);
      expect(isMatch('a["b"]c', "BZZ")).toBe(false);
      expect(isMatch('a["b"]c', "beware")).toBe(false);
      expect(isMatch('a["b"]c', "BewAre")).toBe(false);

      expect(isMatch("a[\\\\b]c", "*")).toBe(false);
      expect(isMatch("a[\\\\b]c", "**")).toBe(false);
      expect(isMatch("a[\\\\b]c", "\\*")).toBe(false);
      expect(isMatch("a[\\\\b]c", "a")).toBe(false);
      expect(isMatch("a[\\\\b]c", "a/*")).toBe(false);
      expect(isMatch("a[\\\\b]c", "abc")).toBe(true);
      expect(isMatch("a[\\\\b]c", "abd")).toBe(false);
      expect(isMatch("a[\\\\b]c", "abe")).toBe(false);
      expect(isMatch("a[\\\\b]c", "b")).toBe(false);
      expect(isMatch("a[\\\\b]c", "bb")).toBe(false);
      expect(isMatch("a[\\\\b]c", "bcd")).toBe(false);
      expect(isMatch("a[\\\\b]c", "bdir/")).toBe(false);
      expect(isMatch("a[\\\\b]c", "Beware")).toBe(false);
      expect(isMatch("a[\\\\b]c", "c")).toBe(false);
      expect(isMatch("a[\\\\b]c", "ca")).toBe(false);
      expect(isMatch("a[\\\\b]c", "cb")).toBe(false);
      expect(isMatch("a[\\\\b]c", "d")).toBe(false);
      expect(isMatch("a[\\\\b]c", "dd")).toBe(false);
      expect(isMatch("a[\\\\b]c", "de")).toBe(false);
      expect(isMatch("a[\\\\b]c", "baz")).toBe(false);
      expect(isMatch("a[\\\\b]c", "bzz")).toBe(false);
      expect(isMatch("a[\\\\b]c", "BZZ")).toBe(false);
      expect(isMatch("a[\\\\b]c", "beware")).toBe(false);
      expect(isMatch("a[\\\\b]c", "BewAre")).toBe(false);

      expect(isMatch("a[\\b]c", "*")).toBe(false);
      expect(isMatch("a[\\b]c", "**")).toBe(false);
      expect(isMatch("a[\\b]c", "\\*")).toBe(false);
      expect(isMatch("a[\\b]c", "a")).toBe(false);
      expect(isMatch("a[\\b]c", "a/*")).toBe(false);
      expect(isMatch("a[\\b]c", "abc")).toBe(false);
      expect(isMatch("a[\\b]c", "abd")).toBe(false);
      expect(isMatch("a[\\b]c", "abe")).toBe(false);
      expect(isMatch("a[\\b]c", "b")).toBe(false);
      expect(isMatch("a[\\b]c", "bb")).toBe(false);
      expect(isMatch("a[\\b]c", "bcd")).toBe(false);
      expect(isMatch("a[\\b]c", "bdir/")).toBe(false);
      expect(isMatch("a[\\b]c", "Beware")).toBe(false);
      expect(isMatch("a[\\b]c", "c")).toBe(false);
      expect(isMatch("a[\\b]c", "ca")).toBe(false);
      expect(isMatch("a[\\b]c", "cb")).toBe(false);
      expect(isMatch("a[\\b]c", "d")).toBe(false);
      expect(isMatch("a[\\b]c", "dd")).toBe(false);
      expect(isMatch("a[\\b]c", "de")).toBe(false);
      expect(isMatch("a[\\b]c", "baz")).toBe(false);
      expect(isMatch("a[\\b]c", "bzz")).toBe(false);
      expect(isMatch("a[\\b]c", "BZZ")).toBe(false);
      expect(isMatch("a[\\b]c", "beware")).toBe(false);
      expect(isMatch("a[\\b]c", "BewAre")).toBe(false);

      expect(isMatch("a[b-d]c", "*")).toBe(false);
      expect(isMatch("a[b-d]c", "**")).toBe(false);
      expect(isMatch("a[b-d]c", "\\*")).toBe(false);
      expect(isMatch("a[b-d]c", "a")).toBe(false);
      expect(isMatch("a[b-d]c", "a/*")).toBe(false);
      expect(isMatch("a[b-d]c", "abc")).toBe(true);
      expect(isMatch("a[b-d]c", "abd")).toBe(false);
      expect(isMatch("a[b-d]c", "abe")).toBe(false);
      expect(isMatch("a[b-d]c", "b")).toBe(false);
      expect(isMatch("a[b-d]c", "bb")).toBe(false);
      expect(isMatch("a[b-d]c", "bcd")).toBe(false);
      expect(isMatch("a[b-d]c", "bdir/")).toBe(false);
      expect(isMatch("a[b-d]c", "Beware")).toBe(false);
      expect(isMatch("a[b-d]c", "c")).toBe(false);
      expect(isMatch("a[b-d]c", "ca")).toBe(false);
      expect(isMatch("a[b-d]c", "cb")).toBe(false);
      expect(isMatch("a[b-d]c", "d")).toBe(false);
      expect(isMatch("a[b-d]c", "dd")).toBe(false);
      expect(isMatch("a[b-d]c", "de")).toBe(false);
      expect(isMatch("a[b-d]c", "baz")).toBe(false);
      expect(isMatch("a[b-d]c", "bzz")).toBe(false);
      expect(isMatch("a[b-d]c", "BZZ")).toBe(false);
      expect(isMatch("a[b-d]c", "beware")).toBe(false);
      expect(isMatch("a[b-d]c", "BewAre")).toBe(false);

      expect(isMatch("a?c", "*")).toBe(false);
      expect(isMatch("a?c", "**")).toBe(false);
      expect(isMatch("a?c", "\\*")).toBe(false);
      expect(isMatch("a?c", "a")).toBe(false);
      expect(isMatch("a?c", "a/*")).toBe(false);
      expect(isMatch("a?c", "abc")).toBe(true);
      expect(isMatch("a?c", "abd")).toBe(false);
      expect(isMatch("a?c", "abe")).toBe(false);
      expect(isMatch("a?c", "b")).toBe(false);
      expect(isMatch("a?c", "bb")).toBe(false);
      expect(isMatch("a?c", "bcd")).toBe(false);
      expect(isMatch("a?c", "bdir/")).toBe(false);
      expect(isMatch("a?c", "Beware")).toBe(false);
      expect(isMatch("a?c", "c")).toBe(false);
      expect(isMatch("a?c", "ca")).toBe(false);
      expect(isMatch("a?c", "cb")).toBe(false);
      expect(isMatch("a?c", "d")).toBe(false);
      expect(isMatch("a?c", "dd")).toBe(false);
      expect(isMatch("a?c", "de")).toBe(false);
      expect(isMatch("a?c", "baz")).toBe(false);
      expect(isMatch("a?c", "bzz")).toBe(false);
      expect(isMatch("a?c", "BZZ")).toBe(false);
      expect(isMatch("a?c", "beware")).toBe(false);
      expect(isMatch("a?c", "BewAre")).toBe(false);

      expect(isMatch("*/man*/bash.*", "man/man1/bash.1")).toBe(true);

      expect(isMatch("[^a-c]*", "*")).toBe(true);
      expect(isMatch("[^a-c]*", "**")).toBe(true);
      expect(isMatch("[^a-c]*", "a")).toBe(false);
      expect(isMatch("[^a-c]*", "a/*")).toBe(false);
      expect(isMatch("[^a-c]*", "abc")).toBe(false);
      expect(isMatch("[^a-c]*", "abd")).toBe(false);
      expect(isMatch("[^a-c]*", "abe")).toBe(false);
      expect(isMatch("[^a-c]*", "b")).toBe(false);
      expect(isMatch("[^a-c]*", "bb")).toBe(false);
      expect(isMatch("[^a-c]*", "bcd")).toBe(false);
      expect(isMatch("[^a-c]*", "bdir/")).toBe(false);
      expect(isMatch("[^a-c]*", "Beware")).toBe(true);
      expect(isMatch("[^a-c]*", "Beware")).toBe(true);
      expect(isMatch("[^a-c]*", "c")).toBe(false);
      expect(isMatch("[^a-c]*", "ca")).toBe(false);
      expect(isMatch("[^a-c]*", "cb")).toBe(false);
      expect(isMatch("[^a-c]*", "d")).toBe(true);
      expect(isMatch("[^a-c]*", "dd")).toBe(true);
      expect(isMatch("[^a-c]*", "de")).toBe(true);
      expect(isMatch("[^a-c]*", "baz")).toBe(false);
      expect(isMatch("[^a-c]*", "bzz")).toBe(false);
      expect(isMatch("[^a-c]*", "BZZ")).toBe(true);
      expect(isMatch("[^a-c]*", "beware")).toBe(false);
      expect(isMatch("[^a-c]*", "BewAre")).toBe(true);
    });

    test("bash_wildmatch", () => {
      expect(isMatch("a[]-]b", "aab")).toBe(false);
      expect(isMatch("[ten]", "ten")).toBe(false);
      expect(isMatch("]", "]")).toBe(true);
      // expect ( isMatch ( "a[]-]b", "a-b" ) );
      // expect ( isMatch ( "a[]-]b", "a]b" ) );
      // expect ( isMatch ( "a[]]b", "a]b" ) );
      // expect ( isMatch ( "a[\\]a\\-]b", "aab" ) );
      expect(isMatch("t[a-g]n", "ten")).toBe(true);
      expect(isMatch("t[^a-g]n", "ton")).toBe(true);
    });

    test("bash_slashmatch", () => {
      expect(isMatch("f[^eiu][^eiu][^eiu][^eiu][^eiu]r", "foo/bar")).toBe(
        false,
      );
      expect(isMatch("foo[/]bar", "foo/bar")).toBe(true);
      expect(isMatch("f[^eiu][^eiu][^eiu][^eiu][^eiu]r", "foo-bar")).toBe(true);
    });

    test("bash_extra_stars", () => {
      expect(isMatch("a**c", "bbc")).toBe(false);
      expect(isMatch("a**c", "abc")).toBe(true);
      expect(isMatch("a**c", "bbd")).toBe(false);

      expect(isMatch("a***c", "bbc")).toBe(false);
      expect(isMatch("a***c", "abc")).toBe(true);
      expect(isMatch("a***c", "bbd")).toBe(false);

      expect(isMatch("a*****?c", "bbc")).toBe(false);
      expect(isMatch("a*****?c", "abc")).toBe(true);
      expect(isMatch("a*****?c", "bbc")).toBe(false);

      expect(isMatch("?*****??", "bbc")).toBe(true);
      expect(isMatch("?*****??", "abc")).toBe(true);

      expect(isMatch("*****??", "bbc")).toBe(true);
      expect(isMatch("*****??", "abc")).toBe(true);

      expect(isMatch("?*****?c", "bbc")).toBe(true);
      expect(isMatch("?*****?c", "abc")).toBe(true);

      expect(isMatch("?***?****c", "bbc")).toBe(true);
      expect(isMatch("?***?****c", "abc")).toBe(true);
      expect(isMatch("?***?****c", "bbd")).toBe(false);

      expect(isMatch("?***?****?", "bbc")).toBe(true);
      expect(isMatch("?***?****?", "abc")).toBe(true);

      expect(isMatch("?***?****", "bbc")).toBe(true);
      expect(isMatch("?***?****", "abc")).toBe(true);

      expect(isMatch("*******c", "bbc")).toBe(true);
      expect(isMatch("*******c", "abc")).toBe(true);

      expect(isMatch("*******?", "bbc")).toBe(true);
      expect(isMatch("*******?", "abc")).toBe(true);

      expect(isMatch("a*cd**?**??k", "abcdecdhjk")).toBe(true);
      expect(isMatch("a**?**cd**?**??k", "abcdecdhjk")).toBe(true);
      expect(isMatch("a**?**cd**?**??k***", "abcdecdhjk")).toBe(true);
      expect(isMatch("a**?**cd**?**??***k", "abcdecdhjk")).toBe(true);
      expect(isMatch("a**?**cd**?**??***k**", "abcdecdhjk")).toBe(true);
      expect(isMatch("a****c**?**??*****", "abcdecdhjk")).toBe(true);
    });

    test("stars", () => {
      expect(isMatch("*.js", "a/b/c/z.js")).toBe(false);
      expect(isMatch("*.js", "a/b/z.js")).toBe(false);
      expect(isMatch("*.js", "a/z.js")).toBe(false);
      expect(isMatch("*.js", "z.js")).toBe(true);

      expect(isMatch("*/*", "a/.ab")).toBe(true);
      expect(isMatch("*", ".ab")).toBe(true);

      expect(isMatch("z*.js", "z.js")).toBe(true);
      expect(isMatch("*/*", "a/z")).toBe(true);
      expect(isMatch("*/z*.js", "a/z.js")).toBe(true);
      expect(isMatch("a/z*.js", "a/z.js")).toBe(true);

      expect(isMatch("*", "ab")).toBe(true);
      expect(isMatch("*", "abc")).toBe(true);

      expect(isMatch("f*", "bar")).toBe(false);
      expect(isMatch("*r", "foo")).toBe(false);
      expect(isMatch("b*", "foo")).toBe(false);
      expect(isMatch("*", "foo/bar")).toBe(false);
      expect(isMatch("*c", "abc")).toBe(true);
      expect(isMatch("a*", "abc")).toBe(true);
      expect(isMatch("a*c", "abc")).toBe(true);
      expect(isMatch("*r", "bar")).toBe(true);
      expect(isMatch("b*", "bar")).toBe(true);
      expect(isMatch("f*", "foo")).toBe(true);

      expect(isMatch("*abc*", "one abc two")).toBe(true);
      expect(isMatch("a*b", "a         b")).toBe(true);

      expect(isMatch("*a*", "foo")).toBe(false);
      expect(isMatch("*a*", "bar")).toBe(true);
      expect(isMatch("*abc*", "oneabctwo")).toBe(true);
      expect(isMatch("*-bc-*", "a-b.c-d")).toBe(false);
      expect(isMatch("*-*.*-*", "a-b.c-d")).toBe(true);
      expect(isMatch("*-b*c-*", "a-b.c-d")).toBe(true);
      expect(isMatch("*-b.c-*", "a-b.c-d")).toBe(true);
      expect(isMatch("*.*", "a-b.c-d")).toBe(true);
      expect(isMatch("*.*-*", "a-b.c-d")).toBe(true);
      expect(isMatch("*.*-d", "a-b.c-d")).toBe(true);
      expect(isMatch("*.c-*", "a-b.c-d")).toBe(true);
      expect(isMatch("*b.*d", "a-b.c-d")).toBe(true);
      expect(isMatch("a*.c*", "a-b.c-d")).toBe(true);
      expect(isMatch("a-*.*-d", "a-b.c-d")).toBe(true);
      expect(isMatch("*.*", "a.b")).toBe(true);
      expect(isMatch("*.b", "a.b")).toBe(true);
      expect(isMatch("a.*", "a.b")).toBe(true);
      expect(isMatch("a.b", "a.b")).toBe(true);

      expect(isMatch("**-bc-**", "a-b.c-d")).toBe(false);
      expect(isMatch("**-**.**-**", "a-b.c-d")).toBe(true);
      expect(isMatch("**-b**c-**", "a-b.c-d")).toBe(true);
      expect(isMatch("**-b.c-**", "a-b.c-d")).toBe(true);
      expect(isMatch("**.**", "a-b.c-d")).toBe(true);
      expect(isMatch("**.**-**", "a-b.c-d")).toBe(true);
      expect(isMatch("**.**-d", "a-b.c-d")).toBe(true);
      expect(isMatch("**.c-**", "a-b.c-d")).toBe(true);
      expect(isMatch("**b.**d", "a-b.c-d")).toBe(true);
      expect(isMatch("a**.c**", "a-b.c-d")).toBe(true);
      expect(isMatch("a-**.**-d", "a-b.c-d")).toBe(true);
      expect(isMatch("**.**", "a.b")).toBe(true);
      expect(isMatch("**.b", "a.b")).toBe(true);
      expect(isMatch("a.**", "a.b")).toBe(true);
      expect(isMatch("a.b", "a.b")).toBe(true);

      expect(isMatch("*/*", "/ab")).toBe(true);
      expect(isMatch(".", ".")).toBe(true);
      expect(isMatch("a/", "a/.b")).toBe(false);
      expect(isMatch("/*", "/ab")).toBe(true);
      expect(isMatch("/??", "/ab")).toBe(true);
      expect(isMatch("/?b", "/ab")).toBe(true);
      expect(isMatch("/*", "/cd")).toBe(true);
      expect(isMatch("a", "a")).toBe(true);
      expect(isMatch("a/.*", "a/.b")).toBe(true);
      expect(isMatch("?/?", "a/b")).toBe(true);
      expect(isMatch("a/**/j/**/z/*.md", "a/b/c/d/e/j/n/p/o/z/c.md")).toBe(
        true,
      );
      expect(isMatch("a/**/z/*.md", "a/b/c/d/e/z/c.md")).toBe(true);
      expect(isMatch("a/b/c/*.md", "a/b/c/xyz.md")).toBe(true);
      expect(isMatch("a/b/c/*.md", "a/b/c/xyz.md")).toBe(true);
      expect(isMatch("a/*/z/.a", "a/b/z/.a")).toBe(true);
      expect(isMatch("bz", "a/b/z/.a")).toBe(false);
      expect(isMatch("a/**/c/*.md", "a/bb.bb/aa/b.b/aa/c/xyz.md")).toBe(true);
      expect(isMatch("a/**/c/*.md", "a/bb.bb/aa/bb/aa/c/xyz.md")).toBe(true);
      expect(isMatch("a/*/c/*.md", "a/bb.bb/c/xyz.md")).toBe(true);
      expect(isMatch("a/*/c/*.md", "a/bb/c/xyz.md")).toBe(true);
      expect(isMatch("a/*/c/*.md", "a/bbbb/c/xyz.md")).toBe(true);
      expect(isMatch("*", "aaa")).toBe(true);
      expect(isMatch("*", "ab")).toBe(true);
      expect(isMatch("ab", "ab")).toBe(true);

      expect(isMatch("*/*/*", "aaa")).toBe(false);
      expect(isMatch("*/*/*", "aaa/bb/aa/rr")).toBe(false);
      expect(isMatch("aaa*", "aaa/bba/ccc")).toBe(false);
      expect(isMatch("aaa**", "aaa/bba/ccc")).toBe(false);
      expect(isMatch("aaa/*", "aaa/bba/ccc")).toBe(false);
      expect(isMatch("aaa/*ccc", "aaa/bba/ccc")).toBe(false);
      expect(isMatch("aaa/*z", "aaa/bba/ccc")).toBe(false);
      expect(isMatch("*/*/*", "aaa/bbb")).toBe(false);
      expect(isMatch("*/*jk*/*i", "ab/zzz/ejkl/hi")).toBe(false);
      expect(isMatch("*/*/*", "aaa/bba/ccc")).toBe(true);
      expect(isMatch("aaa/**", "aaa/bba/ccc")).toBe(true);
      expect(isMatch("aaa/*", "aaa/bbb")).toBe(true);
      expect(isMatch("*/*z*/*/*i", "ab/zzz/ejkl/hi")).toBe(true);
      expect(isMatch("*j*i", "abzzzejklhi")).toBe(true);

      expect(isMatch("*", "a")).toBe(true);
      expect(isMatch("*", "b")).toBe(true);
      expect(isMatch("*", "a/a")).toBe(false);
      expect(isMatch("*", "a/a/a")).toBe(false);
      expect(isMatch("*", "a/a/b")).toBe(false);
      expect(isMatch("*", "a/a/a/a")).toBe(false);
      expect(isMatch("*", "a/a/a/a/a")).toBe(false);

      expect(isMatch("*/*", "a")).toBe(false);
      expect(isMatch("*/*", "a/a")).toBe(true);
      expect(isMatch("*/*", "a/a/a")).toBe(false);

      expect(isMatch("*/*/*", "a")).toBe(false);
      expect(isMatch("*/*/*", "a/a")).toBe(false);
      expect(isMatch("*/*/*", "a/a/a")).toBe(true);
      expect(isMatch("*/*/*", "a/a/a/a")).toBe(false);

      expect(isMatch("*/*/*/*", "a")).toBe(false);
      expect(isMatch("*/*/*/*", "a/a")).toBe(false);
      expect(isMatch("*/*/*/*", "a/a/a")).toBe(false);
      expect(isMatch("*/*/*/*", "a/a/a/a")).toBe(true);
      expect(isMatch("*/*/*/*", "a/a/a/a/a")).toBe(false);

      expect(isMatch("*/*/*/*/*", "a")).toBe(false);
      expect(isMatch("*/*/*/*/*", "a/a")).toBe(false);
      expect(isMatch("*/*/*/*/*", "a/a/a")).toBe(false);
      expect(isMatch("*/*/*/*/*", "a/a/b")).toBe(false);
      expect(isMatch("*/*/*/*/*", "a/a/a/a")).toBe(false);
      expect(isMatch("*/*/*/*/*", "a/a/a/a/a")).toBe(true);
      expect(isMatch("*/*/*/*/*", "a/a/a/a/a/a")).toBe(false);

      expect(isMatch("a/*", "a")).toBe(false);
      expect(isMatch("a/*", "a/a")).toBe(true);
      expect(isMatch("a/*", "a/a/a")).toBe(false);
      expect(isMatch("a/*", "a/a/a/a")).toBe(false);
      expect(isMatch("a/*", "a/a/a/a/a")).toBe(false);

      expect(isMatch("a/*/*", "a")).toBe(false);
      expect(isMatch("a/*/*", "a/a")).toBe(false);
      expect(isMatch("a/*/*", "a/a/a")).toBe(true);
      expect(isMatch("a/*/*", "b/a/a")).toBe(false);
      expect(isMatch("a/*/*", "a/a/a/a")).toBe(false);
      expect(isMatch("a/*/*", "a/a/a/a/a")).toBe(false);

      expect(isMatch("a/*/*/*", "a")).toBe(false);
      expect(isMatch("a/*/*/*", "a/a")).toBe(false);
      expect(isMatch("a/*/*/*", "a/a/a")).toBe(false);
      expect(isMatch("a/*/*/*", "a/a/a/a")).toBe(true);
      expect(isMatch("a/*/*/*", "a/a/a/a/a")).toBe(false);

      expect(isMatch("a/*/*/*/*", "a")).toBe(false);
      expect(isMatch("a/*/*/*/*", "a/a")).toBe(false);
      expect(isMatch("a/*/*/*/*", "a/a/a")).toBe(false);
      expect(isMatch("a/*/*/*/*", "a/a/b")).toBe(false);
      expect(isMatch("a/*/*/*/*", "a/a/a/a")).toBe(false);
      expect(isMatch("a/*/*/*/*", "a/a/a/a/a")).toBe(true);

      expect(isMatch("a/*/a", "a")).toBe(false);
      expect(isMatch("a/*/a", "a/a")).toBe(false);
      expect(isMatch("a/*/a", "a/a/a")).toBe(true);
      expect(isMatch("a/*/a", "a/a/b")).toBe(false);
      expect(isMatch("a/*/a", "a/a/a/a")).toBe(false);
      expect(isMatch("a/*/a", "a/a/a/a/a")).toBe(false);

      expect(isMatch("a/*/b", "a")).toBe(false);
      expect(isMatch("a/*/b", "a/a")).toBe(false);
      expect(isMatch("a/*/b", "a/a/a")).toBe(false);
      expect(isMatch("a/*/b", "a/a/b")).toBe(true);
      expect(isMatch("a/*/b", "a/a/a/a")).toBe(false);
      expect(isMatch("a/*/b", "a/a/a/a/a")).toBe(false);

      expect(isMatch("*/**/a", "a")).toBe(false);
      expect(isMatch("*/**/a", "a/a/b")).toBe(false);
      expect(isMatch("*/**/a", "a/a")).toBe(true);
      expect(isMatch("*/**/a", "a/a/a")).toBe(true);
      expect(isMatch("*/**/a", "a/a/a/a")).toBe(true);
      expect(isMatch("*/**/a", "a/a/a/a/a")).toBe(true);

      expect(isMatch("*/", "a")).toBe(false);
      expect(isMatch("*/*", "a")).toBe(false);
      expect(isMatch("a/*", "a")).toBe(false);
      // expect ( isMatch ( "*/*", "a/" ) ) . toBe(false);
      // expect ( isMatch ( "a/*", "a/" ) ) . toBe(false);
      expect(isMatch("*", "a/a")).toBe(false);
      expect(isMatch("*/", "a/a")).toBe(false);
      expect(isMatch("*/", "a/x/y")).toBe(false);
      expect(isMatch("*/*", "a/x/y")).toBe(false);
      expect(isMatch("a/*", "a/x/y")).toBe(false);
      expect(isMatch("*", "a/")).toBe(true);
      expect(isMatch("*", "a")).toBe(true);
      expect(isMatch("*/", "a/")).toBe(true);
      expect(isMatch("*{,/}", "a/")).toBe(true);
      expect(isMatch("*/*", "a/a")).toBe(true);
      expect(isMatch("a/*", "a/a")).toBe(true);

      expect(isMatch("a/**/*.txt", "a.txt")).toBe(false);
      expect(isMatch("a/**/*.txt", "a/x/y.txt")).toBe(true);
      expect(isMatch("a/**/*.txt", "a/x/y/z")).toBe(false);

      expect(isMatch("a/*.txt", "a.txt")).toBe(false);
      expect(isMatch("a/*.txt", "a/b.txt")).toBe(true);
      expect(isMatch("a/*.txt", "a/x/y.txt")).toBe(false);
      expect(isMatch("a/*.txt", "a/x/y/z")).toBe(false);

      expect(isMatch("a*.txt", "a.txt")).toBe(true);
      expect(isMatch("a*.txt", "a/b.txt")).toBe(false);
      expect(isMatch("a*.txt", "a/x/y.txt")).toBe(false);
      expect(isMatch("a*.txt", "a/x/y/z")).toBe(false);

      expect(isMatch("*.txt", "a.txt")).toBe(true);
      expect(isMatch("*.txt", "a/b.txt")).toBe(false);
      expect(isMatch("*.txt", "a/x/y.txt")).toBe(false);
      expect(isMatch("*.txt", "a/x/y/z")).toBe(false);

      expect(isMatch("a*", "a/b")).toBe(false);
      expect(isMatch("a/**/b", "a/a/bb")).toBe(false);
      expect(isMatch("a/**/b", "a/bb")).toBe(false);

      expect(isMatch("*/**", "foo")).toBe(false);
      expect(isMatch("**/", "foo/bar")).toBe(false);
      expect(isMatch("**/*/", "foo/bar")).toBe(false);
      expect(isMatch("*/*/", "foo/bar")).toBe(false);

      expect(isMatch("**/..", "/home/foo/..")).toBe(true);
      expect(isMatch("**/a", "a")).toBe(true);
      expect(isMatch("**", "a/a")).toBe(true);
      expect(isMatch("a/**", "a/a")).toBe(true);
      expect(isMatch("a/**", "a/")).toBe(true);
      expect(isMatch("a/**", "a")).toBe(true);
      expect(isMatch("**/", "a/a")).toBe(false);
      expect(isMatch("**/a/**", "a")).toBe(true);
      expect(isMatch("a/**", "a")).toBe(true);
      expect(isMatch("**/", "a/a")).toBe(false);
      expect(isMatch("*/**/a", "a/a")).toBe(true);
      expect(isMatch("a/**", "a")).toBe(true);
      expect(isMatch("*/**", "foo/")).toBe(true);
      expect(isMatch("**/*", "foo/bar")).toBe(true);
      expect(isMatch("*/*", "foo/bar")).toBe(true);
      expect(isMatch("*/**", "foo/bar")).toBe(true);
      expect(isMatch("**/", "foo/bar/")).toBe(true);
      expect(isMatch("**/*", "foo/bar/")).toBe(true);
      expect(isMatch("**/*/", "foo/bar/")).toBe(true);
      expect(isMatch("*/**", "foo/bar/")).toBe(true);
      expect(isMatch("*/*/", "foo/bar/")).toBe(true);

      expect(isMatch("*/foo", "bar/baz/foo")).toBe(false);
      expect(isMatch("**/bar/*", "deep/foo/bar")).toBe(false);
      expect(isMatch("*/bar/**", "deep/foo/bar/baz/x")).toBe(false);
      expect(isMatch("/*", "ef")).toBe(false);
      expect(isMatch("foo?bar", "foo/bar")).toBe(false);
      expect(isMatch("**/bar*", "foo/bar/baz")).toBe(false);
      expect(isMatch("**/bar**", "foo/bar/baz")).toBe(false);
      expect(isMatch("foo**bar", "foo/baz/bar")).toBe(false);
      expect(isMatch("foo*bar", "foo/baz/bar")).toBe(false);
      expect(isMatch("foo/**", "foo")).toBe(true);
      expect(isMatch("/*", "/ab")).toBe(true);
      expect(isMatch("/*", "/cd")).toBe(true);
      expect(isMatch("/*", "/ef")).toBe(true);
      expect(isMatch("a/**/j/**/z/*.md", "a/b/j/c/z/x.md")).toBe(true);
      expect(isMatch("a/**/j/**/z/*.md", "a/j/z/x.md")).toBe(true);

      expect(isMatch("**/foo", "bar/baz/foo")).toBe(true);
      expect(isMatch("**/bar/*", "deep/foo/bar/baz")).toBe(true);
      expect(isMatch("**/bar/**", "deep/foo/bar/baz/")).toBe(true);
      expect(isMatch("**/bar/*/*", "deep/foo/bar/baz/x")).toBe(true);
      expect(isMatch("foo/**/**/bar", "foo/b/a/z/bar")).toBe(true);
      expect(isMatch("foo/**/bar", "foo/b/a/z/bar")).toBe(true);
      expect(isMatch("foo/**/**/bar", "foo/bar")).toBe(true);
      expect(isMatch("foo/**/bar", "foo/bar")).toBe(true);
      expect(isMatch("*/bar/**", "foo/bar/baz/x")).toBe(true);
      expect(isMatch("foo/**/**/bar", "foo/baz/bar")).toBe(true);
      expect(isMatch("foo/**/bar", "foo/baz/bar")).toBe(true);
      expect(isMatch("**/foo", "XXX/foo")).toBe(true);
    });

    test("globstars", () => {
      expect(isMatch("**/*.js", "a/b/c/d.js")).toBe(true);
      expect(isMatch("**/*.js", "a/b/c.js")).toBe(true);
      expect(isMatch("**/*.js", "a/b.js")).toBe(true);
      expect(isMatch("a/b/**/*.js", "a/b/c/d/e/f.js")).toBe(true);
      expect(isMatch("a/b/**/*.js", "a/b/c/d/e.js")).toBe(true);
      expect(isMatch("a/b/c/**/*.js", "a/b/c/d.js")).toBe(true);
      expect(isMatch("a/b/**/*.js", "a/b/c/d.js")).toBe(true);
      expect(isMatch("a/b/**/*.js", "a/b/d.js")).toBe(true);
      expect(isMatch("a/b/**/*.js", "a/d.js")).toBe(false);
      expect(isMatch("a/b/**/*.js", "d.js")).toBe(false);

      expect(isMatch("**c", "a/b/c")).toBe(false);
      expect(isMatch("a/**c", "a/b/c")).toBe(false);
      expect(isMatch("a/**z", "a/b/c")).toBe(false);
      expect(isMatch("a/**b**/c", "a/b/c/b/c")).toBe(false);
      expect(isMatch("a/b/c**/*.js", "a/b/c/d/e.js")).toBe(false);
      expect(isMatch("a/**/b/**/c", "a/b/c/b/c")).toBe(true);
      expect(isMatch("a/**b**/c", "a/aba/c")).toBe(true);
      expect(isMatch("a/**b**/c", "a/b/c")).toBe(true);
      expect(isMatch("a/b/c**/*.js", "a/b/c/d.js")).toBe(true);

      expect(isMatch("a/**/*", "a")).toBe(false);
      expect(isMatch("a/**/**/*", "a")).toBe(false);
      expect(isMatch("a/**/**/**/*", "a")).toBe(false);
      expect(isMatch("**/a", "a/")).toBe(true);
      // expect ( isMatch ( "a/**/*", "a/" ) ) . toBe(false);
      // expect ( isMatch ( "a/**/**/*", "a/" ) ) . toBe(false);
      // expect ( isMatch ( "a/**/**/**/*", "a/" ) ) . toBe(false);
      expect(isMatch("**/a", "a/b")).toBe(false);
      expect(isMatch("a/**/j/**/z/*.md", "a/b/c/j/e/z/c.txt")).toBe(false);
      expect(isMatch("a/**/b", "a/bb")).toBe(false);
      expect(isMatch("**/a", "a/c")).toBe(false);
      expect(isMatch("**/a", "a/b")).toBe(false);
      expect(isMatch("**/a", "a/x/y")).toBe(false);
      expect(isMatch("**/a", "a/b/c/d")).toBe(false);
      expect(isMatch("**", "a")).toBe(true);
      expect(isMatch("**/a", "a")).toBe(true);
      expect(isMatch("a/**", "a")).toBe(true);
      expect(isMatch("**", "a/")).toBe(true);
      expect(isMatch("**/a/**", "a/")).toBe(true);
      expect(isMatch("a/**", "a/")).toBe(true);
      expect(isMatch("a/**/**", "a/")).toBe(true);
      expect(isMatch("**/a", "a/a")).toBe(true);
      expect(isMatch("**", "a/b")).toBe(true);
      expect(isMatch("*/*", "a/b")).toBe(true);
      expect(isMatch("a/**", "a/b")).toBe(true);
      expect(isMatch("a/**/*", "a/b")).toBe(true);
      expect(isMatch("a/**/**/*", "a/b")).toBe(true);
      expect(isMatch("a/**/**/**/*", "a/b")).toBe(true);
      expect(isMatch("a/**/b", "a/b")).toBe(true);
      expect(isMatch("**", "a/b/c")).toBe(true);
      expect(isMatch("**/*", "a/b/c")).toBe(true);
      expect(isMatch("**/**", "a/b/c")).toBe(true);
      expect(isMatch("*/**", "a/b/c")).toBe(true);
      expect(isMatch("a/**", "a/b/c")).toBe(true);
      expect(isMatch("a/**/*", "a/b/c")).toBe(true);
      expect(isMatch("a/**/**/*", "a/b/c")).toBe(true);
      expect(isMatch("a/**/**/**/*", "a/b/c")).toBe(true);
      expect(isMatch("**", "a/b/c/d")).toBe(true);
      expect(isMatch("a/**", "a/b/c/d")).toBe(true);
      expect(isMatch("a/**/*", "a/b/c/d")).toBe(true);
      expect(isMatch("a/**/**/*", "a/b/c/d")).toBe(true);
      expect(isMatch("a/**/**/**/*", "a/b/c/d")).toBe(true);
      expect(isMatch("a/b/**/c/**/*.*", "a/b/c/d.e")).toBe(true);
      expect(isMatch("a/**/f/*.md", "a/b/c/d/e/f/g.md")).toBe(true);
      expect(isMatch("a/**/f/**/k/*.md", "a/b/c/d/e/f/g/h/i/j/k/l.md")).toBe(
        true,
      );
      expect(isMatch("a/b/c/*.md", "a/b/c/def.md")).toBe(true);
      expect(isMatch("a/*/c/*.md", "a/bb.bb/c/ddd.md")).toBe(true);
      expect(isMatch("a/**/f/*.md", "a/bb.bb/cc/d.d/ee/f/ggg.md")).toBe(true);
      expect(isMatch("a/**/f/*.md", "a/bb.bb/cc/dd/ee/f/ggg.md")).toBe(true);
      expect(isMatch("a/*/c/*.md", "a/bb/c/ddd.md")).toBe(true);
      expect(isMatch("a/*/c/*.md", "a/bbbb/c/ddd.md")).toBe(true);

      expect(
        isMatch("foo/bar/**/one/**/*.*", "foo/bar/baz/one/image.png"),
      ).toBe(true);
      expect(
        isMatch("foo/bar/**/one/**/*.*", "foo/bar/baz/one/two/image.png"),
      ).toBe(true);
      expect(
        isMatch("foo/bar/**/one/**/*.*", "foo/bar/baz/one/two/three/image.png"),
      ).toBe(true);
      expect(isMatch("a/b/**/f", "a/b/c/d/")).toBe(false);
      expect(isMatch("a/**", "a")).toBe(true);
      expect(isMatch("**", "a")).toBe(true);
      expect(isMatch("a{,/**}", "a")).toBe(true);
      expect(isMatch("**", "a/")).toBe(true);
      expect(isMatch("a/**", "a/")).toBe(true);
      expect(isMatch("**", "a/b/c/d")).toBe(true);
      expect(isMatch("**", "a/b/c/d/")).toBe(true);
      expect(isMatch("**/**", "a/b/c/d/")).toBe(true);
      expect(isMatch("**/b/**", "a/b/c/d/")).toBe(true);
      expect(isMatch("a/b/**", "a/b/c/d/")).toBe(true);
      expect(isMatch("a/b/**/", "a/b/c/d/")).toBe(true);
      expect(isMatch("a/b/**/c/**/", "a/b/c/d/")).toBe(true);
      expect(isMatch("a/b/**/c/**/d/", "a/b/c/d/")).toBe(true);
      expect(isMatch("a/b/**/**/*.*", "a/b/c/d/e.f")).toBe(true);
      expect(isMatch("a/b/**/*.*", "a/b/c/d/e.f")).toBe(true);
      expect(isMatch("a/b/**/c/**/d/*.*", "a/b/c/d/e.f")).toBe(true);
      expect(isMatch("a/b/**/d/**/*.*", "a/b/c/d/e.f")).toBe(true);
      expect(isMatch("a/b/**/d/**/*.*", "a/b/c/d/g/e.f")).toBe(true);
      expect(isMatch("a/b/**/d/**/*.*", "a/b/c/d/g/g/e.f")).toBe(true);
      expect(isMatch("a/b-*/**/z.js", "a/b-c/z.js")).toBe(true);
      expect(isMatch("a/b-*/**/z.js", "a/b-c/d/e/z.js")).toBe(true);

      expect(isMatch("*/*", "a/b")).toBe(true);
      expect(isMatch("a/b/c/*.md", "a/b/c/xyz.md")).toBe(true);
      expect(isMatch("a/*/c/*.md", "a/bb.bb/c/xyz.md")).toBe(true);
      expect(isMatch("a/*/c/*.md", "a/bb/c/xyz.md")).toBe(true);
      expect(isMatch("a/*/c/*.md", "a/bbbb/c/xyz.md")).toBe(true);

      expect(isMatch("**/*", "a/b/c")).toBe(true);
      expect(isMatch("**/**", "a/b/c")).toBe(true);
      expect(isMatch("*/**", "a/b/c")).toBe(true);
      expect(isMatch("a/**/j/**/z/*.md", "a/b/c/d/e/j/n/p/o/z/c.md")).toBe(
        true,
      );
      expect(isMatch("a/**/z/*.md", "a/b/c/d/e/z/c.md")).toBe(true);
      expect(isMatch("a/**/c/*.md", "a/bb.bb/aa/b.b/aa/c/xyz.md")).toBe(true);
      expect(isMatch("a/**/c/*.md", "a/bb.bb/aa/bb/aa/c/xyz.md")).toBe(true);
      expect(isMatch("a/**/j/**/z/*.md", "a/b/c/j/e/z/c.txt")).toBe(false);
      expect(isMatch("a/b/**/c{d,e}/**/xyz.md", "a/b/c/xyz.md")).toBe(false);
      expect(isMatch("a/b/**/c{d,e}/**/xyz.md", "a/b/d/xyz.md")).toBe(false);
      expect(isMatch("a/**/", "a/b")).toBe(false);
      expect(isMatch("**/*", "a/b/.js/c.txt")).toBe(true);
      expect(isMatch("a/**/", "a/b/c/d")).toBe(false);
      expect(isMatch("a/**/", "a/bb")).toBe(false);
      expect(isMatch("a/**/", "a/cb")).toBe(false);
      expect(isMatch("/**", "/a/b")).toBe(true);
      expect(isMatch("**/*", "a.b")).toBe(true);
      expect(isMatch("**/*", "a.js")).toBe(true);
      expect(isMatch("**/*.js", "a.js")).toBe(true);
      expect(isMatch("a/**/", "a/")).toBe(true);
      expect(isMatch("**/*.js", "a/a.js")).toBe(true);
      expect(isMatch("**/*.js", "a/a/b.js")).toBe(true);
      expect(isMatch("a/**/b", "a/b")).toBe(true);
      expect(isMatch("a/**b", "a/b")).toBe(true);
      expect(isMatch("**/*.md", "a/b.md")).toBe(true);
      expect(isMatch("**/*", "a/b/c.js")).toBe(true);
      expect(isMatch("**/*", "a/b/c.txt")).toBe(true);
      expect(isMatch("a/**/", "a/b/c/d/")).toBe(true);
      expect(isMatch("**/*", "a/b/c/d/a.js")).toBe(true);
      expect(isMatch("a/b/**/*.js", "a/b/c/z.js")).toBe(true);
      expect(isMatch("a/b/**/*.js", "a/b/z.js")).toBe(true);
      expect(isMatch("**/*", "ab")).toBe(true);
      expect(isMatch("**/*", "ab/c")).toBe(true);
      expect(isMatch("**/*", "ab/c/d")).toBe(true);
      expect(isMatch("**/*", "abc.js")).toBe(true);

      expect(isMatch("**/", "a")).toBe(false);
      expect(isMatch("**/a/*", "a")).toBe(false);
      expect(isMatch("**/a/*/*", "a")).toBe(false);
      expect(isMatch("*/a/**", "a")).toBe(false);
      expect(isMatch("a/**/*", "a")).toBe(false);
      expect(isMatch("a/**/**/*", "a")).toBe(false);
      expect(isMatch("**/", "a/b")).toBe(false);
      expect(isMatch("**/b/*", "a/b")).toBe(false);
      expect(isMatch("**/b/*/*", "a/b")).toBe(false);
      expect(isMatch("b/**", "a/b")).toBe(false);
      expect(isMatch("**/", "a/b/c")).toBe(false);
      expect(isMatch("**/**/b", "a/b/c")).toBe(false);
      expect(isMatch("**/b", "a/b/c")).toBe(false);
      expect(isMatch("**/b/*/*", "a/b/c")).toBe(false);
      expect(isMatch("b/**", "a/b/c")).toBe(false);
      expect(isMatch("**/", "a/b/c/d")).toBe(false);
      expect(isMatch("**/d/*", "a/b/c/d")).toBe(false);
      expect(isMatch("b/**", "a/b/c/d")).toBe(false);
      expect(isMatch("**", "a")).toBe(true);
      expect(isMatch("**/**", "a")).toBe(true);
      expect(isMatch("**/**/*", "a")).toBe(true);
      expect(isMatch("**/**/a", "a")).toBe(true);
      expect(isMatch("**/a", "a")).toBe(true);
      expect(isMatch("**/a/**", "a")).toBe(true);
      expect(isMatch("a/**", "a")).toBe(true);
      expect(isMatch("**", "a/b")).toBe(true);
      expect(isMatch("**/**", "a/b")).toBe(true);
      expect(isMatch("**/**/*", "a/b")).toBe(true);
      expect(isMatch("**/**/b", "a/b")).toBe(true);
      expect(isMatch("**/b", "a/b")).toBe(true);
      expect(isMatch("**/b/**", "a/b")).toBe(true);
      expect(isMatch("*/b/**", "a/b")).toBe(true);
      expect(isMatch("a/**", "a/b")).toBe(true);
      expect(isMatch("a/**/*", "a/b")).toBe(true);
      expect(isMatch("a/**/**/*", "a/b")).toBe(true);
      expect(isMatch("**", "a/b/c")).toBe(true);
      expect(isMatch("**/**", "a/b/c")).toBe(true);
      expect(isMatch("**/**/*", "a/b/c")).toBe(true);
      expect(isMatch("**/b/*", "a/b/c")).toBe(true);
      expect(isMatch("**/b/**", "a/b/c")).toBe(true);
      expect(isMatch("*/b/**", "a/b/c")).toBe(true);
      expect(isMatch("a/**", "a/b/c")).toBe(true);
      expect(isMatch("a/**/*", "a/b/c")).toBe(true);
      expect(isMatch("a/**/**/*", "a/b/c")).toBe(true);
      expect(isMatch("**", "a/b/c/d")).toBe(true);
      expect(isMatch("**/**", "a/b/c/d")).toBe(true);
      expect(isMatch("**/**/*", "a/b/c/d")).toBe(true);
      expect(isMatch("**/**/d", "a/b/c/d")).toBe(true);
      expect(isMatch("**/b/**", "a/b/c/d")).toBe(true);
      expect(isMatch("**/b/*/*", "a/b/c/d")).toBe(true);
      expect(isMatch("**/d", "a/b/c/d")).toBe(true);
      expect(isMatch("*/b/**", "a/b/c/d")).toBe(true);
      expect(isMatch("a/**", "a/b/c/d")).toBe(true);
      expect(isMatch("a/**/*", "a/b/c/d")).toBe(true);
      expect(isMatch("a/**/**/*", "a/b/c/d")).toBe(true);
    });

    test("utf8", () => {
      expect(isMatch("フ*/**/*", "フォルダ/aaa.js")).toBe(true);
      expect(isMatch("フォ*/**/*", "フォルダ/aaa.js")).toBe(true);
      expect(isMatch("フォル*/**/*", "フォルダ/aaa.js")).toBe(true);
      expect(isMatch("フ*ル*/**/*", "フォルダ/aaa.js")).toBe(true);
      expect(isMatch("フォルダ/**/*", "フォルダ/aaa.js")).toBe(true);
    });

    test("negation", () => {
      expect(isMatch("!*", "abc")).toBe(false);
      expect(isMatch("!abc", "abc")).toBe(false);
      expect(isMatch("*!.md", "bar.md")).toBe(false);
      expect(isMatch("foo!.md", "bar.md")).toBe(false);
      expect(isMatch("\\!*!*.md", "foo!.md")).toBe(false);
      expect(isMatch("\\!*!*.md", "foo!bar.md")).toBe(false);
      expect(isMatch("*!*.md", "!foo!.md")).toBe(true);
      expect(isMatch("\\!*!*.md", "!foo!.md")).toBe(true);
      expect(isMatch("!*foo", "abc")).toBe(true);
      expect(isMatch("!foo*", "abc")).toBe(true);
      expect(isMatch("!xyz", "abc")).toBe(true);
      expect(isMatch("*!*.*", "ba!r.js")).toBe(true);
      expect(isMatch("*.md", "bar.md")).toBe(true);
      expect(isMatch("*!*.*", "foo!.md")).toBe(true);
      expect(isMatch("*!*.md", "foo!.md")).toBe(true);
      expect(isMatch("*!.md", "foo!.md")).toBe(true);
      expect(isMatch("*.md", "foo!.md")).toBe(true);
      expect(isMatch("foo!.md", "foo!.md")).toBe(true);
      expect(isMatch("*!*.md", "foo!bar.md")).toBe(true);
      expect(isMatch("*b*.md", "foobar.md")).toBe(true);

      expect(isMatch("a!!b", "a")).toBe(false);
      expect(isMatch("a!!b", "aa")).toBe(false);
      expect(isMatch("a!!b", "a/b")).toBe(false);
      expect(isMatch("a!!b", "a!b")).toBe(false);
      expect(isMatch("a!!b", "a!!b")).toBe(true);
      expect(isMatch("a!!b", "a/!!/b")).toBe(false);

      expect(isMatch("!a/b", "a/b")).toBe(false);
      expect(isMatch("!a/b", "a")).toBe(true);
      expect(isMatch("!a/b", "a.b")).toBe(true);
      expect(isMatch("!a/b", "a/a")).toBe(true);
      expect(isMatch("!a/b", "a/c")).toBe(true);
      expect(isMatch("!a/b", "b/a")).toBe(true);
      expect(isMatch("!a/b", "b/b")).toBe(true);
      expect(isMatch("!a/b", "b/c")).toBe(true);

      expect(isMatch("!abc", "abc")).toBe(false);
      expect(isMatch("!!abc", "abc")).toBe(true);
      expect(isMatch("!!!abc", "abc")).toBe(false);
      expect(isMatch("!!!!abc", "abc")).toBe(true);
      expect(isMatch("!!!!!abc", "abc")).toBe(false);
      expect(isMatch("!!!!!!abc", "abc")).toBe(true);
      expect(isMatch("!!!!!!!abc", "abc")).toBe(false);
      expect(isMatch("!!!!!!!!abc", "abc")).toBe(true);

      // expect ( isMatch ( "!(*/*)", "a/a" ) ) . toBe(false);
      // expect ( isMatch ( "!(*/*)", "a/b" ) ) . toBe(false);
      // expect ( isMatch ( "!(*/*)", "a/c" ) ) . toBe(false);
      // expect ( isMatch ( "!(*/*)", "b/a" ) ) . toBe(false);
      // expect ( isMatch ( "!(*/*)", "b/b" ) ) . toBe(false);
      // expect ( isMatch ( "!(*/*)", "b/c" ) ) . toBe(false);
      // expect ( isMatch ( "!(*/b)", "a/b" ) ) . toBe(false);
      // expect ( isMatch ( "!(*/b)", "b/b" ) ) . toBe(false);
      // expect ( isMatch ( "!(a/b)", "a/b" ) ) . toBe(false);
      expect(isMatch("!*", "a")).toBe(false);
      expect(isMatch("!*", "a.b")).toBe(false);
      expect(isMatch("!*/*", "a/a")).toBe(false);
      expect(isMatch("!*/*", "a/b")).toBe(false);
      expect(isMatch("!*/*", "a/c")).toBe(false);
      expect(isMatch("!*/*", "b/a")).toBe(false);
      expect(isMatch("!*/*", "b/b")).toBe(false);
      expect(isMatch("!*/*", "b/c")).toBe(false);
      expect(isMatch("!*/b", "a/b")).toBe(false);
      expect(isMatch("!*/b", "b/b")).toBe(false);
      expect(isMatch("!*/c", "a/c")).toBe(false);
      expect(isMatch("!*/c", "a/c")).toBe(false);
      expect(isMatch("!*/c", "b/c")).toBe(false);
      expect(isMatch("!*/c", "b/c")).toBe(false);
      expect(isMatch("!*a*", "bar")).toBe(false);
      expect(isMatch("!*a*", "fab")).toBe(false);
      expect(isMatch("!a/(*)", "a/a")).toBe(true);
      expect(isMatch("!a/(*)", "a/b")).toBe(true);
      expect(isMatch("!a/(*)", "a/c")).toBe(true);
      expect(isMatch("!a/(b)", "a/b")).toBe(true);
      expect(isMatch("!a/*", "a/a")).toBe(false);
      expect(isMatch("!a/*", "a/b")).toBe(false);
      expect(isMatch("!a/*", "a/c")).toBe(false);
      expect(isMatch("!f*b", "fab")).toBe(false);
      expect(isMatch("!(*/*)", "a")).toBe(true);
      expect(isMatch("!(*/*)", "a.b")).toBe(true);
      expect(isMatch("!(*/b)", "a")).toBe(true);
      expect(isMatch("!(*/b)", "a.b")).toBe(true);
      expect(isMatch("!(*/b)", "a/a")).toBe(true);
      expect(isMatch("!(*/b)", "a/c")).toBe(true);
      expect(isMatch("!(*/b)", "b/a")).toBe(true);
      expect(isMatch("!(*/b)", "b/c")).toBe(true);
      expect(isMatch("!(a/b)", "a")).toBe(true);
      expect(isMatch("!(a/b)", "a.b")).toBe(true);
      expect(isMatch("!(a/b)", "a/a")).toBe(true);
      expect(isMatch("!(a/b)", "a/c")).toBe(true);
      expect(isMatch("!(a/b)", "b/a")).toBe(true);
      expect(isMatch("!(a/b)", "b/b")).toBe(true);
      expect(isMatch("!(a/b)", "b/c")).toBe(true);
      expect(isMatch("!*", "a/a")).toBe(true);
      expect(isMatch("!*", "a/b")).toBe(true);
      expect(isMatch("!*", "a/c")).toBe(true);
      expect(isMatch("!*", "b/a")).toBe(true);
      expect(isMatch("!*", "b/b")).toBe(true);
      expect(isMatch("!*", "b/c")).toBe(true);
      expect(isMatch("!*/*", "a")).toBe(true);
      expect(isMatch("!*/*", "a.b")).toBe(true);
      expect(isMatch("!*/b", "a")).toBe(true);
      expect(isMatch("!*/b", "a.b")).toBe(true);
      expect(isMatch("!*/b", "a/a")).toBe(true);
      expect(isMatch("!*/b", "a/c")).toBe(true);
      expect(isMatch("!*/b", "b/a")).toBe(true);
      expect(isMatch("!*/b", "b/c")).toBe(true);
      expect(isMatch("!*/c", "a")).toBe(true);
      expect(isMatch("!*/c", "a.b")).toBe(true);
      expect(isMatch("!*/c", "a/a")).toBe(true);
      expect(isMatch("!*/c", "a/b")).toBe(true);
      expect(isMatch("!*/c", "b/a")).toBe(true);
      expect(isMatch("!*/c", "b/b")).toBe(true);
      expect(isMatch("!*a*", "foo")).toBe(true);
      expect(isMatch("!a/(*)", "a")).toBe(true);
      expect(isMatch("!a/(*)", "a.b")).toBe(true);
      expect(isMatch("!a/(*)", "b/a")).toBe(true);
      expect(isMatch("!a/(*)", "b/b")).toBe(true);
      expect(isMatch("!a/(*)", "b/c")).toBe(true);
      expect(isMatch("!a/(b)", "a")).toBe(true);
      expect(isMatch("!a/(b)", "a.b")).toBe(true);
      expect(isMatch("!a/(b)", "a/a")).toBe(true);
      expect(isMatch("!a/(b)", "a/c")).toBe(true);
      expect(isMatch("!a/(b)", "b/a")).toBe(true);
      expect(isMatch("!a/(b)", "b/b")).toBe(true);
      expect(isMatch("!a/(b)", "b/c")).toBe(true);
      expect(isMatch("!a/*", "a")).toBe(true);
      expect(isMatch("!a/*", "a.b")).toBe(true);
      expect(isMatch("!a/*", "b/a")).toBe(true);
      expect(isMatch("!a/*", "b/b")).toBe(true);
      expect(isMatch("!a/*", "b/c")).toBe(true);
      expect(isMatch("!f*b", "bar")).toBe(true);
      expect(isMatch("!f*b", "foo")).toBe(true);

      expect(isMatch("!.md", ".md")).toBe(false);
      expect(isMatch("!**/*.md", "a.js")).toBe(true);
      expect(isMatch("!**/*.md", "b.md")).toBe(false);
      expect(isMatch("!**/*.md", "c.txt")).toBe(true);
      expect(isMatch("!*.md", "a.js")).toBe(true);
      expect(isMatch("!*.md", "b.md")).toBe(false);
      expect(isMatch("!*.md", "c.txt")).toBe(true);
      expect(isMatch("!*.md", "abc.md")).toBe(false);
      expect(isMatch("!*.md", "abc.txt")).toBe(true);
      expect(isMatch("!*.md", "foo.md")).toBe(false);
      expect(isMatch("!.md", "foo.md")).toBe(true);

      expect(isMatch("!*.md", "a.js")).toBe(true);
      expect(isMatch("!*.md", "b.txt")).toBe(true);
      expect(isMatch("!*.md", "c.md")).toBe(false);
      expect(isMatch("!a/*/a.js", "a/a/a.js")).toBe(false);
      expect(isMatch("!a/*/a.js", "a/b/a.js")).toBe(false);
      expect(isMatch("!a/*/a.js", "a/c/a.js")).toBe(false);
      expect(isMatch("!a/*/*/a.js", "a/a/a/a.js")).toBe(false);
      expect(isMatch("!a/*/*/a.js", "b/a/b/a.js")).toBe(true);
      expect(isMatch("!a/*/*/a.js", "c/a/c/a.js")).toBe(true);
      expect(isMatch("!a/a*.txt", "a/a.txt")).toBe(false);
      expect(isMatch("!a/a*.txt", "a/b.txt")).toBe(true);
      expect(isMatch("!a/a*.txt", "a/c.txt")).toBe(true);
      expect(isMatch("!a.a*.txt", "a.a.txt")).toBe(false);
      expect(isMatch("!a.a*.txt", "a.b.txt")).toBe(true);
      expect(isMatch("!a.a*.txt", "a.c.txt")).toBe(true);
      expect(isMatch("!a/*.txt", "a/a.txt")).toBe(false);
      expect(isMatch("!a/*.txt", "a/b.txt")).toBe(false);
      expect(isMatch("!a/*.txt", "a/c.txt")).toBe(false);

      expect(isMatch("!*.md", "a.js")).toBe(true);
      expect(isMatch("!*.md", "b.txt")).toBe(true);
      expect(isMatch("!*.md", "c.md")).toBe(false);
      expect(isMatch("!**/a.js", "a/a/a.js")).toBe(false);
      expect(isMatch("!**/a.js", "a/b/a.js")).toBe(false);
      expect(isMatch("!**/a.js", "a/c/a.js")).toBe(false);
      expect(isMatch("!**/a.js", "a/a/b.js")).toBe(true);
      expect(isMatch("!a/**/a.js", "a/a/a/a.js")).toBe(false);
      expect(isMatch("!a/**/a.js", "b/a/b/a.js")).toBe(true);
      expect(isMatch("!a/**/a.js", "c/a/c/a.js")).toBe(true);
      expect(isMatch("!**/*.md", "a/b.js")).toBe(true);
      expect(isMatch("!**/*.md", "a.js")).toBe(true);
      expect(isMatch("!**/*.md", "a/b.md")).toBe(false);
      expect(isMatch("!**/*.md", "a.md")).toBe(false);
      expect(isMatch("**/*.md", "a/b.js")).toBe(false);
      expect(isMatch("**/*.md", "a.js")).toBe(false);
      expect(isMatch("**/*.md", "a/b.md")).toBe(true);
      expect(isMatch("**/*.md", "a.md")).toBe(true);
      expect(isMatch("!**/*.md", "a/b.js")).toBe(true);
      expect(isMatch("!**/*.md", "a.js")).toBe(true);
      expect(isMatch("!**/*.md", "a/b.md")).toBe(false);
      expect(isMatch("!**/*.md", "a.md")).toBe(false);
      expect(isMatch("!*.md", "a/b.js")).toBe(true);
      expect(isMatch("!*.md", "a.js")).toBe(true);
      expect(isMatch("!*.md", "a/b.md")).toBe(true);
      expect(isMatch("!*.md", "a.md")).toBe(false);
      expect(isMatch("!**/*.md", "a.js")).toBe(true);
      expect(isMatch("!**/*.md", "b.md")).toBe(false);
      expect(isMatch("!**/*.md", "c.txt")).toBe(true);
    });

    test("question_mark", () => {
      expect(isMatch("?", "a")).toBe(true);
      expect(isMatch("?", "aa")).toBe(false);
      expect(isMatch("?", "ab")).toBe(false);
      expect(isMatch("?", "aaa")).toBe(false);
      expect(isMatch("?", "abcdefg")).toBe(false);

      expect(isMatch("??", "a")).toBe(false);
      expect(isMatch("??", "aa")).toBe(true);
      expect(isMatch("??", "ab")).toBe(true);
      expect(isMatch("??", "aaa")).toBe(false);
      expect(isMatch("??", "abcdefg")).toBe(false);

      expect(isMatch("???", "a")).toBe(false);
      expect(isMatch("???", "aa")).toBe(false);
      expect(isMatch("???", "ab")).toBe(false);
      expect(isMatch("???", "aaa")).toBe(true);
      expect(isMatch("???", "abcdefg")).toBe(false);

      expect(isMatch("a?c", "aaa")).toBe(false);
      expect(isMatch("a?c", "aac")).toBe(true);
      expect(isMatch("a?c", "abc")).toBe(true);
      expect(isMatch("ab?", "a")).toBe(false);
      expect(isMatch("ab?", "aa")).toBe(false);
      expect(isMatch("ab?", "ab")).toBe(false);
      expect(isMatch("ab?", "ac")).toBe(false);
      expect(isMatch("ab?", "abcd")).toBe(false);
      expect(isMatch("ab?", "abbb")).toBe(false);
      expect(isMatch("a?b", "acb")).toBe(true);

      expect(isMatch("a/?/c/?/e.md", "a/bb/c/dd/e.md")).toBe(false);
      expect(isMatch("a/??/c/??/e.md", "a/bb/c/dd/e.md")).toBe(true);
      expect(isMatch("a/??/c.md", "a/bbb/c.md")).toBe(false);
      expect(isMatch("a/?/c.md", "a/b/c.md")).toBe(true);
      expect(isMatch("a/?/c/?/e.md", "a/b/c/d/e.md")).toBe(true);
      expect(isMatch("a/?/c/???/e.md", "a/b/c/d/e.md")).toBe(false);
      expect(isMatch("a/?/c/???/e.md", "a/b/c/zzz/e.md")).toBe(true);
      expect(isMatch("a/?/c.md", "a/bb/c.md")).toBe(false);
      expect(isMatch("a/??/c.md", "a/bb/c.md")).toBe(true);
      expect(isMatch("a/???/c.md", "a/bbb/c.md")).toBe(true);
      expect(isMatch("a/????/c.md", "a/bbbb/c.md")).toBe(true);
    });

    test("braces", () => {
      expect(isMatch("{a,b,c}", "a")).toBe(true);
      expect(isMatch("{a,b,c}", "b")).toBe(true);
      expect(isMatch("{a,b,c}", "c")).toBe(true);
      expect(isMatch("{a,b,c}", "aa")).toBe(false);
      expect(isMatch("{a,b,c}", "bb")).toBe(false);
      expect(isMatch("{a,b,c}", "cc")).toBe(false);

      expect(isMatch("a/{a,b}", "a/a")).toBe(true);
      expect(isMatch("a/{a,b}", "a/b")).toBe(true);
      expect(isMatch("a/{a,b}", "a/c")).toBe(false);
      expect(isMatch("a/{a,b}", "b/b")).toBe(false);
      expect(isMatch("a/{a,b,c}", "b/b")).toBe(false);
      expect(isMatch("a/{a,b,c}", "a/c")).toBe(true);
      expect(isMatch("a{b,bc}.txt", "abc.txt")).toBe(true);

      expect(isMatch("foo[{a,b}]baz", "foo{baz")).toBe(true);

      expect(isMatch("a{,b}.txt", "abc.txt")).toBe(false);
      expect(isMatch("a{a,b,}.txt", "abc.txt")).toBe(false);
      expect(isMatch("a{b,}.txt", "abc.txt")).toBe(false);
      expect(isMatch("a{,b}.txt", "a.txt")).toBe(true);
      expect(isMatch("a{b,}.txt", "a.txt")).toBe(true);
      expect(isMatch("a{a,b,}.txt", "aa.txt")).toBe(true);
      expect(isMatch("a{a,b,}.txt", "aa.txt")).toBe(true);
      expect(isMatch("a{,b}.txt", "ab.txt")).toBe(true);
      expect(isMatch("a{b,}.txt", "ab.txt")).toBe(true);

      expect(isMatch("{a/,}a/**", "a")).toBe(true);
      expect(isMatch("a{a,b/}*.txt", "aa.txt")).toBe(true);
      expect(isMatch("a{a,b/}*.txt", "ab/.txt")).toBe(true);
      expect(isMatch("a{a,b/}*.txt", "ab/a.txt")).toBe(true);
      expect(isMatch("{a/,}a/**", "a/")).toBe(true);
      expect(isMatch("{a/,}a/**", "a/a/")).toBe(true);
      expect(isMatch("{a/,}a/**", "a/a")).toBe(true);
      expect(isMatch("{a/,}a/**", "a/a/a")).toBe(true);
      expect(isMatch("{a/,}a/**", "a/a/")).toBe(true);
      expect(isMatch("{a/,}a/**", "a/a/a/")).toBe(true);
      expect(isMatch("{a/,}b/**", "a/b/a/")).toBe(true);
      expect(isMatch("{a/,}b/**", "b/a/")).toBe(true);
      expect(isMatch("a{,/}*.txt", "a.txt")).toBe(true);
      expect(isMatch("a{,/}*.txt", "ab.txt")).toBe(true);
      expect(isMatch("a{,/}*.txt", "a/b.txt")).toBe(true);
      expect(isMatch("a{,/}*.txt", "a/ab.txt")).toBe(true);

      expect(isMatch("a{,.*{foo,db},\\(bar\\)}.txt", "a.txt")).toBe(true);
      expect(isMatch("a{,.*{foo,db},\\(bar\\)}.txt", "adb.txt")).toBe(false);
      expect(isMatch("a{,.*{foo,db},\\(bar\\)}.txt", "a.db.txt")).toBe(true);

      expect(isMatch("a{,*.{foo,db},\\(bar\\)}.txt", "a.txt")).toBe(true);
      expect(isMatch("a{,*.{foo,db},\\(bar\\)}.txt", "adb.txt")).toBe(false);
      expect(isMatch("a{,*.{foo,db},\\(bar\\)}.txt", "a.db.txt")).toBe(true);

      expect(isMatch("a{,.*{foo,db},\\(bar\\)}", "a")).toBe(true);
      expect(isMatch("a{,.*{foo,db},\\(bar\\)}", "adb")).toBe(false);
      expect(isMatch("a{,.*{foo,db},\\(bar\\)}", "a.db")).toBe(true);

      expect(isMatch("a{,*.{foo,db},\\(bar\\)}", "a")).toBe(true);
      expect(isMatch("a{,*.{foo,db},\\(bar\\)}", "adb")).toBe(false);
      expect(isMatch("a{,*.{foo,db},\\(bar\\)}", "a.db")).toBe(true);

      expect(isMatch("{,.*{foo,db},\\(bar\\)}", "a")).toBe(false);
      expect(isMatch("{,.*{foo,db},\\(bar\\)}", "adb")).toBe(false);
      expect(isMatch("{,.*{foo,db},\\(bar\\)}", "a.db")).toBe(false);
      expect(isMatch("{,.*{foo,db},\\(bar\\)}", ".db")).toBe(true);

      expect(isMatch("{,*.{foo,db},\\(bar\\)}", "a")).toBe(false);
      expect(isMatch("{*,*.{foo,db},\\(bar\\)}", "a")).toBe(true);
      expect(isMatch("{,*.{foo,db},\\(bar\\)}", "adb")).toBe(false);
      expect(isMatch("{,*.{foo,db},\\(bar\\)}", "a.db")).toBe(true);

      expect(isMatch("a/b/**/c{d,e}/**/`xyz.md", "a/b/c/xyz.md")).toBe(false);
      expect(isMatch("a/b/**/c{d,e}/**/xyz.md", "a/b/d/xyz.md")).toBe(false);
      expect(isMatch("a/b/**/c{d,e}/**/xyz.md", "a/b/cd/xyz.md")).toBe(true);
      expect(isMatch("a/b/**/{c,d,e}/**/xyz.md", "a/b/c/xyz.md")).toBe(true);
      expect(isMatch("a/b/**/{c,d,e}/**/xyz.md", "a/b/d/xyz.md")).toBe(true);
      expect(isMatch("a/b/**/{c,d,e}/**/xyz.md", "a/b/e/xyz.md")).toBe(true);

      expect(isMatch("*{a,b}*", "xax")).toBe(true);
      expect(isMatch("*{a,b}*", "xxax")).toBe(true);
      expect(isMatch("*{a,b}*", "xbx")).toBe(true);

      expect(isMatch("*{*a,b}", "xba")).toBe(true);
      expect(isMatch("*{*a,b}", "xb")).toBe(true);

      expect(isMatch("*??", "a")).toBe(false);
      expect(isMatch("*???", "aa")).toBe(false);
      expect(isMatch("*???", "aaa")).toBe(true);
      expect(isMatch("*****??", "a")).toBe(false);
      expect(isMatch("*****???", "aa")).toBe(false);
      expect(isMatch("*****???", "aaa")).toBe(true);

      expect(isMatch("a*?c", "aaa")).toBe(false);
      expect(isMatch("a*?c", "aac")).toBe(true);
      expect(isMatch("a*?c", "abc")).toBe(true);

      expect(isMatch("a**?c", "abc")).toBe(true);
      expect(isMatch("a**?c", "abb")).toBe(false);
      expect(isMatch("a**?c", "acc")).toBe(true);
      expect(isMatch("a*****?c", "abc")).toBe(true);

      expect(isMatch("*****?", "a")).toBe(true);
      expect(isMatch("*****?", "aa")).toBe(true);
      expect(isMatch("*****?", "abc")).toBe(true);
      expect(isMatch("*****?", "zzz")).toBe(true);
      expect(isMatch("*****?", "bbb")).toBe(true);
      expect(isMatch("*****?", "aaaa")).toBe(true);

      expect(isMatch("*****??", "a")).toBe(false);
      expect(isMatch("*****??", "aa")).toBe(true);
      expect(isMatch("*****??", "abc")).toBe(true);
      expect(isMatch("*****??", "zzz")).toBe(true);
      expect(isMatch("*****??", "bbb")).toBe(true);
      expect(isMatch("*****??", "aaaa")).toBe(true);

      expect(isMatch("?*****??", "a")).toBe(false);
      expect(isMatch("?*****??", "aa")).toBe(false);
      expect(isMatch("?*****??", "abc")).toBe(true);
      expect(isMatch("?*****??", "zzz")).toBe(true);
      expect(isMatch("?*****??", "bbb")).toBe(true);
      expect(isMatch("?*****??", "aaaa")).toBe(true);

      expect(isMatch("?*****?c", "abc")).toBe(true);
      expect(isMatch("?*****?c", "abb")).toBe(false);
      expect(isMatch("?*****?c", "zzz")).toBe(false);

      expect(isMatch("?***?****c", "abc")).toBe(true);
      expect(isMatch("?***?****c", "bbb")).toBe(false);
      expect(isMatch("?***?****c", "zzz")).toBe(false);

      expect(isMatch("?***?****?", "abc")).toBe(true);
      expect(isMatch("?***?****?", "bbb")).toBe(true);
      expect(isMatch("?***?****?", "zzz")).toBe(true);

      expect(isMatch("?***?****", "abc")).toBe(true);
      expect(isMatch("*******c", "abc")).toBe(true);
      expect(isMatch("*******?", "abc")).toBe(true);
      expect(isMatch("a*cd**?**??k", "abcdecdhjk")).toBe(true);
      expect(isMatch("a**?**cd**?**??k", "abcdecdhjk")).toBe(true);
      expect(isMatch("a**?**cd**?**??k***", "abcdecdhjk")).toBe(true);
      expect(isMatch("a**?**cd**?**??***k", "abcdecdhjk")).toBe(true);
      expect(isMatch("a**?**cd**?**??***k**", "abcdecdhjk")).toBe(true);
      expect(isMatch("a****c**?**??*****", "abcdecdhjk")).toBe(true);

      expect(isMatch("a/?/c/?/*/e.md", "a/b/c/d/e.md")).toBe(false);
      expect(isMatch("a/?/c/?/*/e.md", "a/b/c/d/e/e.md")).toBe(true);
      expect(isMatch("a/?/c/?/*/e.md", "a/b/c/d/efghijk/e.md")).toBe(true);
      expect(isMatch("a/?/**/e.md", "a/b/c/d/efghijk/e.md")).toBe(true);
      expect(isMatch("a/?/e.md", "a/bb/e.md")).toBe(false);
      expect(isMatch("a/??/e.md", "a/bb/e.md")).toBe(true);
      expect(isMatch("a/?/**/e.md", "a/bb/e.md")).toBe(false);
      expect(isMatch("a/?/**/e.md", "a/b/ccc/e.md")).toBe(true);
      expect(isMatch("a/*/?/**/e.md", "a/b/c/d/efghijk/e.md")).toBe(true);
      expect(isMatch("a/*/?/**/e.md", "a/b/c/d/efgh.ijk/e.md")).toBe(true);
      expect(isMatch("a/*/?/**/e.md", "a/b.bb/c/d/efgh.ijk/e.md")).toBe(true);
      expect(isMatch("a/*/?/**/e.md", "a/bbb/c/d/efgh.ijk/e.md")).toBe(true);

      expect(isMatch("a/*/ab??.md", "a/bbb/abcd.md")).toBe(true);
      expect(isMatch("a/bbb/ab??.md", "a/bbb/abcd.md")).toBe(true);
      expect(isMatch("a/bbb/ab???md", "a/bbb/abcd.md")).toBe(true);
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

// Some parts of this file are based on and significantly adapt:
// - https://github.com/fabiospampinato/zeptomatch/tree/d9dce45 – MIT © Fabio Spampinato (fabiospampinato)
// - https://github.com/micromatch/picomatch/tree/bf6a33b – MIT © Jon Schlinkert (jonschlinkert)
// - https://github.com/devongovett/glob-match/tree/d5a6c67 – MIT © Devon Govett (devongovett)
