main -> stmts {% 
    ([statements]) => ({
      statements,
      subs: []
    })
  %}
  | stmts "]" sub_declare:* {% 
    ([statements, _, subs]) => ({
      statements,
      subs
    })
  %}
stmts -> _ symbol:* {%
  ([_, symbols]) => symbols.map(e => e[0]).filter(e => e !== null)
%}
symbol -> (comma | number | operator |
  unsuffixed_access | suffixed_access | unsuffixed_name | suffixed_name | arr_io |
  rep_loop | label | jmp_skip | sub_skip | jmp_declare | __) {% id %}
# commas help to separate numbers without spaces
# best used when converting to/from binary format
comma -> "," {% () => null %}
number -> [0-9]:+ ("." [0-9]:+):? {%
  ([before, after]) => ({
    symbol: "number",
    value: parseFloat(
      before.join("") +
      (after ? "." + after[1].join("") : "")
    )
  })
%}
# Only [a-d] may be used for matrices
letter -> [a-nΘp-zαβυλμω] {% id %}
operator -> (";" | "+" | "-" | "×" | "÷" | "neg" | "mod" | "max" | "dup" | "rev" |
  "log" | "exp" | "pow" | "rem" | "√" | "sin" | "cos" | "wait" |
  "R" | "(P)") {%
    ([[op]]) => ({
      symbol: "operator",
      operator: op
    })
  %}
name -> "(" letter ")" {% id %}
unsuffixed_access -> letter {%
  ([letter]) => ({
    symbol: "access",
    suffix_count: 0,
    letter
  })
%}
suffixed_access -> pipe _ letter {%
  ([pipe, _, letter]) => ({
    symbol: "access",
    suffix_count: pipe,
    letter
  })
%}
unsuffixed_name -> name {%
  ([letter]) => ({
    symbol: "assignment",
    suffix_count: 0,
    letter
  })
%}
suffixed_name -> pipe _ name {%
  ([pipe, _, letter]) => ({
    symbol: "assignment",
    pipe,
    letter
  })
%}
arr_io -> [RP] pipe _ name {%
  ([rp, pipe, _, letter]) => ({
    symbol: rp == "P" ? "print" : "read",
    suffix_count: pipe,
    letter
  })
%}
pipe -> [|‖] {%
  ([pipe]) => "|‖".indexOf(pipe) + 1
%}
rep_loop -> "rep" _ name _ stmts _ "]" {%
  ([_rep, _, name, _1, statements]) => ({
    symbol: "rep",
    name,
    statements
  })
%}
label -> [0-2] [0-9] | "30" | "31" {%
  (d) => parseInt(''.join(d))
%}
sub_skip -> label _ "↓" {%
  ([label, _, _1]) => ({
    symbol: "sub_skip",
    label
  })
%}
jmp_skip -> label _ "↑" {%
  ([label, _, _1]) => ({
    symbol: "jmp_skip",
    label
  })
%}
jmp_declare -> "*" _ label {%
  ([d, _, _1]) => ({
    symbol: "jmp_declare",
    label
  })
%}
sub_declare -> "*" _ label _ stmts _ "]" {%
  ([_, _1, label, _2, statements]) => ({
    symbol,
    statements
  })
%}
# Whitespace: `_` is optional, `__` is mandatory.
@builtin "whitespace.ne"