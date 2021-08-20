import { interpret, interpretToString } from "../src/interpreter";
import { expect } from "chai";
import { george } from "./mocha-george";

function printsExactly(code: string, expected: string) {
  expect(
    interpretToString(code, {
      limitLength: 12,
    })
  ).to.equal(expected);
}

describe("Jumps", () => {
  george("can jump in a while loop", () => {
    printsExactly("*0 1 (P) 0↑", "1\n".repeat(6));
  });
  george("can jump to later labels", () => {
    printsExactly("2↑ 73(P) *2 42(P)", "42\n");
  });
  george("can conditionally jump", () => {
    printsExactly("1,0> 2↑ 73(P) *2 42(P)", "42\n");
    printsExactly("0,1> 2↑ 73(P) *2 42(P)", "73\n42\n");
  });
  george(
    "jumps unconditionally if no relational operator has been passed since the last jump",
    () => {
      printsExactly("1neg 2↑ 73(P) *2 (P)", "-1\n");
      printsExactly("1,0> 2↑ 73(P) *2 42(P) 0, 3↑ 8(P) *3", "42\n");
      printsExactly("1,0> 2↑ 73(P) *2 42(P) 1,0> 0, 3↑ 8(P) *3", "42\n8\n");
    }
  );
  george("can use jumps as if-else", () => {
    printsExactly("1,0> 2↑ 1(P) 3↑ *2 2(P) *3", "2\n");
    printsExactly("0,1> 2↑ 1(P) 3↑ *2 2(P) *3", "1\n");
  });
});
