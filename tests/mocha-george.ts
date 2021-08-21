import { expect } from "chai";
import { interpretToString } from "../src/interpreter";

export function george(name: string, ...rest: any[]) {
  it("GEORGE " + name, ...rest);
}

export function printsExactly(code: string, expected: string) {
  expect(
    interpretToString(code, {
      lengthLimit: 16,
    })
  ).to.equal(expected);
}

export function throwsOn(code: string) {
  expect(() => interpretToString(code, {})).to.throw();
}
