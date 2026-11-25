const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const {deriveFragrancePlan}=await import(require('node:url').pathToFileURL(path.resolve(__dirname,'../src/utils/fragrancePlan.js')));
 const workspace={branches:[{id:'br',name:'Main Branch',isVirtual:false}],fragranceTypes:[],materials:[{id:'o1',name:'Rose Oil',type:'Perfume Oil'},{id:'o2',name:'Oud Oil',type:'Perfume Oil'},{id:'o3',name:'Musk Oil',type:'Perfume Oil'},{id:'s1',name:'Alcohol',type:'Solvent'}],bottleSizes:[50,100].map(v=>({id:'b'+v,name:v+' ml set',volumeMl:String(v),configured:true,packaging:[{materialId:'bottle',name:'Glass Bottle',role:'Bottle'},{materialId:'pump',name:'Pump',role:'Pump'},{materialId:'cap',name:'Cap',role:'Cap'},{materialId:'label',name:'Label',role:'Label'}]})),fragrances:['Rose','Oud','Musk'].map((name,i)=>({id:'f'+i,name,perfumeOilId:'o'+(i+1),defaultType:'EDP',defaultOilPercentage:'20',solventRecipe:[{materialId:'s1',share:'100'}],defaultBottleSize:'b100',pricesByType:{EDP:[800,1200,950][i]},knots:[],knotDetails:[]}))};
 let saved=null,knots=[];const errors=[];
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),endpoint=url.pathname.split('/api/v1/')[1];let body={};try{body=req.postDataJSON()||{};}catch{}
  let data=[],status=200;
  if(endpoint==='auth/token/refresh/')data={access:'mock-access'};
  else if(endpoint==='auth/me/')data={id:'admin',username:'admin',name:'Admin',role:'owner',permissions:['*'],storeSetup:{singleLocationMode:true,branchId:'br',warehouseId:'wh'}};
  else if(endpoint==='perfume-workspace/')data=workspace;
  else if(endpoint==='perfume-pricing/'){
   const p=deriveFragrancePlan(workspace,body.fragranceSelections,body.bottleSizeId);const selected=p.profiles.map(f=>({fragranceId:f.id,name:f.name,price:String(f.pricesByType.EDP)})),highest=selected.reduce((a,b)=>Number(a.price)>Number(b.price)?a:b);const price=Number(highest.price)*p.volume/100;
   data={sellingPrice:price,pricingToken:'mock-token',pricing:{selectedFragrances:selected,highestFragrance:highest.name,basePrice:highest.price,referenceVolumeMl:'100',multiplier:String(p.volume/100),surcharge:'0',calculatedPrice:String(price)}};
  }else if(endpoint==='perfume-products/'&&req.method()==='POST'){
   const p=deriveFragrancePlan(workspace,body.fragranceSelections,body.bottleSizeId);saved={...body,id:'new-product',fragranceFirst:true,recipeRevision:1,recipe:p.rows,packaging:p.bottle.packaging,fillVolumeMl:p.volume,sellingPrice:600,pricing:{currency:'INR',highestFragrance:'Oud'}};data=saved;status=201;
  }else if(endpoint==='perfume-products/new-product/')data=saved;
  else if(endpoint==='knots/'&&req.method()==='POST'){data={...body,id:'k1'};knots.push(data);status=201;}
  else if(endpoint==='knots/'&&req.method()==='GET')data=knots;
  else if(endpoint==='knots/k1/'&&req.method()==='DELETE'){knots=[];status=204;data=null;}
  else if(endpoint==='fragrances/')data=workspace.fragrances;
  else if(endpoint==='bottle-sizes/')data=workspace.bottleSizes;
  else if(endpoint==='inventory/raw-materials/')data=workspace.materials.map(m=>({...m,categoryType:m.type,unit:'ml',status:'active'}));
  await route.fulfill({status,contentType:'application/json',body:status===204?'':JSON.stringify(data)});
 });
 try{
  await page.goto('http://127.0.0.1:5199/inventory/products/create');await page.getByRole('heading',{name:'Create Product',exact:true}).waitFor();
  const fragrance=n=>page.locator('label').filter({hasText:new RegExp('^Fragrance '+n)}).locator('select');
  await fragrance(1).selectOption('f0');await page.getByRole('button',{name:/Add fragrance/}).click();await fragrance(2).selectOption('f1');
  const oils=page.getByLabel('Oil % of perfume',{exact:true});await oils.nth(0).fill('12');await oils.nth(1).fill('8');
  await page.getByLabel('Bottle / packaging set',{exact:true}).selectOption('b50');
  await page.getByText('Final selling price: INR 600',{exact:true}).waitFor();
  assert.match(await page.locator('tbody').innerText(),/6\.0000/);assert.match(await page.locator('tbody').innerText(),/4\.0000/);
  await page.getByRole('button',{name:/Add fragrance/}).click();await fragrance(3).selectOption('f2');assert.equal(await page.getByRole('button',{name:/Add fragrance/}).isDisabled(),true);
  await page.getByRole('button',{name:'Remove',exact:true}).nth(2).click();await oils.nth(0).fill('12');await oils.nth(1).fill('8');
  await page.getByLabel('Product / combination name',{exact:true}).fill('Royal Rose Oud');
  await page.getByText('Final selling price: INR 600',{exact:true}).waitFor();
  await page.screenshot({path:'/tmp/fragrance-first-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/fragrance-first-mobile.png',fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.getByRole('button',{name:'Save product',exact:true}).click();await page.waitForURL('**/inventory/products/new-product');assert.equal(saved.fragranceSelections.length,2);assert.equal(saved.name,'Royal Rose Oud');
  await page.goto('http://127.0.0.1:5199/inventory/knots');await page.getByRole('button',{name:'+ Create Knot',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Name',{exact:true}).fill('Premium Knot');await dialog.getByLabel('Configured price (INR)',{exact:true}).fill('25');await dialog.getByLabel('Price basis',{exact:true}).selectOption('bottle');await dialog.getByRole('button',{name:'Save Knot',exact:true}).click();
  await page.getByRole('cell',{name:'Premium Knot',exact:true}).waitFor();await page.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Delete Knot',exact:true}).click();await page.getByText('No Knots yet.',{exact:false}).waitFor();
  assert.deepEqual(errors,[]);console.log('PASS: fragrance defaults, 12%/8% ml preview, highest price, max 3, save, 390px overflow, Knot create/delete modal, no runtime errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
