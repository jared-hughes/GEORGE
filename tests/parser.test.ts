import parse from "../src/parser";
import { expect } from "chai";

function parses(s: string) {
  expect(() => parse(s)).to.not.throw();
}

function cantParse(s: string) {
  expect(() => parse(s)).to.throw();
}

describe("Parser tests", () => {
  it("safely parses simple code", () => {
    parses("1,2+ (P) R+ (P)");
    parses(
      "3(ω)9.836(a)dupdupωaaaωωωωω +-×÷neg mod λ max dup rev ωlog exp pow rem √ sin cos"
    );
    const letters = "abcdefghijklmnθpqrstuvwxyzαβγλμω";
    // appends all the corresponding names
    parses(letters + [...letters].map((c) => `(${c})`).join(""));
  });
  it("safely parses pipe access, pipe name, pipe print, and pipe read", () => {
    parses("2 | a");
    parses("2, 3 ‖ b");
    parses("2 | (a)");
    parses("2, 3 ‖ (b)");
    parses("a b P| (a)");
    parses("a b R| (a)");
    parses("i m n j R‖ (b)");
    parses("i m n j P‖ (b)");
  });
  it("throws if R|, P|, R‖, or P‖ is not followed by a name", () => {
    cantParse("a b P| a");
    cantParse("a b R| a");
    cantParse("i m n j R‖ b");
    cantParse("i m n j P‖ b");
  });
  it("safely parses code with jumps", () => {
    parses("1 *0 (P) 1+ dup 10 >~ 0↑");
    parses("1 *0 ↑2 *1 *2, 1 a > ↑1 *3 b 1 - 3 neg > ↑0");
  });
  it("safely parses code with subs", () => {
    parses("6↓ ] * 6 (a) (b) ]");
    parses("4, 6, 1↓ (P) ] *1 (a); (b); a b > 2↑ b 3↑ *2 a *3 ] ");
  });
  it("safely parses a rep", () => {
    parses("0, 5 rep(a) a (P); ]");
  });
  it("safely parses nested reps", () => {
    parses("1, 5 rep(a) 1, 5 rep(b) a b × (P); ] ]");
  });
  it("throws if a rep lacks a closing `]`", () => {
    cantParse("0, 5 rep(a) a (P)");
  });
  it("throws if a rep extends into a subroutine", () => {
    cantParse("0, 5 rep(a) a 0↓ (P)\n]\n*0 1+ ]");
  });
  it("throws if a comma is missing between adjacent numbers", () => {
    cantParse("2 3↑ *3 a");
    // TODO: cantParse("3↑ *3 6 (P)");
  });
  it("throws if the main is not closed with `]` and a sub is present", () => {
    cantParse("1\n*1 (a); (b); ]");
  });
  it("throws if the main is closed with `]` but a sub is not present", () => {
    cantParse("1 ]");
  });
  it("throws if a sub is not closed with `]`", () => {
    cantParse("1 3↓ ] 3* (P)");
  });
  it("throws from unmatched `)`", () => {
    cantParse("a b )");
  });
  it("requires names to be complete and correct", () => {
    cantParse("(");
    cantParse("(3");
    cantParse("(a");
    cantParse("(a )");
    cantParse("(a 7");
  });
});
