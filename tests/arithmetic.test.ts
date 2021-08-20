import { interpret, interpretToString } from "../src/interpreter";
import { expect } from "chai";
import { george } from "./mocha-george";

function computes(code: string, expected: string) {
  expect(interpretToString(code + "(P)")).to.equal(expected + "\n");
}

describe("Arithmetic", () => {
  george("adds using `+`", () => {
    computes("1,2+", "3");
    computes("7.3,4.9+", "12.2");
  });
  george("subtracts using `-`", () => {
    computes("1,2-", "-1");
    computes("7.6,3.5-", "4.1");
  });
  george("multiplies using `×`", () => {
    computes("3,4×", "12");
    computes("3.2,2.6×", "8.32");
  });
  george("divides using `÷`", () => {
    computes("3,4÷", "0.75");
    computes("111,3÷", "37");
  });
  george("sqrts using `√`", () => {
    computes("7√", "2.6457513110645907");
    computes("81√", "9");
  });
  george("arithmetically negates using `-`", () => {
    computes("1 neg", "-1");
    computes("7.8neg", "-7.8");
  });
  george("absolute values using `mod`", () => {
    computes("7.3mod", "7.3");
    computes("5negmod", "5");
  });
  george("takes maximum using `max`", () => {
    computes("2, 3 max", "3");
    computes("4.2, 3.14 max", "4.2");
  });
  george("takes natural log using `log`", () => {
    // TODO: how should GEORGE handle NaNs like `1 neg log`?
    computes("10 log", "2.302585092994046");
    computes("2 log", "0.6931471805599453");
  });
  george("exponentiates using `exp`", () => {
    computes("1 exp", "2.718281828459045");
    computes("0.6931471805599453exp", "2");
  });
  george("powers using `pow`", () => {
    computes("2,5 pow", "32");
    computes("3.5,4.7 pow", "360.6781292646417");
  });
  george("takes modulus using `rem`", () => {
    computes("13,5 rem", "3");
    computes("13neg,5 rem", "2");
    computes("2.94,1 rem", "0.94");
  });
  george("takes radians sine using `sin`", () => {
    computes("3 sin", "0.1411200080598672");
    computes("1.5707963267948966 sin", "1");
  });
  george("takes radians cosine using `cos`", () => {
    computes("3 cos", "-0.9899924966004454");
    computes("3.141592653589793 cos", "-1");
  });
});

describe("Logical operations", () => {
  george("compares using `>`", () => {
    computes("2,2>", "0"), computes("3,2>", "-1");
  });
  george("tests for equality using `=`", () => {
    computes("2,2=", "-1"), computes("3,2=", "0");
  });
  george("logically negates using `~`", () => {
    // TODO: what is expected behavior if the argument is not 0 or -1?
    computes("0~", "-1");
    computes("1neg ~", "0");
  });
  george("logically ANDs using `&`", () => {
    computes("0,0&", "0");
    computes("1neg,0&", "0");
    computes("1negdup&", "-1");
  });
  george("logically ORs using `∨`", () => {
    computes("0,0∨", "0");
    computes("1neg,0∨", "-1");
    computes("1negdup∨", "-1");
  });
});

describe("Stack Management", () => {
  george("drops top of stack using `;`", () => {
    expect(interpret("1 ;", true).stack.length).to.equal(0);
    expect(interpret("1,2,3 ;", true).stack.length).to.equal(2);
    computes("1,2,99 ; +", "3");
  });
  george("duplicates top of stack using `dup`", () => {
    expect(interpret("1 dup", true).stack.length).to.equal(2);
    computes("3 dup ×", "9");
  });
  george("reverses using `rev`", () => {
    computes("1,3 rev -", "2");
    computes("4,2 rev >", "0");
  });
});

// missing: ("↑↓wait R (P)");
