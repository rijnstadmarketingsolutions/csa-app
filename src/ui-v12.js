/* =====================================================================
   v12 — vrienden, chat, crypto sturen en vrijspelen door te handelen
   ===================================================================== */
IC.users='<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-6 6.5-6s5.9 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2c2 .8 3.1 2.8 3.5 5.8"/>';
IC.send='<path d="M21 3 10.5 13.5"/><path d="M21 3 14.6 21l-4.1-7.5L3 9.4z"/>';
IC.lock='<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>';
IC.back='<path d="m15 5-7 7 7 7"/>';
IC.useradd='<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-6 6.5-6s5.9 2.4 6.5 6M19 8v6M16 11h6"/>';
{const i=NAV.findIndex(n=>n[0]==='meldingen');NAV.splice(i>=0?i+1:NAV.length,0,['vrienden','Vrienden','users'])}

/* ---------- handelsrang en vrij te spelen stijlen ---------- */
const RANKS=[[0,'Starter'],[100,'Leerling'],[300,'Handelaar'],[800,'Gevorderd'],[1800,'Expert'],[4000,'Meester'],[8000,'Legende']];
const rankOf=xp=>{let i=0;RANKS.forEach((r,k)=>{if((xp||0)>=r[0])i=k});return {n:i+1,name:RANKS[i][1],min:RANKS[i][0],next:RANKS[i+1]?RANKS[i+1][0]:null}};
const xpOf=r=>Math.round((r.n||0)*10+(r.days||0)*25+Math.min(Math.floor((r.vol||0)/500),2000));
const UNLOCKS={
  noirblue:{n:5,txt:'Doe 5 transacties'},
  arctic:{days:3,txt:'Handel op 3 verschillende dagen'},
  noirgreen:{n:15,txt:'Doe 15 transacties'},
  navygold:{rank:3,txt:'Bereik handelsrang 3: Handelaar'},
  emerald:{days:10,txt:'Handel op 10 verschillende dagen'},
  bordeaux:{rank:5,txt:'Bereik handelsrang 5: Expert'}
};
const REW={st:null,
  local(){const P=LS.get('paper2',null);const T=((P&&P.trades)||[]).filter(t=>t.side==='buy'||t.side==='sell');const r={n:T.length,vol:T.reduce((a,t)=>a+(+t.eur||0),0),days:new Set(T.map(t=>Math.floor(t.t/864e5))).size};r.xp=xpOf(r);return r},
  get(){return this.st||LS.get('rw',null)||{n:0,vol:0,days:0,xp:0}},
  admin(){return !!(Api.user&&Api.user.admin)},
  async load(n=0){if(!Api.authed&&Api.token&&n<6){setTimeout(()=>this.load(n+1),2000);return this.get()}
    try{this.st=Api.authed?await Api.call('/api/rewards'):this.local();LS.set('rw',this.st);this.check();this.redraw()}catch(e){}return this.st},
  redraw(){const v=UI.el;if(!v)return;$$('.rwbar',v).forEach(b=>b.outerHTML=this.bar());if($('.skinrow',v))lockMark(v)},
  open(k){const u=UNLOCKS[k];if(!u||this.admin()||tierRank(Api.user&&Api.user.plan)>=4)return true;const r=this.get();if(u.n&&r.n<u.n)return false;if(u.days&&r.days<u.days)return false;if(u.rank&&rankOf(r.xp).n<u.rank)return false;return true},
  prog(k){const u=UNLOCKS[k],r=this.get();if(!u)return 1;if(u.n)return Math.min(1,r.n/u.n);if(u.days)return Math.min(1,r.days/u.days);if(u.rank)return Math.min(1,(r.xp||0)/RANKS[u.rank-1][0]);return 1},
  check(){const now=Object.keys(UNLOCKS).filter(k=>this.open(k));const seen=LS.get('rwseen',null);if(!Array.isArray(seen)){LS.set('rwseen',now);return}
    const fresh=now.filter(k=>!seen.includes(k));if(!fresh.length)return;LS.set('rwseen',now);
    fresh.forEach(k=>{const s=SKINS.find(x=>x[0]===k);UI.toast({kind:'success',title:'Nieuwe stijl vrijgespeeld: '+(s?s[1]:k),body:'Kies hem met de stijlknop rechtsboven.'})})},
  bar(){const r=this.get(),R=rankOf(r.xp),p=R.next?Math.min(100,((r.xp-R.min)/(R.next-R.min))*100):100;
    return `<div class="rwbar"><div class="rwtop"><b>Handelsrang ${R.n}: <span>${R.name}</span></b><span>${R.next?`${nlN(r.xp,0)} van ${nlN(R.next,0)} xp`:`${nlN(r.xp,0)} xp, hoogste rang`}</span></div><div class="rwtrack" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p)}" aria-label="Voortgang naar de volgende rang"><i style="width:${p.toFixed(1)}%"></i></div>
      <small>Je verdient xp met elke transactie (10), elke dag dat je handelt (25) en met je omzet. Zo speel je nieuwe stijlen vrij.</small></div>`}
};
const lockMark=root=>{$$('.skinopt',root).forEach(b=>{const k=b.dataset.skin||b.dataset.skinset;if(!k||!UNLOCKS[k])return;const open=REW.open(k)||k===Skin.cur();
  b.classList.toggle('locked',!open);b.querySelector('.lockinfo')?.remove();if(open){b.removeAttribute('aria-disabled');return}
  b.setAttribute('aria-disabled','true');const sm=b.querySelector('small');sm&&sm.insertAdjacentHTML('afterend',`<small class="lockinfo">${ico('lock')}${esc(UNLOCKS[k].txt)} (${Math.round(REW.prog(k)*100)}%)</small>`)})};
{const os=Skin.set.bind(Skin);Skin.set=function(k){if(UNLOCKS[k]&&!REW.open(k)&&k!==this.cur()){UI.toast({title:'Nog niet vrijgespeeld',body:UNLOCKS[k].txt+' om deze stijl te gebruiken.'});return}return os(k)}}
{const om=Skin.menu.bind(Skin);Skin.menu=function(btn){om(btn);const m=$('#skinmenu');if(!m)return;lockMark(m);const r=REW.get(),R=rankOf(r.xp);
  m.querySelector('h3')?.insertAdjacentHTML('afterend',`<a class="rwline" href="#vrienden">${ico('trophy')}<span><b>Rang ${R.n}: <span>${R.name}</span></b><small>${R.next?`${nlN(r.xp,0)} / ${nlN(R.next,0)} xp`:'Hoogste rang'}</small></span></a>`);
  m.querySelector('.rwline').onclick=()=>m.remove()}}
{const im=Pages.instellingen.mount;Pages.instellingen.mount=function(el,arg){im.call(this,el,arg);const row=$('.skinrow',el);if(row){row.insertAdjacentHTML('beforebegin',REW.bar());lockMark(el)}}}
{const oo=PT.order.bind(PT);PT.order=async function(b){const r=await oo(b);setTimeout(()=>REW.load(),600);return r}}
setTimeout(()=>REW.load(),2500);

/* ---------- vrienden en chat ---------- */
const ava=(f,cls='')=>{const R=rankOf(f.xp||0);const ring=R.n>=7?'r3':R.n>=5?'r2':R.n>=3?'r1':'';const ch=((f.name||f.username||'?').trim()[0]||'?').toUpperCase();
  return `<span class="ava ${ring} ${cls}" title="Rang ${R.n}: ${R.name}" aria-hidden="true">${esc(ch)}</span>`};
const SOC={d:null,u:null,msgs:[],more:false,t:null,lt:0,
  badge(n){$$('#nav a[data-p=vrienden],#tabbar a[data-p=vrienden]').forEach(a=>{let b=a.querySelector('.nbadge');if(!b){b=document.createElement('span');b.className='nbadge';a.appendChild(b)}b.textContent=n>99?'99+':String(n);b.hidden=!n})},
  async unread(){if(!Api.authed)return;try{const r=await Api.call('/api/social/unread');this.badge((r.n||0)+(r.req||0))}catch(e){}},
  stop(){clearInterval(this.t);this.t=null}
};
setTimeout(()=>SOC.unread(),3500);
setInterval(()=>{if(document.visibilityState==='visible'&&UI.cur!=='vrienden')SOC.unread()},45e3);

const linkify=s=>s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
const msgHTML=m=>{const tm=`<time>${hhmm(m.t)}${m.me&&m.read?' · gelezen':''}</time>`;
  if(m.kind==='transfer'){const d=m.data||{};return `<div class="msg tf${m.me?' me':''}" data-mid="${m.id}"><div class="tfc"><span class="tfi">${ico('send')}</span><div><small>${m.me?'Je stuurde':'Je ontving'}</small><b>${eur2(d.eur)}</b><span>${qtyFmt(d.qty)} ${esc(d.sym)} tegen ${eur(d.price)}</span>${m.text?`<p data-noi18n>${linkify(esc(m.text))}</p>`:''}<em>Oefengeld</em></div></div>${tm}</div>`}
  return `<div class="msg${m.me?' me':''}" data-mid="${m.id}"><p data-noi18n>${linkify(esc(m.text))}</p>${tm}</div>`};
const msgsHTML=L=>{let day='',out='';for(const m of L){const d=dmy(m.t);if(d!==day){day=d;out+=`<div class="mday"><span>${d}</span></div>`}out+=msgHTML(m)}return out};

Pages.vrienden={
  title:a=>a?'@'+a:'Vrienden',
  html(arg){return `<div class="phead"><div><h1>Vrienden</h1><p>Voeg vrienden toe op gebruikersnaam, chat met elkaar en stuur elkaar crypto.</p></div></div><div id="soc" class="soc${arg?' inchat':''}"><div class="card"><p class="muted">Laden…</p></div></div>`},
  async mount(el,arg){SOC.stop();const box=$('#soc',el);
    if(!Api.authed){box.innerHTML=`<div class="card soce"><h2>Log in om vrienden toe te voegen</h2><p class="muted">Met een account kun je vrienden zoeken op gebruikersnaam, chatten en crypto naar elkaar sturen.</p></div>`;return}
    REW.load();let d;try{d=SOC.d=await Api.call('/api/social')}catch(e){box.innerHTML=`<div class="card"><p>Vrienden laden lukt nu niet: ${esc(e.message)}</p></div>`;return}
    if(UI.el!==el)return;
    if(!d.me.username)return this.pickName(box);
    box.innerHTML=`<aside class="socl">${this.meCard(d)}${this.addCard()}<div id="socreq">${this.reqHTML(d)}</div><div class="card flush"><div class="chead"><h2>Vrienden</h2><span class="muted">${d.friends.length}</span></div><div id="soclist">${this.listHTML(d,arg)}</div></div></aside><section class="socc" id="socc">${arg?'':this.emptyChat(d)}</section>`;
    this.bindList(el,box);
    SOC.badge(d.friends.reduce((a,f)=>a+(f.unread||0),0)+d.incoming.length);
    if(arg)this.openChat(el,arg);
    else SOC.t=setInterval(()=>{if(UI.cur!=='vrienden'||UI.arg){SOC.stop();return}if(document.visibilityState==='visible')this.refreshList(el)},20e3)},
  meCard(d){const r=REW.get();return `<div class="card socme">${ava({name:d.me.name,username:d.me.username,xp:r.xp},'lg')}<div><b>${esc(d.me.name||d.me.username)} ${staffBadge(d.me.role)}</b><span class="muted">@${esc(d.me.username)}</span><button class="lnk" data-act="rename">Gebruikersnaam wijzigen</button></div>${REW.bar()}</div>`},
  addCard(){return `<div class="card socadd"><label for="socq"><b>Vriend toevoegen</b></label><div class="socin"><span>@</span><input id="socq" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="gebruikersnaam" maxlength="21"></div><div id="socres" aria-live="polite"></div></div>`},
  reqHTML(d){const inc=d.incoming.map(f=>`<div class="srq">${ava(f)}<span><b>${esc(f.name||f.username)}</b><small>@${esc(f.username)} wil je toevoegen</small></span><button class="btn sm" data-acc="${esc(f.username)}">Accepteren</button><button class="btn ghost sm" data-dec="${esc(f.username)}" aria-label="Weigeren">${ico('x')}</button></div>`).join('');
    const out=d.outgoing.map(f=>`<div class="srq">${ava(f)}<span><b>${esc(f.name||f.username)}</b><small>@${esc(f.username)}: verzoek verstuurd</small></span><button class="btn ghost sm" data-dec="${esc(f.username)}" data-cancel="1">Intrekken</button></div>`).join('');
    return inc||out?`<div class="card"><div class="chead"><h2>Verzoeken</h2>${d.incoming.length?`<span class="pill">${d.incoming.length} nieuw</span>`:''}</div>${inc}${out}</div>`:''},
  listHTML(d,arg){if(!d.friends.length)return `<p class="muted socnone">Nog geen vrienden. Zoek hierboven op gebruikersnaam om iemand toe te voegen.</p>`;
    return d.friends.map(f=>{const R=rankOf(f.xp),l=f.last;const prev=l?(l.kind==='transfer'?`${l.mine?'Je stuurde':'Ontvangen:'} ${l.data?eur2(l.data.eur)+' aan '+esc(l.data.sym):'crypto'}`:`${l.mine?'<span>Jij:</span> ':''}<span data-noi18n>${esc(l.text||'')}</span>`):`Rang ${R.n}: <span>${R.name}</span>`;
      return `<a class="sfr${arg===f.username?' on':''}" href="#vrienden-${esc(f.username)}">${ava(f)}<span><b>${esc(f.name||f.username)} ${staffBadge(f.role)}</b><small>${prev}</small></span><span class="sfm">${l?`<time>${Date.now()-l.t<864e5?hhmm(l.t):dmy(l.t)}</time>`:''}${f.unread?`<i class="nbadge">${f.unread}</i>`:''}</span></a>`}).join('')},
  emptyChat(d){return `<div class="card soce">${ico('users')}<h2>${d.friends.length?'Kies een vriend om te chatten':'Voeg je eerste vriend toe'}</h2><p class="muted">${d.friends.length?'In de chat kun je ook crypto sturen. Tot de officiële lancering gaat dat met je oefengeld.':'Deel je gebruikersnaam @'+esc(d.me.username)+' met vrienden, of zoek hen links op hun gebruikersnaam.'}</p></div>`},
  async refreshList(el){try{const d=SOC.d=await Api.call('/api/social');if(UI.el!==el)return;const L=$('#soclist',el);if(L)L.innerHTML=this.listHTML(d,UI.arg);const rq=$('#socreq',el);if(rq)rq.innerHTML=this.reqHTML(d);SOC.badge(d.friends.reduce((a,f)=>a+(f.unread||0),0)+d.incoming.length)}catch(e){}},
  bindList(el,box){
    const q=$('#socq',el),res=$('#socres',el);let tm=null,seq=0;
    q.addEventListener('input',()=>{clearTimeout(tm);const v=q.value.trim().toLowerCase().replace(/^@/,'');if(v.length<2){res.innerHTML='';return}
      tm=setTimeout(async()=>{const my=++seq;try{const r=await Api.call('/api/social/search?q='+encodeURIComponent(v));if(my!==seq)return;
        res.innerHTML=r.results.length?r.results.map(u=>`<div class="srq">${ava(u)}<span><b>${esc(u.name||u.username)} ${staffBadge(u.role)}</b><small>@${esc(u.username)}</small></span>${u.status==='friend'?`<a class="btn ghost sm" href="#vrienden-${esc(u.username)}">Chat</a>`:u.status==='sent'?'<span class="muted sm">Verstuurd</span>':u.status==='received'?`<button class="btn sm" data-acc="${esc(u.username)}">Accepteren</button>`:`<button class="btn sm" data-add="${esc(u.username)}">${ico('useradd')}Toevoegen</button>`}</div>`).join(''):`<p class="muted sm">Geen gebruiker gevonden die begint met @${esc(v)}.</p>`}catch(e){res.innerHTML=`<p class="muted sm">${esc(e.message)}</p>`}},250)});
    box.addEventListener('click',async e=>{const b=e.target.closest('[data-add],[data-acc],[data-dec],[data-act=rename]');if(!b)return;
      if(b.dataset.act==='rename')return this.pickName($('#socc',el)||box,true);
      b.disabled=true;try{
        if(b.dataset.add){const r=await Api.call('/api/social/request',{method:'POST',body:{username:b.dataset.add}});UI.toast({kind:'success',title:r.status==='friend'?`Je bent nu bevriend met @${b.dataset.add}`:`Verzoek verstuurd naar @${b.dataset.add}`});q.value='';res.innerHTML=''}
        else if(b.dataset.acc){await Api.call('/api/social/respond',{method:'POST',body:{username:b.dataset.acc,accept:true}});UI.toast({kind:'success',title:`Je bent nu bevriend met @${b.dataset.acc}`});q.value='';res.innerHTML=''}
        else if(b.dataset.dec){if(b.dataset.cancel)await Api.call('/api/social/remove',{method:'POST',body:{username:b.dataset.dec}});else await Api.call('/api/social/respond',{method:'POST',body:{username:b.dataset.dec,accept:false}})}
        await this.refreshList(el)}catch(x){UI.toast({title:'Dat lukte niet',body:x.message});b.disabled=false}})},
  pickName(box,change){const d=SOC.d||{me:{}};const sug=String(d.me.username||d.me.name||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9_.]/g,'').slice(0,20);
    box.innerHTML=`<div class="card soce socname"><h2>${change?'Gebruikersnaam wijzigen':'Kies je gebruikersnaam'}</h2><p class="muted">Vrienden vinden je op deze naam. Gebruik 3 tot 20 tekens: kleine letters, cijfers, een punt of een liggend streepje.</p>
      <form id="unf"><div class="socin"><span>@</span><input name="u" required minlength="3" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(sug)}" aria-label="Gebruikersnaam"></div><p class="err" id="unerr" role="alert"></p><div class="row"><button class="btn">${change?'Opslaan':'Gebruikersnaam opslaan'}</button>${change?'<a class="btn ghost" href="#vrienden">Annuleren</a>':''}</div></form></div>`;
    const f=$('#unf',box);f.u.focus();f.onsubmit=async e=>{e.preventDefault();const bt=f.querySelector('button');bt.disabled=true;
      try{const r=await Api.call('/api/social/username',{method:'POST',body:{username:f.u.value}});if(Api.user){Api.user.username=r.username;LS.set('srvuser',Api.user)}UI.toast({kind:'success',title:`Je gebruikersnaam is @${r.username}`});
        if(change&&location.hash!=='#vrienden')location.hash='#vrienden';else UI.route()}catch(x){$('#unerr',box).textContent=x.message;bt.disabled=false}}},

  /* chat met één vriend */
  async openChat(el,u){const c=$('#socc',el);c.innerHTML=`<div class="card chat"><p class="muted">Chat laden…</p></div>`;let r;
    try{r=await Api.call('/api/social/chat?u='+encodeURIComponent(u))}catch(e){c.innerHTML=`<div class="card soce"><h2>Deze chat is niet beschikbaar</h2><p class="muted">${esc(e.message)}</p><a class="btn ghost" href="#vrienden">${ico('back')}Terug naar vrienden</a></div>`;return}
    if(UI.el!==el)return;SOC.u=u;SOC.msgs=r.messages;SOC.more=r.more;const f=r.friend,R=rankOf(f.xp||0);
    c.innerHTML=`<div class="card chat"><div class="chh"><a class="btn ghost sm chback" href="#vrienden" aria-label="Terug naar vrienden">${ico('back')}</a>${ava(f)}<span><b>${esc(f.name||f.username)} ${staffBadge(f.role)}</b><small>@${esc(f.username)}<span> · rang ${R.n}: </span><span>${R.name}</span></small></span><button class="btn ghost sm" data-act="unfriend">Verwijderen</button></div>
      <div class="chm" id="chm" aria-live="polite">${SOC.more?'<button class="lnk chmore" data-act="more">Oudere berichten laden</button>':''}${SOC.msgs.length?msgsHTML(SOC.msgs):`<p class="muted chnone">Nog geen berichten. Zeg hallo of stuur @${esc(f.username)} wat crypto.</p>`}</div>
      <form class="chf" id="chf"><button type="button" class="btn ghost chsend" data-act="send" title="Crypto sturen" aria-label="Crypto sturen">${ico('send')}<span>Crypto</span></button><textarea name="t" rows="1" maxlength="1000" placeholder="Bericht aan @${esc(f.username)}" aria-label="Bericht"></textarea><button class="btn" aria-label="Versturen">Versturen</button></form></div>`;
    const m=$('#chm',c),fm=$('#chf',c),ta=fm.t;const down=()=>{m.scrollTop=m.scrollHeight};down();
    ta.addEventListener('input',()=>{ta.style.height='auto';ta.style.height=Math.min(140,ta.scrollHeight)+'px'});
    ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();fm.requestSubmit()}});
    const add=msg=>{if(SOC.msgs.some(x=>x.id===msg.id))return;SOC.msgs.push(msg);m.querySelector('.chnone')?.remove();const last=SOC.msgs[SOC.msgs.length-2];const sep=!last||dmy(last.t)!==dmy(msg.t)?`<div class="mday"><span>${dmy(msg.t)}</span></div>`:'';
      const atEnd=m.scrollHeight-m.scrollTop-m.clientHeight<80;m.insertAdjacentHTML('beforeend',sep+msgHTML(msg));if(atEnd||msg.me)down()};
    fm.onsubmit=async e=>{e.preventDefault();const t=ta.value.trim();if(!t)return;ta.value='';ta.style.height='auto';
      try{const r=await Api.call('/api/social/chat',{method:'POST',body:{u,text:t}});add(r.message)}catch(x){ta.value=t;UI.toast({title:'Bericht niet verstuurd',body:x.message})}};
    c.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;
      if(b.dataset.act==='send')this.sendDlg(u,f,add);
      if(b.dataset.act==='more'){b.disabled=true;try{const r=await Api.call(`/api/social/chat?u=${encodeURIComponent(u)}&before=${SOC.msgs[0].id}`);const h=m.scrollHeight;SOC.msgs=r.messages.concat(SOC.msgs);SOC.more=r.more;m.innerHTML=(SOC.more?'<button class="lnk chmore" data-act="more">Oudere berichten laden</button>':'')+msgsHTML(SOC.msgs);m.scrollTop=m.scrollHeight-h}catch(x){b.disabled=false}}
      if(b.dataset.act==='unfriend')dlg(`<h2>@${esc(u)} verwijderen?</h2><p class="muted">Jullie zijn dan geen vrienden meer en kunnen niet meer chatten. De berichten blijven bewaard als jullie elkaar later opnieuw toevoegen.</p><div class="row" style="margin-top:14px"><button class="btn" id="unok">Verwijderen</button><button class="btn ghost" id="unno">Annuleren</button></div>`,card=>{
        $('#unno',card).onclick=closeOverlay;$('#unok',card).onclick=async()=>{try{await Api.call('/api/social/remove',{method:'POST',body:{username:u}});closeOverlay();UI.toast({title:`@${u} is verwijderd uit je vrienden`});location.hash='#vrienden'}catch(x){UI.toast({title:'Dat lukte niet',body:x.message})}}})});
    this.refreshList(el);
    SOC.t=setInterval(async()=>{if(UI.cur!=='vrienden'||UI.arg!==u){SOC.stop();return}if(document.visibilityState!=='visible')return;
      const last=SOC.msgs.length?SOC.msgs[SOC.msgs.length-1].id:0;try{const r=await Api.call(`/api/social/chat?u=${encodeURIComponent(u)}&after=${last}`);r.messages.forEach(add);if(r.messages.some(x=>!x.me))this.refreshList(el)}catch(x){}},4000)},

  /* crypto sturen vanuit de chat */
  async sendDlg(u,f,add){dlg(`<h2>Crypto sturen naar @${esc(u)}</h2><p class="muted">Laden…</p>`);let P;try{P=await PT.load()}catch(e){}
    const H=Object.entries((P&&P.holdings)||{}).filter(([s,h])=>(h.k||'crypto')==='crypto'&&h.qty>0).map(([s,h])=>{const q=PT.px(s,'crypto');return {s,qty:h.qty,p:q&&q.p,v:q&&q.p?q.p*h.qty:null}}).sort((a,b)=>(b.v||0)-(a.v||0));
    if(!H.length){dlg(`<h2>Crypto sturen naar @${esc(u)}</h2><p class="muted">Je hebt nog geen crypto in je portefeuille. Koop eerst iets via Handelen, dan kun je het hier naar een vriend sturen.</p><div class="row" style="margin-top:14px"><a class="btn" href="#handel" id="sdgo">Naar Handelen</a><button class="btn ghost" id="sdno">Sluiten</button></div>`,c=>{$('#sdno',c).onclick=closeOverlay;$('#sdgo',c).onclick=closeOverlay});return}
    dlg(`<h2>Crypto sturen naar @${esc(u)}</h2><p class="muted sm">Tot de officiële lancering verstuur je oefengeld. Het bedrag gaat direct van jouw portefeuille naar die van @${esc(u)}, tegen de actuele koers en zonder kosten.</p>
      <form id="sdf" class="sdf"><label>Wat stuur je?<select name="sym">${H.map(h=>`<option value="${esc(h.s)}">${esc(h.s)}: ${qtyFmt(h.qty)} (${h.v!=null?eur2(h.v):'koers onbekend'})</option>`).join('')}</select></label>
      <label>Bedrag in euro<div class="sdamt"><input name="eur" inputmode="decimal" autocomplete="off" placeholder="0,00" required><button type="button" class="btn ghost sm" id="sdall">Alles</button></div></label>
      <p class="sdprev" id="sdprev" aria-live="polite"></p><label>Bericht (optioneel)<input name="note" maxlength="140" placeholder="Bijvoorbeeld: voor de pizza"></label>
      <p class="err" id="sderr" role="alert"></p><div class="row"><button class="btn" id="sdok">${ico('send')}Versturen</button><button type="button" class="btn ghost" id="sdno">Annuleren</button></div></form>`,c=>{
      const fm=$('#sdf',c),pv=$('#sdprev',c);let all=false;const cur=()=>H.find(h=>h.s===fm.sym.value);
      const upd=()=>{const h=cur(),v=parseFloat(String(fm.eur.value).replace(/\./g,'').replace(',','.'));if(all&&h){pv.textContent=`Je stuurt al je ${h.s}: ${qtyFmt(h.qty)} ${h.s}${h.v!=null?' ('+eur2(h.v)+')':''}.`;return}
        if(!h||!h.p||!(v>0)){pv.textContent=h&&h.p?`Koers ${h.s}: ${eur(h.p)}`:'';return}const q=v/h.p;pv.textContent=q>h.qty*(1+1e-6)?`Je hebt maar ${qtyFmt(h.qty)} ${h.s} (${eur2(h.v)}).`:`≈ ${qtyFmt(q)} ${h.s} tegen ${eur(h.p)}`};
      fm.eur.addEventListener('input',()=>{all=false;upd()});fm.sym.addEventListener('change',()=>{all=false;fm.eur.value='';upd()});upd();
      $('#sdall',c).onclick=()=>{const h=cur();all=true;fm.eur.value=h&&h.v!=null?nlN(h.v,2):'';upd()};$('#sdno',c).onclick=closeOverlay;
      fm.onsubmit=async e=>{e.preventDefault();const bt=$('#sdok',c);bt.disabled=true;$('#sderr',c).textContent='';const v=parseFloat(String(fm.eur.value).replace(/\./g,'').replace(',','.'));
        try{const r=await Api.call('/api/social/send',{method:'POST',body:{u,sym:fm.sym.value,eur:all?null:v,all,note:fm.note.value.trim()||null}});closeOverlay();add(r.message);PT.load();
          UI.toast({kind:'success',title:`${eur2(r.message.data.eur)} aan ${r.message.data.sym} gestuurd naar @${u}`})}catch(x){$('#sderr',c).textContent=x.message;bt.disabled=false}}})}
};

/* terugkeer na Discord-koppeling */
{const q=new URLSearchParams(location.search).get('discord');if(q){const M={ok:['success','Discord gekoppeld','Je bent lid van de Vantis-server en krijgt je meldingen nu ook als privébericht.'],cancelled:['info','Koppelen geannuleerd','Je kunt Discord later alsnog koppelen bij Instellingen.'],expired:['error','Koppelen duurde te lang','Probeer het opnieuw bij Instellingen → Discord.'],error:['error','Discord koppelen is niet gelukt','Probeer het opnieuw. Lukt het niet, laat het ons weten.']};
  const m=M[q]||M.error;history.replaceState(null,'',location.pathname+location.hash);setTimeout(()=>UI.toast({kind:m[0],title:m[1],body:m[2]}),1200)}}

/* ---------- abonnementen: Gratis, Plus, Pro, Elite ---------- */
const TIERN={free:'Gratis',premium:'Plus',plus:'Plus',pro:'Pro',elite:'Elite',ultimate:'Ultimate',black:'Vantis Black'};
const tierRank=p=>({premium:1,plus:1,pro:2,elite:3,ultimate:4,black:5})[p]||0;
const tierKey=p=>p==='premium'?'plus':(TIERN[p]?p:'free');
const enforced=()=>!!(((Api.h&&Api.h.features)||Api.features||{}).premiumEnforced);
const canTier=n=>!!(Api.user&&Api.user.admin)||!enforced()||tierRank(Api.user&&Api.user.plan)>=n;
const tierWall=(n,title,body)=>dlg(`<h2>${esc(title)}</h2><p class="muted">${esc(body)}</p><div class="row" style="display:flex;gap:8px;margin-top:14px"><a class="btn" href="#premium" id="twgo">Bekijk ${TIERN[['free','plus','pro','elite'][n]]}</a><button class="btn ghost" id="twno">Sluiten</button></div>`,c=>{$('#twno',c).onclick=closeOverlay;$('#twgo',c).onclick=closeOverlay});
Object.assign(PLANF,{
  free:['Live koersen, grafieken en nieuws','Oefenhandel met € 10.000','Vrienden, chat en crypto sturen','Koersalerts in de app','De Vantis-community op Discord'],
  plus:['Alles van Gratis','De volledige Vantis Academy: alle leerpaden en lessen','Pushmeldingen 24/7 en meldingen via Discord','Ochtendbriefing, nieuws op trefwoord en weekoverzicht per e-mail','Plus-rol in de Discord-server'],
  pro:['Alles van Plus','Certificaten bij afgeronde leerpaden','Indicator-alerts (zoals RSI) en eigen scanners','Volledige Impact, Event Radar en Marktdata','Track record, backtest en "Wat als"','Pro-kanalen in Discord'],
  elite:['Alles van Pro','Elke maand een live sessie in Discord','Elite-kanaal in Discord','Vroege toegang tot nieuwe functies','Voorrang bij support'],
  ultimate:['Alles van Elite','Elke maand een 1-op-1 sessie met een coach','Ultimate-lounge in Discord','Vantis AI: 5× zoveel vragen per dag','Alle stijlen direct vrijgespeeld','Als eerste nieuwe functies testen'],
  black:['Alles van Ultimate','Onbeperkt Vantis AI','Vantis Black-rol in Discord']});
Pages.premium.html=()=>`<div class="phead"><div><h1>Abonnementen</h1><p>Leer traden met de Vantis Academy vanaf Plus, haal certificaten met Pro, krijg begeleiding met Elite en 1-op-1 coaching met Ultimate. Probeer een betaald abonnement eerst een week gratis; je kunt altijd opzeggen.</p></div></div><div id="prbody">${waitBox()}</div>
  <p class="disc">Abonnementen lopen via Stripe. Opzeggen kan op elk moment via "Abonnement beheren". Vantis geeft geen financieel advies.</p>`;
Pages.premium.title=()=>'Abonnementen';
Pages.premium.live=function(el,arg,kind){if(kind!=='calc'||!PRF.plans)return;const P=PRF.plans;const cur=tierKey(Api.user&&Api.user.plan);const per=PRF.period;
  const plan=t=>(P.plans||[]).find(x=>x.tier===t&&x.period===per)||(P.plans||[]).find(x=>x.tier===t&&x.period==='month');
  const card=(t,hl)=>{const pl=plan(t);const lab=t==='free'?'€ 0':(pl&&pl.label)||'';const m=lab.match(/^(€\s?[\d.,]+)\s*(.*)$/);const price=m?`${esc(m[1])}<small>${esc(m[2]||'altijd gratis')}</small>`:esc(lab);return `<div class="plan ${hl?'hl':''} ${cur===t?'cur':''}">${hl?'<span class="pbadge">Meest gekozen</span>':''}<h3>${TIERN[t]}</h3><div class="pprice">${price}</div><ul>${PLANF[t].map(f=>`<li>${ico('check')}${esc(f)}</li>`).join('')}</ul>
    ${cur===t?`<div class="tag up" style="justify-self:start">Je huidige abonnement</div>${t!=='free'?'<button class="btn ghost" id="prportal">Abonnement beheren</button>':''}`:t==='free'?'':P.ready&&pl&&pl.available?`<button class="btn ${hl?'':'ghost'}" data-buy="${pl.id}">${P.trialDays&&cur==='free'?`Probeer ${P.trialDays} dagen gratis`:'Kies '+TIERN[t]}</button>`:'<button class="btn ghost" disabled>Binnenkort beschikbaar</button>'}</div>`};
  $('#prbody',el).innerHTML=`<div class="seg" style="margin-bottom:16px"><button data-per="month" class="${per==='month'?'on':''}">Per maand</button><button data-per="year" class="${per==='year'?'on':''}">Per jaar</button></div>
    <div class="plans plans5">${card('free')}${card('plus',true)}${card('pro')}${card('elite')}${card('ultimate')}</div>
    <div class="blackcard ${cur==='black'?'cur':''}"><div><span class="bkmark">VANTIS BLACK</span><p>Alleen voor het Vantis-team. Niet te koop.</p></div><ul>${PLANF.black.map(f=>`<li>${ico('check')}${esc(f)}</li>`).join('')}</ul>${cur==='black'?'<span class="tag up">Jouw abonnement</span>':''}</div>
    ${!P.ready?`<p class="note" style="margin-top:12px">Betalen wordt nog gekoppeld. Tot die tijd kun je alles gebruiken.</p>`:''}`};
{const i=NAV.findIndex(n=>n[0]==='premium');if(i>=0)NAV[i]=['premium','Abonnementen','gem']}

/* Academy vanaf Plus, certificaten vanaf Pro */
{const lh=Pages.leren.html;Pages.leren.html=function(arg){if(!canTier(1))return this.wallHTML();let h=lh.call(this,arg);
    if(!canTier(2))h=h.replace(/Download je certificaat als afbeelding\./g,'Certificaten zitten in Pro.');return h};
  Pages.leren.wallHTML=function(){return `<div class="phead"><div><h1>Vantis Academy</h1><p>Leer stap voor stap traden: van je eerste aankoop tot risicobeheer, grafieken lezen en macro. De Academy zit in Plus, Pro en Elite.</p></div></div>
    <div class="card acwall"><div><h2>Ontgrendel de Academy met Plus</h2><p class="muted">${AC_PATHS.length} leerpaden met ${AC_PATHS.reduce((a,p)=>a+p.L.length,0)} lessen, oefeningen met echte koersen en opdrachten in de app. Met Pro haal je ook certificaten.</p><a class="btn" href="#premium">Bekijk Plus</a></div></div>
    <div class="acwgrid">${AC_PATHS.map(p=>`<div class="card acwp"><span class="acwl">${ico('lock')}${esc(p.lvl||'')}</span><h3>${esc(p.t)}</h3><p class="muted">${esc(p.d||'')}</p><small class="faint">${p.L.length} lessen</small></div>`).join('')}</div>`};
  const lm=Pages.leren.mount;Pages.leren.mount=function(el,arg){if(!canTier(1))return;return lm.call(this,el,arg)}}
{const oc=acCert;acCert=function(p){if(!canTier(2))return tierWall(2,'Certificaten zitten in Pro','Je hebt dit leerpad afgerond. Met Pro download je er een certificaat van, en krijg je ook indicator-alerts, eigen scanners en de volledige marktdata.');return oc(p)}}

/* gebruikersnaam bij registratie: voorstel uit de naam en live beschikbaarheid */
{const u=$('#lguser'),st=$('#unst'),nm=$('#lgname');if(u&&st){let t=null,seq=0,touched=false;
  const norm=v=>v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9_.]/g,'').replace(/^[._]+|[._]+$/g,'').slice(0,20);
  const check=()=>{clearTimeout(t);const v=u.value.trim().toLowerCase().replace(/^@/,'');st.className='unst';if(!v){st.textContent='Vrienden vinden je op deze naam.';return}
    if(!/^[a-z0-9](?:[a-z0-9_.]{1,18})[a-z0-9]$/.test(v)){st.textContent='3 tot 20 tekens: kleine letters, cijfers, punt of liggend streepje.';st.classList.add('bad');return}
    if(!Api.on)return;st.textContent='Controleren…';t=setTimeout(async()=>{const my=++seq;try{const r=await Api.call('/api/auth/username?u='+encodeURIComponent(v));if(my!==seq)return;st.textContent=r.ok?`@${v} is beschikbaar`:r.error;st.classList.add(r.ok?'good':'bad')}catch(e){st.textContent=''}},350)};
  u.addEventListener('input',()=>{touched=true;check()});
  nm&&nm.addEventListener('input',()=>{if(touched&&u.value)return;u.value=norm(nm.value.replace(/\s+/g,'.'));check()})}}

/* ---------- staff-rollen ---------- */
const ROLEN={founder:'Founder',senior_partner:'Senior Partner',admin:'Admin',moderator:'Moderator',coach:'Coach',analist:'Analist',support:'Support'};
const staffBadge=r=>r&&ROLEN[r]?`<span class="sbadge sb-${r}">${ROLEN[r]}</span>`:'';
function roleSelect(u){const R=(ADM.roles||[]);const can=id=>!id||(R.find(x=>x.id===id)||{}).canGive;const cur=u.role||'';const me=Api.user||{};
  const locked=cur&&!can(cur);return `<select class="inp sm" data-urole="${esc(u.id)}" style="width:auto" ${locked?'disabled title="Je kunt deze rol niet wijzigen"':''}><option value="">Geen rol</option>${Object.entries(ROLEN).map(([k,n])=>`<option value="${k}" ${cur===k?'selected':''} ${can(k)||cur===k?'':'disabled'}>${n}</option>`).join('')}</select>`}
