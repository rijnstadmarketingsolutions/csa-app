/* =====================================================================
   Vantis — stijlkiezer: Huidig, Dark Luxury, Light Luxury
   ===================================================================== */
const SKINS=[['classic','Huidig','Het vertrouwde navy en wit, met licht en donker.'],['luxdark','Dark Luxury','Pikzwart met chroom en zilver, glas en glans.'],['luxlight','Light Luxury','Parelwit met gepolijst zilver en matglas.']];
const Skin={
  get(){return S.settings.skin||LS.get('skin','luxdark')},
  apply(k){const R=document.documentElement;R.dataset.skin=k;if(k==='luxdark')R.dataset.theme='dark';else if(k==='luxlight')R.dataset.theme='light';else R.dataset.theme=S.settings.theme==='dark'?'dark':'light';
    document.querySelector('meta[name=theme-color]')?.setAttribute('content',k==='luxdark'?'#050505':k==='luxlight'?'#F3F4F6':'#17243A');const b=$('#themebtn');if(b)b.setAttribute('aria-label',k==='classic'?'Licht of donker':'Dark of Light Luxury')},
  set(k){S.settings.skin=k;LS.set('skin',k);saveSettings();this.apply(k);if(UI.el)UI.route();UI.toast({kind:'success',title:'Stijl: '+SKINS.find(x=>x[0]===k)[1]})},
  menu(btn){const old=$('#skinmenu');if(old){old.remove();btn.setAttribute('aria-expanded','false');return}const cur=this.get();const r=btn.getBoundingClientRect();
    const m=document.createElement('div');m.id='skinmenu';m.className='skinmenu';m.setAttribute('role','menu');m.setAttribute('aria-label','Stijl kiezen');
    m.innerHTML=`<h3>Stijl</h3>${SKINS.map(([k,n,d])=>`<button class="skinopt" role="menuitemradio" aria-checked="${cur===k}" data-skin="${k}"><span class="sw sw-${k}"></span><span><b>${n}</b><small>${d}</small></span><svg class="ck" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></button>`).join('')}`;
    document.body.appendChild(m);m.style.top=Math.round(r.bottom+8)+'px';m.style.left=Math.max(10,Math.min(window.innerWidth-m.offsetWidth-10,r.right-m.offsetWidth))+'px';btn.setAttribute('aria-expanded','true');
    m.querySelector(`[data-skin="${cur}"]`)?.focus();
    m.addEventListener('click',e=>{const o=e.target.closest('[data-skin]');if(!o)return;m.remove();btn.setAttribute('aria-expanded','false');if(o.dataset.skin!==cur)this.set(o.dataset.skin)});
    m.addEventListener('keydown',e=>{const L=[...m.querySelectorAll('.skinopt')];const i=L.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();L[(i+1)%L.length].focus()}if(e.key==='ArrowUp'){e.preventDefault();L[(i-1+L.length)%L.length].focus()}if(e.key==='Escape'){m.remove();btn.setAttribute('aria-expanded','false');btn.focus()}});
    setTimeout(()=>document.addEventListener('click',function off(e){if(!m.contains(e.target)&&e.target!==btn&&!btn.contains(e.target)){m.remove();btn.setAttribute('aria-expanded','false');document.removeEventListener('click',off)}}),0)}
};
document.body.insertAdjacentHTML('afterbegin','<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="vmetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#8b919a"/><stop offset=".6" stop-color="#eef0f2"/><stop offset="1" stop-color="#9aa0a9"/></linearGradient></defs></svg>');
Skin.apply(Skin.get());
{const sb=$('#skinbtn');if(sb)sb.onclick=e=>{e.stopPropagation();Skin.menu(sb)};
  const tb=$('#themebtn');if(tb){const orig=tb.onclick;tb.onclick=function(e){const k=Skin.get();if(k==='luxdark'||k==='luxlight')return Skin.set(k==='luxdark'?'luxlight':'luxdark');return orig&&orig.call(this,e)}}}
/* na het synchroniseren van voorkeuren de gekozen stijl opnieuw toepassen */
{const op=Sync.pull&&Sync.pull.bind(Sync);if(op)Sync.pull=async function(){const r=await op();if(S.settings.skin){LS.set('skin',S.settings.skin);Skin.apply(S.settings.skin)}return r}}
{const ih=Pages.instellingen.html,im=Pages.instellingen.mount;
  Pages.instellingen.html=function(){const cur=Skin.get();return ih.call(this).replace('<div id="chwrap">',`<div class="card" style="margin-top:16px"><div class="chead"><h2>Stijl</h2></div><div class="skinrow">${SKINS.map(([k,n,d])=>`<button class="skinopt" role="radio" aria-checked="${cur===k}" data-skinset="${k}"><span class="sw sw-${k}"></span><span><b>${n}</b><small>${d}</small></span><svg class="ck" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></button>`).join('')}</div></div><div id="chwrap">`)};
  Pages.instellingen.mount=function(el,arg){im.call(this,el,arg);el.addEventListener('click',e=>{const o=e.target.closest('[data-skinset]');if(o&&o.dataset.skinset!==Skin.get())Skin.set(o.dataset.skinset)})}}
/* white-label: eigen naam in plaats van het Vantis-woordmerk */
{const ab2=applyBrand;applyBrand=function(force){ab2(force);setTimeout(()=>{const b=BRAND||{};const custom=b.name&&b.name!=='Vantis';$$('.brand,.mbrand').forEach(x=>{x.classList.toggle('brand-custom',!!custom);let t=x.querySelector('.bname');if(custom){if(!t){t=document.createElement('b');t.className='bname';(x.querySelector('.bwrap')||x).prepend(t)}t.textContent=b.name}else if(t)t.remove()})},400)}}
