# GEORGE language

Quick implementation based on https://en.wikipedia.org/wiki/GEORGE_(programming_language) and http://members.iinet.net.au/~dgreen/deuce/GEORGEProgrammingManual.pdf.

The language name should always be stylized as GEORGE -- or G E O R G E if you're feeling funky.

The GEORGE language uses some non-ASCII unicode characters. For your convenience and until a GEORGE keyboard layout exists, `GEORGE.xcompose` is provided with compose key bindings. If you're on Windows, you will want to install [WinCompose](http://wincompose.info/) to use this; otherwise, just include the file in your `~/.XCompose`. Changes should apply after restarting the input method (a reboot works well).

---

Notes from reading the GEORGE Programming Manual:

This is called G-code, for GEORGE-code presumably

## 1. Programming

### 1.1 "Reverse Polish" notation

- We use reverse polish notation.
- GEORGE only has monadic (`neg`, `mod` (absolute value), `log`, etc.) and dyadic operators (`+`, `-`, `×`, `÷`, etc.)
- Variables such as `a` are niladic; they push 1 value without popping any.
- Push results to a stack, then the operators pop 1 or 2 values and push 1 value.
- Operator `dup` duplicates the top of the stack
- Operator `rev` swaps the top two entries on the stack

#### Operators

| Symbol | For        | write     |
| ------ | ---------- | --------- |
| `+`    | `a + b`    | `a b +`   |
| `-`    | `a - b`    | `a b -`   |
| `×`    | `ab`       | `a b ×`   |
| `÷`    | `a÷b`      | `a b ÷`   |
| `neg`  | `-a`       | `a neg`   |
| `mod`  | `\|a\|`    | `a mod`   |
| `max`  | `max(a,b)` | `a b max` |
| `log`  | `log_e(a)` | `a log`   |
| `exp`  | `e^a`      | `a exp`   |
| `pow`  | `a^b`      | `a b pow` |
| `rem`  | `a%b`      | `a b rem` |
| `√`    | `√a`       | `a √`     |
| `sin`  | `sin(a)`   | `a sin`   |
| `cos`  | `cos(a)`   | `a cos`   |
| `dup`  | e          | e         |
| `rev`  | e          | e         |

Notes:

- `sin` and `cos` are in radians
- `a b rem` returns the number `x` such that `nb + x = a` where `n` and `b` are both integers and `0 ≤ x < b`. Note that `a 1 rem` gives the positive fractional part of `a`.

### 1.2 Numerals

Use `0123456789` (and `.` if needed) to form numbers

When two numbers must be written consecutively, they should be separated by a comma.

For `(4.3)÷(16-x)` write `4.3, 16 x - ÷`

### 1.3 Variables

An alphabet of 32 letters is provided, including `a-z` except `o` and some Greek letters: `abcdefghijklmnΘpqrstuvwxyzαβυλμω`

There are three separate ranges of storage locations:

- "Unsuffixed variable" store: 32 locations used for single values
- "Single suffix" or "vector" store: 32 × 32 locations. Any of the 32 letters may be used with a single suffix, and suffixes may be from 0 to 31
- "Double suffix" or "matrix" store: 32 × 32 × 4 locations: Both suffixes may range from 0 to 31, but only the letters `a`, `b`, `c`, and `d` may be used

The entire number store is random access (any location may be accessed at any time)

Suffixes are written first and separated by a single bar for single suffixes or a double-bar for double suffixes:

For `x_14`, write `14 | x`

For `c_6,31`, write `6 , 31 ‖ c`

For `a_{i+j}`, write `i j + | a`

For `a_4,{x+1}`, write `4 x 1 + ‖ a`

For `a_{j_k}`, write `k | j | a`

### 1.4 Names

When a number has been calculated, it can be inserted to the number store by using a "name" symbol such as `(c)`.

For `c ← a + b` write `a b + (c) ;`

For `x_i ← y_3` write `3 y i | (x) ;`

For `b_{i,j} ← a_{i,j}^2` write `i j ‖ a dup × i j ‖ (b) ;`

Note the use of the semicolon instruction `;`. This pops the printed value from the stack because the "name" symbol does not do it automatically.

### 1.5 Input and Output

The symbol `R` reads one number from STDIN and places it in the first vacant cell of the accumulator.

The symbol `(P)` prints the number at the top of the stack. It is written with parentheses to indicate that it does not pop from the stack

For `x = 1 + nextNum()` write `R 1 + (x) ;`

For `print(x)` write `x (P) ;`

For `print(nextNum() + nextNum())` write `R R + (P) ;`

For `x_{3}...x_{12} = [nextNum()for _ in range(10)]` write `3 12 R| (x) ;`

For `map(print, [x_{3}...x{12}])` write `3 12 P| (x) ;`

To read in a matrix of numbers `a_ij` to `a_mn` write `i m j n R‖ (a)`. The matrix is read or printed row by row, i.e. in the order `a_{i,j}, a_{i,j+1}, ... a_{i,n}, a_{i+1,j}, ... `

### 1.6 Repetitive operations

For `for (i=a; i<=b; i++) { exp(i) }`, write `a b rep (i) i exp ]`

For example, you can print the first twenty square numbers by using `1, 20 rep (j) j j × (P) ; ]`

To set `a_j = b_j^2` for each `j` from `1` to `n`, write `1 n rep (j) j | b dup × j | (a)`

For repeated summation, simply push `0` to the stack before running the loop. For example, the sum of the first 100 squares can be printed as thus: `0, 1, 100 rep (j) j j × + ] (P) ;`

If you don't need the iteration variable, just don't use it. `1, 1, 5 rep (i) dup y rev ÷ + 2 ÷ ] (P) ;` prints the result of five iterations of Newton's method for the square root of `y`.

Repetitions may of course be nested. To print, for each `b` from 1 to 5, the sum of `a^b` over `a` from 1 to 9, write

```
1, 5 rep (b)
  0
  1, 9 rep (a)
    a b pow + (P) ;
  ]
]
```

For three simple program examples, see page 7 and 8 of the GEORGE Programming Manual. TODO include here

### 1.7 Subroutines

These are like methods. Each must be numbered.

For example, a subroutine to push the square root of the sum of squares of the two numbers at the top of the stack may be written as follows: `* 6 dup × rev dup × + .5 √ ]`

If this subroutine is attached to a program, it may be called by using the symbols `6 ↓`, which can be considered as a diadic operator, for example `a b 6 ↓ (P) ]` (Note that `]` must be used to end the program so that it does not carry on into subroutines.

The number of a subroutine must be represented by a single numeral symbol. (0 to 31)

A subroutine can access locations in the rest of the number store. Take care not to over-write locations needed in the main program. Convention is to reserve Greek letters for use in subroutines.

Subroutines may themselves reference other subroutines.

### 1.8 Skips and discrimination

A place marker consisting of `*` following by a single numeral may be inserted anywhere in a program. A GOTO "skip" instruction may be given by writing the number of the mark followed by the symbol `↑` (this works similar to "skip to subroutine" ↓ except it does not provide for later returning to the point of interruption).

For example, to infinitely read in pairs of number and print their sum, write

```
* 0 R R + (P) ; 0 ↑
```

Skips may also be conditional on the results of a calculation. For this purpose, there are two relational operators: `=` and `>`, and three logical operators: `~`, `&` and `∨`. A skip (either `↑` or `↓`) is treated as conditional if one of the two relational operators occurs prior to it since the previous skip.

```
= equals
> greater than
~ not
& and
∨ or
```

Note that "false" is represented by `0`, and "true" is represented by -1 (`1 neg`)

To run Newton's method for square root until successive values differ by not more than `e`, write

`1 * 0 (x) y x ÷ + 2 ÷ dup x - mod e > 0 ↑`

### 1.9 Miscellaneous programming points

- (Not implemented here) The stack is limited to 12 cells
- (Not implemented here) The link list (call stack) is limited to six entries
- (Not implemented here) Limited to 512 symbols
- Some symbols are treated in pairs or groups and must not be separated by other symbols such as comma, etc. These are: numeral sequences, bar-signs (`|` and `‖`) with their following variables; `rep` with the following name; `R|`, `P|`, `R‖`, `P‖` and their following names; the asterisk `*` and its following numeral
- Numbers used for indexing purposes (suffixes, skip numbers, ranges of repetition) are
  - assumed to be integers of modulus less than 2^15; use of numbers with fractional parts or outside this range may give incorrect results
  - skip numbers are interpreted modulo 32
- Although suffixes are normally limited to the range 0 to 31, use of values outside these limits is possible under certain circumstances
  - Single suffixes: total is treated modulo 1024. `a_32≡b_0`, `a_33≡b_1`, `a_64≡c_0`, `a_{-1}≡ω_31`
  - Double suffixed: the second suffix is interpreted modulo 32 and does _not_ cause spill. The first suffix is mod 128 as spills through `a`, `b`, `c`, `d` in the same way as single suffxes
- (Not implemented) The symbol `wait` performs no operation but halts the program until a manual signal is given, displaying the top number of the stack while paused.
- (Not implemented) Symbol "I" for taking input from keys; maybe this could be program argv?
