#!/usr/bin/env node

import yargs from "yargs/yargs";
import { interpret } from "./interpreter";

interface Arguments {
  [x: string]: unknown;
  cmd: string;
}

const options: Arguments = yargs(process.argv.slice(2))
  .options({
    cmd: {
      alias: "c",
      describe: "program passed in as string (terminates option list)",
      type: "string",
      demandOption: true,
    },
  })
  .usage("Example usage: node cli.js -c '2, 3 + (P)'")
  .parseSync();

interpret(options.cmd, false);
