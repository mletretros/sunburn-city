import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), puppeteer = require('puppeteer');
async function walk(path) {
  const entries = [];
  for (const name of (await readdir(path)).sort()) {
    const full = join(path, name), info = await stat(full);
    entries.push({ path: full, name, directory: info.isDirectory(), bytes: info.isFile() ? info.size : 0 });
    if (info.isDirectory()) entries.push(...await walk(full));
  }
  return entries;
}
const entries = await walk('out'), game = entries.filter(e=>e.path.startsWith('out/game/'));
const bytes = game.reduce((sum,e)=>sum+e.bytes,0);
assert.ok(game.length + 1 <= 993); assert.ok(bytes<=50331648);
assert.ok(entries.every(e=>!e.name.startsWith('.'))); assert.ok(entries.length<=1000);
const index = (await stat('out/game/index.html')).size, dossier = (await stat('out/dossier.json')).size;
assert.ok(index<=1048576); assert.ok(dossier<=1572864);
const kit = await readFile('/root/projects/bounty/makefun/gta6-01/kit/gta6-01-kit/starter/vendor/makefun-game.ts').catch(()=>null);
const local = await readFile('vendor/makefun-game.ts');
if (!kit) throw new Error('Locate kit helper before checking equality');
assert.ok(local.equals(kit), 'Vendored kit helper modified');
let syntax = 0;
for (const file of (await walk('game')).filter(e=>!e.directory && e.path.endsWith('.js'))) {
  const result = spawnSync(process.execPath,['--experimental-default-type=module','--check',file.path],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr); syntax++;
}
assert.ok(!(await readFile('README.md','utf8')).match(/[{}]/),'README brace placeholders');
const shots = entries.filter(e=>e.path.startsWith('out/screenshots/') && !e.directory);
assert.ok(shots.length>=3 && shots.length<=4);
const browser = await puppeteer.launch({executablePath:'/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome',headless:true,args:['--no-sandbox']});
const images=[];
try {
  const page=await browser.newPage();
  for(const shot of shots){
    const data=await readFile(shot.path); assert.ok(data.length<=262144); assert.equal(data.readUInt16BE(0),0xffd8); assert.equal(data.readUInt16BE(data.length-2),0xffd9);
    const decoded=await page.evaluate(async encoded=>{const image=new Image();image.src='data:image/jpeg;base64,'+encoded;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let sum=0,squares=0,black=0;for(let i=0;i<pixels.length;i+=4){const v=(pixels[i]+pixels[i+1]+pixels[i+2])/3;sum+=v;squares+=v*v;if(v<8)black++;}const n=pixels.length/4;return {width:image.width,height:image.height,mean:sum/n,variance:squares/n-(sum/n)**2,blackFraction:black/n};},data.toString('base64'));
    assert.equal(decoded.width,1280);assert.equal(decoded.height,720);assert.ok(decoded.variance>200);assert.ok(decoded.blackFraction<.5);
    images.push({name:shot.name,bytes:data.length,eoi:true,...decoded});
  }
}finally{await browser.close();}
console.log(JSON.stringify({gameEntriesIncludingRoot:game.length+1,gameBytes:bytes,indexBytes:index,dossierBytes:dossier,outputEntries:entries.length,dotfiles:0,syntaxFiles:syntax,kitSha256:createHash('sha256').update(local).digest('hex'),images},null,2));
