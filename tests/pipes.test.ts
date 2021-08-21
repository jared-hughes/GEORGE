import { george, printsExactly } from "./mocha-george";

describe("Pipes", () => {
  george("pops the right count when assigning via pipes", () => {
    printsExactly("0, 1, 2|(a);  2|a(P);(P)", "1\n0\n");
    printsExactly("0, 1, 2,2‖(a);  2,2‖a(P);(P)", "1\n0\n");
  });
  george("can re-print a vector in order", () => {
    printsExactly(
      "0,5rep(i)ii×i|(a);] 0,5rep(i)i|a(P);]",
      "0\n1\n4\n9\n16\n25\n"
    );
  });
});
