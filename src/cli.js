#!/usr/bin/env node

const yargs = require("yargs");
const parse = require("./parser.js").default;

const options = yargs
  .usage("Example usage: node cli.js -c '2, 3 + (P)'")
  .option("c", {
    alias: "cmd",
    describe: "program passed in as string (terminates option list)",
    type: "string",
    demandOption: true,
  }).argv;

console.log(parse(options.cmd));
