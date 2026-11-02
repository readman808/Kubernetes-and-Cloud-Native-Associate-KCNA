'use strict';
/* ================= helpers ================= */
const H=['7d9f8b6c5','6c5d8f7b4','5b8d7f6c4','84c7d9b6f','9f5c6b7d8','68d5c9f7b'];
const RN=['x2k9q','m4tz8','p7wnc','h5rj2','t9vdl','c8bqz','w3nxk','j6pfs'];
const pn=(b,g,i)=>b+'-'+H[g%H.length]+'-'+RN[(g*2+(i||0))%RN.length];
function fmtAge(sec){sec=Math.max(0,Math.round(sec));if(sec<120)return sec+'s';if(sec<3600){const m=Math.floor(sec/60),r=sec%60;return m+'m'+(r?r+'s':'')}const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);return h+'h'+(m?m+'m':'')}
function tbl(head,rows){const all=[head].concat(rows);const w=head.map((_,i)=>Math.max.apply(null,all.map(r=>String(r[i]==null?'':r[i]).length)));return all.map(r=>r.map((c,i)=>i===r.length-1?String(c):String(c).padEnd(w[i]+3)).join('')).join('\n')}
function kv(rows){const w=Math.max.apply(null,rows.map(r=>r[0].length).concat([3]));const L=[['Key','Value'],['---','-----']].concat(rows);return L.map(r=>r[0].padEnd(w+4)+r[1]).join('\n')}
function tokenize(str){const out=[];let cur='',has=false,q=null;for(let i=0;i<str.length;i++){const ch=str[i];if(q){if(ch===q)q=null;else cur+=ch}else if(ch==='"'||ch==="'"){q=ch;has=true}else if(/\s/.test(ch)){if(has||cur){out.push(cur);cur='';has=false}}else if(ch==='\\'&&i+1<str.length){cur+=str[++i];has=true}else{cur+=ch;has=true}}if(has||cur)out.push(cur);return out}
function splitTop(str,seps){const parts=[];let cur='',q=null;for(let i=0;i<str.length;i++){const ch=str[i];if(q){cur+=ch;if(ch===q)q=null;continue}if(ch==='"'||ch==="'"){q=ch;cur+=ch;continue}let hit=null;for(const sp of seps){if(str.startsWith(sp,i)){hit=sp;break}}if(hit==='|'&&str[i+1]==='|')hit=null;if(hit){parts.push(cur);cur='';i+=hit.length-1;continue}cur+=ch}parts.push(cur);return parts}
const KIND={pod:'pod',pods:'pod',po:'pod',deploy:'deploy',deployment:'deploy',deployments:'deploy','deployment.apps':'deploy','deployments.apps':'deploy',svc:'svc',service:'svc',services:'svc',ep:'ep',endpoints:'ep',endpoint:'ep',event:'events',events:'events',ev:'events',node:'node',nodes:'node',no:'node',secret:'secret',secrets:'secret',ns:'ns',namespace:'ns',namespaces:'ns',cm:'cm',configmap:'cm',configmaps:'cm',all:'all',rs:'rs',replicaset:'rs',replicasets:'rs',pvc:'pvc',persistentvolumeclaim:'pvc',persistentvolumeclaims:'pvc'};
const KINDNAME={pod:'pods',deploy:'deployments.apps',svc:'services',secret:'secrets',node:'nodes'};
function parseRes(arr){const r={kind:null,kindRaw:null,name:null,rest:[]};if(!arr.length)return r;let a=arr.slice();const f=a.shift();if(f.indexOf('/')>0){const k=f.split('/')[0].toLowerCase();r.kindRaw=k;r.kind=KIND[k]||k;r.name=f.split('/').slice(1).join('/')}else{r.kindRaw=f.toLowerCase();r.kind=KIND[r.kindRaw]||(r.kindRaw.indexOf(',')>0?r.kindRaw:r.kindRaw);if(a.length&&a[0].indexOf('=')<0&&a[0][0]!=='-'){r.name=a.shift()}}r.rest=a;return r}
function parseFlags(tokens,verb){const valued=new Set(['-n','--namespace','-o','--output','-c','--container','--type','--patch','--from-literal','--cert','--key','--requests','--limits','--tail','-l','--selector','-f','--filename','--image','--replicas','--field-selector','-L','--set','--set-string','--values','--version','--timeout','--since','--revision']);if(verb==='patch')valued.add('-p');const flags={},pos=[];let after=null;for(let i=0;i<tokens.length;i++){const t=tokens[i];if(t==='--'){after=tokens.slice(i+1);break}if(t[0]==='-'&&t.length>1&&!/^-\d/.test(t)){let k=t,v=true;if(t.indexOf('=')>0&&t.slice(0,2)==='--'){k=t.slice(0,t.indexOf('='));v=t.slice(t.indexOf('=')+1)}else if(valued.has(t)){v=tokens[++i];if(v===undefined)v=''}else if(/^-o./.test(t)&&t[1]==='o'&&t[2]!=='-'){k='-o';v=t.slice(2)}k=k.replace(/^-+/,'');if(k==='set'&&flags.set&&typeof v==='string')flags.set=flags.set+','+v;else flags[k]=v}else pos.push(t)}if(flags.namespace)flags.n=flags.namespace;if(flags.output)flags.o=flags.output;if(flags.selector)flags.l=flags.selector;return{flags,pos,after}}
function splitEnv(tokens){const env={};let i=0;if(tokens[0]==='env'){i=1;while(i<tokens.length&&/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])){const j=tokens[i].indexOf('=');env[tokens[i].slice(0,j)]=tokens[i].slice(j+1);i++}}return{env,rest:tokens.slice(i)}}
function podDesc(p,o){const age=fmtAge(p.age);const L=[
'Name:             '+p.name,'Namespace:        lab','Priority:         0','Service Account:  default',
'Node:             '+(o.noNode?'<none>':'kcna-lab-control-plane/172.18.0.2'),
'Start Time:       '+(o.noNode?'<none>':'Mon, 02 Nov 2026 02:11:04 +0000'),
'Labels:           '+p.labels,'Annotations:      <none>',
'Status:           '+(o.phase||'Running'),'IP:               '+(p.ip||''),'Controlled By:    ReplicaSet/'+p.name.replace(/-[a-z0-9]{5}$/,''),
'Containers:',o.container,'Conditions:','  Type              Status','  Initialized       True','  Ready             '+(p.ready.split('/')[0]===p.ready.split('/')[1]?'True':'False'),'  PodScheduled      '+(o.noNode?'False':'True')];
if(o.volumes)L.push('Volumes:',o.volumes);
L.push('QoS Class:       '+(o.qos||'BestEffort'),'Node-Selectors:  <none>','Tolerations:     node.kubernetes.io/not-ready:NoExecute op=Exists for 300s','Events:','  Type     Reason   Age   From     Message','  ----     ------   ----  ----     -------');
o.events.forEach(e=>L.push('  '+e[0].padEnd(9)+e[1].padEnd(9)+e[2].padEnd(6)+e[3].padEnd(9)+e[4]));return L.join('\n')}
const SYS_PODS=[['coredns-7db6d8ff4d-9kq2z','1/1','Running','0','1h'],['coredns-7db6d8ff4d-wm5tb','1/1','Running','0','1h'],['etcd-kcna-lab-control-plane','1/1','Running','0','1h'],['kindnet-xk8v2','1/1','Running','0','1h'],['kube-apiserver-kcna-lab-control-plane','1/1','Running','0','1h'],['kube-controller-manager-kcna-lab-control-plane','1/1','Running','0','1h'],['kube-proxy-7zq4d','1/1','Running','0','1h'],['kube-scheduler-kcna-lab-control-plane','1/1','Running','0','1h']];

/* ================= engine ================= */
const SC={};
function def(id,o){o.id=id;SC[id]=o}
const Sim={sc:null,s:null,hints:0,sol:false,startT:0,endT:0,done:false};
Sim.start=function(id){Sim.sc=SC[id];Sim.s=Object.assign({tick:0,gen:0},Sim.sc.init());Sim.hints=0;Sim.sol=false;Sim.startT=Date.now();Sim.endT=0;Sim.done=false};
Sim.points=function(){return Sim.sol?0:Math.max(0,3-Sim.hints)};
Sim.hint=function(){const h=Sim.sc.hints;if(Sim.hints>=h.length)return'No more hints. Try the Solution button.';Sim.hints++;return'Hint '+Sim.hints+'/'+h.length+': '+h[Sim.hints-1]};
Sim.check=function(){const ok=Sim.sc.fixed(Sim.s);if(ok&&!Sim.done){Sim.done=true;Sim.endT=Date.now()}return ok};
Sim.exec=function(line){
  line=line.trim();if(!line)return{out:''};
  const lc=line.toLowerCase();
  if(lc==='help'||lc==='?')return{out:HELP};
  if(lc==='clear')return{clear:true};
  if(lc==='hint')return{out:Sim.hint(),hint:true};
  if(lc==='check')return{check:true};
  if(lc==='brief')return{out:Sim.sc.brief};
  if(lc==='solution')return{solution:true};
  if(lc==='quit'||lc==='menu'||lc==='exit')return{quit:true};
  let outs=[],edit=null;
  const segs=splitTop(line,['&&',';']);
  for(const seg of segs){const r=runPipeline(seg.trim());if(r.edit)edit=r.edit;if(r.out!=='')outs.push(r.out)}
  Sim.s.tick++;if(Sim.sc.onTick)Sim.sc.onTick(Sim.s);
  return{out:outs.join('\n'),edit};
};
const HELP=`Supported in this simulator:
  kubectl get|describe|logs|exec|edit|patch|set|create|delete|rollout|config ...
     (-n lab, -o wide|yaml|name|jsonpath, --show-labels, -l, -A, --previous)
  helm list|status|get values|history|upgrade
  vault is NOT installed locally: run it inside the pod with kubectl exec ... -- vault ...
  echo, base64 -d, grep, openssl, and pipes (|), && and ;
Game commands: hint, check, brief, solution, clear, menu`;
function runPipeline(str){
  const stages=splitTop(str,['|']).map(x=>x.trim());
  let r=runCmd(stages[0]);if(r.edit)return r;
  let out=r.out;
  for(let i=1;i<stages.length;i++)out=runFilter(stages[i],out);
  return{out};
}
function runFilter(st,input){
  const t=tokenize(st);const c=t[0];
  if(c==='grep'){let inv=false,ic=false,pat=null;t.slice(1).forEach(x=>{if(x==='-v')inv=true;else if(x==='-i')ic=true;else if(x[0]!=='-'&&pat===null)pat=x});if(pat===null)return'usage: grep [-iv] PATTERN';let re;try{re=new RegExp(pat,ic?'i':'')}catch(e){re=new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),ic?'i':'')}return input.split('\n').filter(l=>re.test(l)!==inv).join('\n')}
  if(c==='base64'){if(t.some(x=>x==='-d'||x==='--decode'||x==='-D')){try{return atob(input.replace(/\s+/g,''))}catch(e){return'base64: invalid input'}}return btoa(input)}
  if(c==='wc'){return String(input===''?0:input.split('\n').length)}
  if(c==='head'||c==='tail'){let n=10;const i=t.indexOf('-n');if(i>0)n=parseInt(t[i+1],10)||10;const L=input.split('\n');return(c==='head'?L.slice(0,n):L.slice(-n)).join('\n')}
  return'bash: '+c+': command not found';
}
function runCmd(str){
  const t=tokenize(str);if(!t.length)return{out:''};
  const c=t[0];
  if(c==='kubectl'||c==='k')return kubectl(t.slice(1));
  if(c==='helm')return{out:Sim.sc.helm?helm(t.slice(1)):'Error: no Helm releases in this scenario (the helm-tls scenario uses Helm).'};
  if(c==='echo')return{out:t.slice(1).join(' ')};
  if(c==='openssl')return{out:Sim.sc.openssl?Sim.sc.openssl(Sim.s,t):'bash: openssl: not needed in this scenario'};
  if(c==='pwd')return{out:'/home/player'};
  if(c==='whoami')return{out:'player'};
  if(c==='vault')return{out:'bash: vault: command not found\n(the vault CLI lives inside the Vault pod: use kubectl exec ... -- vault ...)'};
  if(c==='base64'){return{out:'base64: pipe something into it, e.g. echo ABC= | base64 -d'}}
  return{out:'bash: '+c+': command not found'};
}
function kubectl(tokens){
  const sc=Sim.sc,s=Sim.s;const verb=tokens[0];
  if(!verb)return{out:'kubectl controls the Kubernetes cluster manager. Type help.'};
  const pf=parseFlags(tokens.slice(1),verb);const flags=pf.flags;
  const c={verb,flags,pos:pf.pos,after:pf.after,o:flags.o,patchStr:flags.patch||flags.p||'',r:null,sub:null};
  if(verb==='set'){c.sub=pf.pos[0];c.r=parseRes(pf.pos.slice(1))}else c.r=parseRes(pf.pos);
  const ns=flags.n;
  switch(verb){
  case'version':return{out:'Client Version: v1.30.0\nKustomize Version: v5.0.4\nServer Version: v1.30.0'};
  case'cluster-info':return{out:'Kubernetes control plane is running at https://127.0.0.1:34567\nCoreDNS is running at https://127.0.0.1:34567/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy'};
  case'config':{const sub=pf.pos[0];if(sub==='current-context')return{out:'kind-kcna-lab'};if(sub==='get-contexts')return{out:'CURRENT   NAME            CLUSTER         AUTHINFO        NAMESPACE\n*         kind-kcna-lab   kind-kcna-lab   kind-kcna-lab   lab'};if(sub==='set-context'||sub==='use-context')return{out:'Context "kind-kcna-lab" modified.'};return{out:'(simulator) supported: kubectl config current-context | get-contexts'}}
  case'top':return{out:'error: Metrics API not available'};
  case'get':return{out:kget(c,ns,flags)};
  case'describe':return{out:kdescribe(c,ns)};
  case'logs':return{out:klogs(c)};
  case'exec':return kexec(c);
  case'edit':return kedit(c);
  case'rollout':return{out:krollout(c)};
  case'delete':return{out:kdelete(c)};
  case'create':return{out:kcreate(c)};
  case'set':case'patch':case'annotate':case'label':case'scale':case'apply':case'replace':case'expose':case'run':case'cordon':case'drain':case'taint':{
    if(verb==='apply'||verb==='replace'||verb==='run'||verb==='expose')return{out:'(simulator) manifests and new objects are not supported here. Use set, patch or edit on the existing objects.'};
    if(c.r.kind==='deploy'&&c.r.name&&!sc.deploys(s).some(d=>d.name===c.r.name))return{out:'Error from server (NotFound): deployments.apps "'+c.r.name+'" not found'};
    const res=sc.cmd?sc.cmd(s,c):undefined;
    if(res!==undefined)return{out:res};
    return{out:'(simulator) that change did not match anything fixable in this scenario. Check the object name and syntax.'};}
  default:return{out:'error: unknown or unsupported command "'+verb+'" in the simulator. Type help.'};
  }
}
function filterLabels(list,sel){if(!sel||sel===true)return list;const parts=String(sel).split(',');return list.filter(p=>parts.every(x=>p.labels.split(',').indexOf(x)>=0))}
function kget(c,ns,flags){
  const sc=Sim.sc,s=Sim.s,r=c.r,o=c.o;
  if(!r.kindRaw)return'You must specify the type of resource to get. Use "kubectl api-resources" for a complete list of supported resources.';
  if(ns&&ns!=='lab'&&!flags.A)return'No resources found in '+ns+' namespace.';
  const kinds=r.kindRaw.indexOf(',')>0?r.kindRaw.split(','):[r.kind];
  const outs=kinds.map(k=>kgetOne(KIND[k]||k,r,o,flags,kinds.length>1));
  return outs.join('\n\n');
}
function kgetOne(kind,r,o,flags,multi){
  const sc=Sim.sc,s=Sim.s;
  const nameErr=(plural)=>'Error from server (NotFound): '+plural+' "'+r.name+'" not found';
  if(kind==='all'){return'NAME\n'+sc.pods(s).map(p=>'pod/'+p.name).join('\n')+'\n\n'+sc.svcs(s).map(x=>'service/'+x.name).join('\n')+'\n\n'+sc.deploys(s).map(d=>'deployment.apps/'+d.name).join('\n')}
  if(kind==='pod'){
    let list=sc.pods(s);if(flags.l)list=filterLabels(list,flags.l);
    if(r.name&&!multi){list=list.filter(p=>p.name===r.name);if(!list.length)return nameErr('pods')}
    if(o==='name')return list.map(p=>'pod/'+p.name).join('\n');
    if(o==='yaml'&&list.length)return podYaml(list[0]);
    if(flags.A||flags['all-namespaces']){const rows=SYS_PODS.map(p=>['kube-system'].concat(p)).concat(list.map(p=>['lab',p.name,p.ready,p.status,String(p.restarts),fmtAge(p.age)]));return tbl(['NAMESPACE','NAME','READY','STATUS','RESTARTS','AGE'],rows)}
    if(!list.length)return'No resources found in lab namespace.';
    const wide=o==='wide',sl=flags['show-labels'];
    const head=['NAME','READY','STATUS','RESTARTS','AGE'].concat(wide?['IP','NODE']:[]).concat(sl?['LABELS']:[]);
    return tbl(head,list.map(p=>[p.name,p.ready,p.status,String(p.restarts),fmtAge(p.age)].concat(wide?[p.ip||'<none>',p.ip?'kcna-lab-control-plane':'<none>']:[]).concat(sl?[p.labels]:[])));
  }
  if(kind==='deploy'){
    let list=sc.deploys(s);if(r.name){list=list.filter(d=>d.name===r.name);if(!list.length)return nameErr('deployments.apps')}
    if(o==='yaml'||o==='json'){const ob=sc.objects&&sc.objects['deploy/'+list[0].name];return ob?ob.yaml(s):'(simulator) yaml not available'}
    if(o==='name')return list.map(d=>'deployment.apps/'+d.name).join('\n');
    return tbl(['NAME','READY','UP-TO-DATE','AVAILABLE','AGE'],list.map(d=>[d.name,d.ready,String(d.up),String(d.avail),fmtAge(d.age)]));
  }
  if(kind==='svc'){
    let list=sc.svcs(s);if(r.name){list=list.filter(d=>d.name===r.name);if(!list.length)return nameErr('services')}
    if(!list.length)return'No resources found in lab namespace.';
    if(o==='yaml'||o==='json'){const ob=sc.objects&&sc.objects['svc/'+list[0].name];return ob?ob.yaml(s):'(simulator) yaml not available'}
    const wide=o==='wide';
    return tbl(['NAME','TYPE','CLUSTER-IP','EXTERNAL-IP','PORT(S)','AGE'].concat(wide?['SELECTOR']:[]),list.map(x=>[x.name,'ClusterIP',x.ip,'<none>',x.ports,fmtAge(x.age)].concat(wide?[x.selector]:[])));
  }
  if(kind==='ep'){
    const rows=sc.endpoints(s);let list=rows;if(r.name){list=rows.filter(d=>d.name===r.name);if(!list.length)return nameErr('endpoints')}
    if(!list.length)return'No resources found in lab namespace.';
    return tbl(['NAME','ENDPOINTS','AGE'],list.map(e=>[e.name,e.eps,fmtAge(e.age)]));
  }
  if(kind==='events'){const ev=sc.events(s);if(!ev.length)return'No resources found in lab namespace.';return tbl(['LAST SEEN','TYPE','REASON','OBJECT','MESSAGE'],ev.map(e=>[e[2]||'30s',e[0],e[1],e[3],e[4]]))}
  if(kind==='node'){return tbl(['NAME','STATUS','ROLES','AGE','VERSION'],[['kcna-lab-control-plane','Ready','control-plane','1h','v1.30.0']])}
  if(kind==='ns'){return tbl(['NAME','STATUS','AGE'],[['default','Active','1h'],['kube-node-lease','Active','1h'],['kube-public','Active','1h'],['kube-system','Active','1h'],['lab','Active','10m']])}
  if(kind==='secret'){
    const list=sc.secrets?sc.secrets(s):[];
    if(r.name){const sec=list.find(x=>x.name===r.name);if(!sec)return nameErr('secrets');
      if(o==='yaml'||o==='json'){return'apiVersion: v1\ndata:\n'+Object.keys(sec.data).map(k=>'  '+k+': '+sec.data[k]).join('\n')+'\nkind: Secret\nmetadata:\n  name: '+sec.name+'\n  namespace: lab\ntype: '+sec.type}
      if(o&&String(o).indexOf('jsonpath')===0){const m=/\.data\.(.+?)\}/.exec(String(o));if(!m)return Object.keys(sec.data).map(k=>sec.data[k]).join(' ');const key=Object.keys(sec.data).find(k=>m[1].replace(/\\/g,'')===k);return key?sec.data[key]:''}}
    const l2=r.name?list.filter(x=>x.name===r.name):list;
    if(!l2.length)return'No resources found in lab namespace.';
    return tbl(['NAME','TYPE','DATA','AGE'],l2.map(x=>[x.name,x.type,String(Object.keys(x.data).length),fmtAge(x.age)]));
  }
  return'No resources found in lab namespace.';
}
function podYaml(p){return'apiVersion: v1\nkind: Pod\nmetadata:\n  labels:\n'+p.labels.split(',').map(x=>'    '+x.replace('=',': ')).join('\n')+'\n  name: '+p.name+'\n  namespace: lab\nstatus:\n  phase: '+(p.status==='Pending'||p.status==='ContainerCreating'?'Pending':'Running')+'\n  containerStatuses:\n  - ready: '+(p.ready.split('/')[0]===p.ready.split('/')[1])+'\n    restartCount: '+p.restarts}
function kdescribe(c,ns){
  const sc=Sim.sc,s=Sim.s,r=c.r;
  if(!r.kind)return'You must specify the type of resource to describe.';
  if(r.kind==='pod'){const pods=sc.pods(s);let list=r.name?pods.filter(p=>p.name===r.name):pods;if(c.flags.l)list=filterLabels(pods,c.flags.l);if(!list.length)return r.name?'Error from server (NotFound): pods "'+r.name+'" not found':'No resources found in lab namespace.';return list.map(p=>sc.describePod(s,p)).join('\n\n')}
  if(r.kind==='deploy'||r.kind==='svc'){
    const lst=r.kind==='deploy'?sc.deploys(s):sc.svcs(s);
    if(!r.name)return lst.map(x=>'Name: '+x.name).join('\n');
    if(!lst.some(x=>x.name===r.name))return'Error from server (NotFound): '+KINDNAME[r.kind]+' "'+r.name+'" not found';
    if(sc.describeObj){const d=sc.describeObj(s,r.kind,r.name);if(d)return d}
    const ob=sc.objects&&sc.objects[r.kind+'/'+r.name];return ob?ob.yaml(s):'(simulator) not available';
  }
  if(r.kind==='node')return'Name:               kcna-lab-control-plane\nRoles:              control-plane\nCapacity:\n  cpu:                4\n  memory:             8139000Ki\n  pods:               110\nAllocatable:\n  cpu:                4\n  memory:             8139000Ki\n  pods:               110\nAllocated resources:\n  Resource           Requests     Limits\n  cpu                950m (23%)   100m (2%)\n  memory             290Mi (3%)   390Mi (4%)';
  if(r.kind==='secret'){const sec=(sc.secrets?sc.secrets(s):[]).find(x=>x.name===r.name);if(!sec)return'Error from server (NotFound): secrets "'+r.name+'" not found';return'Name:         '+sec.name+'\nNamespace:    lab\nType:         '+sec.type+'\n\nData\n====\n'+Object.keys(sec.data).map(k=>k+':  '+atobSafe(sec.data[k]).length+' bytes').join('\n')}
  return'(simulator) describe is supported for pod, deploy, svc, node, secret.';
}
function atobSafe(b){try{return atob(b)}catch(e){return b}}
function resolvePod(c){
  const sc=Sim.sc,s=Sim.s,r=c.r,pods=sc.pods(s);
  if(r.kind==='deploy'&&r.name){return pods.find(p=>p.name.indexOf(r.name+'-')===0)||null}
  if(r.kind==='pod'&&r.name)return pods.find(p=>p.name===r.name)||null;
  if(r.kindRaw&&!r.name)return pods.find(p=>p.name===r.kindRaw)||null;
  if(c.flags.l){return filterLabels(pods,c.flags.l)[0]||null}
  return null;
}
function klogs(c){
  const sc=Sim.sc,s=Sim.s;
  if(!c.r.kindRaw&&!c.flags.l)return'error: expected \'logs [-f] [-p] (POD | TYPE/NAME) [-c CONTAINER]\'.\nPOD or TYPE/NAME is a required argument for the logs command';
  const p=resolvePod(c);if(!p)return'Error from server (NotFound): pods "'+(c.r.name||c.r.kindRaw)+'" not found';
  return sc.logs(s,p,!!(c.flags.previous||c.flags.p));
}
function kexec(c){
  const sc=Sim.sc,s=Sim.s;
  if(c.flags.it||c.flags.i||c.flags.t){ if(!c.after||!c.after.length)return{out:'(simulator) interactive shells are not supported. Run the command directly after --, e.g. kubectl exec deploy/vault -- ls'} }
  if(!c.after||!c.after.length)return{out:'error: you must specify at least one command for the container'};
  if(/^(\/bin\/)?(ba)?sh$/.test(c.after[0]))return{out:'(simulator) interactive shells are not supported. Run the command directly after --, e.g. kubectl exec deploy/vault -- vault status'};
  if(!sc.exec)return{out:'error: unable to upgrade connection: container not found'};
  const p=resolvePod(c);if(!p)return{out:'Error from server (NotFound): pods "'+(c.r.name||c.r.kindRaw||'')+'" not found'};
  return{out:sc.exec(s,p,c.after)};
}
function kedit(c){
  const sc=Sim.sc,s=Sim.s,r=c.r;
  if(!r.kind||!r.name)return{out:'error: you must specify the resource to edit, e.g. kubectl edit deploy/vault'};
  const ob=sc.objects&&sc.objects[r.kind+'/'+r.name];
  if(!ob)return{out:'Error from server (NotFound): '+(KINDNAME[r.kind]||r.kind)+' "'+r.name+'" not found'};
  const before=ob.yaml(s);
  return{out:'',edit:{title:'kubectl edit '+r.kind+'/'+r.name,yaml:before,onSave:(txt)=>{if(txt.trim()===before.trim())return'Edit cancelled, no changes made.';const res=ob.apply(s,txt);return res||((r.kind==='deploy'?'deployment.apps/':'service/')+r.name+' edited')}}};
}
function krollout(c){
  const sc=Sim.sc,s=Sim.s,sub=c.pos[0];const r=parseRes(c.pos.slice(1));
  const d=sc.deploys(s).find(x=>x.name===r.name);
  if(!d)return r.name?'Error from server (NotFound): deployments.apps "'+r.name+'" not found':'error: required resource not specified';
  if(sub==='status'){const [a,b]=d.ready.split('/');return a===b?'deployment "'+d.name+'" successfully rolled out':'Waiting for deployment "'+d.name+'" rollout to finish: '+a+' of '+b+' updated replicas are available...\n(a real kubectl would keep waiting here; press Ctrl+C)'}
  if(sub==='restart'){s.gen++;if(sc.onRestart)sc.onRestart(s);return'deployment.apps/'+d.name+' restarted'}
  return'(simulator) supported: rollout status | restart';
}
function kdelete(c){
  const sc=Sim.sc,s=Sim.s,r=c.r;
  if(r.kind==='pod'){const pods=sc.pods(s);const list=c.flags.all?pods:pods.filter(p=>p.name===r.name);if(!list.length)return'Error from server (NotFound): pods "'+(r.name||'')+'" not found';s.gen++;if(sc.onRestart)sc.onRestart(s);return list.map(p=>'pod "'+p.name+'" deleted').join('\n')}
  return'error: the simulator blocks deleting that resource (it would break the lab). Fix it with set / patch / edit instead.';
}
function kcreate(c){
  const sc=Sim.sc,s=Sim.s;
  if(c.pos[0]==='secret'&&sc.createSecret)return sc.createSecret(s,c);
  return'(simulator) create is only supported for secrets in scenarios that need them.';
}
