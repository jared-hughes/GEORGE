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
      type: "goto_sub_call";
    };
export type Routine = {
  actions: Action[];
  jmpIndices: Map<number, number>;
  name: string;
};
export interface Routines {
  main: Routine;
  [k: string]: Routine;
}

export default function parse(code: string) {
  function parseError(token: Token, type: string) {
    return new Error(lexer.formatError(token, type));
  }

  function eofError(parsing?: string) {
    return new Error(`EOF while parsing ${parsing || "something"}.`);
  }

  function nextRequired(parsing?: string) {
    const token = lexer.next();
    if (token === undefined) {
      throw eofError(parsing);
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
        throw parseError(lparen, "Expected `(` starting a name");
      }
    }
    // We don't want to allow spaces, so use nextRequired() instead of nextNonWhitespaceRequired()
    const letter = nextRequired("name");
    if (letter.type !== "letter") {
      throw parseError(letter, "Expected letter in name");
    }
    const rparen = nextRequired("name");
    if (rparen.type !== "rparen") {
      throw parseError(rparen, "Expected `)` closing a name");
    }
    return getLetterIndex(letter.value);
  }

  function parseLabelValue() {
    const labelToken = nextNonWhitespaceRequired("label");
    if (labelToken?.type !== "number") {
      throw parseError(labelToken, "Label requires a number");
    }
    return parseFloat(labelToken.value);
  }

  lexer.reset(code);

  let routines: Routines = {
    main: {
      actions: [],
      jmpIndices: new Map(),
      name: "main",
    },
  };
  let currentRoutine: Routine | null = routines.main;
  let isMainRoutine = true;
  let isPrevComma = false;
  // stack of indices to return to
  let repStack = [];

  let token;

  while ((token = nextNonWhitespace())) {
    const tokenType = token.type as keyof typeof tokenTable;
    if (tokenType === "asterisk") {
      if (currentRoutine === null) {
        // declare a subroutine
        const labelValue = parseLabelValue();
        currentRoutine = {
          actions: [],
          jmpIndices: new Map(),
          name: "" + labelValue,
        };
        routines[labelValue] = currentRoutine;
      } else {
        // Subroutine declaration handled above
        const labelValue = parseLabelValue();
        currentRoutine.jmpIndices.set(
          labelValue,
          // pointer to index after the label
          currentRoutine.actions.length - 1
        );
      }
    } else if (currentRoutine === null) {
      throw parseError(token, "Expected `*` to begin subroutine");
    }
    switch (tokenType) {
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
          throw parseError(
            token,
            "Oopsie, a comma is missing between two numbers"
          );
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
          const letterToken = nextNonWhitespaceRequired();
          if (letterToken?.type !== "letter") {
            throw parseError(letterToken, "Expected letter");
          }
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
        throw parseError(token, "Unmatched right paren");
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
              throw parseError(
                token,
                "Unnecessary `]` closing the main routine. Probably a `rep` is not closed."
              );
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
    throw eofError("subroutine");
  }
  if (repStack.length > 0) {
    throw eofError("rep");
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
