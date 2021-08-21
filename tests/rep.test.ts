import { george, printsExactly, throwsOn } from "./mocha-george";

describe("Reps", () => {
  george("can print in a loop using `rep`", () => {
    printsExactly("0,5 rep (i) i (P); ]", "0\n1\n2\n3\n4\n5\n");
  });
  george("can nest reps", () => {
    printsExactly(
      "0,3 rep(i) 0,1 rep(j) i2× j+ (P);]]",
      "0\n1\n2\n3\n4\n5\n6\n7\n"
    );
  });
  george("throws if max <= init in a rep", () => {
    throwsOn("5, 0 rep (i) i (P); ]");
    throwsOn("5, 5 rep (i) i (P); ]");
  });
  george("throws if bounds are non-integer in a rep", () => {
    throwsOn("2.5, 5 rep (i) ]");
    throwsOn("2, 4.5 rep (i) ]");
  });
  george("can compute factorial in a rep", () => {
    printsExactly("1, 1,6 rep (i) i× ] (P)", "720\n");
  });
});
