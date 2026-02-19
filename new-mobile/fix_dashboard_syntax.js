const fs = require('fs');
let c = fs.readFileSync('lib/main.dart', 'utf8');

// Fix string interpolation - Dart uses ${} not \${}
c = c.replace(/\\\$/g, '\$');

// Fix other syntax issues
c = c.replace(/'Track \\\${/g, "'Track \${");
c = c.replace(/\\\${_formatSecondsInt/g, '\${_formatSecondsInt');
c = c.replace(/\\\${currentIdx/g, '\${currentIdx');
c = c.replace(/\\\${i \+ 1}/g, '\${i + 1}');
c = c.replace(/\\\${song\['index'\] \+ 1}/g, "\${song['index'] + 1}");

fs.writeFileSync('lib/main.dart.tmp', c, 'utf8');
console.log('✓ Fixed string interpolation syntax');

