import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const manifest=JSON.parse(await fs.readFile('assets/campaign-source.json','utf8'));
await fs.mkdir('assets/originals/campaign',{recursive:true});
await fs.mkdir('public/images',{recursive:true});
for(const asset of manifest){
 const original=path.join('assets/originals/campaign',`${asset.key}.png`);
 if(path.resolve(asset.path)!==path.resolve(original))await fs.copyFile(asset.path,original);
 const image=sharp(original);
 const isBag=asset.key.endsWith('-bag');
 await image.clone().resize({width:isBag?800:1600,withoutEnlargement:true}).webp({quality:85}).toFile(`public/images/${asset.key}.webp`);
 await image.clone().resize({width:640,withoutEnlargement:true}).webp({quality:82}).toFile(`public/images/${asset.key}-640.webp`);
 if(isBag)await image.clone().resize({width:480,withoutEnlargement:true}).webp({quality:82}).toFile(`public/images/${asset.key}-480.webp`);
}
for(const key of ['discovery-box','mixed-box','gift-box'])await fs.copyFile('public/images/family.webp',`public/images/${key}-closeup.webp`);
console.log('Campaign originals retained and responsive WebP assets exported.');
