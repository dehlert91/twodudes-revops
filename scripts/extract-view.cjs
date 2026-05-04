const fs = require('fs');
const path = String.raw`C:\Users\DylanEhlert\.claude\projects\C--Users-DylanEhlert-twodudes-revops\b71cd76f-3dd0-47f4-a6f0-532cd1dbb8c3\tool-results\toolu_01QcUAcoCQD3fCXMADS9erUC.json`;
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const text = data[0].text; // a JSON string like {"result":"..."}
const outer = JSON.parse(text); // {result: "...<untrusted-data>...[{...}]...</untrusted-data>"}
const inner = outer.result;
// Inner is a string with <untrusted-data-XXX> tags around a JSON array
const arrStart = inner.indexOf('[{');
const arrEnd = inner.lastIndexOf('}]') + 2;
const arr = JSON.parse(inner.substring(arrStart, arrEnd));
const sql = arr[0].pg_get_viewdef;
fs.writeFileSync('C:\\Users\\DylanEhlert\\twodudes-revops\\scripts\\current-view.sql', sql);
console.log(sql.length, 'chars written');
