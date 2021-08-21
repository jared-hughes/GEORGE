#!/usr/bin/env node

import yargs from "yargs/yargs";
import { interpret, InterpreterOptionsOpt } from "./interpreter";

export default function runGEORGE(args: string[], opts: InterpreterOptionsOpt) {
  interface Arguments {
    [x: string]: unknown;
    cmd: string;
  }

  const options: Arguments = yargs(args)
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

  interpret(options.cmd, opts);
}
