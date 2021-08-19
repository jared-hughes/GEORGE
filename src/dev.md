To compile the grammar:

```
nearleyc grammar.ne -o grammar.js
```

To quickly test a single string:

```
nearleyc grammar.ne -o grammar.js; nearley-test -q -i "4.3 16 x - ÷" grammar.js
```
