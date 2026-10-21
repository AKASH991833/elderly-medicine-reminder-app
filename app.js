'use strict';
const KEY='dawaiyaad.v1';
const PRESETS=[['Morning','08:00'],['Afternoon','14:00'],['Evening','18:00'],['Night','21:00']];
const FOOD={any:'Any time',before:'Before food',after:'After food'};
const WINDOW_MIN=120; // doses older than this and not taken are shown as missed
let S=load();let tab='today';let draftTimes=['08:00'];let editId=null;
let snooze={},alerted={},active=null,beepTimer=null,wake=null,audioCtx=null;
function blank(){return{person:'',meds:[],log:{},contacts:[],med:{blood:'',allergy:'',cond:'',doctor:''},voice:true,lang:'hi',fs:0,keepAwake:false}}
function load(){const d=store.get(KEY,null);return Object.assign(blank(),d||{})}
function save(){store.set(KEY,S)}
const now=()=>new Date(Date.now()+(window.__offset||0));
const pad=n=>String(n).padStart(2,'0');
const dkey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const fmt12=t=>{const[h,m]=t.split(':').map(Number);return ((h%12)||12)+':'+pad(m)+' '+(h>=12?'PM':'AM')};
const toMin=t=>{const[h,m]=t.split(':').map(Number);return h*60+m};
function activeOn(m,d){return (!m.added||dkey(d)>=m.added)&&(!m.end||dkey(d)<=m.end)&&(!m.start||dkey(d)>=m.start)}
function dosesFor(d){const k=dkey(d),out=[];S.meds.forEach(m=>{if(!activeOn(m,d))return;m.times.forEach(t=>out.push({id:m.id+'|'+t,med:m,t,k:k+'|'+m.id+'|'+t,min:toMin(t)}))});return out.sort((a,b)=>a.min-b.min||a.med.name.localeCompare(b.med.name))}
function status(d,nowMin){if(S.log[d.k])return'taken';if(nowMin-d.min>WINDOW_MIN)return'missed';if(nowMin>=d.min)return'due';return'later'}
function render(){
 document.documentElement.className='fs'+S.fs;
 const T=[['today','Today'],['meds','Medicines'],['sos','Emergency'],['record','Record'],['set','Settings']];
 $('#app').innerHTML=`<div class="tabs">${T.map(([k,l])=>`<button data-t="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div><div id="v"></div>`;
 $$('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;editId=null;render();scrollTo(0,0)});
 ({today:vToday,meds:vMeds,sos:vSos,record:vRecord,set:vSet})[tab]($('#v'));
}
function greet(){const h=now().getHours();return (h<12?'Good morning':h<17?'Hello':'Good evening')+(S.person?', '+S.person:'')}
function vToday(el){
 const n=now(),nm=n.getHours()*60+n.getMinutes(),list=dosesFor(n);
 const nextD=list.find(d=>status(d,nm)==='due')||list.find(d=>status(d,nm)==='later');
 const stat=list.map(d=>status(d,nm));
 el.innerHTML=`<h2 style="font-size:1.5rem">${esc(greet())}</h2>
 ${!list.length?`<div class="card empty">${S.meds.length?'No medicines scheduled for today.':'No medicines added yet. Add them on the Medicines tab.'}</div>`:''}
 ${nextD?`<div class="card next"><div class="muted" style="font-weight:700;letter-spacing:.04em;text-transform:uppercase;font-size:.8rem">${status(nextD,nm)==='due'?'Take now':'Next dose'}</div><div class="t">${fmt12(nextD.t)}</div><div class="n">${esc(nextD.med.name)}</div><div class="muted" style="font-size:1.1rem">${esc(nextD.med.dose||'')} ${nextD.med.food!=='any'?'· '+FOOD[nextD.med.food]:''}</div>
  ${status(nextD,nm)==='due'?`<button class="btn big ok" data-take="${nextD.k}" style="margin-top:16px">✓ Taken</button>`:''}</div>`:(list.length?'<div class="card next"><div class="n">All done for today ✓</div></div>':'')}
 ${list.map((d,i)=>{const s=stat[i];return `<div class="dose ${s==='taken'?'taken':s==='missed'?'missed':''}"><div class="time">${fmt12(d.t)}</div><div class="nm"><b>${esc(d.med.name)}</b><span class="muted">${esc(d.med.dose||'')}${d.med.food!=='any'?' · '+FOOD[d.med.food]:''}</span></div>
  ${s==='taken'?`<span class="pill ok">✓ Taken</span>`:s==='missed'?`<span class="pill bad">Missed</span><button class="btn sm" data-take="${d.k}">Taken</button>`:s==='due'?`<button class="btn ok" data-take="${d.k}">Taken</button>`:'<span class="pill">Upcoming</span>'}</div>`}).join('')}
 ${list.length?`<div class="muted" style="text-align:center">${stat.filter(s=>s==='taken').length} of ${list.length} doses taken</div>`:''}
 ${S.meds.length&&!('Notification' in window&&Notification.permission==='granted')?'<div class="alertb" style="margin-top:14px">Keep the app open for the alarm sound. For notifications, tap "Allow notifications" in Settings.</div>':'<div class="alertb" style="margin-top:14px">Note: a browser cannot ring the alarm while the app is closed. Keep the app open, or turn on "Keep screen on" in Settings.</div>'}`;
 $$('[data-take]',el).forEach(b=>b.onclick=()=>take(b.dataset.take));
}
function take(k){S.log[k]={at:now().toISOString()};save();stopAlert(k);render();toast('Marked as taken ✓')}
function vMeds(el){
 const m=editId&&S.meds.find(x=>x.id===editId);
 const f=m||{name:'',dose:'',food:'any',times:draftTimes,start:'',end:'',note:''};
 if(m)draftTimes=draftTimes.length&&el.dataset.editing===editId?draftTimes:[...m.times];
 el.dataset.editing=editId||'';
 el.innerHTML=`<div class="card"><h3>${m?'Edit medicine':'New medicine'}</h3><form id="mf" class="grid">
 <div style="grid-column:1/-1"><label class="f">Medicine name *</label><input name="name" required maxlength="60" value="${esc(f.name)}" placeholder="e.g. Metformin 500"></div>
 <div><label class="f">Dose</label><input name="dose" maxlength="40" value="${esc(f.dose)}" placeholder="1 tablet"></div>
 <div><label class="f">With food</label><select name="food">${Object.entries(FOOD).map(([k,v])=>`<option value="${k}" ${f.food===k?'selected':''}>${v}</option>`).join('')}</select></div>
 <div style="grid-column:1/-1"><label class="f">Times to take *</label><div class="chips">${PRESETS.map(([l,t])=>`<button type="button" data-p="${t}">+ ${l} ${fmt12(t)}</button>`).join('')}</div>
  <div id="tl">${draftTimes.map(t=>`<span class="timeitem">${fmt12(t)}<button type="button" data-rt="${t}" aria-label="Remove">✕</button></span>`).join('')||'<span class="muted">No time added</span>'}</div>
  <div class="row" style="margin-top:8px"><input type="time" id="ct" style="max-width:180px" value="09:00"><button type="button" class="btn" id="at">Add this time</button></div></div>
 <div><label class="f">Start date (optional)</label><input type="date" name="start" value="${esc(f.start)}"></div>
 <div><label class="f">Last day (optional)</label><input type="date" name="end" value="${esc(f.end)}"></div>
 <div style="grid-column:1/-1"><label class="f">Note (optional)</label><input name="note" maxlength="100" value="${esc(f.note)}"></div>
 <div class="row" style="grid-column:1/-1"><button class="btn pri">${m?'Save changes':'Add medicine'}</button>${m?'<button type="button" class="btn" id="cn">Cancel</button>':''}</div></form></div>
 <h3>My medicines (${S.meds.length})</h3>
 ${S.meds.length?S.meds.map(x=>`<div class="card"><div class="row"><div class="grow"><b style="font-size:1.2rem">${esc(x.name)}</b><div class="muted">${esc(x.dose||'')} ${x.food!=='any'?'· '+FOOD[x.food]:''}</div><div style="margin-top:6px">${x.times.map(t=>`<span class="pill">${fmt12(t)}</span> `).join('')}</div>${x.note?`<div class="muted" style="font-size:.9rem;margin-top:4px">${esc(x.note)}</div>`:''}${x.end?`<div class="muted" style="font-size:.85rem">Last day: ${esc(x.end)}</div>`:''}</div>
  <button class="btn" data-ed="${x.id}">Edit</button><button class="btn bad" data-rm="${x.id}">Remove</button></div></div>`).join(''):'<div class="card empty">No medicines added.</div>'}`;
 $$('[data-p]',el).forEach(b=>b.onclick=()=>{keepForm();if(!draftTimes.includes(b.dataset.p))draftTimes.push(b.dataset.p);draftTimes.sort();render()});
 $('#at').onclick=()=>{keepForm();const v=$('#ct').value;if(v&&!draftTimes.includes(v))draftTimes.push(v);draftTimes.sort();render()};
 $$('[data-rt]',el).forEach(b=>b.onclick=()=>{keepForm();draftTimes=draftTimes.filter(t=>t!==b.dataset.rt);render()});
 function keepForm(){formCache=Object.fromEntries(new FormData($('#mf')).entries())}
 if(Object.keys(formCache).length)for(const[k,v]of Object.entries(formCache)){const i=$(`#mf [name=${k}]`);if(i)i.value=v}
 $('#mf').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);const name=fd.get('name').trim();
  if(!name)return;if(!draftTimes.length){toast('Add at least one time');return}
  if(fd.get('start')&&fd.get('end')&&fd.get('end')<fd.get('start')){toast('Last day cannot be before the start date');return}
  const o={name,dose:fd.get('dose').trim(),food:fd.get('food'),times:[...draftTimes],start:fd.get('start'),end:fd.get('end'),note:fd.get('note').trim()};
  if(m)Object.assign(m,o);else S.meds.push({id:uid(),added:dkey(now()),...o});
  save();editId=null;draftTimes=['08:00'];formCache={};render();toast('Saved')};
 if($('#cn'))$('#cn').onclick=()=>{editId=null;draftTimes=['08:00'];formCache={};render()};
 $$('[data-ed]',el).forEach(b=>b.onclick=()=>{editId=b.dataset.ed;formCache={};draftTimes=[...S.meds.find(x=>x.id===editId).times];render();scrollTo(0,0)});
 $$('[data-rm]',el).forEach(b=>b.onclick=()=>{const x=S.meds.find(y=>y.id===b.dataset.rm);if(confirm('Remove "'+x.name+'"?')){S.meds=S.meds.filter(y=>y.id!==x.id);save();render()}});
}
let formCache={};
const telOK=n=>/^[+]?[0-9\s\-]{3,18}$/.test(n);
function vSos(el){
 el.innerHTML=`<div class="card"><h3>Get help quickly</h3><div class="grid"><a class="btn call big" href="tel:112" style="text-decoration:none;display:grid;place-items:center">☎ 112 - Emergency</a><a class="btn call big" href="tel:108" style="text-decoration:none;display:grid;place-items:center">☎ 108 - Ambulance</a></div>
 <p class="muted" style="margin:10px 0 0;font-size:.88rem">112 is the all-India emergency number. 108 is the ambulance number in most states.</p></div>
 <div class="card"><h3>Family / Doctor</h3>${S.contacts.map(c=>`<div class="cbig"><div class="nm">${esc(c.name)}<div class="muted" style="font-size:.95rem;font-weight:500">${esc(c.num)}</div></div><a class="btn call" href="tel:${esc(c.num.replace(/[^\d+]/g,''))}" style="text-decoration:none;display:grid;place-items:center;min-width:110px">☎ Call</a><button class="btn bad" data-rc="${c.id}" aria-label="Remove">✕</button></div>`).join('')||'<div class="empty">No contacts added yet. Add one below.</div>'}
 <form id="cf" class="grid" style="margin-top:14px"><div><label class="f">Name (e.g. Son Rahul, Dr. Gupta)</label><input name="n" required maxlength="40"></div><div><label class="f">Phone number</label><input name="p" required inputmode="tel" maxlength="18"></div><div style="align-self:end"><button class="btn pri" style="width:100%">Add contact</button></div></form></div>
 <div class="card"><h3>Medical information</h3><p class="muted" style="margin-top:0;font-size:.92rem">Show this to a doctor or ambulance staff in an emergency.</p><form id="mi" class="grid">
 <div><label class="f">Blood group</label><input name="blood" maxlength="10" value="${esc(S.med.blood)}"></div><div><label class="f">Allergies</label><input name="allergy" maxlength="100" value="${esc(S.med.allergy)}"></div>
 <div><label class="f">Conditions (BP, diabetes...)</label><input name="cond" maxlength="120" value="${esc(S.med.cond)}"></div><div><label class="f">Doctor / hospital</label><input name="doctor" maxlength="100" value="${esc(S.med.doctor)}"></div>
 <div style="grid-column:1/-1"><button class="btn pri">Save</button></div></form></div>`;
 $('#cf').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const p=f.get('p').trim();if(!telOK(p)){toast('Enter a valid phone number');return}S.contacts.push({id:uid(),name:f.get('n').trim(),num:p});save();render()};
 $$('[data-rc]',el).forEach(b=>b.onclick=()=>{S.contacts=S.contacts.filter(c=>c.id!==b.dataset.rc);save();render()});
 $('#mi').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);['blood','allergy','cond','doctor'].forEach(k=>S.med[k]=f.get(k).trim());save();toast('Saved')};
}
function vRecord(el){
 const days=[];for(let i=6;i>=0;i--){const d=new Date(now());d.setDate(d.getDate()-i);days.push(d)}
 const rows=days.map(d=>{const l=dosesFor(d);const t=l.filter(x=>S.log[x.k]).length;return{d,total:l.length,t}});
 const maxT=Math.max(1,...rows.map(r=>r.total));
 const tot=rows.reduce((a,r)=>a+r.total,0),tk=rows.reduce((a,r)=>a+r.t,0);
 el.innerHTML=`<div class="card"><h3>Last 7 days</h3>${tot?`<p style="font-size:1.3rem;font-weight:800;margin:0 0 12px">${tk} of ${tot} doses taken (${Math.round(tk/tot*100)}%)</p>`:'<p class="muted">No record yet.</p>'}
 <div class="bars">${rows.map(r=>`<div><i style="height:${r.total?Math.max(3,r.t/maxT*90):3}px;${r.total&&r.t<r.total?'background:var(--warn)':''}"></i>${r.t}/${r.total}<br>${r.d.toLocaleDateString('en-IN',{weekday:'short'})}</div>`).join('')}</div></div>
 <div class="card"><button class="btn" id="pr">Print / PDF for family</button></div>`;
 $('#pr').onclick=()=>print();
}
function vSet(el){
 const notif='Notification' in window?Notification.permission:'unsupported';
 el.innerHTML=`<div class="card"><h3>Settings</h3><form id="sf" class="grid">
 <div><label class="f">Elder's name (e.g. Grandma)</label><input name="p" maxlength="30" value="${esc(S.person)}"></div>
 <div><label class="f">Text size</label><select name="fs"><option value="0" ${S.fs==0?'selected':''}>Normal</option><option value="1" ${S.fs==1?'selected':''}>Large</option><option value="2" ${S.fs==2?'selected':''}>Extra large</option></select></div>
 <div><label class="f">Spoken voice alerts</label><select name="v"><option value="1" ${S.voice?'selected':''}>On</option><option value="0" ${!S.voice?'selected':''}>Off</option></select></div>
 <div><label class="f">Voice language</label><select name="l"><option value="hi" ${S.lang==='hi'?'selected':''}>Hindi</option><option value="en" ${S.lang==='en'?'selected':''}>English</option></select></div>
 <div style="grid-column:1/-1"><button class="btn pri">Save</button></div></form></div>
 <div class="card"><h3>Reminders</h3><div class="row"><button class="btn" id="tv">Test the voice</button><button class="btn" id="nt" ${notif==='granted'||notif==='unsupported'?'disabled':''}>${notif==='granted'?'Notifications on ✓':notif==='unsupported'?'Notifications not supported':'Allow notifications'}</button><button class="btn" id="ka" ${'wakeLock' in navigator?'':'disabled'}>${S.keepAwake?'Keep screen on: On ✓':'Keep screen on'}</button></div>
 <p class="muted" style="font-size:.92rem">The alarm rings only while the app is open. Keep the phone on charge with "Keep screen on" turned on. For Hindi voice, the phone needs a Hindi text-to-speech voice installed.</p></div>
 <div class="card"><h3>Backup</h3><div class="row"><button class="btn" id="bk">Backup (.json)</button><label class="btn" style="display:inline-flex;align-items:center">Restore<input type="file" id="rs" accept=".json,application/json" class="hide"></label><button class="btn bad" id="rst">Delete everything</button></div></div>`;
 $('#sf').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);S.person=f.get('p').trim();S.fs=+f.get('fs');S.voice=f.get('v')==='1';S.lang=f.get('l');save();render();toast('Saved')};
 $('#tv').onclick=()=>{speak(S.lang==='hi'?'Dawai ka samay ho gaya hai.':'It is time for your medicine.',true)};
 $('#nt').onclick=async()=>{try{await Notification.requestPermission()}catch(_){}render()};
 $('#ka').onclick=async()=>{S.keepAwake=!S.keepAwake;save();await applyWake();render()};
 $('#bk').onclick=()=>download('medicine-reminder-backup-'+dkey(now())+'.json',JSON.stringify(S),'application/json');
 $('#rst').onclick=()=>{if(confirm('All data will be deleted. Are you sure?')){S=blank();save();render()}};
 $('#rs').onchange=async x=>{const f=x.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());if(!j||!Array.isArray(j.meds))throw 0;
  const n=blank();n.person=String(j.person||'').slice(0,30);n.fs=[0,1,2].includes(j.fs)?j.fs:0;n.voice=j.voice!==false;n.lang=j.lang==='en'?'en':'hi';
  n.meds=j.meds.map(m=>({id:String(m.id||uid()),name:String(m.name||'').slice(0,60),dose:String(m.dose||'').slice(0,40),food:FOOD[m.food]?m.food:'any',times:(Array.isArray(m.times)?m.times:[]).filter(t=>/^\d{2}:\d{2}$/.test(t)),added:String(m.added||''),start:String(m.start||''),end:String(m.end||''),note:String(m.note||'')})).filter(m=>m.name&&m.times.length);
  n.log=Object.fromEntries(Object.entries(j.log||{}).slice(0,5000).map(([k,v])=>[String(k),{at:String(v&&v.at||'')}]));
  n.contacts=(Array.isArray(j.contacts)?j.contacts:[]).filter(c=>telOK(String(c.num||''))).map(c=>({id:String(c.id||uid()),name:String(c.name||'').slice(0,40),num:String(c.num)}));
  n.med=Object.fromEntries(['blood','allergy','cond','doctor'].map(k=>[k,String(j.med&&j.med[k]||'').slice(0,120)]));
  if(!confirm('Replace current data with this backup?'))return;S=n;save();render();toast('Backup restored')}catch(_){toast('This is not a valid backup file')}};
}
/* ---------- alarm engine ---------- */
function ctx(){try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume()}catch(_){}return audioCtx}
function beep(){const c=ctx();if(!c)return;const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=880;o.connect(g);g.connect(c.destination);const t=c.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.35,t+.05);g.gain.setValueAtTime(.35,t+.35);g.gain.linearRampToValueAtTime(0,t+.45);o.start(t);o.stop(t+.5)}
function speak(text,force){if(!('speechSynthesis' in window)||(!S.voice&&!force))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=S.lang==='hi'?'hi-IN':'en-IN';const v=speechSynthesis.getVoices().find(v=>v.lang&&v.lang.toLowerCase().replace('_','-').startsWith(u.lang.toLowerCase().slice(0,2)));if(v)u.voice=v;u.rate=.85;speechSynthesis.speak(u)}catch(_){}}
function msg(d){const who=S.person?S.person+', ':'';return S.lang==='hi'?`${who}dawai ka samay ho gaya hai. ${d.med.name}. ${d.med.dose||''}`:`${who}it is time for your medicine. ${d.med.name}. ${d.med.dose||''}`}
function showAlert(d){
 active=d;const o=document.createElement('div');o.className='overlay';o.id='ov';o.setAttribute('role','alertdialog');o.setAttribute('aria-label','Medicine time');
 o.innerHTML=`<div style="font-size:4rem;font-weight:900">✚</div><h1>${esc(greet().split(',')[0])}! Time for your medicine</h1><div class="med">${esc(d.med.name)}</div><div style="font-size:1.6rem">${esc(d.med.dose||'')} ${d.med.food!=='any'?'· '+FOOD[d.med.food]:''}</div><div style="font-size:1.4rem;font-weight:800">${fmt12(d.t)}</div>
 <button class="btn big ok" id="ovt">✓ Taken</button><button class="btn big" id="ovs" style="min-height:60px;font-size:1.2rem">Remind me in 10 minutes</button>`;
 document.body.appendChild(o);
 $('#ovt').onclick=()=>take(d.k);
 $('#ovs').onclick=()=>{snooze[d.k]=Date.now()+(window.__offset||0)+10*60000;alerted[d.k]=0;stopAlert();toast('We will remind you again in 10 minutes')};
 const say=()=>{beep();setTimeout(beep,600);setTimeout(()=>speak(msg(d)),1300)};say();beepTimer=setInterval(say,30000);
 try{if('Notification' in window&&Notification.permission==='granted'){const n=new Notification('Medicine time',{body:`${d.med.name} ${d.med.dose||''}`,tag:d.k,requireInteraction:true});n.onclick=()=>focus()}}catch(_){}
 if(navigator.vibrate)navigator.vibrate([400,200,400]);
}
function stopAlert(k){clearInterval(beepTimer);beepTimer=null;const o=$('#ov');if(o)o.remove();active=null;try{speechSynthesis.cancel()}catch(_){}}
function tick(){
 if(active)return;
 const n=now(),nm=n.getHours()*60+n.getMinutes(),t=Date.now()+(window.__offset||0);
 for(const d of dosesFor(n)){
  if(S.log[d.k])continue;
  const st=status(d,nm);if(st!=='due')continue;
  if(snooze[d.k]&&t<snooze[d.k])continue;
  if(alerted[d.k])continue;
  alerted[d.k]=1;showAlert(d);return;
 }
 if(tab==='today'&&!$('#ov')&&!document.activeElement.matches('input,select,textarea'))render();
}
async function applyWake(){try{if(S.keepAwake&&'wakeLock' in navigator&&!wake){wake=await navigator.wakeLock.request('screen');wake.addEventListener('release',()=>{wake=null})}else if(!S.keepAwake&&wake){await wake.release();wake=null}}catch(_){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){applyWake();tick()}});
render();applyWake();setInterval(tick,10000);setTimeout(tick,500);
window.__tick=tick;
