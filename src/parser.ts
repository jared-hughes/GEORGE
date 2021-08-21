import moo, { Token } from "moo";
import PeekableLexer from "moo-peekable-lexer";

// prettier-ignore
const operators = [
  "-","+","×","÷",";","√","↑","↓",">","=","~","&","∨",
  "neg","mod","max","dup","rev","log","exp","pow","rem",
  "sin","cos","wait","R","(P)"
]

const tokenTable = {
  // RPpipe must be above operator to avoid tokenizing as `R` `|`
  RPpipe: /[RP][|‖]/,
  operator: operators,
  rep: "rep",
  number: /[0-9]+(?:\.[0-9]+)?/,
  comma: ",",
  rbracket: "]",
  pipe: /[|‖]/,
  asterisk: "*",
  lparen: "(",
  rparen: ")",
  whitespace: {
    match: /\s/,
    lineBreaks: true,
  },
  // Only [a-d] may be used for matrices
  letter: /[a-nθp-zαβγλμω]/,
} as const;

const mooLexer = moo.compile(tokenTable);

const lexer = new PeekableLexer({ lexer: mooLexer });

type Action =
  | {
      type: "operator";
      value: string;
    }
  | {
      type: "number";
      value: number;
    }
  | {
      type: "print" | "read" | "assign" | "access";
      suffix_count: 0 | 1 | 2;
      letter: number;
    }
  | {
      type: "rep_start";
      letter: number;
    }
  | {
      type: "rep_end";
      goto: number;
    }
  | {
      type: "end_sub";
    }
  | {
      type: "end_main";
    };

export type Program = {
  actions: Action[];
  jmpIndices: Map<number, number>;
  subIndices: Map<number, number>;
};

class StacklessError extends Error {
  constructor(msg: string) {
    super(msg);
    this.stack = "";
  }
}

class ParseError extends StacklessError {
  constructor(msg: string) {
    super(msg);
    this.name = this.constructor.name;
  }
}

class EOFError extends StacklessError {
  constructor(msg: string) {
    super(msg);
    this.name = this.constructor.name;
  }
}

export default function parse(code: string) {
  function parseError(token: Token, msg: string) {
    return new ParseError("\n\n" + lexer.formatError(token, msg) + "\n");
  }

  function eofError(parsing?: string) {
    return new EOFError(
      `\n\nGEORGE reached the end of the code while parsing a ${
        parsing ?? "something"
      }.\n`
    );
  }

  function nextRequired(parsing?: string) {
    const token = lexer.next();
    if (token === undefined) {
      throw eofError("parsing");
    }
    return token;
  }

  function peekNonWhitespace() {
    let token = lexer.peek();
    while (token?.type === "whitespace") {
      lexer.next();
      token = lexer.peek();
    }
    return token;
  }

  function nextNonWhitespace() {
    let token = lexer.next();
    // Skip whitespace
    while (token?.type === "whitespace") {
      token = lexer.next();
    }
    return token;
  }

  function nextNonWhitespaceRequired(parsing?: string) {
    const token = nextNonWhitespace();
    if (token === undefined) {
      throw eofError(parsing);
    }
    return token;
  }

  function parseName(skipLParen = false) {
    if (!skipLParen) {
      const lparen = nextNonWhitespaceRequired("name");
      if (lparen?.type !== "lparen") {
        throw parseError(lparen, "GEORGE expected `(` starting a name");
      }
    }
    // We don't want to allow spaces, so use nextRequired() instead of nextNonWhitespaceRequired()
    const letter = nextRequired("name");
    if (letter.type !== "letter") {
      throw parseError(letter, "GEORGE expected letter in name");
    }
    const rparen = nextRequired("name");
    if (rparen.type !== "rparen") {
      throw parseError(rparen, "GEORGE expected `)` closing a name");
    }
    return getLetterIndex(letter.value);
  }

  function parseLabelValue() {
    const labelToken = nextNonWhitespaceRequired("label");
    if (labelToken?.type !== "number") {
      throw parseError(labelToken, "GEORGE mandates a number in this label");
    }
    return parseFloat(labelToken.value);
  }

  lexer.reset(code);

  let program: Program = {
    actions: [],
    jmpIndices: new Map(),
    subIndices: new Map(),
  };
  let currentRoutine: "main" | null | number = "main";
  let isPrevComma = false;
  // stack of indices to return to
  let repStack = [];

  let token;

  while ((token = nextNonWhitespace())) {
    const tokenType = token.type as keyof typeof tokenTable;
    if (tokenType === "asterisk") {
      const labelValue = parseLabelValue();
      // pointer to index after the label
      const ptr = program.actions.length - 1;
      if (currentRoutine === null) {
        // declare a subroutine
        currentRoutine = labelValue;
        program.subIndices.set(labelValue, ptr);
      } else {
        program.jmpIndices.set(labelValue, ptr);
      }
    } else if (currentRoutine === null) {
      throw parseError(token, "GEORGE expected a subroutine starting with `*`");
    }
    switch (tokenType) {
      case "operator":
        program.actions.push({
          type: "operator",
          value: token.value,
        });
        break;
      case "number":
        const actions = program.actions;
        if (
          actions.length &&
          actions[actions.length - 1].type === "number" &&
          !isPrevComma
        ) {
          throw parseError(
            token,
            "GEORGE has no need for spaces. GEORGE expects a comma between adjacent numbers"
          );
        }
        actions.push({
          type: "number",
          value: parseFloat(token.value),
        });
        break;
      case "RPpipe":
        program.actions.push({
          type: token.value[0] == "P" ? "print" : "read",
          suffix_count: pipeValue("token.value[1]") as 1 | 2,
          letter: parseName(),
        });
        break;
      case "pipe":
        const val = pipeValue(token.value) as 1 | 2;
        if (peekNonWhitespace()?.type === "lparen") {
          // assignment
          program.actions.push({
            type: "assign",
            suffix_count: val,
            letter: parseName(),
          });
        } else {
          const letterToken = nextNonWhitespaceRequired("pipe access");
          if (letterToken?.type !== "letter") {
            throw parseError(
              letterToken,
              "GEORGE expected a letter after this pipe"
            );
          }
          program.actions.push({
            type: "access",
            suffix_count: val,
            letter: getLetterIndex(letterToken.value),
          });
        }
        break;
      case "lparen":
        program.actions.push({
          type: "assign",
          suffix_count: 0,
          letter: parseName(true),
        });
        break;
      case "rparen":
        throw parseError(
          token,
          "GEORGE found a right paren without a matching friend"
        );
      case "letter":
        program.actions.push({
          type: "access",
          suffix_count: 0,
          letter: getLetterIndex(token.value),
        });
        break;
      case "rep":
        const letter = parseName();
        program.actions.push({
          type: "rep_start",
          letter: letter,
        });
        // pointer to the index after the rep
        repStack.push(program.actions.length);
        break;
      case "rbracket":
        const top = repStack.pop();
        if (top !== undefined) {
          program.actions.push({
            type: "rep_end",
            goto: top,
          });
        } else if (currentRoutine !== null) {
          if (currentRoutine === "main") {
            if (lexer.peek() === undefined) {
              throw parseError(
                token,
                "Unnecessary `]` closing the main routine. Probably a `rep` is not closed."
              );
            } else {
              program.actions.push({
                type: "end_main",
              });
            }
          } else {
            program.actions.push({
              type: "end_sub",
            });
          }
          currentRoutine = null;
        }
        break;
      case "comma":
        // handled below
        break;
    }
    isPrevComma = token.type === "comma";
  }

  if (currentRoutine === "main") {
    program.actions.push({
      type: "end_main",
    });
  } else if (currentRoutine !== null) {
    throw eofError("subroutine");
  }
  if (repStack.length > 0) {
    throw eofError("rep");
  }
  return program;
}

function pipeValue(pipe: string) {
  if (pipe === "|") {
    return 1;
  } else if (pipe === "‖") {
    return 2;
  }
}

const letters = "abcdefghijklmnθpqrstuvwxyzαβγλμω";
function getLetterIndex(letter: string) {
  const index = letters.indexOf(letter);
  if (index === -1) {
    throw "Programming Error: unhandled letter " + letter;
  }
  return index;
}
