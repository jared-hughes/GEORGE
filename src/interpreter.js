const parse = require("./parser").default;

function interpret(code) {
  const routines = parse(code);
  console.log(routines);
}

exports.default = interpret;
