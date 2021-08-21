import { george, printsExactly } from "./mocha-george";

describe("Integration", () => {
  george("can call subroutines in reps", () => {
    // sum of squares
    printsExactly("0, 1,10 rep (a) a 0↓ + ] (P) ] *0 dup× ]", "385\n");
  });
  george("can jump in reps", () => {
    // sum of 1..100 except multiples of 7
    printsExactly("0, 1,100 rep (i) i7rem 0= 2↑ i+ *2 ] (P)", "4315\n");
  });
  george("can rep in subroutines", () => {
    // factorial
    printsExactly("6, 0↓ (P) ] *0 1rev1rev rep (α) α× ] ]", "720\n");
  });
  george("can jump in subroutines", () => {
    // subroutine 0 squares, unless the top of the stack is a multiple of 7
    printsExactly(
      "14, 0↓ (P); 13, 0↓ (P);] *0 dup7rem 0= 2↑ dup× *2 ]",
      "14\n169\n"
    );
  });
});
