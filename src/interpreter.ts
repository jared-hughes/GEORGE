import parse, { Program } from "./parser";

interface InterpreterOptions {
  stdout: boolean;
  outputToString: boolean;
  lengthLimit: number;
  timeLimit: number; // ms
}

export type InterpreterOptionsOpt = {
  [K in keyof InterpreterOptions]?: InterpreterOptions[K];
};

export function interpretToString(
  code: string,
  opts: InterpreterOptionsOpt = {}
) {
  return interpret(code, {
    ...opts,
    outputToString: true,
  }).outputString;
}

export function interpret(code: string, opts: InterpreterOptionsOpt) {
  const program = parse(code);
  const int = new Interpreter(program, opts);
  int.fullExec();
  return int;
}

interface ProgramPointer {
  currentRoutine: number | "main";
  programIndex: number;
}
export class Interpreter {
  stack: number[] = [];
  unsuffixed_mem: number[] = Array(32).fill(0);
  vector_mem: number[] = Array(32 * 32).fill(0);
  matrix_mem: number[] = Array(32 * 32 * 4).fill(0);
  currentRoutine: number | "main" = "main";
  programIndex: number = 0;
  callStack: ProgramPointer[] = [];
  // true if `>` or `=` has been encountered since the last jmp
  isConditional = false;
  outputString = "";
  opts: InterpreterOptions;
  totalLength = 0;
  repStack: {
    letter: number;
    max: number;
    startIndex: number;
  }[] = [];
  stopReason: null | "DONE" | "LENGTH" | "TIME" = null;
  startTime: number;

  constructor(public program: Program, opts: InterpreterOptionsOpt) {
    this.startTime = Date.now();
    this.opts = {
      stdout: opts.stdout ?? false,
      outputToString:
        opts.outputToString ??
        (opts.stdout !== undefined ? !opts.stdout : true),
      lengthLimit: opts.lengthLimit ?? 16384, // 16 kb
      timeLimit: opts.timeLimit ?? 2000, // 2s
    };
  }

  checkOK() {
    if (this.totalLength >= this.opts.lengthLimit) {
      this.stopReason = "LENGTH";
    }
    if (Date.now() - this.startTime > this.opts.timeLimit) {
      this.stopReason = "TIME";
    }
  }

  printLine(s: string) {
    if (this.opts.outputToString) {
      this.outputString += s + "\n";
    }
    if (this.opts.stdout) {
      console.log(s);
    }
    // +1 for newline
    this.totalLength += s.length + 1;
  }

  fullExec() {
    while ((this.checkOK(), this.stopReason === null)) {
      this.step();
    }
  }

  step() {
    const action = this.program.actions[this.programIndex];
    switch (action.type) {
      case "number":
        this.stack.push(action.value);
        break;
      case "operator":
        this.applyOperator(action.value);
        break;
      case "access":
        if (action.suffix_count === 0) {
          this.stack.push(this.unsuffixed_mem[action.letter]);
        } else if (action.suffix_count === 1) {
          this.assertMinStackSize(1);
          this.stack.push(
            this.vector_mem[
              getVectorIndex(action.letter, this.stack.pop() as number)
            ]
          );
        } else {
          this.assertMinStackSize(2);
          const j = this.stack.pop() as number;
          const i = this.stack.pop() as number;
          this.stack.push(this.matrix_mem[getMatrixIndex(action.letter, i, j)]);
        }
        break;
      case "assign":
        if (action.suffix_count === 0) {
          this.assertMinStackSize(1);
          this.unsuffixed_mem[action.letter] = this.stackPeek();
        } else if (action.suffix_count === 1) {
          this.assertMinStackSize(2);
          this.vector_mem[
            getVectorIndex(action.letter, this.stack.pop() as number)
          ] = this.stackPeek();
        } else {
          this.assertMinStackSize(3);
          const j = this.stack.pop() as number;
          const i = this.stack.pop() as number;
          this.matrix_mem[getMatrixIndex(action.letter, i, j)] =
            this.stackPeek();
        }
        break;
      case "print":
        if (action.suffix_count === 0) {
          this.printLine("" + this.unsuffixed_mem[action.letter]);
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
        this.assertMinStackSize(2, "rep");
        const max = this.stack.pop() as number;
        const init = this.stack.pop() as number;
        const letter = action.letter;
        this.unsuffixed_mem[letter] = init;
        if (!Number.isInteger(max) || !Number.isInteger(init)) {
          throw `GEORGE requires rep bounds to be integers.`;
        }
        if (max <= init) {
          throw `Rep max must be greater than init. Or not? Idk. Either way, GEORGE will not let you proceed with \`${init}, ${max} rep\`.`;
        }
        this.repStack.push({
          letter,
          max,
          startIndex: this.programIndex,
        });
        break;
      case "rep_end":
        const rep = this.repStack[this.repStack.length - 1];
        if (this.unsuffixed_mem[rep.letter] < rep.max) {
          this.unsuffixed_mem[rep.letter] += 1;
          this.programIndex = rep.startIndex;
        } else {
          // move on
          this.repStack.pop();
        }
        break;
      case "end_sub":
        const prev = this.callStack.pop();
        if (prev === undefined) {
          throw "Impossible situation: reached end of subroutine without entering subroutine";
        }
        this.currentRoutine = prev.currentRoutine;
        this.programIndex = prev.programIndex;
        break;
      case "end_main":
        this.stopReason = "DONE";
        break;
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

  stackPeek(n: number = 1) {
    return this.stack[this.stack.length - n];
  }

  getSkipLocation() {
    // skip numbers are treated modulo 32
    this.assertMinStackSize(1);
    return rem(this.stack.pop() as number, 32);
  }

  shouldSkip() {
    // Not sure how GEORGE is supposed to check truthiness in general
    // as the manual only states 0 → falsey and -1 → truthey
    // Even val&1 !== 0 would be appropriate
    const shouldSkip = !this.isConditional || this.stack.pop() !== 0;
    this.isConditional = false;
    return shouldSkip;
  }

  applyOperator(op: string) {
    let skipLabel: number;
    switch (op) {
      case "↑":
        skipLabel = this.getSkipLocation();
        if (this.shouldSkip()) {
          const skipLocation = this.program.jmpIndices.get(skipLabel);
          if (skipLocation === undefined) {
            throw `No jmp location for label ${skipLabel}. I don't know where to jump. If your friends jump off a bridge, would you jump too?`;
          }
          this.programIndex = skipLocation;
        }
        break;
      case "↓":
        skipLabel = this.getSkipLocation();
        if (this.shouldSkip()) {
          const ptr = this.program.subIndices.get(skipLabel);
          if (ptr !== undefined) {
            this.callStack.push({
              currentRoutine: this.currentRoutine,
              programIndex: this.programIndex,
            });
            this.programIndex = ptr;
            this.currentRoutine = skipLabel;
          } else {
            throw `No subroutine exists with label ${skipLabel}`;
          }
        }
        break;
      case ";":
        this.assertMinStackSize(1, op);
        this.stack.pop();
        break;
      case "dup":
        this.assertMinStackSize(1, op);
        this.stack.push(this.stackPeek());
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
        this.printLine("" + this.stackPeek());
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
    if (op === ">" || op === "=") {
      this.isConditional = true;
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
  "√": (a) => Math.sqrt(a),
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
