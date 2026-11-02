/* ================= UI ================= */
const $=id=>document.getElementById(id);
const ORDER=['crashloop','imagepull','pending','service-selector','vault-secrets','vault-sealed','helm-tls'];
let results=[],timerH=null,hist=[],hi=0,curId=null;
function lsGet(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
results=lsGet('k8slab_results',[]);
function who(){return($('name').value||'').trim()||'Player'}
function fmtT(ms){const s=Math.floor(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function bestFor(id){const r=results.filter(x=>x.id===id);return r.length?r.reduce((a,b)=>(b.points>a.points||(b.points===a.points&&b.ms<a.ms))?b:a):null}
function renderMenu(){
  $('name').value=lsGet('k8slab_name','');$('who').textContent='👤 '+who();
  $('cards').innerHTML='';
  ORDER.forEach(id=>{const sc=SC[id],b=bestFor(id);const d=document.createElement('div');d.className='card';
    d.innerHTML='<h2></h2><p><span class="tag"></span> <span class="best"></span></p><button class="primary">Start</button>';
    d.querySelector('h2').textContent=sc.title;d.querySelector('.tag').textContent=sc.level;
    d.querySelector('.best').innerHTML=b?'<span class="done">✔ best '+b.points+' pts, '+fmtT(b.ms)+'</span>':'<small>not solved yet</small>';
    d.querySelector('button').onclick=()=>startGame(id);$('cards').appendChild(d)});
  const R=$('results');
  if(!results.length){R.innerHTML='<small>No runs yet.</small>'}
  else{let h='<table><tr><th>Scenario</th><th>Pts</th><th>Time</th><th>Hints</th><th>Who</th></tr>';results.slice(-15).reverse().forEach(r=>{h+='<tr><td>'+esc(SC[r.id]?SC[r.id].title:r.id)+'</td><td>'+r.points+'</td><td>'+fmtT(r.ms)+'</td><td>'+r.hints+(r.sol?' + solution':'')+'</td><td>'+esc(r.who)+'</td></tr>'});R.innerHTML=h+'</table>'}
}
function esc(x){return String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function print(txt,cls){const d=document.createElement('div');d.className=cls||'out';d.textContent=txt;$('term').appendChild(d);$('term').scrollTop=$('term').scrollHeight}
function updPts(){$('pts').textContent=Sim.points()+' pts'}
function startGame(id){
  lsSet('k8slab_name',$('name').value);
  Sim.start(id);curId=id;
  $('menu').classList.add('hidden');$('game').classList.remove('hidden');$('timer').classList.remove('hidden');$('pts').classList.remove('hidden');
  $('who').textContent='👤 '+who();$('gtitle').textContent=Sim.sc.title+' ('+Sim.sc.level+')';$('brief').textContent=Sim.sc.brief;
  $('term').innerHTML='';$('win').classList.add('hidden');
  print('Connected to context kind-kcna-lab, namespace lab. Type help for supported commands.','sys');
  updPts();clearInterval(timerH);tick();timerH=setInterval(tick,500);$('cmd').value='';$('cmd').focus();
}
function tick(){const e=Sim.done?Sim.endT:Date.now();$('timer').textContent='⏱ '+fmtT(e-Sim.startT)}
function backToMenu(){clearInterval(timerH);$('game').classList.add('hidden');$('menu').classList.remove('hidden');$('timer').classList.add('hidden');$('pts').classList.add('hidden');renderMenu()}
function doCheck(){
  if(Sim.done){print('Already solved. Back to the menu for the next one.','good');return}
  if(Sim.check()){
    const pts=Sim.points(),ms=Sim.endT-Sim.startT;
    results.push({id:curId,points:pts,ms,hints:Sim.hints,sol:Sim.sol,who:who(),date:new Date().toISOString().slice(0,10)});lsSet('k8slab_results',results);
    print('PASS: incident resolved! '+pts+' pts in '+fmtT(ms)+' (hints used: '+Sim.hints+(Sim.sol?', solution viewed':'')+')','good');
    const idx=ORDER.indexOf(curId),nxt=ORDER[idx+1];
    const w=$('win');w.classList.remove('hidden');w.innerHTML='<h2>✅ Resolved</h2><p>'+esc(Sim.sc.solution).replace(/\n/g,'<br>')+'</p><div class="btns"></div>';
    const b=w.querySelector('.btns');
    if(nxt){const n=document.createElement('button');n.className='primary';n.textContent='Next: '+SC[nxt].title;n.onclick=()=>startGame(nxt);b.appendChild(n)}
    const m=document.createElement('button');m.textContent='Menu';m.onclick=backToMenu;b.appendChild(m);
    updPts();
  }else print('NOT YET: the incident is not resolved. Keep investigating (hint if you are stuck).','sys');
}
function submit(){
  const line=$('cmd').value;$('cmd').value='';if(!line.trim())return;
  hist.push(line);hi=hist.length;print('$ '+line,'cmd');
  if(Sim.done&&!/^(menu|exit|quit|clear|help)$/i.test(line.trim())){print('Incident already resolved. Use the buttons below to continue.','sys');return}
  const r=Sim.exec(line);
  if(r.clear){$('term').innerHTML='';return}
  if(r.quit){backToMenu();return}
  if(r.hint){print(r.out,'sys');updPts();return}
  if(r.check){doCheck();return}
  if(r.solution){doSolution();return}
  if(r.edit){openEditor(r.edit);return}
  if(r.out!=='')print(r.out);
}
function doSolution(){if(!Sim.sol&&!Sim.done){if(!confirm('Viewing the solution sets this scenario to 0 points. Continue?'))return;Sim.sol=true;updPts()}print('SOLUTION:\n'+Sim.sc.solution,'sys')}
function openEditor(ed){
  $('etitle').textContent=ed.title;$('etext').value=ed.yaml;const dlg=$('editor');
  const onClose=()=>{dlg.removeEventListener('close',onClose);if(dlg.returnValue==='save'){const res=ed.onSave($('etext').value);if(res)print(res)}else print('Edit cancelled, no changes made.');$('cmd').focus()};
  dlg.addEventListener('close',onClose);dlg.returnValue='';
  if(dlg.showModal)dlg.showModal();else{const t=prompt(ed.title,ed.yaml);if(t!==null){const res=ed.onSave(t);if(res)print(res)}dlg.removeEventListener('close',onClose)}
}
$('cmd').addEventListener('keydown',e=>{
  if(e.key==='Enter')submit();
  else if(e.key==='ArrowUp'){if(hi>0){hi--;$('cmd').value=hist[hi]}e.preventDefault()}
  else if(e.key==='ArrowDown'){if(hi<hist.length-1){hi++;$('cmd').value=hist[hi]}else{hi=hist.length;$('cmd').value=''}e.preventDefault()}
});
$('bHint').onclick=()=>{if(Sim.done)return;print('$ hint','cmd');print(Sim.hint(),'sys');updPts();$('cmd').focus()};
$('bCheck').onclick=()=>{print('$ check','cmd');doCheck()};
$('bBrief').onclick=()=>{print('$ brief','cmd');print(Sim.sc.brief,'sys')};
$('bSol').onclick=()=>{print('$ solution','cmd');doSolution()};
$('bQuit').onclick=backToMenu;
$('name').addEventListener('input',()=>{lsSet('k8slab_name',$('name').value);$('who').textContent='👤 '+who()});
$('copyRes').onclick=()=>{
  const lines=['K8s Troubleshooting Lab results for '+who()];let total=0;
  ORDER.forEach(id=>{const b=bestFor(id);if(b){total+=b.points;lines.push('- '+SC[id].title+': '+b.points+' pts, '+fmtT(b.ms)+', hints '+b.hints+(b.sol?', solution viewed':''))}else lines.push('- '+SC[id].title+': not solved')});
  lines.push('TOTAL: '+total+' / '+(ORDER.length*3)+' pts');const txt=lines.join('\n');
  const done=()=>{$('copyRes').textContent='Copied!';setTimeout(()=>$('copyRes').textContent='Copy results to share with the team',1500)};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done,()=>prompt('Copy:',txt));else prompt('Copy:',txt);
};
$('clearRes').onclick=()=>{if(confirm('Clear all saved results on this device?')){results=[];lsSet('k8slab_results',results);renderMenu()}};
renderMenu();
