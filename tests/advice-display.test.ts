import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('AI display converts cents and basis points without changing servings or saved evidence',()=>{
 const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const helper=source.slice(source.indexOf('function displayAdvice('),source.indexOf('async function refreshAI('));
 const format=vm.runInNewContext(helper+';displayAdvice');
 const raw='83,679 cents against a 150,000-cent budget, 25,104 cents profit and a 3,000-basis-point margin. 53 servings; 12 available; shortage 41.';
 assert.equal(format(raw),'$836.79 against a $1,500.00 budget, $251.04 contribution (not net profit) and a 30% margin. 53 servings; 12 available; shortage 41.');
 assert.equal(format('83679 cents; 3000 basis points; not net profit.'),'$836.79; 30%; not net profit.');
 assert.equal(format('$836.79; contribution; 30%.'),'$836.79; contribution; 30%.');
 assert.match(raw,/83,679 cents/);
});
