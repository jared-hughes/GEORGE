declare module "moo-peekable-lexer" {
  import { Lexer, Token } from "moo";

  interface PeekableLexer extends Lexer {
    new (opts: any): PeekableLexer;
    peek(): Token;
  }

  const PeekableLexer: PeekableLexer;
  export default PeekableLexer;
}
