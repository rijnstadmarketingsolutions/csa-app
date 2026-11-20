/* =====================================================================
   v5 ronde 1 — periodiek kopen, trailing stop, vergelijken met de markt,
   ranglijst, dagboek, wat-als-calculator en import uit Bitvavo
   ===================================================================== */
IC.calc='<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 7h8M8 11h2M12 11h2M16 11v6M8 15h2M12 15h2M8 18h6"/>';
IC.upload='<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>';IC.trophy='<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6v4H9z"/>';
IC.repeat='<path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2"/><path d="M20 4v5h-5M4 20v-5h5"/>';IC.book='<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-5a3 3 0 0 0-3 3"/><path d="M20 4v14h-6"/>';
NAV.splice(NAV.findIndex(n=>n[0]==='trackrecord'),0,['watals','Wat als…?','calc']);

/* lijngrafiek met meerdere reeksen op tijd: [{name,color,pts:[[t,v],…]}] */
function mlines(series,o={}){const all=series.flatMap(s=>s.pts.filter(p=>p[1]!=null));if(all.length<2)return `<div class="achart empty" style="height:${o.h||200}px">${o.empty||'Nog te weinig gegevens.'}</div>`;
  const W=600,H=o.h||220,t0=Math.min(...all.map(p=>p[0])),t1=Math.max(...all.map(p=>p[0]))||t0+1,mn=Math.min(...all.map(p=>p[1]),o.zero?0:Infinity),mx=Math.max(...all.map(p=>p[1]),o.zero?0:-Infinity),r=mx-mn||1,lo=mn-r*.1,hi=mx+r*.1;
  const X=t=>(t-t0)/((t1-t0)||1)*W,Y=v=>H-(v-lo)/(hi-lo)*H;
  const path=s=>s.pts.filter(p=>p[1]!=null).map((p,i)=>`${i?'L':'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(' ');
  return `<div class="achart mlc" style="height:${H}px"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${[.25,.5,.75].map(f=>`<line x1="0" x2="${W}" y1="${H*f}" y2="${H*f}" stroke="var(--line)" stroke-dasharray="3 5" vector-effect="non-scaling-stroke"/>`).join('')}
    ${o.zero&&lo<0&&hi>0?`<line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink3)" vector-effect="non-scaling-stroke"/>`:''}
    ${series.map((s,i)=>`<path d="${path(s)}" fill="none" stroke="${s.color}" stroke-width="${i===0?2.4:1.6}" ${s.dash?'stroke-dasharray="5 4"':''} vector-effect="non-scaling-stroke"/>`).join('')}</svg>
    <span class="alab" style="top:${(Y(mx)/H*100).toFixed(1)}%">${o.fmt?o.fmt(mx):mx}</span><span class="alab" style="top:${(Y(mn)/H*100).toFixed(1)}%">${o.fmt?o.fmt(mn):mn}</span>
    ${o.from?`<span class="axl l">${o.from}</span><span class="axl r">${o.to||'nu'}</span>`:''}</div>
    <div class="mlleg">${series.map(s=>{const l=s.pts.filter(p=>p[1]!=null).pop();return `<span><i style="background:${s.color}${s.dash?';opacity:.7':''}"></i>${esc(s.name)}${l&&o.fmtLast?` <b class="num ${o.cls?cls(l[1]):''}">${o.fmtLast(l[1])}</b>`:''}</span>`}).join('')}</div>`}

/* ---------- Handelen: extra kaarten ---------- */
const H5={bench:LS.get('h5bench',true),board:null,bt:'month',jf:'all'};
{const hh=Pages.handel.html,hm=Pages.handel.mount,hl=Pages.handel.live,hc=Pages.handel.chart;
  Pages.handel.html=function(){let h=hh.call(this);
    h=h.replace(`<div class="seg" id="hdrng">`,`<label class="mini-sw" title="Vergelijk met Bitcoin en de S&amp;P 500"><input type="checkbox" id="hdbench" ${H5.bench?'checked':''}> Vergelijk</label><div class="seg" id="hdrng">`);
    h=h.replace(`</div><aside class="hdside">`,`<div class="card flush" id="dcacard"><div class="chead" style="padding:18px 18px 0"><div><h2>${ico('repeat','class="h2i"')}Periodiek kopen</h2><div class="src">Elke dag, week of maand automatisch kopen met oefengeld</div></div></div><div id="hddca"></div></div>
      <div class="card flush"><div class="chead" style="padding:18px 18px 0"><div><h2>${ico('book','class="h2i"')}Dagboek</h2><div class="src">Je notities bij transacties, en hoe het daarna uitpakte</div></div><div class="chips" id="hdjf">${[['all','Alles'],['due','Terugblik klaar']].map(([k,l])=>`<button class="chip ${H5.jf===k?'on':''}" data-jf="${k}">${l}</button>`).join('')}</div></div><div id="hdjr"></div></div>
      </div><aside class="hdside">`);
    return h.replace(`</aside></div>`,`<div class="card"><div class="chead"><h2>${ico('trophy','class="h2i"')}Ranglijst</h2><div class="seg" id="hdbt"><button data-bt="month" class="${H5.bt==='month'?'on':''}">Deze maand</button><button data-bt="all" class="${H5.bt==='all'?'on':''}">Altijd</button></div></div><div id="hdbd"></div></div></aside></div>`)};
  Pages.handel.mount=async function(el,arg){
    $('#hdbench',el).onchange=e=>{H5.bench=e.target.checked;LS.set('h5bench',H5.bench);this.chart(el)};
    $('#hdbt',el).onclick=e=>{const b=e.target.closest('[data-bt]');if(!b)return;H5.bt=b.dataset.bt;$$('#hdbt button',el).forEach(x=>x.classList.toggle('on',x===b));boardHTML(el)};
    $('#hdjf',el).onclick=e=>{const b=e.target.closest('[data-jf]');if(!b)return;H5.jf=b.dataset.jf;$$('#hdjf .chip',el).forEach(x=>x.classList.toggle('on',x===b));journalHTML(el)};
    el.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;const d=t.dataset;
      try{if(d.dcadel){await dcaCall('DELETE',+d.dcadel);UI.toast({kind:'info',title:'Plan verwijderd'});this.live(el,null,'calc')}
        else if(d.dcatog){await dcaCall('PUT',+d.dcatog,{active:d.on!=='1'});this.live(el,null,'calc')}
        else if(d.jedit){journalEdit(el,d.jedit)}
        else if(d.act==='boardon'){boardJoin(el)}else if(d.act==='boardoff'){if(Api.authed){PT.P=await Api.call('/api/paper/board',{method:'POST',body:{on:false}});H5.board=null;boardHTML(el)}}}
      catch(x){UI.toast({kind:'error',title:'Niet gelukt',body:x.message})}});
    el.addEventListener('submit',async e=>{if(e.target.id!=='dcaform')return;e.preventDefault();const f=e.target;const sym=f.sym.value,a=getAsset(sym);
      try{const body={sym,kind:a?.kind||'crypto',eur:numIn(f.eur.value),every:f.every.value,start:f.start.value?new Date(f.start.value+'T09:00').getTime():null};await dcaCall('POST',null,body);
        UI.toast({kind:'success',title:`Plan gestart: ${eur2(body.eur)} ${sym} per ${({day:'dag',week:'week',month:'maand'})[body.every]}`,body:Api.authed?'De CSA-server koopt automatisch, ook als de app dicht is.':'Wordt uitgevoerd zolang de app open is.'});f.reset();this.live(el,null,'calc')}
      catch(x){UI.toast({kind:'error',title:'Plan niet gestart',body:x.message})}});
    await hm.call(this,el,arg);boardHTML(el)},
  Pages.handel.live=function(el,arg,kind){hl.call(this,el,arg,kind);if(!$('#hddca',el)||!PT.P)return;dcaHTML(el);journalHTML(el)};
  Pages.handel.chart=function(el){const P=PT.P;if(!P||!$('#hdch',el))return;if(!H5.bench)return hc.call(this,el);
    const c=pfCalc(P);const lim={'24u':DAY,'7d':7*DAY,'30d':30*DAY,all:Infinity}[HD.range];const H=(P.hist||[]).filter(x=>Date.now()-x.t<=lim);
    const pts=H.map(x=>[x.t,x.value]).concat([[Date.now(),c.tot]]);if(pts.length<3||pts[pts.length-1][0]-pts[0][0]<45*MIN)return hc.call(this,el);const v0=pts[0][1];
    const btcNow=S.crypto.get('BTC')?.price??P.bench?.btc;const spyNow=PT.px('SPY','stock')?.p??P.bench?.spy;
    const rel=(arr,now)=>{const f=arr.find(x=>x[1]!=null);return f?arr.concat(now!=null?[[Date.now(),now]]:[]).filter(x=>x[1]!=null).map(([t,v])=>[t,(v/f[1]-1)*100]):[]};
    const S1=[{name:'Jij',color:'var(--navy3)',pts:pts.map(([t,v])=>[t,(v/v0-1)*100])},{name:'Alles in Bitcoin',color:'#E08A00',dash:1,pts:rel(H.map(x=>[x.t,x.btc]),btcNow)},{name:'S&P 500',color:'#0A8754',dash:1,pts:rel(H.map(x=>[x.t,x.spy]),spyNow)}].filter(s=>s.pts.length>=2);
    const ch=c.tot-v0;$('#hdsub',el).innerHTML=`<span class="${cls(ch)}">${sgnEur(ch)} (${pct(v0?ch/v0*100:0)})</span> ${HD.range==='all'?'sinds start':'in deze periode'}`;
    $('#hdch',el).innerHTML=mlines(S1,{h:230,zero:1,fmt:v=>pct(v,1),fmtLast:v=>pct(v,1),cls:1,from:new Date(pts[0][0]).toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})})+(S1.length<3?`<p class="note" style="margin:8px 0 0">De vergelijking vult zich vanaf nu bij elk waardepunt.</p>`:'')};
}
async function dcaCall(method,id,body){if(!Api.authed){const P=PT.loc();P.dca=P.dca||[];
    if(method==='POST'){if(!(body.eur>=5))throw new Error('Minimaal € 5.');P.dca.unshift({id:Date.now(),sym:body.sym,kind:body.kind,eur:body.eur,every:body.every,next:body.start||Date.now(),active:1,created:Date.now(),runs:0})}
    if(method==='DELETE')P.dca=P.dca.filter(x=>x.id!==id);if(method==='PUT'){const d=P.dca.find(x=>x.id===id);if(d){d.active=body.active?1:0;if(d.active&&d.next<Date.now())d.next=Date.now()}}
    PT.save(P);return P}
  PT.P=await Api.call('/api/paper/dca'+(id?'/'+id:''),{method,body:body||{}});(PT.P.notes||[]).forEach(n=>UI.toast({kind:'info',title:'Let op',body:n}));return PT.P}
/* lokaal periodiek kopen (zonder account) */
setInterval(()=>{const P=PT.P;if(Api.authed||!P||!P.local||!P.dca)return;let ch=false;const STEP={day:DAY,week:7*DAY,month:30*DAY};
  for(const d of P.dca.filter(x=>x.active&&x.next<=Date.now())){const q=PT.px(d.sym,d.kind);if(!q)continue;try{const t=PT.exec(P,{sym:d.sym,kind:d.kind,side:'buy',eur:d.eur},q,'periodiek');d.runs++;d.last=Date.now();while(d.next<=Date.now())d.next+=STEP[d.every];ch=true;
    Alerts.push({id:'dca:'+d.id+':'+d.runs,cat:'order',href:'#handel',title:`Periodieke aankoop: ${d.sym} voor ${eur2(d.eur)}`,body:`${qtyFmt(t.qty)} ${d.sym} tegen ${eur(t.price)} · oefengeld`})}catch(e){d.active=0;d.note=e.message;ch=true}}
  if(ch){PT.save(P);if(UI.cur==='handel'&&UI.el)Pages.handel.live(UI.el,null,'calc')}},30000);
function dcaHTML(el){const P=PT.P;const L=P.dca||[];const ev={day:'per dag',week:'per week',month:'per maand'};
  const opts=[...assetChoices('').crypto.slice(0,40),...assetChoices('').stocks].map(a=>`<option value="${a.sym}">${esc(a.name)} (${a.sym})</option>`).join('');
  $('#hddca',el).innerHTML=(L.length?`<div class="tw"><table class="stack hdt"><thead><tr><th>Asset</th><th class="n">Bedrag</th><th>Volgende aankoop</th><th class="n">Gedaan</th><th></th></tr></thead><tbody>${L.map(d=>{const a=getAsset(d.sym);return `<tr style="cursor:default" class="${d.active?'':'off'}"><td data-l="Asset">${a?an(a):esc(d.sym)}</td><td class="n" data-l="Bedrag"><b>${eur2(d.eur)}</b><br><small class="faint">${ev[d.every]}</small></td>
    <td data-l="Volgende aankoop">${d.active?`${dmy(d.next)} ${hhmm(d.next)}`:`<span class="tag">Gepauzeerd</span>${d.note?`<br><small class="faint">${esc(d.note)}</small>`:''}`}</td><td class="n" data-l="Gedaan">${d.runs}× · ${eur2(d.runs*d.eur)}</td>
    <td class="acts" data-l="Acties"><button class="btn sm ghost" data-dcatog="${d.id}" data-on="${d.active?1:0}">${d.active?'Pauzeren':'Hervatten'}</button><button class="btn sm ghost" data-dcadel="${d.id}">Verwijderen</button></td></tr>`}).join('')}</tbody></table></div>`:'')+
  `<form id="dcaform" class="addform"><select class="inp" name="sym" aria-label="Asset" style="flex:2">${opts}</select><input class="inp" name="eur" placeholder="Bedrag €" required inputmode="decimal" aria-label="Bedrag" style="max-width:120px"><select class="inp" name="every" aria-label="Hoe vaak" style="max-width:130px"><option value="week">per week</option><option value="month">per maand</option><option value="day">per dag</option></select><input class="inp" type="date" name="start" aria-label="Startdatum (optioneel)" title="Startdatum (leeg = nu)" style="max-width:160px"><button class="btn">${ico('repeat')}Start plan</button></form>
  <p class="note" style="padding:0 18px 16px;margin:0">${Api.authed?'De CSA-server koopt automatisch op het gekozen moment, ook als de app dicht is. Is er te weinig saldo, dan wordt het plan gepauzeerd en krijg je een melding.':'Zonder account wordt er alleen gekocht als de app open is. Log in om het 24/7 te laten lopen.'}</p>`}
async function boardHTML(el){const b=$('#hdbd',el);if(!b)return;if(!Api.authed){b.innerHTML=`<div class="empty">Log in om mee te doen met de ranglijst en je resultaat te vergelijken met andere CSA-gebruikers.</div>`;return}
  try{H5.board=H5.board&&Date.now()-H5.board.t<60e3?H5.board:{...await Api.call('/api/board'),t:Date.now()}}catch(x){b.innerHTML=`<div class="callout warn">${esc(x.message)}</div>`;return}
  const L=H5.board[H5.bt]||[];const P=PT.P||{};const key=H5.bt==='month'?'month':'ret';
  b.innerHTML=(L.length?`<ol class="board">${L.slice(0,15).map((r,i)=>`<li class="${r.me?'me':''}"><span class="rk ${i<3?'top':''}">${i+1}</span><span class="nm"><b>${esc(r.nick)}</b>${r.me?' <small>(jij)</small>':''}<small>${r.pos} ${r.pos===1?'positie':'posities'}</small></span><b class="num ${cls(r[key])}">${pct(r[key],1)}</b></li>`).join('')}</ol>`:`<div class="empty">Nog niemand op de ranglijst. Doe als eerste mee!</div>`)+
    (P.board?`<div class="bfootr"><span>Je doet mee als <b>${esc(P.nick||'')}</b></span><button class="lnk" data-act="boardoff">Stoppen</button></div>`:`<div class="bfootr"><span>Alleen je schermnaam en rendement zijn zichtbaar, nooit je e-mail.</span><button class="btn sm" data-act="boardon">Doe mee</button></div>`)}
function boardJoin(el){dlg(`<h2>Meedoen met de ranglijst</h2><p class="muted">Kies een schermnaam. Andere gebruikers zien alleen deze naam, je rendement en het aantal posities.</p><div class="field"><label for="bnick">Schermnaam</label><input class="inp" id="bnick" maxlength="24" value="${esc(PT.P?.nick||(LS.get('user',{}).name||'').split(' ')[0])}"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="no">Annuleren</button><button class="btn" id="yes">Meedoen</button></div>`,c=>{$('#no',c).onclick=closeOverlay;$('#yes',c).onclick=async()=>{try{PT.P=await Api.call('/api/paper/board',{method:'POST',body:{on:true,nick:$('#bnick',c).value}});H5.board=null;closeOverlay();UI.toast({kind:'success',title:'Je staat op de ranglijst'});boardHTML(el)}catch(x){UI.toast({kind:'error',title:'Niet gelukt',body:x.message})}}})}
function journalHTML(el){const box=$('#hdjr',el);const P=PT.P;if(!box||!P)return;let L=(P.trades||[]).filter(t=>t.note);const due=t=>Date.now()-t.t>=30*DAY;if(H5.jf==='due')L=L.filter(due);
  box.innerHTML=L.length?L.slice(0,30).map(t=>{const q=PT.px(t.sym,t.kind);const ch=q?(q.p/t.price-1)*100:null;const good=ch==null?null:(t.side==='buy'?ch>=0:ch<=0);
    return `<div class="jr"><div class="jrh"><span class="otag ${t.side}">${t.side==='buy'?'Koop':'Verkoop'}</span><b>${esc(t.sym)}</b><span class="faint">${dmy(t.t)} · ${eur(t.price)}</span><button class="lnk" data-jedit="${t.id}">Bewerken</button></div><p>“${esc(t.note)}”</p>
      ${ch!=null?`<div class="jro ${good?'up':'down'}">${due(t)?'Terugblik na '+Math.round((Date.now()-t.t)/DAY)+' dagen':'Tot nu toe'}: koers ${pct(ch,1)} sinds je ${t.side==='buy'?'aankoop':'verkoop'} · ${good?'goed getimed':'nog niet goed uitgepakt'}</div>`:''}</div>`}).join(''):`<div style="padding:18px"><div class="empty">${H5.jf==='due'?'Nog geen notities van 30 dagen of ouder.':'Nog geen notities. Klik bij een order op <b>Notitie voor je dagboek</b> om op te schrijven waarom je koopt of verkoopt.'}</div></div>`;
  box.insertAdjacentHTML('beforeend',`<div class="jradd"><button class="lnk" data-jedit="new">+ Notitie bij een eerdere transactie</button></div>`)}
function journalEdit(el,id){const P=PT.P;const T=(P.trades||[]);const t=id==='new'?null:T.find(x=>String(x.id)===String(id));
  dlg(`<h2>${t?'Notitie bewerken':'Notitie toevoegen'}</h2>${t?`<p class="muted">${t.side==='buy'?'Koop':'Verkoop'} ${esc(t.sym)} · ${dmy(t.t)} · ${eur(t.price)}</p>`:`<div class="field"><label for="jt">Transactie</label><select class="inp" id="jt">${T.slice(0,60).map(x=>`<option value="${x.id}">${dmy(x.t)} · ${x.side==='buy'?'koop':'verkoop'} ${esc(x.sym)} · ${eur2(x.eur)}</option>`).join('')}</select></div>`}
    <div class="field"><label for="jn">Waarom?</label><textarea class="inp tknote2" id="jn" maxlength="280" rows="3">${esc(t?.note||'')}</textarea></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="no">Annuleren</button><button class="btn" id="yes">Bewaren</button></div>`,c=>{$('#no',c).onclick=closeOverlay;
    $('#yes',c).onclick=async()=>{const tid=t?t.id:$('#jt',c).value;const note=$('#jn',c).value.trim();try{if(Api.authed)PT.P=await Api.call('/api/paper/trades/'+tid,{method:'PUT',body:{note}});else{const P2=PT.loc();const x=P2.trades.find(y=>String(y.id)===String(tid));if(x)x.note=note||null;PT.save(P2)}closeOverlay();journalHTML(el)}catch(x){UI.toast({kind:'error',title:'Niet gelukt',body:x.message})}}})}

/* ---------- WAT ALS…? ---------- */
const WA={sym:'BTC',mode:'once',eur:'500',every:'month',from:'1y',res:null,busy:false};
const WAF={'1m':30,'3m':91,'6m':182,'1y':365,'2y':730,'3y':1095,'5y':1825};
async function waHistory(a){if(a.kind==='crypto'){const k='wah:'+a.sym;const c=WA[k];if(c&&Date.now()-c.t<HOUR)return c.d;const d=parseC(await bv(`/${a.market||a.sym+"-EUR"}/candles?interval=1d&limit=1440`)).map(x=>[x.t,x.c]);WA[k]={t:Date.now(),d};return d}
  const r=await Api.call('/api/history?sym='+a.sym);return r.d}
function waCompute(d,mode,amt,every,from){const pts=d.filter(x=>x[0]>=from);if(pts.length<2)return null;let units=0,inv=0;const out=[];let nextBuy=pts[0][0];const STEP=every==='week'?7*DAY:every==='day'?DAY:30.44*DAY;
  for(const [t,p] of pts){if(mode==='once'?inv===0:t>=nextBuy){units+=amt/p;inv+=amt;nextBuy+=STEP;if(mode!=='once')while(nextBuy<=t)nextBuy+=STEP}out.push([t,units*p,inv])}
  const last=out[out.length-1];return {out,inv,val:last[1],units,first:pts[0],lastP:pts[pts.length-1][1],buys:mode==='once'?1:Math.round(inv/amt)}}
Pages.watals={
  title:()=>'Wat als…?',
  html:()=>`<div class="phead"><div><h1>Wat als…?</h1><p>Wat was je inleg nu waard geweest als je eerder had gekocht, in één keer of elke week of maand? Gebaseerd op echte slotkoersen. Uitkomsten uit het verleden zeggen niets over de toekomst.</p></div></div>
    <div class="grid g2x"><div class="card"><div class="chead"><h2>Instellen</h2></div><div id="wabox"></div></div><div class="card"><div class="chead"><h2>Uitkomst</h2><span class="src" id="wasrc"></span></div><div id="wares">${waitBox('Kies links een asset en periode')}</div></div></div>
    <p class="disc">Rekenvoorbeeld met historische slotkoersen, zonder kosten, belasting of spread. Geen voorspelling en geen advies.</p>`,
  mount(el){this.form(el);this.run(el)},
  form(el){const opts=[...assetChoices('').crypto.slice(0,60),...assetChoices('').stocks].map(a=>`<option value="${a.sym}" ${a.sym===WA.sym?'selected':''}>${esc(a.name)} (${a.sym})${a.kind==='stock'?' · aandeel':''}</option>`).join('');
    $('#wabox',el).innerHTML=`<div class="field"><label for="wasym">Asset</label><select class="inp" id="wasym">${opts}</select></div>
      <div class="field"><label>Hoe</label><div class="seg tktype" id="wamode" style="grid-template-columns:1fr 1fr"><button data-m="once" class="${WA.mode==='once'?'on':''}">In één keer</button><button data-m="dca" class="${WA.mode==='dca'?'on':''}">Periodiek</button></div></div>
      <div class="field"><label for="waeur">${WA.mode==='once'?'Bedrag':'Bedrag per keer'}</label><div class="tkin"><span>€</span><input class="inp" id="waeur" inputmode="decimal" value="${esc(WA.eur)}"></div><div class="tkq">${[100,250,500,1000].map(v=>`<button data-v="${v}">€ ${v}</button>`).join('')}</div></div>
      ${WA.mode==='dca'?`<div class="field"><label for="waevery">Hoe vaak</label><select class="inp" id="waevery">${[['week','Elke week'],['month','Elke maand'],['day','Elke dag']].map(([k,l])=>`<option value="${k}" ${WA.every===k?'selected':''}>${l}</option>`).join('')}</select></div>`:''}
      <div class="field"><label>Vanaf</label><div class="tkq" id="wafrom">${Object.keys(WAF).map(k=>`<button data-f="${k}" class="${WA.from===k?'on':''}">${k.replace('m',' mnd').replace('y',' jaar')} geleden</button>`).join('')}</div></div>
      <button class="btn" id="wago" style="width:100%">${ico('calc')}Bereken</button>`;
    const re=()=>{this.form(el);this.run(el)};
    $('#wasym',el).onchange=e=>{WA.sym=e.target.value;this.run(el)};$('#wamode',el).onclick=e=>{const b=e.target.closest('[data-m]');if(b){WA.mode=b.dataset.m;re()}};
    $('#waeur',el).oninput=e=>{WA.eur=e.target.value};$('#waeur',el).onkeydown=e=>{if(e.key==='Enter')this.run(el)};
    $$('[data-v]',el).forEach(b=>b.onclick=()=>{WA.eur=b.dataset.v;re()});$('#wafrom',el).onclick=e=>{const b=e.target.closest('[data-f]');if(b){WA.from=b.dataset.f;re()}};
    $('#waevery',el)&&($('#waevery',el).onchange=e=>{WA.every=e.target.value;this.run(el)});$('#wago',el).onclick=()=>this.run(el)},
  async run(el){const a=getAsset(WA.sym);const box=$('#wares',el);const amt=numIn(WA.eur);if(!a||!(amt>0)){box.innerHTML='<div class="empty">Kies een asset en een bedrag.</div>';return}
    box.innerHTML=waitBox('Historie ophalen…');let d;try{d=await waHistory(a)}catch(x){box.innerHTML=`<div class="callout warn">Historie van ${esc(a.name)} kon niet worden geladen${a.kind==='stock'&&!Api.on?' (aandelen alleen in de online app)':''}: ${esc(x.message)}</div>`;return}
    const from=Date.now()-WAF[WA.from]*DAY;const r=waCompute(d,WA.mode,amt,WA.every,from);if(!r){box.innerHTML='<div class="empty">Voor deze periode is nog geen koershistorie.</div>';return}
    const btc=a.sym!=='BTC'&&a.kind==='crypto'?await waHistory(S.crypto.get('BTC')).then(x=>waCompute(x,WA.mode,amt,WA.every,from)).catch(()=>null):null;
    const start=r.out[0][0];const late=start>from+7*DAY;const res=r.val-r.inv;
    $('#wasrc',el).textContent=a.kind==='crypto'?'Bron: Bitvavo dagkoersen':'Bron: Yahoo Finance dagkoersen, omgerekend naar euro';
    box.innerHTML=`<div class="wak"><div><small>Ingelegd</small><b class="num">${eur2(r.inv)}</b><span class="faint">${r.buys}× ${eur2(amt)}</span></div><div><small>Nu waard</small><b class="num">${eur2(r.val)}</b><span class="num ${cls(res)}">${sgnEur(res)} (${pct(res/r.inv*100,1)})</span></div></div>
      ${late?`<p class="note">${esc(a.name)} heeft bij Bitvavo pas koersen vanaf ${new Date(start).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'})}; de berekening start daar.</p>`:''}
      ${mlines([{name:'Waarde',color:'var(--navy3)',pts:r.out.map(x=>[x[0],x[1]])},{name:'Ingelegd',color:'var(--ink3)',dash:1,pts:r.out.map(x=>[x[0],x[2]])},...(btc?[{name:'Zelfde in Bitcoin',color:'#E08A00',dash:1,pts:btc.out.map(x=>[x[0],x[1]])}]:[])],{h:240,fmt:v=>eur2(v),fmtLast:v=>eur2(v),from:new Date(start).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})})}
      <p class="lead" style="margin-top:14px">${WA.mode==='once'?`Als je ${new Date(start).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'})} voor ${eur2(amt)} ${esc(a.name)} had gekocht (koers ${eur(r.first[1])}), was dat nu ${eur2(r.val)} geweest.`:`Als je sinds ${new Date(start).toLocaleDateString('nl-NL',{month:'long',year:'numeric'})} ${({week:'elke week',month:'elke maand',day:'elke dag'})[WA.every]} ${eur2(amt)} ${esc(a.name)} had gekocht, had je nu ${qtyFmt(r.units)} ${esc(a.sym)} ter waarde van ${eur2(r.val)}.`}${btc?` Met Bitcoin was het ${eur2(btc.val)} geweest.`:''}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${WA.mode==='dca'?`<button class="btn" id="wadca">${ico('repeat')}Start dit plan met oefengeld</button>`:`<button class="btn gobuy" data-qbuy="${a.sym}">Koop ${esc(a.sym)} met oefengeld</button>`}</div>`;
    $('#wadca',el)&&($('#wadca',el).onclick=async()=>{try{await dcaCall('POST',null,{sym:a.sym,kind:a.kind,eur:amt,every:WA.every});UI.toast({kind:'success',title:'Plan gestart',body:`${eur2(amt)} ${a.sym} ${({week:'per week',month:'per maand',day:'per dag'})[WA.every]} met oefengeld.`,href:'#handel'})}catch(x){UI.toast({kind:'error',title:'Niet gelukt',body:x.message})}})}
};

/* ---------- IMPORT: Bitvavo-export of eigen CSV naar Mijn bezit ---------- */
function csvRows(text){const first=text.split(/\r?\n/).find(l=>l.trim())||'';const sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':first.includes('\t')?'\t':',';
  const rows=[];let row=[],f='',q=false;for(let i=0;i<text.length;i++){const ch=text[i];if(q){if(ch==='"'){if(text[i+1]==='"'){f+='"';i++}else q=false}else f+=ch}else if(ch==='"')q=true;else if(ch===sep){row.push(f);f=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(f);if(row.some(x=>x.trim()))rows.push(row);row=[];f=''}else f+=ch}
  row.push(f);if(row.some(x=>x.trim()))rows.push(row);return rows}
function parseImport(text){const R=csvRows(text);if(R.length<2)throw new Error('Het bestand bevat geen gegevens.');const H=R[0].map(h=>h.trim().toLowerCase());const col=re=>H.findIndex(h=>re.test(h));const n=v=>{if(v==null)return null;let s=String(v).trim().replace(/[€\s]/g,'');if(!s)return null;if(/,\d{1,8}$/.test(s)&&!/\.\d{1,8}$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'');const x=Number(s);return isFinite(x)?x:null};
  const cT=col(/^type$/),cC=col(/^currency$|^valuta$|^asset$/),cA=col(/^amount$|^aantal$|^hoeveelheid$/),cP=col(/quote price|^price|prijs|koers/),cE=col(/received.*paid amount|eur received|ontvangen.*betaald|^total|totaal/),cFC=col(/fee currency|kosten valuta/),cFA=col(/fee amount|^fee$|kosten bedrag|^kosten$/),cS=col(/^status$/);
  const pos={};
  if(cT>=0&&cC>=0&&cA>=0){ // Bitvavo-export (transacties)
    for(const r of R.slice(1)){const type=(r[cT]||'').trim().toLowerCase();const cur=(r[cC]||'').trim().toUpperCase();const amt=Math.abs(n(r[cA])||0);if(!cur||cur==='EUR'||!amt)continue;if(cS>=0&&r[cS]&&!/complet|voltooid|success/i.test(r[cS]))continue;
      const p=pos[cur]=pos[cur]||{sym:cur,qty:0,cost:0,known:true};const price=cP>=0?n(r[cP]):null;const eurAmt=cE>=0?Math.abs(n(r[cE])||0):null;const feeEur=cFC>=0&&/eur/i.test(r[cFC]||'')?Math.abs(n(r[cFA])||0):0;const feeCoin=cFC>=0&&(r[cFC]||'').trim().toUpperCase()===cur?Math.abs(n(r[cFA])||0):0;
      if(/buy|koop/.test(type)){p.qty+=amt-feeCoin;p.cost+=(eurAmt||(price?amt*price:0))+feeEur;if(!eurAmt&&!price)p.known=false}
      else if(/sell|verkoop/.test(type)){const part=p.qty?Math.min(1,amt/p.qty):0;p.cost-=p.cost*part;p.qty-=amt}
      else if(/withdraw|opname/.test(type)){const part=p.qty?Math.min(1,amt/p.qty):0;p.cost-=p.cost*part;p.qty-=amt+feeCoin}
      else if(/deposit|storting/.test(type)){p.qty+=amt;if(price)p.cost+=amt*price;else p.known=false}
      else if(/staking|reward|rebate|airdrop|bonus|beloning/.test(type)){p.qty+=amt}}
    return Object.values(pos).filter(p=>p.qty>1e-9).map(p=>({sym:p.sym,kind:'crypto',qty:p.qty,avg:p.known&&p.cost>0?p.cost/p.qty:null}))}
  const cs=col(/symbo|^sym|^asset|^coin|^ticker/),cq=col(/^aantal|^qty|^amount|^hoeveel/),ca=col(/aankoop|^avg|gemiddeld|^price|^prijs/);if(cs<0||cq<0)throw new Error('Onbekend formaat. Gebruik de transactie-export van Bitvavo of een CSV met de kolommen symbool;aantal;aankoopprijs.');
  return R.slice(1).map(r=>({sym:(r[cs]||'').trim().toUpperCase(),qty:n(r[cq]),avg:ca>=0?n(r[ca]):null})).filter(x=>x.sym&&x.qty>0).map(x=>({...x,kind:S.stocks.has(x.sym)?'stock':'crypto'}))}
function importDialog(){dlg(`<div class="chead"><h2>${ico('upload','class="h2i"')}Importeren naar Mijn bezit</h2><button class="ibtn" id="imx" aria-label="Sluiten">${ico('x')}</button></div>
  <ol class="imsteps"><li>Open Bitvavo op je computer → <b>Portefeuille</b> → <b>Transactiegeschiedenis</b> → <b>Exporteren</b> (CSV).</li><li>Kies het bestand hieronder. Het blijft op je apparaat; alleen de uitkomst (welke coins en hoeveel) wordt bewaard.</li></ol>
  <label class="imdrop" id="imdrop"><input type="file" id="imf" accept=".csv,text/csv,text/plain" hidden><span>${ico('upload')}</span><b>Kies een CSV-bestand</b><small>of sleep het hierheen · ook eigen CSV met symbool;aantal;aankoopprijs</small></label><div id="imprev"></div>`,c=>{c.style.width='min(620px,100%)';$('#imx',c).onclick=closeOverlay;
  const handle=async file=>{try{const L=parseImport(await file.text());if(!L.length)throw new Error('Geen posities gevonden: alles is verkocht of opgenomen, of het bestand is leeg.');
      $('#imprev',c).innerHTML=`<div class="tw" style="max-height:44vh;overflow:auto;margin-top:12px"><table class="hdt"><thead><tr><th></th><th>Asset</th><th class="n">Aantal</th><th class="n">Gem. aankoop</th><th class="n">Waarde nu</th></tr></thead><tbody>${L.map((p,i)=>{const a=getAsset(p.sym);const v=a&&a.price!=null&&a.kind==='crypto'?a.price*p.qty:null;return `<tr style="cursor:default"><td><input type="checkbox" data-i="${i}" checked aria-label="Importeer ${esc(p.sym)}"></td><td>${a?an(a):`<b>${esc(p.sym)}</b>`}</td><td class="n">${qtyFmt(p.qty)}</td><td class="n">${p.avg?eur(p.avg):'<span class="faint">onbekend</span>'}</td><td class="n">${v!=null?eur2(v):'—'}</td></tr>`}).join('')}</tbody></table></div>
        <label class="imrep"><input type="checkbox" id="imrep"> Vervang mijn huidige bezit (anders wordt het toegevoegd)</label><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn ghost" id="no">Annuleren</button><button class="btn" id="yes">${L.length} ${L.length===1?'positie':'posities'} importeren</button></div>`;
      $('#no',c).onclick=closeOverlay;$('#yes',c).onclick=async()=>{const pick=$$('[data-i]:checked',c).map(x=>L[+x.dataset.i]);const btn=$('#yes',c);btn.disabled=true;btn.textContent='Bezig…';
        try{if($('#imrep',c).checked){for(const p of await Store.positions())await Store.delPosition(p.id)}for(const p of pick)await Store.addPosition({sym:p.sym,kind:p.kind,qty:p.qty,avg:p.avg});closeOverlay();PF.pos=null;UI.toast({kind:'success',title:`${pick.length} posities geïmporteerd`,body:'Je ziet ze bij Portefeuille → Mijn bezit.'});if(UI.cur==='portefeuille')UI.route()}
        catch(x){btn.disabled=false;btn.textContent='Opnieuw proberen';UI.toast({kind:'error',title:'Import mislukt',body:x.message})}}}
    catch(x){$('#imprev',c).innerHTML=`<div class="callout warn" style="margin-top:12px">${esc(x.message)}</div>`}};
  $('#imf',c).onchange=e=>e.target.files[0]&&handle(e.target.files[0]);const dz=$('#imdrop',c);dz.ondragover=e=>{e.preventDefault();dz.classList.add('over')};dz.ondragleave=()=>dz.classList.remove('over');dz.ondrop=e=>{e.preventDefault();dz.classList.remove('over');e.dataTransfer.files[0]&&handle(e.dataTransfer.files[0])}})}
{const ph=Pages.portefeuille.html,pm=Pages.portefeuille.mount;Pages.portefeuille.html=function(){return ph.call(this).replace(`<div class="seg" id="pftab">`,`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn ghost" id="pfimp">${ico('upload')}Importeer uit Bitvavo</button><div class="seg" id="pftab">`).replace(`Oefenportefeuille →</button></div>`,`Oefenportefeuille →</button></div></div>`)};
  Pages.portefeuille.mount=function(el,arg){const r=pm.call(this,el,arg);$('#pfimp',el)&&($('#pfimp',el).onclick=importDialog);return r}}
