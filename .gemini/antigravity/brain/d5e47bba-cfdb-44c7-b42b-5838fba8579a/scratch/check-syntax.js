const fs = require('fs');
const ts = require('typescript');

function checkFile(filePath) {
  console.log(`Checking ${filePath}...`);
  const content = fs.readFileSync(filePath, 'utf8');
  const result = ts.transpileModule(content, {
    compilerOptions: { 
      jsx: ts.JsxEmit.ReactJSX, 
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS
    }
  });
  
  // Let's parse it properly with ts.createSourceFile to get diagnostics
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.ES2020,
    true
  );
  
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([filePath], {
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2020,
    noEmit: true
  }));

  if (diagnostics.length === 0) {
    console.log("No diagnostics errors found via tsc program.");
  } else {
    diagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
        let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
      } else {
        console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      }
    });
  }
}

try {
  checkFile('src/app/[schoolId]/admin/sections/AdminBrandingTab.tsx');
  checkFile('src/app/[schoolId]/admin/sections/AdminNotificationsTab.tsx');
} catch (e) {
  console.error("Error running syntax check:", e);
}
