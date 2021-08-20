import { george, printsExactly } from "./mocha-george";

describe("Subroutines", () => {
  george("can jump back from subroutines", () => {
    printsExactly("1, 2, 0↓ (P) ] *0, 1+ ]", "3\n");
  });
  george("can call other subroutines from a subroutine", () => {
    printsExactly("1↓ ] *0 42(P) ] *1 0↓ ]", "42\n");
  });
  george("can recurse within a subroutine", () => {
    // A rep would of course be better
    printsExactly(
      "5, 0↓ ] *0 dup 0= 2↑ (P) 1neg+ 0↓ 3↑ *2, 1 *3 ]",
      "5\n4\n3\n2\n1\n"
    );
  });
});
