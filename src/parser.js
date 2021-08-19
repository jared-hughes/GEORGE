const moo = require("moo");
const PeekableLexer = require("moo-peekable-lexer");

const mooLexer = moo.compile({
  // Only [a-d] may be used for matrices
  operator:
    /[-+×÷;√↑↓>=~&∨]|neg|mod|max|dup|rev|log|exp|pow|rem|sin|cos|wait|R|\(P\)/,
  rep: "rep",
  number: {
    match: /[1-9][0-9]*(?:\.[0-9]+)?|0/,
    value: parseFloat,
  },
  comma: ",",
  rbracket: "]",
  RPpipe: /[RP][|‖]/,
  pipe: {
    match: /[|‖]/,
    value: pipeValue,
  },
  asterisk: "*",
  lparen: "(",
  rparen: ")",
  whitespace: {
    match: /\s/,
    lineBreaks: true,
  },
  letter: /[a-nΘp-zαβυλμω]/,
});

const lexer = new PeekableLexer({ lexer: mooLexer });

// Just testing all the syntax from examples pasted from the README
lexer.reset(`4.3 , 16 x - ÷
1 * 0 (x) y x ÷ + 2 ÷ dup x - mod e > 0 ↑
2 (a) ;
a b rep (i) i exp ]
1 n rep (j) j | b dup × j | (a) ]
i j ‖ a dup × i j ‖ (b) ;
6 ↓
]
* 6 (P) ; ]`);

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

let routines = { main: [] };
let currentRoutine = routines.main;
let isMainRoutine = true;
let isPrevComma = false;
// stack of indices to return to
let repStack = [];

let token;

while ((token = nextNonWhitespace(false))) {
  if (currentRoutine === null && token.type !== "asterisk") {
    throw "Symbol outside routine";
  }
  switch (token.type) {
    case "operator":
      currentRoutine.push({
        type: "operator",
        value: token.value,
      });
      break;
    case "number":
      if (
        currentRoutine?.length &&
        currentRoutine[currentRoutine.length - 1].type === "number" &&
        !isPrevComma
      ) {
        throw "Oopsie, a comma is missing between two numbers";
      }
      currentRoutine.push({
        type: "number",
        value: token.value,
      });
      break;
    case "comma":
      break;
    case "asterisk":
      labelToken = nextNonWhitespace();
      if (labelToken.type !== "number") {
        throw "Label expects number following it";
      }
      // TODO: maybe restrict label value
      if (currentRoutine !== null) {
        currentRoutine.push({
          type: "jmp_declare",
          label: labelToken.value,
        });
      } else {
        // declare a subroutine
        currentRoutine = [];
        routines[labelToken.value] = currentRoutine;
      }
      break;
    case "RPpipe":
      currentRoutine.push({
        type: token.value[0] == "P" ? "print" : "read",
        suffix_count: pipeValue(token.value[1]),
        letter: parseName(),
      });
      break;
    case "pipe":
      if (peekNonWhitespace()?.type === "lparen") {
        // assignment
        currentRoutine.push({
          type: "assign",
          suffix_count: pipeValue(token.value),
          letter: parseName(),
        });
      } else {
        letterToken = nextNonWhitespace();
        if (letterToken.type !== "letter") throw "Expected letter";
        currentRoutine.push({
          type: "access",
          suffix_count: pipeValue(token.value),
          letter: letterToken.value,
        });
      }
      break;
    case "lparen":
      currentRoutine.push({
        type: "assign",
        suffix_count: 0,
        letter: parseName(true),
      });
      break;
    case "rparen":
      throw "Unmatched right paren";
    case "letter":
      currentRoutine.push({
        type: "access",
        suffix_count: 0,
        letter: token.value,
      });
      break;
    case "rep":
      const letter = parseName();
      currentRoutine.push({
        type: "rep_start",
        letter: letter,
      });
      // pointer to the index after the rep
      repStack.push(currentRoutine.length);
      break;
    case "rbracket":
      if (repStack.length > 0) {
        currentRoutine.push({
          type: "rep_end",
          goto: repStack.pop(),
        });
      } else if (currentRoutine) {
        if (isMainRoutine) {
          isMainRoutine = false;
          if (lexer.peek() === undefined) {
            throw "Unnecessary `]` closing the main routine. Perhaps a `rep` is not closed.";
          }
        } else {
          currentRoutine.push({
            type: "goto_sub_call",
          });
        }
        currentRoutine = null;
      }
      break;
  }
  isPrevComma = token.type === "comma";
}

if (currentRoutine !== null && currentRoutine !== routines.main) {
  throw "Unclosed subroutine";
}

function parseName(skipLParen = false) {
  if (!skipLParen) {
    if (nextNonWhitespace()?.type !== "lparen") throw "Expected name";
  }
  // We don't want to allow spaces, so use lexer.next() instead of next()
  letter = lexer.next();
  if (letter?.type !== "letter") throw "Expected letter";
  if (lexer.next()?.type !== "rparen") throw "Expected closing paren on name";
  return letter.value;
}

function pipeValue(pipe) {
  return "|‖".indexOf(pipe) + 1;
}

console.log(routines);
