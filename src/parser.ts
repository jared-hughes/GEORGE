import moo from "moo";
import PeekableLexer from "moo-peekable-lexer";
import { string } from "yargs";

// prettier-ignore
const operators = [
  "-","+","×","÷",";","√","↑","↓",">","=","~","&","∨",
  "neg","mod","max","dup","rev","log","exp","pow","rem",
  "sin","cos","wait","R","(P)"
]

const tokenTable = {
  // Only [a-d] may be used for matrices
  operator: operators,
  rep: "rep",
  number: /[1-9][0-9]*(?:\.[0-9]+)?|0/,
  comma: ",",
  rbracket: "]",
  RPpipe: /[RP][|‖]/,
  pipe: /[|‖]/,
  asterisk: "*",
  lparen: "(",
  rparen: ")",
  whitespace: {
    match: /\s/,
    lineBreaks: true,
  },
  letter: /[a-nΘp-zαβγλμω]/,
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
      type: "goto_sub_call";
    };
export type Routine = {
  actions: Action[];
  jmpIndices: Map<number, number>;
};
export interface Routines {
  main: Routine;
  [k: string]: Routine;
}

export default function parse(code: string) {
  function peekNonWhitespace() {
    let token = lexer.peek();
    while (token?.type === "whitespace") {
      lexer.next();
      token = lexer.peek();
    }
    return token;
  }

  function nextNonWhitespace(mandatory = true) {
    let token = lexer.next();
    // Skip whitespace
    while (token?.type === "whitespace") {
      token = lexer.next();
    }
    if (mandatory && token === undefined) {
      throw "EOF while parsing something";
    }
    return token;
  }

  function parseName(skipLParen = false) {
    if (!skipLParen) {
      if (nextNonWhitespace()?.type !== "lparen") throw "Expected name";
    }
    // We don't want to allow spaces, so use lexer.next() instead of next()
    const letter = lexer.next();
    if (letter?.type !== "letter") throw "Expected letter";
    if (lexer.next()?.type !== "rparen") throw "Expected closing paren on name";
    return getLetterIndex(letter.value);
  }

  function parseLabelValue() {
    const labelToken = nextNonWhitespace();
    if (labelToken?.type !== "number") {
      throw "Label expects number following it";
    }
    return parseFloat(labelToken.value);
  }

  lexer.reset(code);

  let routines: Routines = {
    main: {
      actions: [],
      jmpIndices: new Map(),
    },
  };
  let currentRoutine: Routine | null = routines.main;
  let isMainRoutine = true;
  let isPrevComma = false;
  // stack of indices to return to
  let repStack = [];

  let token;

  while ((token = nextNonWhitespace(false))) {
    const tokenType = token.type as keyof typeof tokenTable;
    if (currentRoutine === null) {
      if (tokenType === "asterisk") {
        // declare a subroutine
        const labelValue = parseLabelValue();
        currentRoutine = {
          actions: [],
          jmpIndices: new Map(),
        };
        routines[labelValue] = currentRoutine;
      } else {
        throw "Symbol outside routine";
      }
    }
    switch (tokenType) {
      case "asterisk":
        // Subroutine declaration handled above
        const labelValue = parseLabelValue();
        currentRoutine.jmpIndices.set(
          labelValue,
          // pointer to index after the label
          currentRoutine.actions.length - 1
        );
        break;
      case "operator":
        currentRoutine.actions.push({
          type: "operator",
          value: token.value,
        });
        break;
      case "number":
        const actions = currentRoutine.actions;
        if (
          actions.length &&
          actions[actions.length - 1].type === "number" &&
          !isPrevComma
        ) {
          throw "Oopsie, a comma is missing between two numbers";
        }
        actions.push({
          type: "number",
          value: parseFloat(token.value),
        });
        break;
      case "RPpipe":
        currentRoutine.actions.push({
          type: token.value[0] == "P" ? "print" : "read",
          suffix_count: pipeValue("token.value[1]") as 1 | 2,
          letter: parseName(),
        });
        break;
      case "pipe":
        const val = pipeValue(token.value) as 1 | 2;
        if (peekNonWhitespace()?.type === "lparen") {
          // assignment
          currentRoutine.actions.push({
            type: "assign",
            suffix_count: val,
            letter: parseName(),
          });
        } else {
          const letterToken = nextNonWhitespace();
          if (letterToken?.type !== "letter") throw "Expected letter";
          currentRoutine.actions.push({
            type: "access",
            suffix_count: val,
            letter: getLetterIndex(letterToken.value),
          });
        }
        break;
      case "lparen":
        currentRoutine.actions.push({
          type: "assign",
          suffix_count: 0,
          letter: parseName(true),
        });
        break;
      case "rparen":
        throw "Unmatched right paren";
      case "letter":
        currentRoutine.actions.push({
          type: "access",
          suffix_count: 0,
          letter: getLetterIndex(token.value),
        });
        break;
      case "rep":
        const letter = parseName();
        currentRoutine.actions.push({
          type: "rep_start",
          letter: letter,
        });
        // pointer to the index after the rep
        repStack.push(currentRoutine.actions.length);
        break;
      case "rbracket":
        const top = repStack.pop();
        if (top !== undefined) {
          currentRoutine.actions.push({
            type: "rep_end",
            goto: top,
          });
        } else if (currentRoutine) {
          if (isMainRoutine) {
            isMainRoutine = false;
            if (lexer.peek() === undefined) {
              throw "Unnecessary `]` closing the main routine. Perhaps a `rep` is not closed.";
            }
          } else {
            currentRoutine.actions.push({
              type: "goto_sub_call",
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

  if (currentRoutine !== null && currentRoutine !== routines.main) {
    throw "Unclosed subroutine";
  }

  return routines;
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
