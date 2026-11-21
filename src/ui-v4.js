/* =====================================================================
   v4 — Handelen met oefengeld, kopen vanaf elke assetpagina,
        opvallende meldingen en een overzicht dat je zelf indeelt
   ===================================================================== */
IC.trade='<path d="M7 4v16M7 4 3 8M7 4l4 4M17 20V4M17 20l-4-4M17 20l4-4"/>';
IC.edit='<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>';
IC.up='<path d="m6 15 6-6 6 6"/>';IC.down='<path d="m6 9 6 6 6-6"/>';IC.x='<path d="M6 6l12 12M18 6 6 18"/>';IC.plus='<path d="M12 5v14M5 12h14"/>';
IC.download='<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>';IC.check='<path d="m5 12 5 5 9-10"/>';IC.warn='<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>';IC.grip='<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3"/>';
NAV.splice(NAV.findIndex(n=>n[0]==='portefeuille'),0,['handel','Handelen','trade']);

const numIn=v=>{let s=String(v??'').trim().replace(/[\s€$]/g,'');if(!s)return null;if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return isFinite(n)?n:null};
const qtyFmt=q=>q==null||!isFinite(q)?'—':nlN(q,q>=1000?2:q>=1?4:q>=.01?6:8).replace(/0+$/,'').replace(/,$/,'');
const sgnEur=n=>n==null||!isFinite(n)?'—':(n>0?'+':n<0?'−':'')+eur2(Math.abs(n));
const kindOf=sym=>{const a=getAsset(sym);return a?a.kind:'crypto'};

/* ---------------- gegevens: server met account, anders in deze browser ---------------- */
const PT={P:null,q:{},err:'',
  fxUsd(){const u=S.crypto.get('USDC')||S.crypto.get('USDT');return u&&u.price?u.price:null},
  key:(sym,kind)=>(kind==='stock'?'S:':'')+sym,
  px(sym,kind){kind=kind||kindOf(sym);const a=getAsset(sym);const sq=this.q[this.key(sym,kind)];
    if(sq&&Date.now()-sq.t<3*MIN)return sq;
    if(kind==='crypto'&&a&&a.price!=null)return {p:a.price,o:a.ch24!=null?a.price/(1+a.ch24/100):null,src:'Bitvavo'};
    if(kind==='stock'&&a&&a.price!=null&&!a.srvQ){if(a.cur==='EUR')return {p:a.price,o:a.prev||null,src:'app'};const fx=this.fxUsd();if(fx)return {p:a.price*fx,o:a.prev?a.prev*fx:null,native:a.price,cur:'USD',src:'Finnhub'}}
    return sq||this.P?.px?.[sym]||null},
  async quote(sym,kind){kind=kind||kindOf(sym);if(!Api.on)return null;const k=this.key(sym,kind);const c=this.q[k];if(c&&Date.now()-c.t<90e3)return c;
    try{const r=await Api.call(`/api/quote?sym=${encodeURIComponent(sym)}&kind=${kind}`);this.q[k]={...r,t:Date.now()};
      const a=getAsset(sym);if(a&&kind==='stock'&&(a.price==null||a.srvQ)){a.srvQ=r.src;a.price=r.native??r.p;a.cur=r.native!=null?r.cur:'EUR';a.ch24=r.o?(r.p/r.o-1)*100:a.ch24;a.ts=r.ts||Date.now()}
      return this.q[k]}catch(e){return null}},
  async load(){try{this.P=Api.authed?await Api.call('/api/paper'):this.loc();this.err=''}catch(x){this.err=x.message}return this.P},
  async order(b){if(Api.authed){this.P=await Api.call('/api/paper/order',{method:'POST',body:b});return this.P}return this.locOrder(b)},
  async cancel(id){if(Api.authed){this.P=await Api.call('/api/paper/orders/'+id,{method:'DELETE'});return this.P}const P=this.loc();const o=P.orders.find(x=>x.id===id);if(o&&o.status==='open'){o.status='cancelled';o.done=Date.now()}this.save(P);return P},
  async reset(){if(Api.authed){this.P=await Api.call('/api/paper/reset',{method:'POST',body:{}});return this.P}const P=this.fresh();this.save(P);return P},
  /* lokaal (zonder account): zelfde regels als de server */
  fresh(){const t=Date.now();return {start:10000,fee:.0025,cash:10000,holdings:{},realized:0,fees:0,created:t,trades:[],orders:[],hist:[{t,value:10000}],px:{},local:true}},
  loc(){let P=LS.get('paper2',null);if(!P){P=this.fresh();const o=LS.get('paper',null);if(o){P.cash=o.cash;P.holdings=o.holdings||{};P.trades=(o.trades||[]).map((t,i)=>({...t,id:i+1,via:'market'}))}this.save(P)}this.P=P;return P},
  save(P){P.trades=P.trades.slice(0,300);P.hist=P.hist.slice(-720);P.orders=P.orders.filter(o=>o.status==='open'||Date.now()-(o.done||o.created)<30*DAY).slice(0,80);LS.set('paper2',P);this.P=P},
  exec(P,o,q,via){const kind=o.kind||'crypto',price=q.p,F=P.fee;const h=P.holdings[o.sym]||{qty:0,cost:0,k:kind,t:Date.now()};let eur,qty,fee,pnl=null;const r2=n=>Math.round(n*100)/100;
    if(!(price>0))throw new Error('Geen geldige koers.');
    if(o.side==='buy'){eur=r2(o.eur!=null?o.eur:o.qty*price);if(!(eur>=1))throw new Error('Minimaal € 1.');fee=r2(eur*F);if(eur+fee>P.cash+1e-9)throw new Error(`Onvoldoende virtueel saldo: je hebt ${eur2(P.cash)}, nodig is ${eur2(eur+fee)} inclusief 0,25% kosten.`);qty=eur/price;h.qty+=qty;h.cost+=eur+fee;h.k=kind;P.cash-=eur+fee;P.holdings[o.sym]=h}
    else{if(!h.qty)throw new Error(`Je hebt geen ${o.sym} in je oefenportefeuille.`);qty=o.all?h.qty:o.qty!=null?o.qty:o.eur/price;if(qty>h.qty*(1+1e-6))throw new Error(`Je hebt maar ${qtyFmt(h.qty)} ${o.sym}.`);qty=Math.min(qty,h.qty);eur=r2(qty*price);fee=r2(eur*F);const basis=h.cost*(qty/h.qty);pnl=r2(eur-fee-basis);h.cost-=basis;h.qty-=qty;P.cash+=eur-fee;if(h.qty<1e-12||h.qty*price<.005)delete P.holdings[o.sym];else P.holdings[o.sym]=h}
    P.realized+=pnl||0;P.fees+=fee;const t={id:Date.now()+Math.random(),sym:o.sym,kind,side:o.side,eur,qty,price,fee,pnl,src:q.src||null,via,t:Date.now(),note:o.note||null};P.trades.unshift(t);P.hist.push({t:t.t,value:Math.round(pfCalc(P).tot*100)/100,btc:S.crypto.get('BTC')?.price??null});return t},
  locOrder(b){const P=this.loc();const kind=b.kind||'crypto';const q=this.px(b.sym,kind);const type=b.type||'market';P.notes=[];P.last=null;P.placed=null;
    if(type==='market'){if(!q)throw new Error('Geen actuele koers voor '+b.sym);const t=this.exec(P,b,q,'market');P.last=t;
      if(b.side==='buy'){const legs=[];if(b.tp&&b.tp>t.price)legs.push(['limit',+b.tp,'Winst nemen']);if(b.sl&&b.sl<t.price)legs.push(['stop',+b.sl,'Stop-loss']);const oco=legs.length>1?Date.now():null;
        legs.forEach(([ty,lvl,note],i)=>P.orders.unshift({id:Date.now()+i+1,sym:b.sym,kind,type:ty,side:'sell',qty:t.qty,eur:null,allq:0,lvl,oco,status:'open',created:Date.now(),note}))}
      this.save(P);return P}
    if(type==='trail'){if(!q)throw new Error('Geen actuele koers.');if(!P.holdings[b.sym])throw new Error(`Je hebt geen ${b.sym} om te verkopen.`);const lvl=q.p*(1-b.trail/100);P.orders.unshift({id:Date.now(),sym:b.sym,kind,type:'trail',side:'sell',eur:b.eur??null,qty:b.qty??null,allq:b.all?1:0,lvl,trail:b.trail,peak:q.p,oco:null,status:'open',created:Date.now(),note:'Trailing stop'});P.placed={sym:b.sym,type,side:'sell',lvl,trail:b.trail};this.save(P);return P}
    if(!(b.lvl>0))throw new Error('Vul de koers in waarop de order moet worden uitgevoerd.');
    if(b.side==='sell'&&!P.holdings[b.sym])throw new Error(`Je hebt geen ${b.sym} om te verkopen.`);
    if(q&&type==='stop'&&(b.side==='sell'?q.p<=b.lvl:q.p>=b.lvl))throw new Error(`De koers (${eur(q.p)}) staat al ${b.side==='sell'?'onder':'boven'} dit stopniveau.`);
    if(q&&type==='limit'&&(b.side==='buy'?q.p<=b.lvl:q.p>=b.lvl)){P.last=this.exec(P,b,q,'limit');P.notes=['De limiet was meteen haalbaar, dus de order is direct uitgevoerd tegen de marktkoers.'];this.save(P);return P}
    P.orders.unshift({id:Date.now(),sym:b.sym,kind,type,side:b.side,eur:b.eur??null,qty:b.qty??null,allq:b.all?1:0,lvl:b.lvl,oco:null,status:'open',created:Date.now(),note:null});P.placed={sym:b.sym,type,side:b.side,lvl:b.lvl};this.save(P);return P},
  checkLocal(){const P=this.P;if(Api.authed||!P||!P.local)return;let ch=false;
    for(const o of P.orders.filter(x=>x.status==='open')){const q=this.px(o.sym,o.kind);if(!q)continue;if(o.type==='trail'&&q.p>(o.peak||0)){o.peak=q.p;o.lvl=q.p*(1-o.trail/100);ch=true}const hit=o.type==='trail'?q.p<=o.lvl:o.type==='limit'?(o.side==='buy'?q.p<=o.lvl:q.p>=o.lvl):(o.side==='buy'?q.p>=o.lvl:q.p<=o.lvl);if(!hit)continue;ch=true;
      try{const t=this.exec(P,{sym:o.sym,kind:o.kind,side:o.side,eur:o.eur,qty:o.qty,all:!!o.allq},q,o.type==='trail'?'trailing':o.note==='Stop-loss'?'stop-loss':o.note==='Winst nemen'?'take-profit':o.type);o.status='filled';o.done=Date.now();o.price=t.price;
        if(o.oco)P.orders.filter(x=>x.oco===o.oco&&x.id!==o.id&&x.status==='open').forEach(x=>{x.status='cancelled';x.done=Date.now();x.note=(x.note||'')+' · vervallen'});
        Alerts.push({id:'order:'+o.id,cat:'order',force:true,href:'#handel',title:`${ordLbl(o)} uitgevoerd: ${o.side==='buy'?'koop':'verkoop'} ${o.sym}`,body:`${qtyFmt(t.qty)} ${o.sym} tegen ${eur(t.price)}${t.pnl!=null?' · resultaat '+sgnEur(t.pnl):''} · oefengeld`})}
      catch(e){o.status='failed';o.done=Date.now();o.note=e.message}}
    const last=P.hist[P.hist.length-1];if(Object.keys(P.holdings).length&&(!last||Date.now()-last.t>HOUR)){P.hist.push({t:Date.now(),value:Math.round(pfCalc(P).tot*100)/100});ch=true}
    if(ch){this.save(P);if(UI.cur==='handel'&&UI.el)Pages.handel.live(UI.el,null,'calc')}}
};
setInterval(()=>PT.checkLocal(),20000);
const ordLbl=o=>o.type==='trail'?`Trailing ${nlN(o.trail,1)}%`:o.note==='Stop-loss'?'Stop-loss':o.note==='Winst nemen'?'Winst nemen':o.type==='limit'?(o.side==='buy'?'Limiet koop':'Limiet verkoop'):(o.side==='buy'?'Stop koop':'Stop verkoop');

function pfCalc(P){
  const rows=Object.entries(P.holdings||{}).map(([sym,h])=>{const kind=h.k||'crypto';const a=getAsset(sym);const q=PT.px(sym,kind);const p=q?.p??null;const v=p!=null?p*h.qty:null;const res=v!=null?v-h.cost:null;
    return {sym,kind,h,a,q,p,v,avg:h.cost/h.qty,res,resP:res!=null&&h.cost?res/h.cost*100:null,ch24:q&&q.o?(p/q.o-1)*100:(a?.ch24??null)}});
  const inv=rows.reduce((s,r)=>s+(r.v??r.h.cost),0),tot=P.cash+inv;rows.forEach(r=>r.w=tot?(r.v??r.h.cost)/tot*100:0);rows.sort((a,b)=>(b.v??0)-(a.v??0));
  const H=P.hist||[];const ref=H.filter(x=>x.t<=Date.now()-DAY).pop();const dayCh=ref?tot-ref.value:null;
  const sells=(P.trades||[]).filter(t=>t.side==='sell'&&t.pnl!=null);const wins=sells.filter(t=>t.pnl>0);
  return {rows,inv,tot,ret:tot-P.start,retP:(tot/P.start-1)*100,unreal:rows.reduce((s,r)=>s+(r.res||0),0),dayCh,dayP:ref?dayCh/ref.value*100:null,
    stats:{n:(P.trades||[]).length,buys:(P.trades||[]).filter(t=>t.side==='buy').length,sells:sells.length,win:sells.length?wins.length/sells.length*100:null,
      avgWin:wins.length?wins.reduce((s,t)=>s+t.pnl,0)/wins.length:null,avgLoss:sells.length>wins.length?sells.filter(t=>t.pnl<=0).reduce((s,t)=>s+t.pnl,0)/(sells.length-wins.length):null,
      best:sells.slice().sort((a,b)=>b.pnl-a.pnl)[0]||null,worst:sells.slice().sort((a,b)=>a.pnl-b.pnl)[0]||null,vol:(P.trades||[]).reduce((s,t)=>s+t.eur,0)}}
}

/* ---------------- orderticket: één component voor de handelpagina, de assetpagina en een venster ---------------- */
function assetChoices(q){q=(q||'').trim().toLowerCase();const held=new Set(Object.keys(PT.P?.holdings||{}));
  const cr=[...S.crypto.values()].filter(a=>a.price!=null&&!CFG.STABLE.has(a.sym)).sort((a,b)=>(b.volQ||0)-(a.volQ||0));const st=[...S.stocks.values()];
  const m=a=>!q||a.sym.toLowerCase().startsWith(q)||a.name.toLowerCase().includes(q);
  return {held:[...cr,...st].filter(a=>held.has(a.sym)&&m(a)),crypto:cr.filter(m).slice(0,q?40:25),stocks:st.filter(m)}}
const Ticket={
  mount(box,o={}){const st={sym:o.sym||'BTC',kind:o.kind||kindOf(o.sym||'BTC'),side:o.side||'buy',type:o.type||'market',unit:'eur',amt:o.amt||'',all:false,lvl:o.lvl||'',trail:'5',note:'',shownote:false,tp:'',sl:'',tpsl:false,confirm:false,busy:false,fixed:!!o.fixed,compact:!!o.compact,pick:false,pq:''};
    box._tk=st;box.classList.add('tk');this.render(box);PT.quote(st.sym,st.kind).then(()=>this.refresh(box));
    box.addEventListener('click',e=>this.click(box,e));box.addEventListener('input',e=>this.input(box,e));box.addEventListener('keydown',e=>{if(e.key==='Escape'&&st.pick){st.pick=false;this.render(box)}});
    if(!PT.P)PT.load().then(()=>this.refresh(box));return st},
  set(box,patch){Object.assign(box._tk,patch,{confirm:false});if(patch.sym){box._tk.kind=patch.kind||kindOf(patch.sym);PT.quote(box._tk.sym,box._tk.kind).then(()=>this.refresh(box))}this.render(box)},
  calc(st){const P=PT.P||{cash:0,holdings:{},fee:.0025};const q=PT.px(st.sym,st.kind);const p=q?.p??null;const h=P.holdings?.[st.sym];const F=P.fee??.0025;
    const tr=numIn(st.trail);const lvl=st.type==='trail'?(p&&tr?p*(1-tr/100):null):numIn(st.lvl);const exP=st.type==='market'?p:lvl;const amt=numIn(st.amt);let eurV=null,qty=null;
    if(st.side==='sell'&&st.all){qty=h?.qty??0;eurV=exP?qty*exP:null}else if(st.unit==='eur'){eurV=amt;qty=exP&&amt?amt/exP:null}else{qty=amt;eurV=exP&&amt?amt*exP:null}
    const fee=eurV!=null?eurV*F:null;const total=eurV!=null?(st.side==='buy'?eurV+fee:eurV-fee):null;let errm='';
    if(st.type==='trail'&&!(tr>=.5&&tr<=50))errm='Kies een afstand tussen 0,5% en 50%.';else if(st.type==='trail'&&p==null)errm='Nog geen koers voor deze asset; even geduld.';else if(st.type!=='market'&&st.type!=='trail'&&!(lvl>0))errm='Vul de koers in waarop de order moet worden uitgevoerd.';
    else if(!st.all&&!(amt>0))errm='';
    else if(st.side==='buy'&&eurV!=null&&eurV<1)errm='Minimaal € 1.';
    else if(st.side==='buy'&&total!=null&&total>P.cash+1e-9)errm=`Onvoldoende saldo: je hebt ${eur2(P.cash)} vrij.`;
    else if(st.side==='sell'&&!h)errm=`Je hebt geen ${st.sym} in je oefenportefeuille.`;
    else if(st.side==='sell'&&qty!=null&&h&&qty>h.qty*(1+1e-6))errm=`Je hebt maar ${qtyFmt(h.qty)} ${st.sym}.`;
    else if(st.type==='market'&&p==null)errm='Nog geen koers voor deze asset; even geduld.';
    if(!errm&&st.type==='stop'&&p!=null&&lvl>0&&(st.side==='sell'?p<=lvl:p>=lvl))errm=`De koers staat al ${st.side==='sell'?'onder':'boven'} dit stopniveau.`;
    const ready=!errm&&(st.all||amt>0)&&(st.type==='market'?p!=null:lvl>0);
    const tp=numIn(st.tp),sl=numIn(st.sl);
    return {P,q,p,h,F,lvl,tr,exP,eurV,qty,fee,total,errm,ready,tp,sl,cashAfter:total!=null?(st.side==='buy'?P.cash-total:P.cash+total):null,posAfter:h||qty?((h?.qty||0)+(st.side==='buy'?1:-1)*(qty||0)):null}},
  typeHelp(st){return st.type==='trail'?'Verkoopt zodra de koers dit percentage onder de hoogste koers sinds nu zakt. Stijgt de koers, dan schuift de stop mee omhoog.':st.type==='market'?'Direct uitvoeren tegen de actuele koers.':st.type==='limit'?(st.side==='buy'?'Koopt pas als de koers daalt tot jouw prijs of lager.':'Verkoopt pas als de koers stijgt tot jouw prijs of hoger.'):(st.side==='buy'?'Koopt zodra de koers stijgt tot dit niveau (doorbraak).':'Stop-loss: verkoopt zodra de koers daalt tot dit niveau.')},
  render(box){const st=box._tk;const a=getAsset(st.sym);const buy=st.side==='buy';const lvlLbl=st.type==='limit'?(buy?'Koop als de koers daalt tot':'Verkoop als de koers stijgt tot'):(buy?'Koop als de koers stijgt tot':'Verkoop als de koers daalt tot');
    const rel=buy===(st.type==='limit')?[-1,-2,-5,-10]:[1,2,5,10];
    box.innerHTML=`<div class="tkside" role="tablist"><button data-side="buy" class="${buy?'on buy':''}" role="tab" aria-selected="${buy}">Kopen</button><button data-side="sell" class="${!buy?'on sell':''}" role="tab" aria-selected="${!buy}">Verkopen</button></div>
    <div class="tkasset">${st.fixed?`<div class="tkpicked">${a?ab(a):''}<span class="tkn"><b>${esc(a?.name||st.sym)}</b><small>${esc(st.sym)}${a?.kind==='stock'?' · '+esc(a.sector):''}</small></span><span class="tkpx" data-r="px"></span></div>`:
      `<button class="tkpicked btnlike" data-act="pick" aria-haspopup="listbox" aria-expanded="${st.pick}">${a?ab(a):''}<span class="tkn"><b>${esc(a?.name||st.sym)}</b><small>${esc(st.sym)} · ${a?.kind==='stock'?'aandeel':'crypto'}</small></span><span class="tkpx" data-r="px"></span>${ico('down','class="chev"')}</button>
      ${st.pick?`<div class="tkpop"><input class="inp" data-in="pq" placeholder="Zoek op naam of symbool" value="${esc(st.pq)}" autocomplete="off" aria-label="Zoek asset"><div class="tklist" data-r="plist">${this.plist(st)}</div></div>`:''}`}</div>
    <div class="tkpos" data-r="pos"></div>
    <div class="field"><label>Soort order</label><div class="seg tktype ${buy?'':'t4'}">${[['market','Markt'],['limit','Limiet'],['stop','Stop'],...(buy?[]:[['trail','Trailing']])].map(([k,l])=>`<button data-type="${k}" class="${st.type===k?'on':''}">${l}</button>`).join('')}</div><div class="tkhelp">${this.typeHelp(st)}</div></div>
    ${st.type==='trail'?`<div class="field"><label for="tktr_${box.id}">Afstand onder de hoogste koers</label><div class="tkin"><input class="inp" id="tktr_${box.id}" data-in="trail" inputmode="decimal" value="${esc(st.trail)}"><span style="padding-right:12px">%</span></div><div class="tkq">${[3,5,10,15].map(r=>`<button data-trail="${r}" class="${numIn(st.trail)===r?'on':''}">${r}%</button>`).join('')}</div></div>`:''}
    ${st.type!=='market'&&st.type!=='trail'?`<div class="field"><label for="tklvl_${box.id}">${lvlLbl}</label><div class="tkin"><span>€</span><input class="inp" id="tklvl_${box.id}" data-in="lvl" inputmode="decimal" value="${esc(st.lvl)}" placeholder="0,00"></div><div class="tkq">${rel.map(r=>`<button data-rel="${r}">${r>0?'+':''}${r}%</button>`).join('')}</div></div>`:''}
    <div class="field"><label for="tkamt_${box.id}">${buy?'Bedrag':'Hoeveel verkopen'}</label><div class="tkin"><span>${st.unit==='eur'?'€':esc(st.sym)}</span><input class="inp" id="tkamt_${box.id}" data-in="amt" inputmode="decimal" value="${st.all?'':esc(st.amt)}" placeholder="${st.all?'Alles':'0,00'}"><button class="tkunit" data-act="unit" title="Wissel tussen euro en aantal">${st.unit==='eur'?'in aantal':'in euro'}</button></div>
      <div class="tkq">${(buy?[10,25,50,100]:[25,50,75,100]).map(r=>`<button data-pct="${r}" class="${!buy&&r===100&&st.all?'on':''}">${r===100?'Max':r+'%'}</button>`).join('')}</div></div>
    ${buy&&st.type==='market'?`<div class="tktpsl"><button class="lnk" data-act="tpsl">${st.tpsl?'− ':'+ '}Winst nemen en stop-loss</button>${st.tpsl?`<div class="tkgrid"><div class="field"><label>Winst nemen bij</label><div class="tkin"><span>€</span><input class="inp" data-in="tp" inputmode="decimal" value="${esc(st.tp)}" placeholder="optioneel"></div><div class="tkq">${[5,10,20].map(r=>`<button data-tp="${r}">+${r}%</button>`).join('')}</div></div>
      <div class="field"><label>Stop-loss bij</label><div class="tkin"><span>€</span><input class="inp" data-in="sl" inputmode="decimal" value="${esc(st.sl)}" placeholder="optioneel"></div><div class="tkq">${[3,5,10].map(r=>`<button data-sl="${r}">−${r}%</button>`).join('')}</div></div></div><p class="tkhelp">Wordt er één geraakt, dan vervalt de andere automatisch.</p>`:''}</div>`:''}
    <div class="tknotew"><button class="lnk" data-act="note">${st.shownote?'− ':'+ '}Notitie voor je dagboek</button>${st.shownote?`<textarea class="inp tknote2" data-in="note" maxlength="280" rows="2" placeholder="Waarom ${buy?'koop':'verkoop'} je dit? Over 30 dagen laat Vantis zien hoe het uitpakte.">${esc(st.note)}</textarea>`:''}</div>
    <dl class="tksum" data-r="sum"></dl><div class="tkerr" data-r="err" role="alert"></div>
    <div data-r="go"></div><p class="tknote">Oefengeld · geen echte transactie${Api.authed?' · de Vantis-server bepaalt de uitvoerkoers':''}</p>`;
    this.refresh(box);if(st.pick){const i=$('[data-in="pq"]',box);i&&i.focus()}},
  plist(st){const C=assetChoices(st.pq);const row=a=>{const q=PT.px(a.sym,a.kind);return `<button class="tkopt ${a.sym===st.sym?'on':''}" data-pickv="${a.sym}" data-kind="${a.kind}" role="option">${ab(a)}<span class="tkn"><b>${esc(a.name)}</b><small>${esc(a.sym)}</small></span><span class="r"><b class="num">${q?eur(q.p):a.price!=null?money(a,a.price):'—'}</b><small class="num ${cls(a.ch24)}">${a.ch24!=null?pct(a.ch24):''}</small></span></button>`};
    return (C.held.length?`<div class="tkgrp">In je oefenportefeuille</div>${C.held.map(row).join('')}`:'')+(C.crypto.length?`<div class="tkgrp">Crypto</div>${C.crypto.map(row).join('')}`:'')+(C.stocks.length?`<div class="tkgrp">Aandelen en ETF's</div>${C.stocks.map(row).join('')}`:'')||'<div class="empty">Niets gevonden.</div>'},
  refresh(box){const st=box._tk;if(!st||!box.isConnected)return;const c=this.calc(st);const a=getAsset(st.sym);const buy=st.side==='buy';const set=(r,h)=>{const e=$(`[data-r="${r}"]`,box);if(e)e.innerHTML=h};
    set('px',c.p!=null?`<b class="num">${eur(c.p)}</b><small class="num ${cls(c.q?.o?c.p/c.q.o-1:a?.ch24)}">${c.q?.o?pct((c.p/c.q.o-1)*100):a?.ch24!=null?pct(a.ch24):''}</small>`:'<small>koers laden…</small>');
    const h=c.h;const hv=h&&c.p?h.qty*c.p:null;set('pos',h?`<span>Je hebt <b>${qtyFmt(h.qty)} ${esc(st.sym)}</b>${hv!=null?` ≈ ${eur2(hv)}`:''}</span>${hv!=null?`<span class="num ${cls(hv-h.cost)}">${sgnEur(hv-h.cost)} (${pct((hv/h.cost-1)*100)})</span>`:''}`:`<span>Vrij saldo <b>${eur2(c.P.cash)}</b></span>`);
    const srv=PT.q[PT.key(st.sym,st.kind)];const diff=srv&&c.p&&srv!==c.q?Math.abs(srv.p/c.p-1)*100:null;
    const rows=[[st.type==='market'?'Koers':st.type==='trail'?'Stop nu op':'Uitvoeren rond',c.exP!=null?`${eur(c.exP)}<small>${st.type==='market'?' · '+esc(c.q?.src||''):st.type==='trail'?' · schuift mee':' · jouw niveau'}</small>`:'—'],
      ...(Api.authed&&srv&&st.type==='market'&&diff!=null&&diff>.3?[['Serverkoers',`${eur(srv.p)}<small> · ${esc(srv.src)}</small>`]]:[]),
      ['Aantal',c.qty!=null?`${qtyFmt(c.qty)} ${esc(st.sym)}`:'—'],['Kosten (0,25%)',c.fee!=null?eur2(c.fee):'—'],
      [buy?'Totaal':'Je ontvangt',c.total!=null?`<b>${eur2(c.total)}</b>`:'—'],['Saldo na order',c.cashAfter!=null?eur2(c.cashAfter):eur2(c.P.cash)]];
    if(buy&&st.tpsl&&c.qty&&(c.tp||c.sl)){const base=c.exP;if(c.tp&&base)rows.push(['Bij winst nemen',`<span class="up">${sgnEur(c.qty*c.tp*(1-c.F)-c.total)}</span>`]);if(c.sl&&base)rows.push(['Bij stop-loss',`<span class="down">${sgnEur(c.qty*c.sl*(1-c.F)-c.total)}</span>`])}
    set('sum',rows.map(([k,v])=>`<div><dt>${k}</dt><dd class="num">${v}</dd></div>`).join(''));set('err',c.errm?ico('warn')+esc(c.errm):'');
    const verb=buy?'Koop':'Verkoop';const what=st.all?`alle ${st.sym}`:c.eurV!=null?`${st.sym} voor ${eur2(c.eurV)}`:st.sym;
    const lbl=st.type==='market'?`${verb} ${what}`:`Plaats ${st.type==='limit'?'limietorder':st.type==='trail'?'trailing stop':'stoporder'}: ${verb.toLowerCase()} ${st.all?'alles':c.eurV!=null?eur2(c.eurV):''}`;
    set('go',st.confirm?`<div class="tkconfirm"><p><b>Weet je het zeker?</b> ${esc(lbl)}${st.type==='trail'?` op ${nlN(c.tr,1)}% onder de top`:st.type!=='market'?` bij ${eur(c.lvl)}`:''}.</p><div><button class="btn ghost" data-act="no">Annuleren</button><button class="btn ${buy?'gobuy':'gosell'}" data-act="yes" ${st.busy?'disabled':''}>${st.busy?'Bezig…':'Bevestigen'}</button></div></div>`
      :`<button class="btn tkgo ${buy?'gobuy':'gosell'}" data-act="go" ${c.ready?'':'disabled'}>${esc(lbl)}</button>`)},
  input(box,e){const st=box._tk;const k=e.target.dataset.in;if(!k)return;if(k==='pq'){st.pq=e.target.value;const l=$('[data-r="plist"]',box);if(l)l.innerHTML=this.plist(st);return}
    st[k]=e.target.value;if(k==='amt')st.all=false;st.confirm=false;this.refresh(box)},
  async click(box,e){const st=box._tk;const t=e.target.closest('button');if(!t||!box.contains(t))return;const c=this.calc(st);const d=t.dataset;
    if(d.side){if(st.side===d.side)return;this.set(box,{side:d.side,all:false,tpsl:false,type:d.side==='sell'&&st.type==='market'?'market':st.type});return}
    if(d.type){this.set(box,{type:d.type});return}
    if(d.pickv){st.pick=false;st.pq='';this.set(box,{sym:d.pickv,kind:d.kind,all:false,amt:'',lvl:''});return}
    if(d.rel&&c.p){st.lvl=nlN(c.p*(1+ +d.rel/100),c.p>=100?2:c.p>=1?4:6).replace(/\./g,'');this.render(box);return}
    if(d.trail){st.trail=d.trail;this.render(box);return}
    if(d.tp&&c.exP){st.tp=nlN(c.exP*(1+ +d.tp/100),c.exP>=100?2:4).replace(/\./g,'');this.render(box);return}
    if(d.sl&&c.exP){st.sl=nlN(c.exP*(1- +d.sl/100),c.exP>=100?2:4).replace(/\./g,'');this.render(box);return}
    if(d.pct){const r=+d.pct/100;if(st.side==='buy'){st.unit='eur';st.amt=nlN(Math.floor(c.P.cash*r/(1+c.F)*100)/100,2).replace(/\./g,'');st.all=false}else{if(!c.h)return;if(r>=1){st.all=true;st.amt=''}else{st.all=false;st.unit='qty';st.amt=qtyFmt(c.h.qty*r).replace(/\./g,'')}}st.confirm=false;this.render(box);return}
    switch(d.act){
      case 'pick':st.pick=!st.pick;this.render(box);return;
      case 'unit':{const v=numIn(st.amt);st.unit=st.unit==='eur'?'qty':'eur';if(v&&c.exP)st.amt=st.unit==='qty'?qtyFmt(v/c.exP).replace(/\./g,''):nlN(v*c.exP,2).replace(/\./g,'');this.render(box);return}
      case 'tpsl':st.tpsl=!st.tpsl;this.render(box);return;
      case 'note':st.shownote=!st.shownote;this.render(box);if(st.shownote)$('[data-in="note"]',box)?.focus();return;
      case 'go':if(!c.ready)return;if(S.settings.confirmOrders===false)return this.submit(box);st.confirm=true;this.refresh(box);return;
      case 'no':st.confirm=false;this.refresh(box);return;
      case 'yes':return this.submit(box)}
  },
  async submit(box){const st=box._tk;const c=this.calc(st);{if(st.busy||!c.ready)return;st.busy=true;this.refresh(box);const amt=numIn(st.amt);
        const body={sym:st.sym,kind:st.kind,side:st.side,type:st.type,...(st.all?{all:true}:st.unit==='eur'?{eur:amt}:{qty:amt}),...(st.type==='trail'?{trail:c.tr}:st.type!=='market'?{lvl:c.lvl}:{}),...(st.note.trim()?{note:st.note.trim()}:{}),...(st.side==='buy'&&st.tpsl&&st.type==='market'?{tp:c.tp||null,sl:c.sl||null}:{})};
        try{const P=await PT.order(body);st.busy=false;st.confirm=false;st.amt='';st.all=false;st.tp='';st.sl='';st.tpsl=false;st.note='';st.shownote=false;
          if(P.last){const L=P.last;UI.toast({kind:'success',title:`${L.side==='buy'?'Gekocht':'Verkocht'}: ${qtyFmt(L.qty)} ${L.sym}`,body:`Tegen ${eur(L.price)}${L.src?' via '+L.src:''} · ${eur2(L.eur)}${L.pnl!=null?' · resultaat '+sgnEur(L.pnl):''} · oefengeld`,href:'#handel'})}
          else if(P.placed){const o=P.placed;UI.toast({kind:'success',title:`${o.type==='limit'?'Limietorder':o.type==='trail'?'Trailing stop':'Stoporder'} geplaatst`,body:o.type==='trail'?`Verkoopt ${o.sym} als de koers ${nlN(o.trail,1)}% onder de top zakt (nu bij ${eur(o.lvl)}).`:`${o.side==='buy'?'Koop':'Verkoop'} ${o.sym} bij ${eur(o.lvl)}. Je krijgt een melding zodra hij is uitgevoerd.`,href:'#handel'})}
          (P.notes||[]).forEach(n=>UI.toast({kind:'info',title:'Let op',body:n}));
          this.render(box);box.dispatchEvent(new CustomEvent('traded',{bubbles:true}))}
        catch(x){st.busy=false;st.confirm=false;this.refresh(box);UI.toast({kind:'error',title:'Order niet uitgevoerd',body:x.message})}}}
};
function tradeDialog(sym,side){const a=getAsset(sym);dlg(`<div class="chead"><h2>${side==='sell'?'Verkopen':'Kopen'}: ${esc(a?.name||sym)}</h2><button class="ibtn" id="tdx" aria-label="Sluiten">${ico('x')}</button></div><div id="tdbox"></div>`,c=>{$('#tdx',c).onclick=closeOverlay;c.style.width='min(460px,100%)';const b=$('#tdbox',c);b.id='tdbox';Ticket.mount(b,{sym,side,fixed:true});b.addEventListener('traded',()=>setTimeout(closeOverlay,600))})}

/* ---------------- HANDELEN (pagina) ---------------- */
const HD={range:'all',f:'all',q:''};
function donut(parts,size=150){const tot=parts.reduce((s,p)=>s+p.v,0)||1;const r=size/2-12,C=2*Math.PI*r;let off=0;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="donut" role="img" aria-label="Verdeling">${parts.map(p=>{const l=p.v/tot*C;const s=`<circle r="${r}" cx="${size/2}" cy="${size/2}" fill="none" stroke="${p.c}" stroke-width="18" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size/2} ${size/2})"><title>${esc(p.l)} ${nlN(p.v/tot*100,1)}%</title></circle>`;off+=l;return s}).join('')}</svg>`}
const PAL=['#17243A','#2F6FD6','#0A8754','#A86A12','#7B4BC4','#CC3340','#2A9CA6','#8A95A6','#C25C9A','#5A7A1E'];
Pages.handel={
  title:()=>'Handelen',
  html:()=>`<div class="phead"><div><div class="kicker">Oefenen met virtueel geld</div><h1>Handelen</h1><p>Koop en verkoop crypto en aandelen met € 10.000 oefengeld, tegen echte koersen. Met limiet- en stoporders, winst nemen en stop-loss. Vantis voert geen echte transacties uit en geeft geen advies.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" id="hdcsv">${ico('download')}Exporteer</button><button class="btn ghost" id="hdreset">Opnieuw beginnen</button></div></div>
    ${Api.authed?'':`<div class="callout" style="margin-bottom:16px">${Api.on?'<b>Tip:</b> log in om je oefenportefeuille op al je apparaten te hebben. Met een account voert de server je limiet- en stoporders 24/7 uit, ook als de app dicht is.':'<b>Demomodus:</b> je oefenportefeuille staat alleen in deze browser. Limiet- en stoporders worden gecontroleerd zolang de app open is.'}</div>`}
    <section class="kpis" id="hdk">${skel(1)}</section>
    <div class="hdgrid"><div class="hdmain">
      <div class="card"><div class="chead"><div><h2>Waardeverloop</h2><div class="src" id="hdsub"></div></div><div class="seg" id="hdrng">${[['24u','24 uur'],['7d','7 dagen'],['30d','30 dagen'],['all','Alles']].map(([k,l])=>`<button data-r="${k}" class="${HD.range===k?'on':''}">${l}</button>`).join('')}</div></div><div id="hdch"></div></div>
      <div class="card flush"><div class="chead" style="padding:18px 18px 0"><h2>Posities</h2><span class="src" id="hdpsub"></span></div><div id="hdpos"></div></div>
      <div class="card flush"><div class="chead" style="padding:18px 18px 0"><h2>Open orders</h2><span class="src">${Api.authed?'Gecontroleerd elke 5 minuten door de Vantis-server':'Gecontroleerd zolang de app open is'}</span></div><div id="hdord"></div></div>
    </div><aside class="hdside"><div class="card tkcard"><div class="chead"><h2>Order plaatsen</h2></div><div id="hdtk"></div></div>
      <div class="card"><div class="chead"><h2>Verdeling</h2></div><div id="hdal"></div></div>
      <div class="card"><div class="chead"><h2>Statistieken</h2></div><div id="hdst"></div></div></aside></div>
    <div class="card flush" style="margin-top:16px"><div class="chead" style="padding:18px 18px 0;flex-wrap:wrap;gap:10px"><h2>Transacties en orders</h2><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input class="inp sm" id="hdq" placeholder="Zoek asset" value="${esc(HD.q)}" style="width:140px" aria-label="Zoek in transacties"><div class="chips" id="hdf">${[['all','Alles'],['buy','Kopen'],['sell','Verkopen'],['orders','Orders']].map(([k,l])=>`<button class="chip ${HD.f===k?'on':''}" data-f="${k}">${l}</button>`).join('')}</div></div></div><div id="hdtx"></div></div>
    <p class="disc">Oefenhandel met virtueel geld, voor leren en uitproberen. Uitvoering tegen de koers van het moment van controle; echte beurzen kennen spreads, slippage en andere kosten. Geen financieel advies.</p>`,
  async mount(el){
    const tk=$('#hdtk',el);const pre=LS.get('tkpre',null);Ticket.mount(tk,pre?{sym:pre.sym,kind:pre.kind,side:pre.side}:{sym:'BTC'});LS.set('tkpre',null);
    tk.addEventListener('traded',()=>this.live(el,null,'calc'));
    $('#hdrng',el).onclick=e=>{const b=e.target.closest('[data-r]');if(!b)return;HD.range=b.dataset.r;$$('#hdrng button',el).forEach(x=>x.classList.toggle('on',x===b));this.chart(el)};
    $('#hdf',el).onclick=e=>{const b=e.target.closest('[data-f]');if(!b)return;HD.f=b.dataset.f;$$('#hdf .chip',el).forEach(x=>x.classList.toggle('on',x===b));this.tx(el)};
    $('#hdq',el).oninput=e=>{HD.q=e.target.value;this.tx(el)};
    $('#hdreset',el).onclick=()=>dlg(`<h2>Opnieuw beginnen?</h2><p class="muted">Je krijgt weer € 10.000 oefengeld. Posities, orders, transacties en je waardeverloop worden gewist.</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="no">Annuleren</button><button class="btn" id="yes">Opnieuw beginnen</button></div>`,c=>{$('#no',c).onclick=closeOverlay;$('#yes',c).onclick=async()=>{try{await PT.reset();closeOverlay();UI.toast({kind:'success',title:'Je begint opnieuw met € 10.000 oefengeld'});this.live(el,null,'calc')}catch(x){UI.toast({kind:'error',title:'Niet gelukt',body:x.message})}}});
    $('#hdcsv',el).onclick=()=>{const P=PT.P;if(!P)return;const L=[['datum','tijd','type','uitvoering','asset','aantal','koers_eur','bedrag_eur','kosten_eur','resultaat_eur','bron']].concat((P.trades||[]).map(t=>[new Date(t.t).toISOString().slice(0,10),hhmm(t.t),t.side==='buy'?'koop':'verkoop',t.via||'market',t.sym,t.qty,t.price,t.eur,t.fee??'',t.pnl??'',t.src||'']));
      downloadFile('vantis-oefenhandel.csv',L.map(r=>r.map(v=>typeof v==='number'?String(v).replace('.',','):'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\n'),'text/csv')};
    el.addEventListener('click',async e=>{const b=e.target.closest('[data-tr]');if(b){e.preventDefault();e.stopPropagation();const [act,sym,kind]=b.dataset.tr.split('|');const P=PT.P;const h=P?.holdings?.[sym];const q=PT.px(sym,kind);
        const patch={sym,kind,side:act==='buy'?'buy':'sell',type:act==='stop'?'stop':act==='tp'?'limit':'market',all:false,amt:'',lvl:''};
        if(act==='stop'&&q)patch.lvl=nlN(q.p*.95,q.p>=100?2:4).replace(/\./g,'');if(act==='tp'&&q)patch.lvl=nlN(q.p*1.1,q.p>=100?2:4).replace(/\./g,'');if((act==='stop'||act==='tp'||act==='sellall')&&h)patch.all=true;
        Ticket.set(tk,patch);tk.closest('.card').scrollIntoView({behavior:'smooth',block:'start'});tk.closest('.card').classList.add('glow');setTimeout(()=>tk.closest('.card')?.classList.remove('glow'),1200);return}
      const c=e.target.closest('[data-cancel]');if(c){c.disabled=true;try{await PT.cancel(+c.dataset.cancel);UI.toast({kind:'info',title:'Order geannuleerd'});this.live(el,null,'calc')}catch(x){UI.toast({kind:'error',title:'Niet gelukt',body:x.message})}}});
    await PT.load();Object.keys(PT.P?.holdings||{}).forEach(s=>{const h=PT.P.holdings[s];if(h.k==='stock')PT.quote(s,'stock').then(()=>this.live(el,null,'tick'))});this.live(el,null,'calc')},
  live(el,arg,kind){if(!$('#hdk',el))return;if(PT.err){$('#hdk',el).innerHTML=`<div class="callout warn" style="grid-column:1/-1">${esc(PT.err)}</div>`;return}const P=PT.P;if(!P)return;const c=pfCalc(P);
    $('#hdk',el).innerHTML=kpi('Totale waarde',eur2(c.tot),`<span class="${cls(c.ret)}">${sgnEur(c.ret)} (${pct(c.retP)})</span> sinds start`)+kpi('Vandaag',c.dayCh!=null?`<span class="${cls(c.dayCh)}">${sgnEur(c.dayCh)}</span>`:'—',c.dayP!=null?pct(c.dayP)+' in 24 uur':'nog geen 24 uur historie')+
      kpi('Vrij saldo',eur2(P.cash),`${nlN(c.tot?P.cash/c.tot*100:100,0)}% van je portefeuille`)+kpi('Belegd',eur2(c.inv),`${c.rows.length} ${c.rows.length===1?'positie':'posities'} · ongerealiseerd <span class="${cls(c.unreal)}">${sgnEur(c.unreal)}</span>`)+
      kpi('Gerealiseerd',`<span class="${cls(P.realized)}">${sgnEur(P.realized)}</span>`,`kosten betaald ${eur2(P.fees||0)}`);
    $('#hdpsub',el).textContent=c.rows.length?`${c.rows.length} ${c.rows.length===1?'positie':'posities'} · ${eur2(c.inv)}`:'';
    $('#hdpos',el).innerHTML=c.rows.length?`<div class="tw"><table class="stack hdt"><thead><tr><th>Asset</th><th class="n">Aantal</th><th class="n">Koers</th><th class="n">Waarde</th><th class="n">Resultaat</th><th class="n"></th></tr></thead><tbody>${c.rows.map(r=>`<tr onclick="if(!event.target.closest('button,a'))location.hash='#asset-${r.sym.toLowerCase()}'">
      <td data-l="Asset">${r.a?an(r.a):`<b>${esc(r.sym)}</b>`}</td><td class="n" data-l="Aantal">${qtyFmt(r.h.qty)}<br><small class="faint">gem. ${eur(r.avg)}</small></td>
      <td class="n" data-l="Koers">${r.p!=null?eur(r.p):'—'}<br><small class="${cls(r.ch24)}">${r.ch24!=null?pct(r.ch24):''}</small></td><td class="n" data-l="Waarde"><b>${r.v!=null?eur2(r.v):'—'}</b><br><small class="faint">${nlN(r.w,1)}% van totaal</small></td>
      <td class="n ${cls(r.res)}" data-l="Resultaat">${sgnEur(r.res)}<br><small>${r.resP!=null?pct(r.resP):''}</small></td>
      <td class="acts" data-l="Acties"><div class="pacts"><button class="btn sm gobuy" data-tr="buy|${r.sym}|${r.kind}">Koop</button><button class="btn sm gosell" data-tr="sell|${r.sym}|${r.kind}">Verkoop</button><button class="btn sm ghost" data-tr="stop|${r.sym}|${r.kind}" title="Stop-loss instellen">Stop-loss</button><button class="btn sm ghost" data-tr="tp|${r.sym}|${r.kind}" title="Winst nemen instellen">Winst</button></div></td></tr>`).join('')}</tbody></table></div>`
      :`<div style="padding:18px"><div class="empty">Nog geen posities. Kies rechts een crypto of aandeel en koop voor een bedrag naar keuze. Je start met € 10.000 oefengeld.</div></div>`;
    const open=(P.orders||[]).filter(o=>o.status==='open');
    $('#hdord',el).innerHTML=open.length?`<div class="tw"><table class="stack hdt"><thead><tr><th>Order</th><th>Asset</th><th class="n">Niveau</th><th class="n">Koers nu</th><th class="n">Afstand</th><th class="n">Hoeveel</th><th></th></tr></thead><tbody>${open.map(o=>{const q=PT.px(o.sym,o.kind);const a=getAsset(o.sym);const dist=q?(o.lvl/q.p-1)*100:null;
      return `<tr style="cursor:default"><td data-l="Order"><span class="otag ${o.side}">${esc(ordLbl(o))}</span><br><small class="faint">${ago(o.created)}</small></td><td data-l="Asset">${a?an(a):esc(o.sym)}</td><td class="n" data-l="Niveau"><b>${eur(o.lvl)}</b></td><td class="n" data-l="Koers nu">${q?eur(q.p):'—'}</td><td class="n" data-l="Afstand">${dist!=null?pct(dist,1):'—'}</td>
      <td class="n" data-l="Hoeveel">${o.allq?'alles':o.qty!=null?qtyFmt(o.qty)+' '+esc(o.sym):eur2(o.eur)}</td><td class="acts" data-l="Acties"><button class="btn sm ghost" data-cancel="${o.id}">Annuleren</button></td></tr>`}).join('')}</tbody></table></div>`
      :`<div style="padding:18px"><div class="empty">Geen open orders. Kies in het orderticket <b>Limiet</b> of <b>Stop</b>, of zet bij een aankoop winst nemen en stop-loss aan.</div></div>`;
    const parts=c.rows.filter(r=>(r.v??0)>0).slice(0,8).map((r,i)=>({l:r.sym,v:r.v,c:PAL[i%PAL.length]}));const rest=c.rows.slice(8).reduce((s,r)=>s+(r.v||0),0);if(rest>0)parts.push({l:'Overig',v:rest,c:'#B8C2D1'});if(P.cash>0)parts.push({l:'Saldo',v:P.cash,c:'#E2E7EE'});
    const cr=c.rows.filter(r=>r.kind==='crypto').reduce((s,r)=>s+(r.v||0),0),sk=c.rows.filter(r=>r.kind==='stock').reduce((s,r)=>s+(r.v||0),0);
    $('#hdal',el).innerHTML=`<div class="alw">${donut(parts)}<div class="alleg">${parts.map(p=>`<div><i style="background:${p.c}"></i><span>${esc(p.l)}</span><b class="num">${nlN(p.v/c.tot*100,1)}%</b></div>`).join('')}</div></div><div class="alsplit"><span>Crypto <b>${nlN(cr/c.tot*100,0)}%</b></span><span>Aandelen <b>${nlN(sk/c.tot*100,0)}%</b></span><span>Saldo <b>${nlN(P.cash/c.tot*100,0)}%</b></span></div>`;
    const S2=c.stats;const days=P.created?Math.max(1,Math.round((Date.now()-P.created)/DAY)):null;
    $('#hdst',el).innerHTML=`<dl class="stats">${[['Transacties',`${S2.n} <small>(${S2.buys} koop, ${S2.sells} verkoop)</small>`],['Winstgevende verkopen',S2.win!=null?nlN(S2.win,0)+'%':'—'],['Gem. winst / verlies',S2.avgWin!=null||S2.avgLoss!=null?`<span class="up">${S2.avgWin!=null?sgnEur(S2.avgWin):'—'}</span> / <span class="down">${S2.avgLoss!=null?sgnEur(S2.avgLoss):'—'}</span>`:'—'],
      ['Beste verkoop',S2.best?`${esc(S2.best.sym)} <span class="${cls(S2.best.pnl)}">${sgnEur(S2.best.pnl)}</span>`:'—'],['Slechtste verkoop',S2.worst?`${esc(S2.worst.sym)} <span class="${cls(S2.worst.pnl)}">${sgnEur(S2.worst.pnl)}</span>`:'—'],['Omzet',eur2(S2.vol)],['Betaalde kosten',eur2(P.fees||0)],['Bezig sinds',days?`${days} ${days===1?'dag':'dagen'}`:'—']].map(([k,v])=>`<div><dt>${k}</dt><dd class="num">${v}</dd></div>`).join('')}</dl>`;
    this.chart(el);this.tx(el);const tk=$('#hdtk',el);if(tk&&tk._tk&&!tk.contains(document.activeElement))Ticket.refresh(tk);else if(tk&&tk._tk)Ticket.refresh(tk)},
  chart(el){const P=PT.P;if(!P||!$('#hdch',el))return;const c=pfCalc(P);const lim={'24u':DAY,'7d':7*DAY,'30d':30*DAY,all:Infinity}[HD.range];let H=(P.hist||[]).filter(x=>Date.now()-x.t<=lim);
    const pts=H.map(x=>x.value).concat([c.tot]);const first=H[0]||{t:Date.now(),value:c.tot};const ch=c.tot-first.value;
    $('#hdsub',el).innerHTML=`<span class="${cls(ch)}">${sgnEur(ch)} (${pct(first.value?ch/first.value*100:0)})</span> ${HD.range==='all'?'sinds start':'in deze periode'}`;
    $('#hdch',el).innerHTML=pts.length>=3?area(pts,{h:230,fmt:v=>eur2(v),from:new Date(first.t).toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}):`<div class="achart empty" style="height:180px">Het waardeverloop vult zich na je eerste transacties${Api.authed?' en wordt elk uur bijgewerkt':''}.</div>`},
  tx(el){const P=PT.P;const box=$('#hdtx',el);if(!P||!box)return;const q=HD.q.trim().toUpperCase();
    if(HD.f==='orders'){const L=(P.orders||[]).filter(o=>(!q||o.sym.includes(q))&&o.status!=='open');box.innerHTML=L.length?`<div class="tw"><table class="stack hdt"><thead><tr><th>Datum</th><th>Order</th><th>Asset</th><th class="n">Niveau</th><th>Status</th></tr></thead><tbody>${L.map(o=>`<tr style="cursor:default"><td data-l="Datum">${dmy(o.done||o.created)} ${hhmm(o.done||o.created)}</td><td data-l="Order"><span class="otag ${o.side}">${esc(ordLbl(o))}</span></td><td data-l="Asset"><b>${esc(o.sym)}</b></td><td class="n" data-l="Niveau">${eur(o.lvl)}</td><td data-l="Status"><span class="tag ${o.status==='filled'?'up':o.status==='failed'?'down':''}">${{filled:'Uitgevoerd',cancelled:'Geannuleerd',failed:'Mislukt'}[o.status]||o.status}</span>${o.price?` tegen ${eur(o.price)}`:''}${o.note&&o.status==='failed'?`<br><small class="faint">${esc(o.note)}</small>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<div style="padding:18px"><div class="empty">Nog geen afgeronde orders.</div></div>';return}
    const L=(P.trades||[]).filter(t=>(HD.f==='all'||t.side===HD.f)&&(!q||t.sym.includes(q)));
    box.innerHTML=L.length?`<div class="tw"><table class="stack hdt"><thead><tr><th>Datum</th><th>Type</th><th>Asset</th><th class="n">Aantal</th><th class="n">Koers</th><th class="n">Bedrag</th><th class="n">Kosten</th><th class="n">Resultaat</th></tr></thead><tbody>${L.slice(0,150).map(t=>`<tr style="cursor:default"><td data-l="Datum">${dmy(t.t)} ${hhmm(t.t)}</td>
      <td data-l="Type"><span class="otag ${t.side}">${t.side==='buy'?'Koop':'Verkoop'}</span>${t.via&&t.via!=='market'?` <small class="faint">${esc({limit:'limiet',stop:'stop','stop-loss':'stop-loss','take-profit':'winst nemen'}[t.via]||t.via)}</small>`:''}</td><td data-l="Asset"><b>${esc(t.sym)}</b>${t.src?`<br><small class="faint">via ${esc(t.src)}</small>`:''}</td>
      <td class="n" data-l="Aantal">${qtyFmt(t.qty)}</td><td class="n" data-l="Koers">${eur(t.price)}</td><td class="n" data-l="Bedrag">${eur2(t.eur)}</td><td class="n" data-l="Kosten">${t.fee!=null?eur2(t.fee):'—'}</td><td class="n ${cls(t.pnl)}" data-l="Resultaat">${t.pnl!=null?sgnEur(t.pnl):''}</td></tr>`).join('')}</tbody></table></div>`
      :`<div style="padding:18px"><div class="empty">${(P.trades||[]).length?'Geen transacties die hierbij passen.':'Nog geen transacties.'}</div></div>`}
};
/* Portefeuille: de oefen-tab gaat nu naar Handelen */
{const ph=Pages.portefeuille.html;Pages.portefeuille.html=()=>{if(PF.tab==='oefen')PF.tab='mijn';return ph().replace(/<button data-t="oefen"[^>]*>Oefenportefeuille<\/button>/,`<button onclick="location.hash='#handel'">Oefenportefeuille →</button>`)}}

/* ---------------- Assetpagina: direct kopen en verkopen ---------------- */
{const ah=Pages.asset.html,am=Pages.asset.mount,al=Pages.asset.live;
  Pages.asset.html=arg=>{let h=ah(arg);const a=getAsset(arg);if(!a)return h;
    h=h.replace('<button class="btn ghost" id="palert">',`<button class="btn gobuy" id="abuy">${ico('trade')}Kopen</button><button class="btn ghost" id="asell">Verkopen</button><button class="btn ghost" id="palert">`);
    const marker=`<div class="card"><div class="chead"><h2>${gl('senti','Vantis Sentiment')}</h2>`;
    return h.replace(marker,`<div class="card tkcard" id="atcard"><div class="chead"><h2>Handelen</h2><a class="lnk" href="#handel">Mijn oefenportefeuille →</a></div><div id="atk"></div></div>`+marker)};
  Pages.asset.mount=function(el,arg){am.call(this,el,arg);const a=getAsset(arg);if(!a)return;const box=$('#atk',el);
    if(box)Ticket.mount(box,{sym:a.sym,kind:a.kind,fixed:true,compact:true});
    const go=side=>{if(box&&window.innerWidth>900){Ticket.set(box,{side});box.closest('.card').scrollIntoView({behavior:'smooth',block:'center'});box.closest('.card').classList.add('glow');setTimeout(()=>box.closest('.card')?.classList.remove('glow'),1200);setTimeout(()=>$('[data-in="amt"]',box)?.focus(),350)}else tradeDialog(a.sym,side)};
    $('#abuy',el)&&($('#abuy',el).onclick=()=>go('buy'));$('#asell',el)&&($('#asell',el).onclick=()=>go('sell'));
    if(a.kind==='stock'&&a.price==null)PT.quote(a.sym,'stock').then(r=>{if(r&&UI.el===el)this.live(el,arg,'calc')})};
  Pages.asset.live=function(el,arg,kind){al.call(this,el,arg,kind);const b=$('#atk',el);if(b&&b._tk)Ticket.refresh(b)};
}
/* Markten- en watchlistrijen: snelknop kopen (via een venster) */
document.addEventListener('click',e=>{const b=e.target.closest('[data-qbuy]');if(!b)return;e.preventDefault();e.stopPropagation();tradeDialog(b.dataset.qbuy,'buy')},true);

/* ---------------- MELDINGEN: groter, duidelijker, met geluid en trillen ---------------- */
const NX={ctx:null,hiddenCount:0,baseTitle:document.title,
  important:a=>a.kind==='order'||a.cat==='order'||a.cat==='alert'||(a.score||0)>=80||a.important,
  kindOf(a){if(a.kind)return a.kind;if(a.cat==='order')return 'order';if(a.cat==='alert')return 'alert';if(a.cat==='reminder')return 'reminder';if(a.score)return a.score>=80?'hot':'impact';return 'info'},
  chime(strong){if(S.settings.sound===false)return;try{const C=this.ctx||(this.ctx=new (window.AudioContext||window.webkitAudioContext)());if(C.state==='suspended')C.resume();const t=C.currentTime;
    (strong?[[784,0],[1046,.13],[1318,.26]]:[[880,0],[1175,.11]]).forEach(([f,d])=>{const o=C.createOscillator(),g=C.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t+d);g.gain.linearRampToValueAtTime(strong?.22:.12,t+d+.015);g.gain.exponentialRampToValueAtTime(.0001,t+d+.45);o.connect(g).connect(C.destination);o.start(t+d);o.stop(t+d+.5)})}catch(e){}},
  buzz(strong){if(S.settings.vibrate===false)return;try{navigator.vibrate&&navigator.vibrate(strong?[220,90,220,90,320]:[120])}catch(e){}},
  ring(){const b=$('#bell');if(!b)return;b.classList.remove('ring');void b.offsetWidth;b.classList.add('ring')},
  flagTitle(t){if(!document.hidden)return;this.hiddenCount++;const base=this.baseTitle;let on=false;clearInterval(this.ti);this.ti=setInterval(()=>{on=!on;document.title=on?`(${this.hiddenCount}) ${t}`:base;if(!document.hidden){clearInterval(this.ti);document.title=base;this.hiddenCount=0}},1100)}
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){clearInterval(NX.ti);document.title=NX.baseTitle;NX.hiddenCount=0}});
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(!NX.ctx&&S.settings.sound!==false){try{NX.ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}},{once:true}));
const TKIND={success:['check','Gelukt'],error:['warn','Niet gelukt'],info:['bell','Melding'],order:['trade','Order'],alert:['alarm','Koersalert'],hot:['impact','Hoge impact'],impact:['impact','Impact'],reminder:['cal','Herinnering']};
UI.toast=function(a){
  const kind=NX.kindOf(a);const imp=NX.important(a)&&kind!=='success'&&kind!=='error'&&S.settings.bigAlerts!==false;const [icn,lbl]=TKIND[kind]||TKIND.info;
  const ms=imp?0:kind==='error'?9000:a.href||a.act?8000:5500;
  const t=document.createElement('div');t.className=`tst k-${kind}${imp?' big':''}`;t.setAttribute('role',imp||kind==='error'?'alert':'status');
  t.innerHTML=`<span class="tic">${ico(IC[icn]?icn:'bell')}</span><div class="tbd"><div class="tmeta">${esc(a.score?`Impact ${a.score}/100`:lbl)} · ${hhmm(Date.now())}</div><b>${esc(a.title)}</b>${a.body?`<p>${esc(a.body).slice(0,220)}</p>`:''}${a.href||a.act||imp?`<div class="tact">${a.href||a.act?`<button class="tgo">Bekijken</button>`:''}${imp?'<button class="tok">Gezien</button>':''}</div>`:''}</div><button class="tx" aria-label="Sluiten">${ico('x')}</button>${ms?`<i class="tbar" style="animation-duration:${ms}ms"></i>`:''}`;
  const close=()=>{t.classList.add('out');setTimeout(()=>t.remove(),220)};let timer=ms?setTimeout(close,ms):null;
  t.addEventListener('mouseenter',()=>{if(timer){clearTimeout(timer);timer=null;t.classList.add('hold')}});t.addEventListener('mouseleave',()=>{if(ms&&!timer){t.classList.remove('hold');timer=setTimeout(close,2500)}});
  t.addEventListener('click',e=>{if(e.target.closest('.tx')||e.target.closest('.tok'))return close();if(a.act){close();a.act()}else if(a.href){close();UI.go(a.href)}});
  const box=$('#toasts');box.prepend(t);while(box.children.length>4)box.lastChild.remove();
  if(imp||kind==='order'||kind==='alert'){NX.chime(imp);NX.buzz(imp);NX.ring();NX.flagTitle(a.title)}else if(kind!=='success'&&kind!=='error'&&kind!=='info')NX.chime(false);
};
{const ob=UI.badge;UI.badge=function(){const before=+($('#bellc')?.textContent||0);ob.call(this);const n=NC.unread();const b=$('#bellc');if(b){b.classList.toggle('pulse',n>0);if(n>before)NX.ring()}document.title=n&&!document.hidden?`(${n>99?'99+':n}) ${NX.baseTitle}`:NX.baseTitle}}
/* servermeldingen (koersalerts, uitgevoerde orders, impact) die binnenkomen terwijl de app open is */
{const op=NC.pull.bind(NC);let first=true;NC.pull=async function(){await op();const seen=new Set(LS.get('srvseen',[]));const since=LS.get('srvseenT',Date.now()-10*MIN);const fresh=this.srv.filter(n=>!seen.has(n.id)&&n.t>since&&Date.now()-n.t<30*MIN).sort((a,b)=>a.t-b.t);
  this.srv.forEach(n=>seen.add(n.id));LS.set('srvseen',[...seen].slice(-400));LS.set('srvseenT',Date.now());
  fresh.slice(-3).forEach(n=>UI.toast({title:n.title,body:n.body,href:n.url?UI.link(n.url):null,cat:n.cat,score:n.score}));if(fresh.length&&UI.cur==='handel'&&UI.el)PT.load().then(()=>Pages.handel.live(UI.el,null,'calc'));first=false}}
setInterval(()=>{if(Api.authed&&!document.hidden)NC.pull()},45000);
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{const d=e.data||{};if(d.type==='push'){NC.pull()}});
CATLBL.order='Order';
/* instellingen: geluid, trillen, grote meldingen, orderbevestiging */
{const ih=Pages.instellingen.html,im=Pages.instellingen.mount;
  Pages.instellingen.html=function(){const s=S.settings;const sw=(id,on)=>`<label class="sw"><input type="checkbox" id="${id}" ${on?'checked':''}><span></span></label>`;
    return ih.call(this)+`<div class="card" style="margin-top:16px"><div class="chead"><h2>Meldingen in de app</h2><button class="btn ghost sm" id="nxtest">Voorbeeld tonen</button></div>
      <div class="set"><div><b>Grote meldingen voor koersalerts en orders</b><p>Blijven staan tot je ze wegklikt, met een opvallende rand en animatie. Geldt ook voor gebeurtenissen met impact 80 of hoger.</p></div>${sw('nxbig',s.bigAlerts!==false)}</div>
      <div class="set"><div><b>Geluid</b><p>Een kort signaal bij een nieuwe melding; een duidelijker signaal bij koersalerts en orders.</p></div>${sw('nxsnd',s.sound!==false)}</div>
      <div class="set"><div><b>Trillen</b><p>Op telefoons die het ondersteunen.</p></div>${sw('nxvib',s.vibrate!==false)}</div>
      <div class="set"><div><b>Bevestigen voor elke order</b><p>Bij Handelen eerst een bevestigingsstap voordat een order wordt geplaatst.</p></div>${sw('nxconf',s.confirmOrders!==false)}</div></div>`};
  Pages.instellingen.mount=function(el,arg){im.call(this,el,arg);const s=S.settings;const bind=(id,k)=>{const x=$('#'+id,el);if(x)x.onchange=()=>{s[k]=x.checked;saveSettings()}};bind('nxbig','bigAlerts');bind('nxsnd','sound');bind('nxvib','vibrate');bind('nxconf','confirmOrders');
    const t=$('#nxtest',el);if(t)t.onclick=()=>{UI.toast({cat:'alert',title:'Koersalert: Bitcoin boven € 60.000',body:'Zo ziet een koersalert eruit. Klik op Gezien om hem weg te halen.',href:'#meldingen'});setTimeout(()=>UI.toast({kind:'success',title:'Gekocht: 0,0178 BTC',body:'Voorbeeld van een orderbevestiging · oefengeld'}),900)}}}

/* ---------------- OVERZICHT: zelf indelen ---------------- */
const OVW={third:'⅓',half:'½',wide:'⅔',full:'Vol'};const OVWL={third:'een derde',half:'de helft',wide:'twee derde',full:'de volle breedte'};
const PULSE={breadth:'Marktbreedte',volume:'Handelsvolume',senti:'Sentiment',cap:'Totale marktwaarde',dom:'Bitcoin-dominantie',fng:'Fear & Greed-index'};
const OV={edit:false,
  DEF:{blocks:[['brief','full',1],['prices','full',1],['pulse','full',1],['chart','wide',1],['senti','third',1],['heat','half',1],['impact','half',1],['why','third',1],['movers','third',1],['events','third',1],['paper','half',0],['watch','half',0],['stocks','half',0],['news','half',0],['notif','half',0]],
    prices:['BTC','ETH','SOL','XRP'],stocks:['NVDA','AAPL','MSFT','ASML','TSLA'],pulse:Object.keys(PULSE),chart:'BTC',why:'BTC'},
  cfg(){const d=this.DEF,h=S.settings.home||{};const have=new Set((h.blocks||[]).map(b=>b.id));
    const blocks=(h.blocks||[]).filter(b=>this.B[b.id]).concat(d.blocks.filter(([id])=>!have.has(id)).map(([id,w,on])=>({id,w,on:!!on})));
    return {blocks,prices:h.prices||d.prices,stocks:h.stocks||d.stocks,pulse:h.pulse||d.pulse,chart:h.chart||d.chart,why:h.why||d.why}},
  save(c){S.settings.home=c;saveSettings()},
  B:{}
};
const ovA=sym=>getAsset(sym);
const ovPx=a=>{if(!a)return null;if(a.kind==='stock'&&(a.price==null||a.srvQ)){const q=PT.q[PT.key(a.sym,'stock')];if(!q||Date.now()-q.t>3*MIN)PT.quote(a.sym,'stock')}return a.price};
OV.B.brief={t:'Ochtendbriefing',d:'Banner met de briefing van vandaag, zodra die er is.',html:()=>`<a class="brban hidden" id="brban" href="#briefing"></a>`,
  mount(el){(async()=>{try{if(!BR.d&&Api.on){const d=await Api.call('/api/briefing');if(!d.pending)BR.d=d}}catch(e){}const b=$('#brban',el);if(b&&BR.d){b.innerHTML=`${ico('sun')}<span><small>Ochtendbriefing · ${esc(BR.d.day)}</small><b>${esc(BR.d.headline)}</b></span><span class="lnk">Lees →</span>`;b.classList.remove('hidden')}else if(OV.edit&&b){b.classList.remove('hidden');b.innerHTML=`${ico('sun')}<span><small>Ochtendbriefing</small><b>Verschijnt elke ochtend om 08:00</b></span>`}})()},bare:true};
OV.B.prices={t:'Mijn koersen',d:'Koerstegels voor de crypto en aandelen die jij kiest.',cfg:'prices',bare:true,html:()=>`<section class="kpis auto" id="kpis"></section>`,
  live(el){const c=OV.cfg();const L=c.prices.map(ovA).filter(Boolean);const box=$('#kpis',el);if(!box)return;
    if(!S.crypto.size){box.innerHTML=`<div style="grid-column:1/-1">${noData()}</div>`;return}
    const old=$$('.kv',box).map(x=>x.textContent);
    box.innerHTML=L.length?L.map(a=>{const p=ovPx(a);return kpi(`${ab(a)} ${esc(a.name)}`,p!=null?money(a,p):'—',`<span class="${cls(a.ch24)}">${pct(a.ch24)}</span> ${a.kind==='stock'?'vandaag':'24u'}`,a.kind==='crypto'?spark(hseries(a)||series(a),120,30):`<div class="ks">${a.srvQ?'via '+esc(a.srvQ):''}</div>`,'#asset-'+a.sym.toLowerCase())}).join(''):`<div class="kpi"><div class="kl">Nog geen koersen gekozen</div><div class="ks"><button class="lnk" data-ovcfg="prices">Kies je koersen →</button></div></div>`;
    $$('.kv',box).forEach((x,i)=>{if(old[i]&&old[i]!==x.textContent&&/[0-9]/.test(old[i])){const p=s=>parseFloat(s.replace(/[^0-9,−-]/g,'').replace(',','.'));const a=p(old[i]),b=p(x.textContent);if(isFinite(a)&&isFinite(b)&&a!==b)x.classList.add(b>a?'flash-up':'flash-down')}})}};
OV.B.pulse={t:'Marktpuls',d:'Marktbreedte, volume, sentiment, marktwaarde, dominantie en Fear & Greed. Kies zelf welke.',cfg:'pulse',bare:true,html:()=>`<section class="kpis auto" id="kpis2"></section>`,
  live(el){const c=OV.cfg();const mk=S.market,o=S.senti.overall,X=S.extra||{},g=X.global,f=X.fng&&X.fng[0];const box=$('#kpis2',el);if(!box)return;
    const T={breadth:()=>kpi(gl('breadth','Marktbreedte'),mk.n?Math.round(mk.breadth*100)+'%':'—',mk.n?`van top-${mk.n} stijgt`:'',mk.n?`<div class="kbar"><i style="width:${Math.round(mk.breadth*100)}%;background:var(--${mk.breadth<.4?'down':mk.breadth>.6?'up':'ink3'})"></i></div>`:'','#markten'),
      volume:()=>kpi(gl('volume','Handelsvolume'),mk.volRegime?nlN(mk.volRegime,2)+'×':'—','t.o.v. 30-daags gemiddelde',mk.volRegime?`<div class="kbar"><i style="width:${clamp(mk.volRegime/2*100,4,100)}%;background:var(--ink2)"></i></div>`:'','#markten'),
      senti:()=>kpi(gl('senti','Sentiment'),o?esc(o.l):'—',o?`score ${o.score>0?'+':''}${Math.round(o.score)}`:'berekenen…',`<div class="kg">${gauge(o?.score,{w:110,sw:9})}</div>`),
      cap:()=>kpi(gl('cap','Totale cryptomarktwaarde'),g?big(g.cap):'—',g?`<span class="${cls(g.capCh)}">${pct(g.capCh)}</span> 24u · ${esc(g.src||'CoinGecko')}`:(Api.on?'laden via server…':'alleen via de online app')),
      dom:()=>kpi(gl('dom','Bitcoin-dominantie'),g?nlN(g.btcDom,1)+'%':'—',g?`${g.ethDom!=null?`Ethereum ${nlN(g.ethDom,1)}% · `:''}${esc(g.src||'CoinGecko')}`:'aandeel van Bitcoin in de markt',g?`<div class="kbar"><i style="width:${clamp(g.btcDom,0,100)}%;background:var(--ink2)"></i></div>`:''),
      fng:()=>kpi(gl('fng','Fear & Greed-index'),f?f.v+' / 100':'—',f?`${esc(({'Extreme Fear':'Extreme angst','Fear':'Angst','Neutral':'Neutraal','Greed':'Hebzucht','Extreme Greed':'Extreme hebzucht'})[f.l]||f.l)} · alternative.me`:'externe index, los van Vantis',f?`<div class="kbar fng"><i style="left:${f.v}%"></i></div>`:'')};
    box.innerHTML=c.pulse.filter(k=>T[k]).map(k=>T[k]()).join('')||`<div class="kpi"><div class="kl">Geen tegels gekozen</div></div>`}};
OV.B.chart={t:'Koersgrafiek',d:'Grafiek van een crypto naar keuze, 24 uur of 30 dagen.',cfg:'chart',
  html:()=>{const a=ovA(OV.cfg().chart)||S.crypto.get('BTC');return `<div class="card"><div class="chead"><div><div class="kicker" style="margin:0">${esc(a?.name||'Bitcoin')}</div><div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><span class="dprice" id="bprice">—</span><span id="bchg" class="num" style="font-weight:600"></span></div></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><div class="seg" id="brange"><button data-r="24u" class="${DV.range==='24u'?'on':''}">24 uur</button><button data-r="30d" class="${DV.range==='30d'?'on':''}">30 dagen</button></div>${a?`<button class="btn sm gobuy" data-qbuy="${a.sym}">Kopen</button>`:''}</div></div><div id="bchart"></div><div class="bfoot" id="bfoot"></div></div>`},
  mount(el){const a=ovA(OV.cfg().chart);if(a&&a.kind==='crypto')loadHourlyFor(a).then(()=>{if(UI.el===el)OV.B.chart.live(el,'calc')});$('#brange',el)&&($('#brange',el).onclick=e=>{const b=e.target.closest('[data-r]');if(!b)return;DV.range=b.dataset.r;$$('#brange button',el).forEach(x=>x.classList.toggle('on',x===b));OV.B.chart.live(el,'calc')})},
  live(el,kind){const a=ovA(OV.cfg().chart)||S.crypto.get('BTC');if(!a||a.price==null||!$('#bchart',el))return;const ser=DV.range==='24u'?(hseries(a)||series(a)):series(a);
    $('#bprice',el).textContent=eur(a.price);$('#bchg',el).innerHTML=`<span class="${cls(a.ch24)}">${pct(a.ch24)}</span> <span class="faint" style="font-weight:400">24 uur</span>`;
    if(kind==='calc'||!$('#bchart',el).dataset.f){$('#bchart',el).dataset.f=1;$('#bchart',el).innerHTML=area(ser,{h:270,fmt:v=>eur(v),from:DV.range==='24u'&&a.hr?'24 uur geleden':'30 dagen geleden'})}
    const m=a.m||{};$('#bfoot',el).innerHTML=[['24u hoog',eur(a.high)],['24u laag',eur(a.low)],['Volume',big(a.volQ)],['Volatiliteit',m.vol?nlN(m.vol,1)+'%':'—'],['RSI',m.rsi!=null?nlN(m.rsi,0):'—']].map(([k,v])=>`<div><small>${k}</small><b class="num">${v}</b></div>`).join('')+`<div class="src" style="grid-column:1/-1">Bron: Bitvavo ${esc(a.market||a.sym+'-EUR')} · realtime · <span data-ago="${a.ts}">${ago(a.ts)}</span></div>`}};
OV.B.senti={t:'Vantis Market Sentiment',d:'De sentimentmeter met de belangrijkste redenen.',html:()=>`<div class="card senti-card"><div class="chead"><h2>${gl('senti','Vantis Market Sentiment')}</h2><span class="src" id="sage"></span></div><div id="sbox"></div></div>`,
  live(el){const o=S.senti.overall,c=S.senti.crypto,s=S.senti.stocks,last=S.sentiLog.find(l=>l.key==='overall');if(!$('#sbox',el))return;
    $('#sage',el).innerHTML=`herberekend <span data-ago="${S.lastCalc}">${ago(S.lastCalc)}</span>`;const row=(n,v,href,na)=>`<a class="srow" href="${href}"><span>${n}</span>${v?senti(v,true):`<span class="senti sna">${na||'—'}</span>`}</a>`;
    $('#sbox',el).innerHTML=`<div class="sgauge">${gauge(o?.score,{w:260,sw:18})}<div class="sl">${o?esc(o.l):'Berekenen…'}</div><div class="src">${s?'crypto + aandelen':'crypto · aandelen niet gekoppeld'}</div></div>
      <ul class="why-list">${(o?.reasons||[]).slice(0,3).map(r=>`<li class="${r.v>0.05?'up':r.v<-0.05?'down':''}"><i></i>${esc(r.t)}</li>`).join('')}</ul>
      <div class="srows">${row('Crypto',c,'#markten')}${row('Aandelen',s,s?'#aandelen':'#instellingen','Koppelen')}${row('Bitcoin',S.senti.BTC,'#asset-btc')}${row('Ethereum',S.senti.ETH,'#asset-eth')}</div>
      <div class="src" style="margin-top:10px">${last?`Laatste wijziging ${dmy(last.t)} ${hhmm(last.t)}: ${esc(last.from)} → <b>${esc(last.to)}</b>`:'Sinds openen niet gewijzigd'}</div>`}};
OV.B.heat={t:'Heatmap cryptomarkt',d:'De grootste munten in één oogopslag, gekleurd naar 24-uursbeweging.',html:()=>`<div class="card"><div class="chead"><h2>Cryptomarkt in één oogopslag</h2><span class="src">24 uur · top-34 op volume</span></div><div id="dheat"></div><div class="heatleg"><span>−6%</span><i></i><span>+6%</span></div></div>`,
  live(el,kind){const b=$('#dheat',el);if(!b||(kind!=='calc'&&b.dataset.f))return;b.dataset.f=1;b.innerHTML=heatmap(deepList().filter(a=>a.ch24!=null).sort((a,b)=>b.volQ-a.volQ).slice(0,34))}};
OV.B.impact={t:'Impact-feed',d:'De gebeurtenissen met de hoogste impactscore.',html:()=>`<div class="card"><div class="chead"><h2>Impact-feed</h2><a class="lnk" href="#impact">Alles →</a></div><div id="dimp"></div></div>`,
  live(el,kind){const b=$('#dimp',el);if(!b||(kind!=='calc'&&b.dataset.f))return;b.dataset.f=1;const ev=[...S.events.values()].sort((a,b)=>b.score-a.score||b.first-a.first).slice(0,4);b.innerHTML=ev.length?ev.map(e=>impRow(e)).join(''):`<div class="empty">Nog geen gebeurtenissen boven de drempel. Vantis meldt pas iets als data daar aanleiding toe geeft.</div>`}};
OV.B.why={t:'Waarom beweegt…?',d:'De oorzakenanalyse voor een crypto naar keuze.',cfg:'why',html:()=>{const a=ovA(OV.cfg().why)||S.crypto.get('BTC');return `<div class="card"><div class="chead"><h2>Waarom beweegt ${esc(a?.name||'Bitcoin')}?</h2><a class="lnk" href="#waarom-${(a?.sym||'btc').toLowerCase()}">Analyse →</a></div><div id="dwhy"></div></div>`},
  live(el,kind){const b=$('#dwhy',el);if(!b||(kind!=='calc'&&b.dataset.f))return;const a=ovA(OV.cfg().why)||S.crypto.get('BTC');if(!a)return;b.dataset.f=1;const w=a.m&&a.m.vol?whyMoving(a):null;const D=deepList().filter(x=>x.ch24!=null);
    b.innerHTML=!w?waitBox('Historie laden…'):`<p class="lead">${esc(w.summary)}</p><div class="kicker" style="margin:10px 0 2px">Zekerheid: <b style="margin-left:4px">${w.conf}</b></div>${w.causes.slice(0,3).map(c=>`<div class="cause" style="padding:9px 0"><div class="h"><span>${esc(c.k)}</span><span class="num muted">${Math.round(c.share*100)}%</span></div><div class="tr"><i style="width:${Math.round(c.share*100)}%"></i></div></div>`).join('')}
      <div class="chips" style="margin-top:12px">${D.filter(x=>x.sym!==a.sym).sort((x,y)=>Math.abs(y.m.z24||0)-Math.abs(x.m.z24||0)).slice(0,3).map(x=>`<a class="chip" style="display:inline-grid;place-items:center;text-decoration:none" href="#waarom-${x.sym.toLowerCase()}">${x.sym} <span class="${cls(x.ch24)}">&nbsp;${pct(x.ch24,1)}</span></a>`).join('')}</div>`}};
OV.B.movers={t:'Bewegers',d:'Stijgers, dalers, volume en trending, met snelknop kopen.',html:()=>`<div class="card flush"><div class="chead" style="padding:18px 18px 0"><h2>Bewegers</h2><div class="seg" id="mvseg">${[['up','Stijgers'],['down','Dalers'],['vol','Volume'],['trend','Trending']].map(([k,l])=>`<button data-m="${k}" class="${DV.mv===k?'on':''}">${l}</button>`).join('')}</div></div><div id="dmov" style="margin-top:8px"></div></div>`,
  mount(el){$('#mvseg',el)&&($('#mvseg',el).onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;DV.mv=b.dataset.m;$$('#mvseg button',el).forEach(x=>x.classList.toggle('on',x===b));OV.B.movers.live(el)})},
  live(el){const b=$('#dmov',el);if(!b)return;const D=deepList().filter(a=>a.ch24!=null);const row=(a,right)=>`<a class="mrow" href="#asset-${a.sym.toLowerCase()}">${an(a)}<span class="r"><b class="num">${eur(a.price)}</b>${right}</span><button class="qbuy" data-qbuy="${a.sym}" aria-label="Koop ${esc(a.name)}">Koop</button></a>`;
    if(DV.mv==='trend'){const T=(S.extra&&S.extra.trending)||[];b.innerHTML=T.length?T.slice(0,7).map((t,i)=>{const a=S.crypto.get(t.s);return a?row(a,`<span class="num ${cls(a.ch24)}">${pct(a.ch24)}</span>`):`<div class="mrow"><span class="an"><span class="ab">${i+1}</span><span><b>${esc(t.name)}</b><small>${esc(t.s)} · niet op Bitvavo</small></span></span><span class="r"><span class="num ${cls(t.ch)}">${t.ch!=null?pct(t.ch):''}</span></span></div>`}).join('')+'<div class="src" style="padding:10px 18px">Meest gezocht op CoinGecko</div>':`<div style="padding:18px"><div class="empty">${Api.on?'Trending laden via de server…':'Trending is beschikbaar in de online app.'}</div></div>`;return}
    const L=DV.mv==='vol'?D.filter(a=>a.m.volRatio).sort((a,b)=>b.m.volRatio-a.m.volRatio):D.slice().sort((a,b)=>DV.mv==='up'?b.ch24-a.ch24:a.ch24-b.ch24);
    b.innerHTML=L.slice(0,6).map(a=>row(a,`<span class="num ${DV.mv==='vol'?'muted':cls(a.ch24)}">${DV.mv==='vol'?nlN(a.m.volRatio,1)+'× volume':pct(a.ch24)}</span>`)).join('')||`<div style="padding:18px">${waitBox()}</div>`}};
OV.B.events={t:'Komende gebeurtenissen',d:'Macrocijfers, centrale banken en kwartaalcijfers met aftelklok.',html:()=>`<div class="card"><div class="chead"><h2>Komende gebeurtenissen</h2><a class="lnk" href="#radar">Radar →</a></div><div id="dev"></div></div>`,
  live(el,kind){const b=$('#dev',el);if(!b)return;if(kind==='calc'||!b.dataset.f){b.dataset.f=1;b.innerHTML=Radar.upcoming(4).map(evRow).join('')}$$('[data-cd]',b).forEach(c=>c.textContent=countdown(+c.dataset.cd))}};
OV.B.paper={t:'Oefenportefeuille',d:'Waarde, rendement en je grootste posities, met een knop naar Handelen.',html:()=>`<div class="card"><div class="chead"><h2>Oefenportefeuille</h2><a class="lnk" href="#handel">Handelen →</a></div><div id="ovpf">${skel(3)}</div></div>`,
  mount(el){PT.load().then(()=>{if(UI.el===el)OV.B.paper.live(el)})},
  live(el){const b=$('#ovpf',el);const P=PT.P;if(!b||!P)return;const c=pfCalc(P);
    b.innerHTML=`<div class="ovpfk"><div><small>Totale waarde</small><b class="num">${eur2(c.tot)}</b><span class="num ${cls(c.ret)}">${sgnEur(c.ret)} (${pct(c.retP)})</span></div><div><small>Vrij saldo</small><b class="num">${eur2(P.cash)}</b><span class="faint">${(P.orders||[]).filter(o=>o.status==='open').length} open orders</span></div></div>
      ${c.rows.length?c.rows.slice(0,4).map(r=>`<a class="mrow" href="#asset-${r.sym.toLowerCase()}">${r.a?an(r.a):`<b>${esc(r.sym)}</b>`}<span class="r"><b class="num">${eur2(r.v)}</b><span class="num ${cls(r.res)}">${r.resP!=null?pct(r.resP):''}</span></span></a>`).join(''):`<div class="empty">Nog geen posities. <a class="lnk" href="#handel">Begin met € 10.000 oefengeld →</a></div>`}`}};
OV.B.watch={t:'Watchlist',d:'De assets met een ster, met koers, 24-uursbeweging en snelknop kopen.',html:()=>`<div class="card flush"><div class="chead" style="padding:18px 18px 0"><h2>Watchlist</h2><a class="lnk" href="#watchlist">Alles →</a></div><div id="ovwl" style="margin-top:8px"></div></div>`,
  live(el){const b=$('#ovwl',el);if(!b)return;const L=S.watch.map(getAsset).filter(Boolean);b.innerHTML=L.length?L.slice(0,8).map(a=>{const p=ovPx(a);return `<a class="mrow" href="#asset-${a.sym.toLowerCase()}">${an(a)}${a.kind==='crypto'?spark(hseries(a)||series(a),70,24):'<span></span>'}<span class="r"><b class="num">${p!=null?money(a,p):'—'}</b><span class="num ${cls(a.ch24)}">${pct(a.ch24)}</span></span><button class="qbuy" data-qbuy="${a.sym}" aria-label="Koop ${esc(a.name)}">Koop</button></a>`}).join(''):`<div style="padding:18px"><div class="empty">Je watchlist is leeg. Tik op de ster bij een asset om hem toe te voegen.</div></div>`}};
OV.B.stocks={t:'Mijn aandelen',d:'Aandelen en ETF\'s die jij kiest, met koers en snelknop kopen.',cfg:'stocks',html:()=>`<div class="card flush"><div class="chead" style="padding:18px 18px 0"><h2>Mijn aandelen</h2><button class="lnk" data-ovcfg="stocks">Kiezen</button></div><div id="ovst" style="margin-top:8px"></div></div>`,
  live(el){const b=$('#ovst',el);if(!b)return;const L=OV.cfg().stocks.map(getAsset).filter(a=>a&&a.kind==='stock');b.innerHTML=L.length?L.map(a=>{const p=ovPx(a);return `<a class="mrow" href="#asset-${a.sym.toLowerCase()}">${an(a)}<span class="r"><b class="num">${p!=null?money(a,p):'—'}</b><span class="num ${cls(a.ch24)}">${a.ch24!=null?pct(a.ch24):a.srvQ?'':'laden…'}</span></span><button class="qbuy" data-qbuy="${a.sym}" aria-label="Koop ${esc(a.name)}">Koop</button></a>`}).join('')+`<div class="src" style="padding:10px 18px">${L.some(a=>a.srvQ)?'Koersen via de Vantis-server (Yahoo Finance)':'Koersen via Finnhub'}</div>`:`<div style="padding:18px"><div class="empty">Nog geen aandelen gekozen.</div></div>`}};
OV.B.news={t:'Laatste nieuws',d:'De nieuwste artikelen uit alle bronnen, gegroepeerd per onderwerp.',html:()=>`<div class="card"><div class="chead"><h2>Laatste nieuws</h2><a class="lnk" href="#nieuws">Alles →</a></div><div id="ovnw"></div></div>`,
  live(el,kind){const b=$('#ovnw',el);if(!b||(kind!=='calc'&&b.dataset.f))return;b.dataset.f=1;const L=S.clusters.slice(0,6);b.innerHTML=L.length?L.map(c=>clusterRow(c,true)).join(''):waitBox('Nieuws laden…')}};
OV.B.notif={t:'Laatste meldingen',d:'Koersalerts, uitgevoerde orders en impactmeldingen.',html:()=>`<div class="card"><div class="chead"><h2>Laatste meldingen</h2><a class="lnk" href="#meldingen">Alles →</a></div><div id="ovnc"></div></div>`,
  live(el){const b=$('#ovnc',el);if(!b)return;const L=NC.items().slice(0,6);b.innerHTML=L.length?L.map(x=>`<a class="srow" href="${esc(UI.link(x.url||'meldingen'))}"><span><b>${esc(x.title)}</b><br><small class="faint">${esc(CATLBL[x.cat]||'Melding')} · ${ago(x.t)}</small></span>${NC.read.has(x.id)?'':'<span class="tag navy">Nieuw</span>'}</a>`).join(''):'<div class="empty">Nog geen meldingen.</div>'}};

Pages.overzicht={
  title:()=>'Overzicht',
  html(){const c=OV.cfg();const on=c.blocks.filter(b=>b.on),off=c.blocks.filter(b=>!b.on);
    return `<div class="phead"><div><div class="kicker">${new Date().toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'})} · <span class="dot live" style="display:inline-block"></span> live</div><h1>${greet()}${uname()?', '+esc(uname()):''}</h1></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${OV.edit?`<button class="btn ghost" id="ovreset">Standaard herstellen</button><button class="btn" id="ovdone">${ico('check')}Klaar</button>`:`<button class="btn ghost" id="ovedit">${ico('edit')}Aanpassen</button><a class="btn" href="#waarom">${ico('why')}Waarom beweegt de markt?</a>`}</div></div>
      ${OV.edit?`<div class="callout ovhint"><b>Overzicht aanpassen.</b> Versleep blokken of gebruik de pijltjes, kies de breedte, zet blokken uit met het kruisje en kies bij <b>Instellen</b> welke crypto en aandelen je ziet. Wijzigingen worden direct bewaard${Api.authed?' en gesynchroniseerd met je andere apparaten':''}.</div>`:''}
      <div class="ovg ${OV.edit?'editing':''}" id="ovg">${on.map((b,i)=>this.block(b,i,on.length)).join('')}</div>
      ${OV.edit?`<div class="card ovadd"><div class="chead"><h2>Blokken toevoegen</h2><span class="src">${off.length?off.length+' beschikbaar':'Alle blokken staan aan'}</span></div><div class="ovaddl">${off.map(b=>`<button class="ovaddb" data-ovon="${b.id}"><span>${ico('plus')}</span><span><b>${esc(OV.B[b.id].t)}</b><small>${esc(OV.B[b.id].d)}</small></span></button>`).join('')||'<div class="empty">Alles staat al op je overzicht.</div>'}</div></div>`:''}
      <p class="disc">Vantis geeft marktinformatie en analyses, geen financieel advies. Scores en scenario's zijn berekend uit openbare data volgens een vaste methode en garanderen geen koersontwikkeling. Beleggen brengt risico's met zich mee; je kunt (een deel van) je inleg verliezen.</p>`},
  block(b,i,n){const B=OV.B[b.id];const w=B.bare&&['brief','prices','pulse'].includes(b.id)?'full':b.w;
    return `<section class="ovb w-${w}" data-b="${b.id}" ${OV.edit?'draggable="true"':''}>${OV.edit?`<div class="ovbar"><span class="ovgrip" title="Slepen om te verplaatsen">${ico('grip')}</span><b>${esc(B.t)}</b>
      <span class="ovctl">${B.bare?'':`<span class="seg ovw">${Object.entries(OVW).map(([k,l])=>`<button data-ovw="${k}" class="${b.w===k?'on':''}" title="Breedte: ${OVWL[k]}" aria-label="Breedte: ${OVWL[k]}">${l}</button>`).join('')}</span>`}${B.cfg?`<button class="btn sm ghost" data-ovcfg="${B.cfg}">Instellen</button>`:''}
      <button class="ibtn sm" data-ovmv="-1" ${i===0?'disabled':''} aria-label="Omhoog">${ico('up')}</button><button class="ibtn sm" data-ovmv="1" ${i===n-1?'disabled':''} aria-label="Omlaag">${ico('down')}</button><button class="ibtn sm" data-ovoff="${b.id}" aria-label="Verbergen">${ico('x')}</button></span></div>`:''}<div class="ovbody">${B.html()}</div></section>`},
  mount(el){const self=this;
    const rerender=()=>UI.route();
    $('#ovedit',el)&&($('#ovedit',el).onclick=()=>{OV.edit=true;rerender()});$('#ovdone',el)&&($('#ovdone',el).onclick=()=>{OV.edit=false;rerender();UI.toast({kind:'success',title:'Overzicht bewaard'})});
    $('#ovreset',el)&&($('#ovreset',el).onclick=()=>{delete S.settings.home;saveSettings();rerender()});
    el.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const c=OV.cfg();const sec=t.closest('[data-b]');const id=sec&&sec.dataset.b;
      if(t.dataset.ovw&&id){c.blocks.find(b=>b.id===id).w=t.dataset.ovw;OV.save(c);rerender()}
      else if(t.dataset.ovmv&&id){const on=c.blocks.filter(b=>b.on);const i=on.findIndex(b=>b.id===id),j=i+ +t.dataset.ovmv;if(j<0||j>=on.length)return;const A=on[i],Bb=on[j];const ia=c.blocks.indexOf(A),ib=c.blocks.indexOf(Bb);c.blocks[ia]=Bb;c.blocks[ib]=A;OV.save(c);rerender()}
      else if(t.dataset.ovoff){c.blocks.find(b=>b.id===t.dataset.ovoff).on=false;OV.save(c);rerender()}
      else if(t.dataset.ovon){const b=c.blocks.find(b=>b.id===t.dataset.ovon);b.on=true;c.blocks=c.blocks.filter(x=>x!==b);const last=c.blocks.map(x=>x.on).lastIndexOf(true);c.blocks.splice(last+1,0,b);OV.save(c);rerender();setTimeout(()=>$(`[data-b="${b.id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}),100)}
      else if(t.dataset.ovcfg){e.preventDefault();ovConfig(t.dataset.ovcfg)}});
    if(OV.edit){let drag=null;const g=$('#ovg',el);
      g.addEventListener('dragstart',e=>{const s=e.target.closest('.ovb');if(!s)return;drag=s.dataset.b;s.classList.add('dragging');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',drag)}catch(x){}});
      g.addEventListener('dragend',e=>{$$('.ovb',g).forEach(x=>x.classList.remove('dragging','dropb','dropa'));drag=null});
      g.addEventListener('dragover',e=>{const s=e.target.closest('.ovb');if(!drag||!s||s.dataset.b===drag)return;e.preventDefault();const r=s.getBoundingClientRect();const after=(e.clientY-r.top)/r.height>.5;$$('.ovb',g).forEach(x=>x.classList.remove('dropb','dropa'));s.classList.add(after?'dropa':'dropb')});
      g.addEventListener('drop',e=>{const s=e.target.closest('.ovb');if(!drag||!s)return;e.preventDefault();const after=s.classList.contains('dropa');const c=OV.cfg();const A=c.blocks.find(b=>b.id===drag);c.blocks=c.blocks.filter(b=>b!==A);const k=c.blocks.findIndex(b=>b.id===s.dataset.b);c.blocks.splice(after?k+1:k,0,A);OV.save(c);rerender()})}
    OV.cfg().blocks.filter(b=>b.on).forEach(b=>{const B=OV.B[b.id];B.mount&&B.mount(el)})},
  live(el,arg,kind){OV.cfg().blocks.filter(b=>b.on).forEach(b=>{const B=OV.B[b.id];if(B.live)try{B.live(el,kind)}catch(e){console.error(b.id,e)}})}
};
function ovConfig(what){const c=OV.cfg();
  if(what==='pulse'){dlg(`<div class="chead"><h2>Marktpuls: welke tegels?</h2></div><div class="ovchk">${Object.entries(PULSE).map(([k,l])=>`<label><input type="checkbox" value="${k}" ${c.pulse.includes(k)?'checked':''}> ${esc(l)}</label>`).join('')}</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn ghost" id="no">Annuleren</button><button class="btn" id="yes">Bewaren</button></div>`,
    box=>{$('#no',box).onclick=closeOverlay;$('#yes',box).onclick=()=>{c.pulse=$$('input:checked',box).map(x=>x.value);OV.save(c);closeOverlay();UI.route()}});return}
  const single=what==='chart'||what==='why';const onlyStocks=what==='stocks';const onlyCrypto=single;const max=what==='prices'?8:10;let sel=single?[c[what]]:c[what].slice();let q='';
  const title={prices:'Kies je koersen',stocks:'Kies je aandelen',chart:'Grafiek van welke crypto?',why:'Analyse van welke crypto?'}[what];
  dlg(`<div class="chead"><h2>${title}</h2><button class="ibtn" id="ovx" aria-label="Sluiten">${ico('x')}</button></div>${single?'':`<p class="muted" style="margin:0 0 10px">Tik om toe te voegen of weg te halen, maximaal ${max}. De volgorde is de volgorde waarin je ze kiest.</p><div class="chips ovsel" id="ovsel"></div>`}
    <input class="inp" id="ovq" placeholder="Zoek op naam of symbool" autocomplete="off" style="margin:10px 0"><div class="tklist ovlist" id="ovl"></div>
    ${single?'':`<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn ghost" id="no">Annuleren</button><button class="btn" id="yes">Bewaren</button></div>`}`,box=>{box.style.width='min(480px,100%)';
    const draw=()=>{if(!single)$('#ovsel',box).innerHTML=sel.length?sel.map(s=>{const a=getAsset(s);return `<button class="chip on" data-rm="${s}">${a?ab(a):''} ${esc(s)} ×</button>`}).join(''):'<span class="faint">Nog niets gekozen</span>';
      const C=assetChoices(q);const L=[...(onlyStocks?[]:C.crypto.map(a=>['Crypto',a])),...(onlyCrypto?[]:C.stocks.map(a=>["Aandelen en ETF's",a]))];let last='';
      $('#ovl',box).innerHTML=L.map(([g,a])=>{const h=g!==last?`<div class="tkgrp">${g}</div>`:'';last=g;return h+`<button class="tkopt ${sel.includes(a.sym)?'on':''}" data-add="${a.sym}">${ab(a)}<span class="tkn"><b>${esc(a.name)}</b><small>${esc(a.sym)}</small></span><span class="r">${sel.includes(a.sym)?ico('check','class="okc"'):''}</span></button>`}).join('')||'<div class="empty">Niets gevonden.</div>'};
    draw();$('#ovq',box).oninput=e=>{q=e.target.value;draw()};$('#ovq',box).focus();$('#ovx',box).onclick=closeOverlay;
    box.addEventListener('click',e=>{const a=e.target.closest('[data-add]'),r=e.target.closest('[data-rm]');
      if(a){const s=a.dataset.add;if(single){c[what]=s;OV.save(c);closeOverlay();UI.route();return}if(sel.includes(s))sel=sel.filter(x=>x!==s);else if(sel.length<max)sel.push(s);else UI.toast({kind:'info',title:`Maximaal ${max}`,body:'Haal er eerst een weg.'});draw()}
      if(r){sel=sel.filter(x=>x!==r.dataset.rm);draw()}});
    if(!single){$('#no',box).onclick=closeOverlay;$('#yes',box).onclick=()=>{c[what]=sel;OV.save(c);closeOverlay();UI.route()}}})}
