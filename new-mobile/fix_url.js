const fs = require('fs');
const p = 'lib/main.dart';
let c = fs.readFileSync(p, 'utf8');
// Fix: final url -> var url so localhost replacement can reassign it
const oldLine = "      final url = (ann['file_url'] ?? ann['url'] ?? '').toString();";
const newLine = "      var url = (ann['file_url'] ?? ann['url'] ?? '').toString();";
if (c.includes(oldLine)) {
  c = c.replace(oldLine, newLine);
  console.log('Fixed: final url -> var url');
} else {
  console.log('Pattern not found - checking file...');
  const idx = c.indexOf("ann['file_url']");
  console.log('ann[file_url] found at index:', idx);
  if (idx > -1) console.log('Context:', JSON.stringify(c.substring(idx-20, idx+60)));
}
fs.writeFileSync(p + '.tmp', c, 'utf8');
console.log('Written to tmp');

