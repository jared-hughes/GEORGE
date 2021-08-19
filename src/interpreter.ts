import parse, { Routine, Routines } from "./parser";

export default function interpret(code: string) {
  const routines = parse(code);
  const int = new Interpreter(routines);
  int.fullExec();
}

class Interpreter {
  stack: number[] = [];
  unsuffixed_mem: number[] = Array(32).fill(0);
  vector_mem: number[] = Array(32 * 32).fill(0);
  matrix_mem: number[] = Array(32 * 32 * 4).fill(0);
  currentRoutine: Routine;
  programIndex: number = 0;
  jmps: Map<number, number> = new Map();

  constructor(public routines: Routines) {
    this.currentRoutine = routines.main;
  }

  ok() {
    return (
      this.currentRoutine !== this.routines.main ||
      this.programIndex < this.routines.main.length
    );
  }

  fullExec() {
    while (this.ok()) {
      this.step();
    }
  }

  step() {
    const action = this.currentRoutine[this.programIndex];
    switch (action.type) {
      case "number":
        this.stack.push(action.value);
        break;
      case "operator":
        this.applyOperator(action.value);
        break;
      case "jmp_declare":
        // NOTE:
        // TODO: skip numbers are treated modulo 32
        // TODO: what is the correct behavior for duplicated `jmp_declare`s for a single label?
        // TODO: what is the behavior for a clashing jmp in a submodule? Currently theres some overwriting
        this.jmps.set(action.label, this.programIndex);
        break;
      case "access":
        if (action.suffix_count === 0) {
          this.stack.push(this.unsuffixed_mem[action.letter]);
        } else if (action.suffix_count === 1) {
          this.assertMinStackSize(1),
            this.vector_mem[
              getVectorIndex(action.letter, this.stack.pop() as number)
            ];
        } else {
          this.assertMinStackSize(2);
          const j = this.stack.pop() as number;
          const i = this.stack.pop() as number;
          this.matrix_mem[getMatrixIndex(action.letter, i, j)];
        }
        break;
      case "assign":
        if (action.suffix_count === 0) {
          this.assertMinStackSize(1);
          this.unsuffixed_mem[action.letter] = this.stackPeekN(1);
        } else if (action.suffix_count === 1) {
          this.assertMinStackSize(2);
          this.vector_mem[getVectorIndex(action.letter, this.stackPeekN(1))] =
            this.stackPeekN(2);
        } else {
          this.assertMinStackSize(3);
          this.matrix_mem[
            getMatrixIndex(
              action.letter,
              this.stackPeekN(2),
              this.stackPeekN(1)
            )
          ] = this.stackPeekN(3);
        }
        break;
      case "print":
        if (action.suffix_count === 0) {
          console.log(this.unsuffixed_mem[action.letter]);
        } else {
          throw "Suffixed (vector or matrix) print is not yet implemented";
        }
        break;
      case "read":
        throw "Read is not yet implemented";
      // if (action.suffix_count === 0) {
      //   this.unsuffixed_mem[getLetterIndex(action.letter)] = Number(
      //     inputSync()
      //   );
      // } else {
      //   throw "Suffixed (vector or matrix) read is not yet implemented";
      // }
      case "rep_start":
      case "rep_end":
        throw "Execution of rep is not yet implemented";
      case "goto_sub_call":
        throw "Subroutines are not yet implemented. How did you get here without the ↓ operator?";
    }
    this.programIndex += 1;
  }

  assertMinStackSize(size: number, op: string = "") {
    if (this.stack.length < size) {
      throw (
        `Stack is of size ${this.stack.length}` +
        (op ? `, but \`${op}\` expects ${size} arguments` : "")
      );
    }
  }

  stackPeekN(n: number) {
    return this.stack[this.stack.length - n];
  }

  applyOperator(op: string) {
    switch (op) {
      case "↑":
        throw "The jmp operator ↑ is not yet implemented";
        break;
      case "↓":
        throw "The subroutine operator ↑ is not yet implemented";
        break;
      case ";":
        this.assertMinStackSize(1, op);
        this.stack.pop();
        break;
      case "dup":
        this.assertMinStackSize(1, op);
        this.stack.push(this.stackPeekN(1));
        break;
      case "rev":
        this.assertMinStackSize(2, op);
        this.stack.push(this.stack.pop() as number, this.stack.pop() as number);
        break;
      case "wait":
        throw "The `wait` operator is not implemented";
        break;
      case "R":
        throw "The read operator `R` is not implemented";
        // this.stack.push(Number(inputSync()));
        break;
      case "(P)":
        this.assertMinStackSize(1, op);
        console.log(this.stackPeekN(1));
        break;
      default:
        if (op in monadicOperators) {
          const func = monadicOperators[op];
          this.assertMinStackSize(1, op);
          this.stack.push(func(this.stack.pop() as number));
        } else if (op in dyadicOperators) {
          const func = dyadicOperators[op];
          this.assertMinStackSize(2, op);
          const top = this.stack.pop() as number;
          this.stack.push(func(this.stack.pop() as number, top));
        } else {
          throw "Programming Error: unhandled operator " + op;
        }
    }
  }
}

const dyadicOperators: { [K: string]: (a: number, b: number) => number } = {
  "-": (a, b) => a - b,
  "+": (a, b) => a + b,
  "×": (a, b) => a * b,
  "÷": (a, b) => a / b,
  ">": (a, b) => -(a > b),
  "=": (a, b) => -(a == b),
  "&": (a, b) => a & b,
  "∨": (a, b) => a | b,
  pow: (a, b) => Math.pow(a, b),
  max: (a, b) => Math.max(a, b),
  // rem is actually the modulus operation (5 neg 3 rem → 1),
  // but Javascript % is actually the remainder operation (-5 % 3 → -2)
  rem: rem,
};

const monadicOperators: { [K: string]: (a: number) => number } = {
  "√": (a) => a,
  "~": (a) => ~a,
  neg: (a) => -a,
  mod: (a) => Math.abs(a),
  log: (a) => Math.log(a),
  exp: (a) => Math.exp(a),
  sin: (a) => Math.sin(a),
  cos: (a) => Math.cos(a),
};

function getVectorIndex(letter: number, index: number) {
  return rem(32 * letter + index, 1024);
}

function getMatrixIndex(letter: number, i: number, j: number) {
  return rem(1024 * letter + 32 * i, 4096) + rem(j, 32);
}

function rem(a: number, b: number) {
  return ((a % b) + b) % b;
}
