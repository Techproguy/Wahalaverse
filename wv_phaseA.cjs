const { chromium } = require('@playwright/test');
(async()=>{
const b = await chromium.launch();
const out = {};
const page = await b.newPage({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
const cerr=[]; page.on('console',m=>{if(m.type()==='error')cerr.push(m.text())});
await page.goto('http://localhost:8080/?page=create-custom',{waitUntil:'load'});
await page.fill('#cc-name','Tester 😎');
await page.fill('[data-cc="q"][data-qi="0"]','Q1?'); await page.fill('[data-cc="o"][data-qi="0"][data-oi="0"]','A'); await page.fill('[data-cc="o"][data-qi="0"][data-oi="1"]','B');
await page.click('[data-action="cc-answer"][data-qi="0"][data-oi="0"]');
out.answerSelected = await page.evaluate(()=>!!document.querySelector('[data-action="cc-answer"][data-qi="0"][data-oi="0"].selected'));
out.noHOverflowBuilder = await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth<=2);
for(let n=1;n<10;n++){ await page.click('[data-action="cc-add-q"]'); }
const rnd=(n,s)=>Array.from({length:n},(_,i)=>String.fromCharCode(33+((i*97+s*131+i*i*7)%94))).join('');
for(let qi=0;qi<10;qi++){ await page.fill(`[data-cc="q"][data-qi="${qi}"]`,rnd(120,qi+1)); await page.fill(`[data-cc="o"][data-qi="${qi}"][data-oi="0"]`,rnd(60,qi*9+1)); await page.fill(`[data-cc="o"][data-qi="${qi}"][data-oi="1"]`,rnd(60,qi*9+2)); await page.click(`[data-action="cc-answer"][data-qi="${qi}"][data-oi="0"]`); }
await page.click('[data-action="cc-preview"]'); await page.waitForTimeout(200);
out.previewOpened = await page.evaluate(()=>/Looking/.test(document.body.innerText));
if(out.previewOpened){ await page.click('[data-action="cc-generate"]'); await page.waitForTimeout(500); }
out.toastAfterGen = await page.evaluate(()=>{const t=document.getElementById('toast');return t?t.textContent:''});
out.backOnBuilder = await page.evaluate(()=>/Write your/.test(document.body.innerText));
out.draftSurvived = await page.evaluate(()=>{const n=document.querySelector('#cc-name');const q0=document.querySelector('[data-cc="q"][data-qi="0"]');return !!(n&&n.value)&&!!(q0&&q0.value&&q0.value.length>0);});
out.gotLink = await page.evaluate(()=>!!document.querySelector('#share-link'));
out.consoleErrors = cerr.slice(0,5);
console.log(JSON.stringify(out,null,2));
await b.close();
})().catch(e=>{console.error('ERR',e.message)});
