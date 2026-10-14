import { validateNewPassword as v } from "./cp.mjs";
const cases = [
 ["", "Abcdef12", "Abcdef12", "current"],
 ["old", "short1", "short1", "length"],
 ["old", "abcdefgh", "abcdefgh", "letter+number"],
 ["old", "12345678", "12345678", "letter+number"],
 ["Same1234", "Same1234", "Same1234", "different"],
 ["old", "Abcdef12", "Abcdef13", "match"],
 ["old", "Abcdef12", "Abcdef12", ""],
];
for (const [c,n,f,expectWord] of cases) { const r=v(c,n,f); console.log((expectWord ? r.includes(expectWord) : r==="") ? "PASS" : "FAIL", JSON.stringify([c,n,f]), "->", r||"(ok)"); }
