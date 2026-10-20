(function(){
const root=document.documentElement;
const saved=localStorage.getItem('theme');
const pref=saved||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
root.setAttribute('data-theme',pref);
window.toggleTheme=function(){const n=root.getAttribute('data-theme')==='dark'?'light':'dark';root.setAttribute('data-theme',n);localStorage.setItem('theme',n);const b=document.getElementById('themeBtn');if(b)b.textContent=n==='dark'?'☀':'☾';const m=document.querySelector('meta[name=theme-color]');if(m)m.content=n==='dark'?'#0b0a14':'#f6f5fc'};
window.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('themeBtn');if(b){b.textContent=pref==='dark'?'☀':'☾';b.onclick=toggleTheme}});
window.$=(s,e=document)=>e.querySelector(s);window.$$=(s,e=document)=>[...e.querySelectorAll(s)];
window.esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
let tt;window.toast=function(m){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2400)};
window.store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){toast('Storage full - export a backup')}}};
window.download=function(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type||'text/plain'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
window.copyText=async function(t){try{await navigator.clipboard.writeText(t);toast('Copied')}catch(e){const x=document.createElement('textarea');x.value=t;document.body.appendChild(x);x.select();try{document.execCommand('copy');toast('Copied')}catch(_){toast('Copy not allowed here')}x.remove()}};
window.addEventListener('DOMContentLoaded',()=>{let q;new MutationObserver(()=>{clearTimeout(q);q=setTimeout(()=>{const t=document.querySelector('.tabs .on');if(t&&t.parentElement.scrollWidth>t.parentElement.clientWidth)t.parentElement.scrollLeft=t.offsetLeft-(t.parentElement.clientWidth-t.offsetWidth)/2},30)}).observe(document.body,{childList:true,subtree:true})});
if('serviceWorker' in navigator&&location.protocol.startsWith('http')&&location.hostname!=='localhost'){addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
})();
