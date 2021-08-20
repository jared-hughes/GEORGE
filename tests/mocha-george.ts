import { expect } from "chai";
import { interpretToString } from "../src/interpreter";

export function george(name: string, ...rest: any[]) {
  it("GEORGE " + name, ...rest);
}

export function printsExactly(code: string, expected: string) {
  expect(
    interpretToString(code, {
      limitLength: 12,
    })
  ).to.equal(expected);
}
