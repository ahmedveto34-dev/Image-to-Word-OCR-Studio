const fs = require('fs');
let code = fs.readFileSync('src/utils/docxExport.ts', 'utf-8');

code = code.replace(/heading: HeadingLevel.HEADING_1,\n/g, "");
code = code.replace(/heading: HeadingLevel.HEADING_2,\n/g, "");
code = code.replace(/heading: HeadingLevel.HEADING_3,\n/g, "");
code = code.replace(/heading: HeadingLevel.HEADING_4,\n/g, "");

fs.writeFileSync('src/utils/docxExport.ts', code);
