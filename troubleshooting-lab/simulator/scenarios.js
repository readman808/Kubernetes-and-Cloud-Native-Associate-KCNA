/* ================= scenarios ================= */
const cpuM=v=>/m$/.test(v)?parseFloat(v):parseFloat(v)*1000;
const memMi=v=>{const n=parseFloat(v);if(/Gi?$/.test(v))return n*1024;if(/Ki?$/.test(v))return n/1024;if(/Mi?$/.test(v))return n;return n/1048576};
const lab=s=>20*s.tick;

/* 1 ---------------------------------------------------------- crashloop */
def('crashloop',{
 title:'Checkout API keeps restarting',level:'Easy',
 brief:'The "checkout" deployment in namespace lab never becomes Ready. Pods restart repeatedly.\nGoal: get 2/2 replicas Running and Ready.',
 hints:['kubectl get pods, then look at the STATUS and RESTARTS columns.','kubectl logs <pod> (add --previous if it already restarted).','The app needs an environment variable. How do you set one on a Deployment? (kubectl set env ...)'],
 solution:'kubectl set env deploy/checkout DB_URL=postgres://db:5432/app\n(or kubectl edit deploy/checkout and add an env entry)',
 init:()=>({db:null,fixAt:0}),
 fixed:s=>!!s.db,
 pods(s){const ok=!!s.db;return[0,1].map(i=>({name:pn('checkout',s.gen,i),ready:ok?'1/1':'0/1',status:ok?'Running':'CrashLoopBackOff',restarts:ok?0:3+Math.floor(s.tick/2),age:ok?20+(s.tick-s.fixAt)*20:260+lab(s),labels:'app=checkout,pod-template-hash='+H[s.gen%H.length],ip:'10.244.0.'+(5+i)}))},
 deploys(s){const ok=!!s.db;return[{name:'checkout',ready:ok?'2/2':'0/2',up:2,avail:ok?2:0,age:260+lab(s)}]},
 svcs:()=>[],endpoints:()=>[],
 events(s){return s.db?[['Normal','Started','20s','pod/'+pn('checkout',s.gen,0),'Started container web']]:[['Warning','BackOff','10s','pod/'+pn('checkout',s.gen,0),'Back-off restarting failed container web in pod '+pn('checkout',s.gen,0)],['Normal','Pulled','1m','pod/'+pn('checkout',s.gen,1),'Container image "busybox:1.36" already present on machine']]},
 describePod(s,p){const ok=!!s.db;return podDesc(p,{container:'  web:\n    Image:          busybox:1.36\n    Command:\n      sh\n      -c\n      test -n "$DB_URL" || { echo \'DB_URL is required\' >&2; exit 1; }; echo up; sleep 3600\n'+(ok?'    State:          Running\n':'    State:          Waiting\n      Reason:       CrashLoopBackOff\n    Last State:     Terminated\n      Reason:       Error\n      Exit Code:    1\n')+'    Ready:          '+(ok?'True':'False')+'\n    Restart Count:  '+p.restarts+'\n    Environment:    '+(ok?'\n      DB_URL:  '+s.db:'<none>'),events:ok?[['Normal','Started','20s','kubelet','Started container web']]:[['Normal','Pulled','2m','kubelet','Container image "busybox:1.36" already present on machine'],['Normal','Created','2m','kubelet','Created container web'],['Warning','BackOff','10s','kubelet','Back-off restarting failed container web in pod '+p.name]]})},
 logs:(s,p)=>s.db?'up':'DB_URL is required',
 objects:{'deploy/checkout':{yaml:s=>'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: checkout\n  namespace: lab\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: checkout\n  template:\n    spec:\n      containers:\n      - name: web\n        image: busybox:1.36\n'+(s.db?'        env:\n        - name: DB_URL\n          value: '+s.db+'\n':''),
  apply(s,t){const m=/name:\s*DB_URL\s*\n\s*value:\s*(\S+)/.exec(t);if(!m)return'error: no DB_URL env found in the edited manifest; nothing changed';s.db=m[1].replace(/["']/g,'');s.gen++;s.fixAt=s.tick}}},
 cmd(s,c){
  if(c.verb==='set'&&c.sub==='env'&&c.r.kind==='deploy'){const a=c.r.rest.find(x=>/^DB_URL=./.test(x));if(!a)return'error: set env needs VAR=value (the app wants DB_URL)';s.db=a.slice(7);s.gen++;s.fixAt=s.tick;return'deployment.apps/checkout env updated'}
  if(c.verb==='patch'){const m=/DB_URL[^]*?"value"\s*:\s*"([^"]+)"/.exec(c.patchStr);if(m){s.db=m[1];s.gen++;s.fixAt=s.tick;return'deployment.apps/checkout patched'}}
 }
});

/* 2 ---------------------------------------------------------- imagepull */
const GOOD_TAGS=['1.27-alpine','1.27','1.26','1.25-alpine','1.25','latest','alpine','stable'];
const imgOk=s=>GOOD_TAGS.indexOf((s.image||'').replace(/^nginx:/,''))>=0&&/^nginx:/.test(s.image);
def('imagepull',{
 title:'New release stuck at ErrImagePull',level:'Easy',
 brief:'The "web" deployment in namespace lab was just updated and its pods cannot start.\nGoal: 2/2 replicas Ready.',
 hints:['kubectl describe pod <pod> and read the Events section at the bottom.','The image tag does not exist. Which image field is wrong?','Use kubectl set image deploy/web nginx=<image> or kubectl edit deploy/web. Valid tags include 1.27-alpine.'],
 solution:'kubectl set image deploy/web nginx=nginx:1.27-alpine',
 init:()=>({image:'nginx:1.27-alpine-typo',fixAt:0}),
 fixed:s=>imgOk(s),
 pods(s){const ok=imgOk(s);return[0,1].map(i=>({name:pn('web',s.gen,i),ready:ok?'1/1':'0/1',status:ok?'Running':((s.tick+i)%2?'ErrImagePull':'ImagePullBackOff'),restarts:0,age:ok?20+(s.tick-s.fixAt)*20:90+lab(s),labels:'app=web,pod-template-hash='+H[s.gen%H.length],ip:ok?'10.244.0.'+(5+i):''}))},
 deploys(s){const ok=imgOk(s);return[{name:'web',ready:ok?'2/2':'0/2',up:2,avail:ok?2:0,age:90+lab(s)}]},
 svcs:()=>[],endpoints:()=>[],
 events(s){return imgOk(s)?[['Normal','Started','20s','pod/'+pn('web',s.gen,0),'Started container nginx']]:[['Warning','Failed','15s','pod/'+pn('web',s.gen,0),'Failed to pull image "'+s.image+'": manifest unknown'],['Normal','BackOff','10s','pod/'+pn('web',s.gen,0),'Back-off pulling image "'+s.image+'"']]},
 describePod(s,p){const ok=imgOk(s);return podDesc(p,{container:'  nginx:\n    Image:          '+s.image+'\n    State:          '+(ok?'Running':'Waiting\n      Reason:       '+p.status)+'\n    Ready:          '+(ok?'True':'False')+'\n    Restart Count:  0',events:ok?[['Normal','Started','20s','kubelet','Started container nginx']]:[['Normal','Scheduled','90s','default-scheduler','Successfully assigned lab/'+p.name+' to kcna-lab-control-plane'],['Normal','Pulling','60s','kubelet','Pulling image "'+s.image+'"'],['Warning','Failed','58s','kubelet','Failed to pull image "'+s.image+'": rpc error: code = NotFound desc = failed to pull and unpack image: manifest unknown'],['Warning','Failed','58s','kubelet','Error: ErrImagePull'],['Normal','BackOff','30s','kubelet','Back-off pulling image "'+s.image+'"'],['Warning','Failed','30s','kubelet','Error: ImagePullBackOff']]})},
 logs:(s,p)=>imgOk(s)?'/docker-entrypoint.sh: Configuration complete; ready for start up':'Error from server (BadRequest): container "nginx" in pod "'+p.name+'" is waiting to start: trying and failing to pull image',
 objects:{'deploy/web':{yaml:s=>'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\n  namespace: lab\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: web\n  template:\n    spec:\n      containers:\n      - name: nginx\n        image: '+s.image+'\n',
  apply(s,t){const m=/image:\s*(\S+)/.exec(t);if(!m)return'error: no image found';s.image=m[1];s.gen++;s.fixAt=s.tick}}},
 cmd(s,c){
  if(c.verb==='set'&&c.sub==='image'&&c.r.kind==='deploy'){const a=c.r.rest.find(x=>x.indexOf('=')>0);if(!a)return'error: set image needs container=image';const k=a.slice(0,a.indexOf('=')),img=a.slice(a.indexOf('=')+1);if(k!=='nginx'&&k!=='*')return'error: unable to find container named "'+k+'"';s.image=img;s.gen++;s.fixAt=s.tick;return'deployment.apps/web image updated'}
  if(c.verb==='patch'){const m=/"image"\s*:\s*"([^"]+)"/.exec(c.patchStr);if(m){s.image=m[1];s.gen++;s.fixAt=s.tick;return'deployment.apps/web patched'}}
 }
});

/* 3 ---------------------------------------------------------- pending */
const pendOk=s=>cpuM(s.cpu)<=2000&&memMi(s.mem)<=4096;
def('pending',{
 title:'Batch worker stays Pending',level:'Easy',
 brief:'The "worker" deployment in namespace lab has a pod that never gets scheduled.\nGoal: the pod is Running.',
 hints:['kubectl describe pod <pod>: what does the scheduler event say?','Compare the resource requests with what kubectl describe node shows as allocatable.','Lower the requests (e.g. cpu 100m, memory 64Mi): kubectl set resources deploy/worker --requests=cpu=100m,memory=64Mi'],
 solution:'kubectl set resources deploy/worker --requests=cpu=100m,memory=64Mi',
 init:()=>({cpu:'64',mem:'512Gi',fixAt:0}),
 fixed:s=>pendOk(s),
 pods(s){const ok=pendOk(s);return[{name:pn('worker',s.gen,0),ready:ok?'1/1':'0/1',status:ok?'Running':'Pending',restarts:0,age:ok?20+(s.tick-s.fixAt)*20:75+lab(s),labels:'app=worker,pod-template-hash='+H[s.gen%H.length],ip:ok?'10.244.0.5':''}]},
 deploys(s){const ok=pendOk(s);return[{name:'worker',ready:ok?'1/1':'0/1',up:1,avail:ok?1:0,age:75+lab(s)}]},
 svcs:()=>[],endpoints:()=>[],
 events(s){return pendOk(s)?[['Normal','Started','20s','pod/'+pn('worker',s.gen,0),'Started container w']]:[['Warning','FailedScheduling','20s','pod/'+pn('worker',s.gen,0),'0/1 nodes are available: 1 Insufficient cpu, 1 Insufficient memory. preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod.']]},
 describePod(s,p){const ok=pendOk(s);return podDesc(p,{noNode:!ok,phase:ok?'Running':'Pending',container:'  w:\n    Image:      busybox:1.36\n    Command:    sleep 3600\n    State:      '+(ok?'Running':'Waiting\n      Reason:   PodInitializing')+'\n    Requests:\n      cpu:        '+s.cpu+'\n      memory:     '+s.mem+'\n    Ready:      '+(ok?'True':'False'),events:ok?[['Normal','Started','20s','kubelet','Started container w']]:[['Warning','FailedScheduling','75s','default-scheduler','0/1 nodes are available: 1 Insufficient cpu, 1 Insufficient memory. preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod.']]})},
 logs:(s,p)=>pendOk(s)?'':'Error from server (BadRequest): container "w" in pod "'+p.name+'" is waiting to start: ContainerCreating',
 objects:{'deploy/worker':{yaml:s=>'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: worker\n  namespace: lab\nspec:\n  replicas: 1\n  template:\n    spec:\n      containers:\n      - name: w\n        image: busybox:1.36\n        resources:\n          requests:\n            cpu: "'+s.cpu+'"\n            memory: '+s.mem+'\n',
  apply(s,t){const c=/cpu:\s*"?([0-9.]+m?)"?/.exec(t),m=/memory:\s*"?([0-9.]+[KMG]i?)"?/.exec(t);if(!c||!m)return'error: could not read cpu/memory from the edited manifest';s.cpu=c[1];s.mem=m[1];s.gen++;s.fixAt=s.tick}}},
 cmd(s,c){
  if(c.verb==='set'&&c.sub==='resources'&&c.r.kind==='deploy'){const req=c.flags.requests;if(typeof req!=='string')return'error: use --requests=cpu=100m,memory=64Mi';const cp=/cpu=([0-9.]+m?)/.exec(req),mm=/memory=([0-9.]+[KMG]i?)/.exec(req);if(cp)s.cpu=cp[1];if(mm)s.mem=mm[1];s.gen++;s.fixAt=s.tick;return'deployment.apps/worker resource requests updated'}
  if(c.verb==='patch'){const cp=/"cpu"\s*:\s*"([^"]+)"/.exec(c.patchStr),mm=/"memory"\s*:\s*"([^"]+)"/.exec(c.patchStr);if(cp||mm){if(cp)s.cpu=cp[1];if(mm)s.mem=mm[1];s.gen++;s.fixAt=s.tick;return'deployment.apps/worker patched'}}
 }
});

/* 4 ---------------------------------------------------------- service-selector */
def('service-selector',{
 title:'Service has no endpoints',level:'Easy',
 brief:'Pods for "api" are Running, but the Service "api" in namespace lab returns nothing.\nGoal: "kubectl get endpoints api" lists both pod IPs on port 80.',
 hints:['kubectl get endpoints api is empty. Compare kubectl get pods --show-labels with the Service selector (kubectl get svc api -o wide).','The selector label does not match the pods. Also check targetPort against what nginx listens on (80).','kubectl edit svc api, or kubectl patch svc api -p \'{"spec":{...}}\''],
 solution:'kubectl patch svc api --type merge -p \'{"spec":{"selector":{"app":"api"},"ports":[{"port":80,"targetPort":80}]}}\'',
 init:()=>({sel:'api-server',tport:8080}),
 fixed:s=>s.sel==='api'&&s.tport===80,
 pods(s){return[0,1].map(i=>({name:pn('api',s.gen,i),ready:'1/1',status:'Running',restarts:0,age:150+lab(s),labels:'app=api,pod-template-hash='+H[s.gen%H.length],ip:'10.244.0.'+(5+i)}))},
 deploys(s){return[{name:'api',ready:'2/2',up:2,avail:2,age:150+lab(s)}]},
 svcs(s){return[{name:'api',ip:'10.96.142.77',ports:'80/TCP',age:150+lab(s),selector:'app='+s.sel}]},
 endpoints(s){return[{name:'api',eps:s.sel==='api'?'10.244.0.5:'+s.tport+',10.244.0.6:'+s.tport:'<none>',age:150+lab(s)}]},
 events:()=>[],
 describePod(s,p){return podDesc(p,{container:'  nginx:\n    Image:          nginx:1.27-alpine\n    Port:           <none>\n    State:          Running\n    Ready:          True\n    Restart Count:  0',events:[['Normal','Started','2m','kubelet','Started container nginx']]})},
 logs:(s,p)=>'/docker-entrypoint.sh: Configuration complete; ready for start up\n10.244.0.1 - - "GET / HTTP/1.1" 200 615',
 describeObj(s,kind,name){if(kind!=='svc')return null;return'Name:              api\nNamespace:         lab\nLabels:            app=api\nSelector:          app='+s.sel+'\nType:              ClusterIP\nIP:                10.96.142.77\nPort:              <unset>  80/TCP\nTargetPort:        '+s.tport+'/TCP\nEndpoints:         '+(s.sel==='api'?'10.244.0.5:'+s.tport+',10.244.0.6:'+s.tport:'<none>')+'\nSession Affinity:  None'},
 objects:{'svc/api':{yaml:s=>'apiVersion: v1\nkind: Service\nmetadata:\n  name: api\n  namespace: lab\nspec:\n  clusterIP: 10.96.142.77\n  ports:\n  - port: 80\n    protocol: TCP\n    targetPort: '+s.tport+'\n  selector:\n    app: '+s.sel+'\n  type: ClusterIP\n',
  apply(s,t){const m=/selector:\s*\n\s*app:\s*(\S+)/.exec(t),p=/targetPort:\s*(\d+)/.exec(t);if(m)s.sel=m[1];if(p)s.tport=parseInt(p[1],10)}},
  'deploy/api':{yaml:s=>'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api\n  namespace: lab\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: api\n  template:\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:1.27-alpine\n',apply:()=>'(simulator) nothing to fix on the Deployment'}},
 cmd(s,c){
  if(c.verb==='set'&&c.sub==='selector'&&c.r.kind==='svc'){const a=c.r.rest.find(x=>/^app=/.test(x));if(!a)return'error: usage: kubectl set selector svc api app=<value>';s.sel=a.slice(4);return'service/api selector updated'}
  if(c.verb==='patch'&&c.r.kind==='svc'){let j;try{j=JSON.parse(c.patchStr)}catch(e){return'error: unable to parse patch as JSON: '+c.patchStr}const sp=j.spec||{};let ch=false;if(sp.selector&&sp.selector.app){s.sel=sp.selector.app;ch=true}if(sp.ports&&sp.ports[0]&&sp.ports[0].targetPort!==undefined){s.tport=parseInt(sp.ports[0].targetPort,10);ch=true}return ch?'service/api patched':'service/api patched (no change)'}
 }
});

/* shared Vault CLI bits */
const KEYS=['q7Vn3xT0uJ2mD9bLr5Wc8YfH1aEoKsZp4NgXtRiM6vU=','eB5yQ0hCwJ9sLzT3kPnA7dFmXuR2oVgI8cYb1ZqN4tM=','Hs8Uo2LdXr6WvNc0yTqE5mBgJ1zKpA9fIiR3aZtY7bM='];
const ROOT='hvs.CAESIFakeLabRootToken0123456789';
const INIT_TXT='Unseal Key 1: '+KEYS[0]+'\nUnseal Key 2: '+KEYS[1]+'\nUnseal Key 3: '+KEYS[2]+'\n\nInitial Root Token: '+ROOT+'\n\nVault initialized with 3 key shares and a key threshold of 2. Please securely\ndistribute the key shares printed above. When the Vault is re-sealed,\nrestarted, or stopped, you must supply at least 2 of these keys to unseal it\nbefore it can start servicing requests.\n';
function vaultStatus(s,store){const rows=[['Seal Type','shamir'],['Initialized','true'],['Sealed',String(s.sealed)],['Total Shares','3'],['Threshold','2']];
 if(s.sealed){rows.push(['Unseal Progress',(s.progress.length)+'/2'],['Unseal Nonce',s.progress.length?'8f3c1e0a-5d2b-4f7e-9a61-c2d4b8e07f13':'n/a'])}
 rows.push(['Version','1.17.2'],['Build Date','2024-07-05T15:19:12Z'],['Storage Type',store||'file']);
 if(!s.sealed)rows.push(['Cluster Name','vault-cluster-4a1b7c9d'],['Cluster ID','b7e2a1c4-0d3f-9e58-6b21-7f4c8a9d1e33']);
 rows.push(['HA Enabled','false']);return kv(rows)}
function vaultEnvOk(env){return !env.VAULT_ADDR||/^http:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0):8200\/?$/.test(env.VAULT_ADDR)}
const ADDR_OK=['http://vault:8200','http://vault.lab:8200','http://vault.lab.svc:8200','http://vault.lab.svc.cluster.local:8200'];

/* 5 ---------------------------------------------------------- vault-secrets */
def('vault-secrets',{
 title:'App cannot read its secret from Vault',level:'Medium',
 brief:'Vault (dev mode) runs in namespace lab as Service "vault". The "billing" app should read secret/billing and log GOT SECRET, but its logs show errors.\nTip: the Vault pod has the CLI; the root token is "root". Run it with:\n  kubectl exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=root vault <cmd>\nGoal: "kubectl logs deploy/billing" ends with GOT SECRET.',
 hints:['kubectl logs deploy/billing. The first problem is network: does the host in VAULT_ADDR exist? (kubectl get svc)','Fix VAULT_ADDR with kubectl set env deploy/billing VAULT_ADDR=... The next error means the secret path is empty.','Write it: kubectl exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=root vault kv put secret/billing api_key=abc123'],
 solution:'kubectl set env deploy/billing VAULT_ADDR=http://vault:8200\nkubectl exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=root vault kv put secret/billing api_key=abc123',
 init:()=>({addr:'http://vault-server:8200',kv:false,bgen:0}),
 fixed:s=>ADDR_OK.indexOf(s.addr)>=0&&s.kv,
 pods(s){return[{name:pn('vault',0,0),ready:'1/1',status:'Running',restarts:0,age:400+lab(s),labels:'app=vault,pod-template-hash='+H[0],ip:'10.244.0.5'},{name:pn('billing',s.bgen,1),ready:'1/1',status:'Running',restarts:0,age:s.bgen?20:400+lab(s),labels:'app=billing,pod-template-hash='+H[s.bgen%H.length],ip:'10.244.0.6'}]},
 deploys(s){return[{name:'billing',ready:'1/1',up:1,avail:1,age:400+lab(s)},{name:'vault',ready:'1/1',up:1,avail:1,age:400+lab(s)}]},
 svcs(s){return[{name:'vault',ip:'10.96.88.14',ports:'8200/TCP',age:400+lab(s),selector:'app=vault'}]},
 endpoints(s){return[{name:'vault',eps:'10.244.0.5:8200',age:400+lab(s)}]},
 events:()=>[],
 describePod(s,p){const b=p.name.indexOf('billing')===0;return podDesc(p,{container:b?'  app:\n    Image:          curlimages/curl:8.8.0\n    State:          Running\n    Ready:          True\n    Restart Count:  0\n    Environment:\n      VAULT_ADDR:   '+s.addr+'\n      VAULT_TOKEN:  root':'  vault:\n    Image:          hashicorp/vault:1.17\n    Port:           8200/TCP\n    State:          Running\n    Ready:          True\n    Restart Count:  0\n    Environment:\n      VAULT_DEV_ROOT_TOKEN_ID:       root\n      VAULT_DEV_LISTEN_ADDRESS:      0.0.0.0:8200',events:[['Normal','Started','6m','kubelet','Started container '+(b?'app':'vault')]]})},
 logs(s,p){
  if(p.name.indexOf('vault')===0)return'==> Vault server configuration:\n\n             Api Address: http://0.0.0.0:8200\n                     Cgo: disabled\n         Listener 1: tcp (addr: "0.0.0.0:8200", tls: "disabled")\n              Storage: inmem\n\nWARNING! dev mode is enabled! In this mode, Vault runs entirely in-memory\nand starts unsealed with a single unseal key.\n\nRoot Token: root';
  if(ADDR_OK.indexOf(s.addr)<0)return Array(4).fill('cannot reach '+s.addr).join('\n');
  return s.kv?Array(4).fill('GOT SECRET').join('\n'):Array(4).fill('no secret: {"errors":[]}').join('\n')},
 objects:{'deploy/billing':{yaml:s=>'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: billing\n  namespace: lab\nspec:\n  template:\n    spec:\n      containers:\n      - name: app\n        image: curlimages/curl:8.8.0\n        env:\n        - name: VAULT_ADDR\n          value: '+s.addr+'\n        - name: VAULT_TOKEN\n          value: root\n',
  apply(s,t){const m=/name:\s*VAULT_ADDR\s*\n\s*value:\s*(\S+)/.exec(t);if(m){s.addr=m[1].replace(/["']/g,'');s.bgen++}}}},
 cmd(s,c){
  if(c.verb==='set'&&c.sub==='env'&&c.r.kind==='deploy'){if(c.r.name!=='billing')return'error: this scenario only needs changes on deploy/billing';const a=c.r.rest.find(x=>/^VAULT_ADDR=./.test(x));if(!a)return'error: set env needs VAR=value';s.addr=a.slice(11);s.bgen++;return'deployment.apps/billing env updated'}
 },
 exec(s,p,after){
  const e=splitEnv(after),t=e.rest;
  if(p.name.indexOf('billing')===0){if(t[0]==='curl'){const url=t.find(x=>/^https?:\/\//.test(x))||'';const host=(/^https?:\/\/([^:\/]+)/.exec(url)||[])[1]||'';if(!host)return'curl: try a URL, e.g. curl -s http://vault:8200/v1/sys/health';if(['vault','vault.lab','vault.lab.svc','vault.lab.svc.cluster.local'].indexOf(host)<0)return'curl: (6) Could not resolve host: '+host;if(/sys\/health/.test(url))return'{"initialized":true,"sealed":false,"standby":false,"version":"1.17.2"}';if(/secret\/data\/billing/.test(url))return s.kv?'{"data":{"data":{"api_key":"abc123"},"metadata":{"version":1}}}':'{"errors":[]}';return'{"errors":["no handler for route"]}'}if(t[0]==='env'||t[0]==='printenv')return'VAULT_ADDR='+s.addr+'\nVAULT_TOKEN=root';return'(simulator) try: curl, env'}
  if(t[0]!=='vault')return'(simulator) run the vault CLI here, e.g. vault status';
  if(!vaultEnvOk(e.env))return'Get "'+e.env.VAULT_ADDR+'/v1/sys/seal-status": dial tcp: connection refused';
  const a=t.slice(1);
  if(a[0]==='status')return vaultStatus({sealed:false,progress:[]},'inmem');
  if(a[0]==='kv'&&a[1]==='put'){if(e.env.VAULT_TOKEN!=='root')return'Error making API request.\n\nURL: PUT http://127.0.0.1:8200/v1/secret/data/billing\nCode: 403. Errors:\n\n* permission denied';if(a[2]!=='secret/billing'&&a[2]!=='-mount=secret')return'(simulator) the app reads secret/billing, write to that path';const kvp=a.slice(3).filter(x=>x.indexOf('=')>0&&x[0]!=='-');if(!kvp.length)return'Must supply data';s.kv=true;return'======== Secret Path ========\nsecret/data/billing\n\n======= Metadata =======\n'+kv([['created_time','2026-11-02T02:15:41.123456Z'],['custom_metadata','<nil>'],['deletion_time','n/a'],['destroyed','false'],['version','1']])}
  if(a[0]==='kv'&&a[1]==='get'){if(!s.kv)return'No value found at secret/data/billing';return'======== Secret Path ========\nsecret/data/billing\n\n====== Data ======\n'+kv([['api_key','abc123']])}
  return'(simulator) supported: vault status | vault kv put secret/billing k=v | vault kv get secret/billing'}
});

/* 6 ---------------------------------------------------------- vault-sealed */
function vFix(s){if(!s.probeFixed){s.probeFixed=true;s.gen++;s.restarts=0;s.sealed=true;s.progress=[]}}
def('vault-sealed',{
 title:'Vault keeps sealing itself',level:'Hard',
 brief:'Vault (server mode, file storage on a PVC) runs in namespace lab as Deployment/Service "vault".\nApps report "Vault is sealed", and teammates say they unsealed it earlier but it locked again.\nThe unseal keys from initialization were saved in Secret "vault-init" (threshold: 2 of 3 keys).\nTip: run vault commands with:\n  kubectl exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200 vault <cmd>\nGoal: Vault is unsealed AND stays that way (no more restarts).',
 hints:['kubectl get pods: check READY and RESTARTS. Then vault status (see the Sealed field).','The keys are in Secret vault-init: kubectl get secret vault-init -o jsonpath=\'{.data.init\\.txt}\' | base64 -d','Run vault operator unseal <key> twice with two different Unseal Keys.','It re-sealed because the container restarted. kubectl describe pod and read the Events: what is failing?','The liveness probe checks port 8201 (cluster port) but the API listens on 8200. kubectl edit deploy/vault, then unseal again after the rollout.'],
 solution:'1. Fix the restarts: kubectl edit deploy/vault and change livenessProbe httpGet port 8201 -> 8200\n2. Read the keys: kubectl get secret vault-init -o jsonpath=\'{.data.init\\.txt}\' | base64 -d\n3. Unseal twice (new pod is sealed after the rollout):\n   kubectl exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200 vault operator unseal <key1>\n   kubectl exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200 vault operator unseal <key2>\nLesson: Vault seals on every restart unless auto-unseal is configured. Find out WHY it restarts, not just how to unseal.',
 init:()=>({sealed:true,progress:[],restarts:2,probeFixed:false,tick:0}),
 onTick(s){if(!s.probeFixed&&s.tick>0&&s.tick%7===0){s.restarts++;s.sealed=true;s.progress=[]}},
 onRestart(s){s.restarts=0;s.sealed=true;s.progress=[]},
 fixed:s=>!s.sealed&&s.probeFixed,
 pods(s){return[{name:pn('vault',s.gen,0),ready:s.sealed?'0/1':'1/1',status:'Running',restarts:s.restarts,age:s.probeFixed?20+lab(s):300+lab(s),labels:'app=vault,pod-template-hash='+H[s.gen%H.length],ip:'10.244.0.7'}]},
 deploys(s){return[{name:'vault',ready:s.sealed?'0/1':'1/1',up:1,avail:s.sealed?0:1,age:300+lab(s)}]},
 svcs:(s)=>[{name:'vault',ip:'10.96.201.9',ports:'8200/TCP',age:300+lab(s),selector:'app=vault'}],
 endpoints(s){return[{name:'vault',eps:s.sealed?'<none>':'10.244.0.7:8200',age:300+lab(s)}]},
 events(s){const p='pod/'+pn('vault',s.gen,0);return s.probeFixed?[['Normal','Started','20s',p,'Started container vault']]:[['Warning','Unhealthy','8s',p,'Liveness probe failed: Get "http://10.244.0.7:8201/v1/sys/health?sealedcode=200&uninitcode=200": dial tcp 10.244.0.7:8201: connect: connection refused'],['Normal','Killing','8s',p,'Container vault failed liveness probe, will be restarted'],['Warning','Unhealthy','5s',p,'Readiness probe failed: HTTP probe failed with statuscode: 503']]},
 describePod(s,p){const port=s.probeFixed?8200:8201;return podDesc(p,{container:'  vault:\n    Image:          hashicorp/vault:1.17\n    Port:           8200/TCP\n    State:          Running\n'+(s.restarts?'    Last State:     Terminated\n      Reason:       Completed\n      Exit Code:    0\n':'')+'    Ready:          '+(s.sealed?'False':'True')+'\n    Restart Count:  '+s.restarts+'\n    Liveness:       http-get http://:'+port+'/v1/sys/health?sealedcode=200&uninitcode=200 delay=45s timeout=1s period=10s #success=1 #failure=2\n    Readiness:      http-get http://:8200/v1/sys/health delay=0s timeout=1s period=5s #success=1 #failure=3\n    Mounts:\n      /vault/file from data (rw)',volumes:'  data:\n    Type:       PersistentVolumeClaim (a reference to a PersistentVolumeClaim in the same namespace)\n    ClaimName:  vault-data',events:s.probeFixed?[['Normal','Started','20s','kubelet','Started container vault']]:[['Normal','Created','2m','kubelet','Created container vault'],['Normal','Started','2m','kubelet','Started container vault'],['Warning','Unhealthy','50s','kubelet','Liveness probe failed: Get "http://10.244.0.7:8201/v1/sys/health?sealedcode=200&uninitcode=200": dial tcp 10.244.0.7:8201: connect: connection refused'],['Normal','Killing','50s','kubelet','Container vault failed liveness probe, will be restarted'],['Warning','Unhealthy','5s','kubelet','Readiness probe failed: HTTP probe failed with statuscode: 503']]})},
 logs(s,p,prev){
  const base='==> Vault server configuration:\n\n             Api Address: http://0.0.0.0:8200\n              Listener 1: tcp (addr: "0.0.0.0:8200", tls: "disabled")\n                 Storage: file\n                 Version: Vault v1.17.2\n\n==> Vault server started! Log data will stream in below:\n';
  if(prev)return base+'[INFO]  core: security barrier initialized: stored=1 shares=3 threshold=2\n[INFO]  core: post-unseal setup complete\n[INFO]  core: marked as sealed\n==> Vault shutdown triggered\n[INFO]  core: pre-seal teardown complete';
  return base+'[INFO]  core: seal configuration loaded: type=shamir\n[INFO]  core: vault is sealed'+(s.sealed?'':'\n[INFO]  core: successfully unsealed with stored key(s)\n[INFO]  core: post-unseal setup complete')},
 secrets:()=>[{name:'vault-init',type:'Opaque',data:{'init.txt':btoa(INIT_TXT)},age:300}],
 objects:{'deploy/vault':{yaml:s=>'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: vault\n  namespace: lab\nspec:\n  replicas: 1\n  strategy:\n    type: Recreate\n  template:\n    spec:\n      containers:\n      - name: vault\n        image: hashicorp/vault:1.17\n        ports:\n        - containerPort: 8200\n        readinessProbe:\n          httpGet:\n            path: /v1/sys/health\n            port: 8200\n          periodSeconds: 5\n        livenessProbe:\n          httpGet:\n            path: /v1/sys/health?sealedcode=200&uninitcode=200\n            port: '+(s.probeFixed?8200:8201)+'\n          initialDelaySeconds: 45\n          periodSeconds: 10\n          failureThreshold: 2\n',
  apply(s,t){const m=/livenessProbe:[^]*?port:\s*(\d+)/.exec(t);if(!m)return'error: livenessProbe not found';if(m[1]==='8200'){vFix(s);return'deployment.apps/vault edited (new pod rolling out: it starts SEALED)'}return'deployment.apps/vault edited (liveness port is still '+m[1]+')'}}},
 cmd(s,c){
  if(c.verb==='patch'&&/liveness/i.test(c.patchStr)&&/8200/.test(c.patchStr)){vFix(s);return'deployment.apps/vault patched'}
 },
 exec(s,p,after){
  const e=splitEnv(after),t=e.rest;
  if(t[0]!=='vault')return'(simulator) run the vault CLI here, e.g. vault status';
  if(!vaultEnvOk(e.env))return'Get "'+e.env.VAULT_ADDR+'/v1/sys/seal-status": dial tcp: connection refused';
  const a=t.slice(1);
  if(a[0]==='status')return vaultStatus(s);
  if(a[0]==='operator'&&a[1]==='init')return'Error initializing: Error making API request.\n\nURL: PUT http://127.0.0.1:8200/v1/sys/init\nCode: 400. Errors:\n\n* Vault is already initialized';
  if(a[0]==='operator'&&a[1]==='unseal'){
   const key=a[2];if(!key)return'Unseal Key (will be hidden):\nError: the simulator cannot prompt for input. Pass the key as an argument: vault operator unseal <key>';
   if(!s.sealed)return vaultStatus(s);
   if(KEYS.indexOf(key)<0)return'Error unsealing: Error making API request.\n\nURL: PUT http://127.0.0.1:8200/v1/sys/unseal\nCode: 400. Errors:\n\n* failed to decrypt keys from barrier: cipher: message authentication failed';
   if(s.progress.indexOf(key)<0)s.progress.push(key);
   if(s.progress.length>=2){s.sealed=false;s.progress=[]}
   return vaultStatus(s)}
  if(s.sealed)return'Error making API request.\n\nURL: GET http://127.0.0.1:8200/v1/sys/internal/ui/mounts\nCode: 503. Errors:\n\n* Vault is sealed';
  return'(simulator) supported: vault status | vault operator unseal <key>'}
});

/* 7 ---------------------------------------------------------- helm-tls */
const effSecret=s=>s.setVals['tls.secretName']||'gateway-tls';
def('helm-tls',{
 title:'Helm release stuck: TLS secret not found',level:'Medium',
 brief:'Helm release "gateway" (chart in ./chart) was installed into namespace lab. Its pod is stuck in ContainerCreating because it mounts a TLS secret.\nGoal: pod Running. Fix it through Helm and/or by creating the missing secret.',
 hints:['kubectl describe pod <pod>: which secret is missing? helm get values gateway -n lab shows what was set.','Either create that secret (kubectl create secret tls NAME --cert=... --key=...) or change the value back with helm upgrade.','helm upgrade gateway ./chart -n lab --reuse-values --set tls.secretName=<name> (the secret must exist)'],
 solution:'Option A (create the missing secret):\n  openssl req -x509 -nodes -newkey rsa:2048 -keyout /tmp/k -out /tmp/c -subj /CN=gateway -days 1\n  kubectl create secret tls gateway-tls-v2 --cert=/tmp/c --key=/tmp/k\nOption B: create gateway-tls the same way, then\n  helm upgrade gateway ./chart -n lab --set tls.secretName=gateway-tls',
 init:()=>({setVals:{'tls.secretName':'gateway-tls-v2'},secrets:[],files:[],rev:1}),
 fixed:s=>s.secrets.indexOf(effSecret(s))>=0,
 pods(s){const ok=s.secrets.indexOf(effSecret(s))>=0;return[{name:pn('gateway',s.gen,0),ready:ok?'1/1':'0/1',status:ok?'Running':'ContainerCreating',restarts:0,age:ok?30+lab(s):120+lab(s),labels:'app=gateway,pod-template-hash='+H[s.gen%H.length],ip:ok?'10.244.0.5':''}]},
 deploys(s){const ok=s.secrets.indexOf(effSecret(s))>=0;return[{name:'gateway',ready:ok?'1/1':'0/1',up:1,avail:ok?1:0,age:120+lab(s)}]},
 svcs:()=>[],endpoints:()=>[],
 events(s){const p='pod/'+pn('gateway',s.gen,0);return s.secrets.indexOf(effSecret(s))>=0?[['Normal','Started','10s',p,'Started container nginx']]:[['Warning','FailedMount','12s',p,'MountVolume.SetUp failed for volume "tls" : secret "'+effSecret(s)+'" not found']]},
 describePod(s,p){const ok=s.secrets.indexOf(effSecret(s))>=0;return podDesc(p,{phase:ok?'Running':'Pending',container:'  nginx:\n    Image:          nginx:1.27-alpine\n    State:          '+(ok?'Running':'Waiting\n      Reason:       ContainerCreating')+'\n    Ready:          '+(ok?'True':'False')+'\n    Restart Count:  0\n    Mounts:\n      /etc/tls from tls (ro)',volumes:'  tls:\n    Type:        Secret (a volume populated by a Secret)\n    SecretName:  '+effSecret(s)+'\n    Optional:    false',events:ok?[['Normal','Started','10s','kubelet','Started container nginx']]:[['Normal','Scheduled','2m','default-scheduler','Successfully assigned lab/'+p.name+' to kcna-lab-control-plane'],['Warning','FailedMount','10s (x9 over 2m)','kubelet','MountVolume.SetUp failed for volume "tls" : secret "'+effSecret(s)+'" not found']]})},
 logs:(s,p)=>s.secrets.indexOf(effSecret(s))>=0?'/docker-entrypoint.sh: Configuration complete; ready for start up':'Error from server (BadRequest): container "nginx" in pod "'+p.name+'" is waiting to start: ContainerCreating',
 secrets:s=>s.secrets.map(n=>({name:n,type:'kubernetes.io/tls',data:{'tls.crt':btoa('CERT'),'tls.key':btoa('KEY')},age:30})),
 openssl(s,t){const ko=t.indexOf('-keyout'),oo=t.indexOf('-out');if(ko<0||oo<0)return'(simulator) use -keyout <file> and -out <file> to write the key and certificate';s.files.push(t[ko+1],t[oo+1]);return'Generating a RSA private key\n..........................+++++\n......+++++\nwriting new private key to \''+t[ko+1]+'\'\n-----'},
 createSecret(s,c){
  const type=c.pos[1],name=c.pos[2];if(!name)return'error: exactly one NAME is required, got 0';
  if(type==='tls'){const cert=c.flags.cert,key=c.flags.key;if(!cert||!key)return'error: failed to create secret: --cert and --key are required';for(const f of[cert,key])if(s.files.indexOf(f)<0)return'error: failed to load key pair open '+f+': no such file or directory (create it first with openssl)'}
  else if(type!=='generic')return'(simulator) supported: create secret tls|generic NAME';
  if(s.secrets.indexOf(name)>=0)return'Error from server (AlreadyExists): secrets "'+name+'" already exists';
  s.secrets.push(name);return'secret/'+name+' created'},
 objects:{'deploy/gateway':{yaml:s=>'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: gateway\n  namespace: lab\nspec:\n  template:\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:1.27-alpine\n        volumeMounts:\n        - name: tls\n          mountPath: /etc/tls\n          readOnly: true\n      volumes:\n      - name: tls\n        secret:\n          secretName: '+effSecret(s)+'\n',
  apply(s,t){const m=/secretName:\s*(\S+)/.exec(t);if(m){s.setVals['tls.secretName']=m[1];s.gen++;return'deployment.apps/gateway edited (note: Helm will overwrite this on the next upgrade)'}}}},
 cmd:()=>undefined,
 helm:true
});
function helm(tokens){
  const s=Sim.s;const sub=tokens[0];const pf=parseFlags(tokens.slice(1),'helm');const f=pf.flags;
  const ts='2026-11-02 02:11:04.000000000 +0000 UTC';
  if(f.n&&f.n!=='lab'&&!f.A)return sub==='list'||sub==='ls'?'NAME\tNAMESPACE\tREVISION\tUPDATED\tSTATUS\tCHART\tAPP VERSION':'Error: release: not found';
  if(sub==='list'||sub==='ls')return tbl(['NAME','NAMESPACE','REVISION','UPDATED','STATUS','CHART','APP VERSION'],[['gateway','lab',String(s.rev),ts,'deployed','gateway-0.1.0','']]);
  if(sub==='status')return'NAME: gateway\nLAST DEPLOYED: Mon Nov  2 02:11:04 2026\nNAMESPACE: lab\nSTATUS: deployed\nREVISION: '+s.rev;
  if(sub==='history'){const rows=[];for(let i=1;i<=s.rev;i++)rows.push([String(i),ts,i===s.rev?'deployed':'superseded','gateway-0.1.0','',i===1?'Install complete':'Upgrade complete']);return tbl(['REVISION','UPDATED','STATUS','CHART','APP VERSION','DESCRIPTION'],rows)}
  if(sub==='get'){const what=pf.pos[0];
    if(what==='values'){if(f.a||f.all)return'COMPUTED VALUES:\ntls:\n  secretName: '+effSecret(s);const k=Object.keys(s.setVals);return'USER-SUPPLIED VALUES:\n'+(k.length?'tls:\n  secretName: '+s.setVals['tls.secretName']:'null')}
    if(what==='manifest')return'---\n# Source: gateway/templates/deploy.yaml\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: gateway\nspec:\n  template:\n    spec:\n      volumes:\n      - name: tls\n        secret: {secretName: '+effSecret(s)+'}';
    return'(simulator) supported: helm get values | manifest'}
  if(sub==='upgrade'||sub==='install'){
    if(pf.pos.length<2)return'Error: "helm upgrade" requires 2 arguments\n\nUsage:  helm upgrade [RELEASE] [CHART] [flags]';
    if(pf.pos[0]!=='gateway')return'Error: "'+pf.pos[0]+'" has no deployed releases';
    if(pf.pos[1].indexOf('/')<0&&pf.pos[1][0]!=='.')return'Error: repo '+pf.pos[1]+' not found';
    const vals=f['reuse-values']?Object.assign({},s.setVals):{};
    String(f.set||'').split(',').filter(Boolean).forEach(kvp=>{const i=kvp.indexOf('=');if(i>0)vals[kvp.slice(0,i)]=kvp.slice(i+1)});
    s.setVals=vals;s.rev++;s.gen++;
    return'Release "gateway" has been upgraded. Happy Helming!\nNAME: gateway\nLAST DEPLOYED: Mon Nov  2 02:20:41 2026\nNAMESPACE: lab\nSTATUS: deployed\nREVISION: '+s.rev}
  return'(simulator) supported: helm list | status | history | get values | upgrade'}
