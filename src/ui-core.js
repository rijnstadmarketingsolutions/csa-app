/* =====================================================================
   UI — shell, router, componenten
   ===================================================================== */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const LOGO=`<svg viewBox="0 0 200 200" aria-hidden="true">__LOGO__</svg>`;
const IC={
  home:'<path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-6h6v6"/>',
  markets:'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  why:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  impact:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  radar:'<rect x="3" y="4" width="18" height="17" rx="1"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  scanner:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 7v4l3 2"/>',
  news:'<path d="M4 4h13v16H6a2 2 0 0 1-2-2zM17 8h3v10a2 2 0 0 1-2 2"/><path d="M8 8h5M8 12h5M8 16h3"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z"/>',
  more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  back:'<path d="M15 18 9 12l6-6"/>',x:'<path d="M18 6 6 18M6 6l12 12"/>',ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>'
};
const ico=(k,extra='')=>`<svg viewBox="0 0 24 24" ${extra}>${IC[k]}</svg>`;
const NAV=[['overzicht','Overzicht','home'],['markten','Markten','markets'],['waarom','Waarom beweegt het?','why'],['impact','Impact & alerts','impact'],['radar','Event Radar','radar'],['scanner','Opportunity Scanner','scanner'],['nieuws','Nieuws','news'],['watchlist','Watchlist','star'],['instellingen','Instellingen','settings']];

function ab(a,lg){const t=(a.sym||'?').slice(0,a.sym.length>4?3:4);return `<span class="ab${lg?' lg':''}" aria-hidden="true">${esc(t)}</span>`}
function an(a){return `<span class="an">${ab(a)}<span><b>${esc(a.name)}</b><small>${esc(a.sym)}${a.kind==='stock'?' · '+esc(a.sector):''}</small></span></span>`}
function senti(s,score){if(!s)return '<span class="senti sna">Geen data</span>';return `<span class="senti ${s.c}">${esc(s.l)}${score?` <span class="num" style="opacity:.75">${s.score>0?'+':''}${Math.round(s.score)}</span>`:''}</span>`}
function spark(vals,w=96,h=28,wide){const c='spark'+(wide?' wide':'');if(!vals||vals.length<3)return `<svg class="${c}" viewBox="0 0 ${w} ${h}"></svg>`;const mn=Math.min(...vals),mx=Math.max(...vals),r=mx-mn||1;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1)*(w-2)+1).toFixed(1)},${(h-2-(v-mn)/r*(h-4)).toFixed(1)}`).join(' ');const up=vals[vals.length-1]>=vals[0];
  return `<svg class="${c}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="var(--${up?'up':'down'})" stroke-width="1.5" vector-effect="non-scaling-stroke" points="${pts}"/></svg>`}
const series=a=>a.cd?a.cd.map(c=>c.c).concat(a.price!=null?[a.price]:[]):null;
const hseries=a=>a.hr?a.hr.map(c=>c.c).concat(a.price!=null?[a.price]:[]):null;
function meter(score){const p=score==null?50:clamp((score+100)/2,0,100);return `<div class="meter"><i style="left:${p}%"></i></div><div class="meter-l"><span>Bearish</span><span>Neutral</span><span>Bullish</span></div>`}
function star(sym){const on=S.watch.includes(sym);return `<button class="ibtn" data-star="${sym}" aria-label="${on?'Verwijder uit':'Voeg toe aan'} watchlist" title="Watchlist" style="color:${on?'var(--warn)':'var(--ink3)'}">${ico('star',on?'style="fill:currentColor"':'')}</button>`}
function srcLine(a){if(a.kind==='crypto')return `Bron: Bitvavo ${a.market} · ${S.src.bitvavo.st==='ok'?'realtime':'niet live'} · bijgewerkt <span data-ago="${a.ts||0}">${ago(a.ts)}</span>`;
  return a.fh?(a.price!=null?`Bron: Finnhub · ${a.ts?'koers van '+hhmm(a.ts):''} · grafiek TradingView (kan vertraagd zijn)`:'Koers: koppel Finnhub-sleutel · grafiek via TradingView (kan vertraagd zijn)'):'Koers en grafiek via TradingView (kan vertraagd zijn)'}
function tvSym(a){return a.kind==='crypto'?'BITVAVO:'+a.sym+'EUR':a.tv}
function dark(){return document.documentElement.dataset.theme==='dark'}

/* ---------- TradingView widgets (alleen in een gewone browser) ---------- */
function tv(el,name,cfg){
  if(!el)return;el.innerHTML='';
  const box=document.createElement('div');box.className='tradingview-widget-container';
  const w=document.createElement('div');w.className='tradingview-widget-container__widget';box.appendChild(w);
  const s=document.createElement('script');s.src='https://s3.tradingview.com/external-embedding/embed-widget-'+name+'.js';s.async=true;
  s.innerHTML=JSON.stringify(Object.assign({locale:'nl_NL',colorTheme:dark()?'dark':'light',isTransparent:true},cfg));
  s.onerror=()=>{el.innerHTML='<div class="tvph">TradingView kon niet laden. Controleer je internetverbinding of adblocker.</div>'};
  box.appendChild(s);el.appendChild(box);
}
function tvChart(el,sym,h){tv(el,'advanced-chart',{autosize:true,symbol:sym,interval:'60',timezone:'Europe/Amsterdam',theme:dark()?'dark':'light',style:'1',allow_symbol_change:false,hide_side_toolbar:false,withdateranges:true,calendar:false,backgroundColor:dark()?'#111D31':'#FFFFFF',gridColor:dark()?'rgba(255,255,255,0.05)':'rgba(23,36,58,0.06)',support_host:'https://www.tradingview.com'})}

/* ---------- router ---------- */
const UI={
  cur:null,arg:null,el:null,dirty:false,lastPaint:0,lastCalcSeen:0,
  go(h){location.hash=h},
  route(){
    const h=(location.hash||'#overzicht').slice(1);let [p,...rest]=h.split('-');let arg=rest.join('-')||null;
    if(p==='aandelen'){p='markten';arg='aandelen'}
    if(!Pages[p]){p='overzicht';arg=null}
    this.cur=p;this.arg=arg;const pg=Pages[p];
    $$('#nav a,#tabbar a').forEach(a=>a.classList.toggle('on',a.dataset.p===p||(a.dataset.p==='more'&&!['overzicht','markten','waarom','impact'].includes(p))));
    const old=$('#view');const v=old.cloneNode(false);old.replaceWith(v);v.classList.remove('enter');void v.offsetWidth;v.classList.add('enter');v.innerHTML=pg.html(arg);this.el=v;pg.mount&&pg.mount(v,arg);pg.live&&pg.live(v,arg,'calc');
    document.title=(pg.title?pg.title(arg)+' · ':'')+'Crypto Signal AI';
    window.scrollTo(0,0);closeOverlay();
  },
  paint(){if(this.raf)return;const wait=Math.max(0,900-(Date.now()-this.lastPaint));this.raf=setTimeout(()=>{this.raf=null;this.lastPaint=Date.now();this.doPaint()},wait)},
  doPaint(){
    const pg=Pages[this.cur];const calc=S.lastCalc!==this.lastCalcSeen;this.lastCalcSeen=S.lastCalc;
    if(pg&&pg.live&&this.el)try{pg.live(this.el,this.arg,calc?'calc':'tick')}catch(e){console.error(e)}
    shellLive();
  },
  tick(a,prev){this.paint()},
  toast(a){const t=document.createElement('div');t.className='toast';t.innerHTML=`<small>${a.score?`Impact ${a.score}/100 · `:''}${hhmm(Date.now())}</small><b>${esc(a.title)}</b>${a.body?`<span style="opacity:.85;font-size:13px">${esc(a.body).slice(0,160)}</span>`:''}${a.href?'<button>Bekijken →</button>':''}`;
    t.onclick=()=>{if(a.href)location.hash=a.href;t.remove()};$('#toasts').prepend(t);setTimeout(()=>t.remove(),7000);while($('#toasts').children.length>3)$('#toasts').lastChild.remove()},
  badge(){const b=$('#bellc');b.textContent=S.unread;b.classList.toggle('hidden',!S.unread)}
};
function shellLive(){
  const b=S.src.bitvavo;const dot=$('#sdot');dot.className='dot '+(b.st==='ok'?'live':b.st==='err'?'off':'warn');
  $('#stxt').textContent=b.st==='ok'?'Live · Bitvavo':b.st==='err'?'Geen koersdata':'Verbinden…';
  const nOk=Object.values(S.src).filter(s=>s.st==='ok').length;
  $('#sidefoot').innerHTML=`<b style="color:var(--ink2)">Databronnen ${nOk}/${Object.keys(S.src).length} actief</b><br>Koersen: ${b.st==='ok'?'realtime, '+ago(b.ts):esc(b.msg)}<br>Analyse: ${S.lastCalc?'herberekend '+ago(S.lastCalc):'wacht op data'}`;
  tape();$$('[data-ago]').forEach(e=>e.textContent=ago(+e.dataset.ago));
}
let tapeKey='';
function tape(){const L=deepList().sort((a,b)=>(a.rank||99)-(b.rank||99)).slice(0,16);const k=L.map(a=>a.sym).join();
  const item=a=>`<a href="#asset-${a.sym.toLowerCase()}" data-t="${a.sym}"><b>${a.sym}</b><span class="num">${eur(a.price)}</span><span class="num ${cls(a.ch24)}">${pct(a.ch24)}</span></a>`;
  if(k!==tapeKey){tapeKey=k;$('#tapein').innerHTML=(L.map(item).join('')).repeat(2);return}
  L.forEach(a=>$$(`#tapein [data-t="${a.sym}"]`).forEach(el=>{el.children[1].textContent=eur(a.price);el.children[2].textContent=pct(a.ch24);el.children[2].className='num '+cls(a.ch24)}));
}

/* ---------- overlay (drawer/sheet) ---------- */
function drawer(title,html,onmount){
  const o=$('#overlay');o.innerHTML=`<div class="scrim" id="scrim"><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2><button class="ibtn" id="dclose" aria-label="Sluiten">${ico('x')}</button></header><div class="body">${html}</div></aside></div>`;
  $('#scrim').onclick=e=>{if(e.target.id==='scrim')closeOverlay()};$('#dclose').onclick=closeOverlay;onmount&&onmount($('.drawer .body'));$('#dclose').focus();
}
function closeOverlay(){$('#overlay').innerHTML=''}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOverlay()});

/* ---------- gedeelde blokken ---------- */
function clusterRow(c,compact){
  const tone=c.tone>.2?['up','Positief']:c.tone<-.2?['down','Negatief']:['','Neutraal'];
  const as=c.assets.filter(x=>x!=='__macro');
  return `<article class="news"><a class="t" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a><span class="src nowrap">${hhmm(c.t)}</span>
  <div class="meta"><span class="tag navy">${esc(c.kind)}</span><span class="tag ${tone[0]}">${tone[1]}</span>${c.cat!=='general'?`<span class="tag">${esc(CATNL[c.cat]||c.cat)}</span>`:''}<span>${c.sources.size} bron${c.sources.size>1?'nen':''}: ${esc([...c.sources].slice(0,4).join(', '))}</span>${as.slice(0,5).map(s=>`<a class="tag" href="#asset-${s.toLowerCase()}" style="text-decoration:none">${s}</a>`).join('')}</div>
  ${!compact&&c.items.length>1?`<p>Ontdubbeld: ${c.items.length} berichten samengevoegd. ${c.items.slice(1,4).map(i=>`<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.src)}</a>`).join(' · ')}</p>`:''}</article>`;
}
const CATNL={macro:'Macro',regulation:'Regelgeving',security:'Beveiliging',etf:'ETF',earnings:'Bedrijfscijfers',geo:'Geopolitiek',whale:'Grote transacties',general:'Algemeen',move:'Koersbeweging',volume:'Volume',breakout:'Technisch',sudden:'Plotselinge beweging',market:'Marktbreed',watchnews:'Nieuws',sector:'Sector',vol:'Volatiliteit'};
function impRow(e,open){
  const hi=e.score>=60;const dir=e.dir>0?['up','Mogelijk positief']:e.dir<0?['down','Mogelijk negatief']:['','Richting onduidelijk'];
  return `<article class="imp" data-ev="${esc(e.id)}">${ring(e.score)}<div>
  <div class="ttl">${esc(e.title)}</div><div class="meta"><span>${esc(e.I.label)}</span><span class="tag ${dir[0]}">${dir[1]}</span><span class="tag">${esc(CATNL[e.cat]||e.cat)}</span><span>${hhmm(e.first)}</span>${(e.assets||[]).slice(0,4).map(s=>`<span class="tag">${esc(s)}</span>`).join('')}</div>
  ${open?impDetail(e):`<p>${esc(e.what)}</p>`}</div></article>`;
}
function impDetail(e){
  const unc=e.Q>=.9&&e.type!=='news'?'Laag':e.Q>=.6?'Gemiddeld':'Hoog';
  return `<div style="margin-top:12px;display:grid;gap:12px;font-size:14px">
  <div><b>1. Wat is er gebeurd?</b><div class="muted">${esc(e.what)}</div></div>
  <div><b>2. Waarom is het belangrijk?</b><div class="muted">${esc(e.why)}</div></div>
  <div><b>3. Welke assets kunnen geraakt worden?</b><div class="chips" style="margin-top:5px">${(e.assets||[]).map(s=>getAsset(s)?`<a class="chip" href="#asset-${s.toLowerCase()}" style="display:inline-grid;place-items:center;text-decoration:none">${s}</a>`:`<span class="chip" style="display:inline-grid;place-items:center">${esc(s)}</span>`).join('')}</div></div>
  <div><b>4. Mogelijke positieve impact</b><div class="muted">${esc(e.pos)}</div></div>
  <div><b>5. Mogelijke negatieve impact</b><div class="muted">${esc(e.neg)}</div></div>
  <div><b>6. Scenario's</b><ul class="muted" style="margin:4px 0 0;padding-left:18px">${e.scen.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>
  <div><b>7. Hoe betrouwbaar is de informatie?</b><div class="muted">${esc(e.rel)} Onzekerheid van de analyse: ${unc}.</div></div>
  <div class="card" style="background:var(--bg2)"><div class="chead"><h3>Opbouw Impact Score ${e.score}/100</h3><span class="src">Marktimpact · asset-impact ${impact({...e.factors,B:1}).score}/100</span></div>
  <div class="bars">${e.I.parts.map(p=>`<div class="bar"><span>${p.n} <span class="faint">(${Math.round(p.w*100)}%)</span></span><span class="tr"><i style="width:${Math.round(p.v*100)}%"></i></span><span class="v">${Math.round(p.v*p.w*100)}</span></div>`).join('')}</div>
  <p class="note" style="margin:10px 0 0">Bronnen: ${esc((e.src||[]).join(', '))}${e.cl?` · <a href="${esc(e.cl.url)}" target="_blank" rel="noopener">origineel artikel</a>`:''}. Een hoge score betekent niet automatisch dat de koers stijgt of daalt.</p></div></div>`;
}
function bindStars(root){root.addEventListener('click',e=>{const b=e.target.closest('[data-star]');if(!b)return;e.preventDefault();e.stopPropagation();const s=b.dataset.star;
  S.watch=S.watch.includes(s)?S.watch.filter(x=>x!==s):[...S.watch,s];LS.set('watch',S.watch);Sync.schedule();
  $$(`[data-star="${s}"]`).forEach(x=>x.outerHTML=star(s));UI.toast({title:S.watch.includes(s)?`${s} staat op je watchlist`:`${s} verwijderd van je watchlist`})})}
function newsDrawer(a){
  const sym=a.sym;loadCompanyNews(a).then(()=>{const b=$('#ndl');if(b)b.innerHTML=list()});
  const list=()=>{const cl=S.clusters.filter(c=>c.assets.includes(sym)).slice(0,25);return cl.length?cl.map(c=>clusterRow(c,false)).join(''):`<div class="empty">Geen artikelen over ${esc(a.name)} in de gekoppelde nieuwsbronnen${S.src.cc.st!=='ok'&&S.src.fh.st!=='ok'?' (nieuwsbron niet bereikbaar)':''}. Bekijk hieronder de live TradingView-nieuwsfeed.</div>`};
  drawer('Nieuws: '+a.name,`<p class="note" style="margin:12px 0">Artikelen die CSA aan ${esc(a.name)} koppelt, ontdubbeld en gelabeld (feit, verwachting, gerucht, interpretatie of speculatie). Klik om het origineel te openen.</p><div id="ndl">${list()}</div><h3 style="margin:22px 0 10px">Live nieuwsfeed (TradingView)</h3><div class="tv" id="ntv" style="height:520px"></div>`,
    b=>tv($('#ntv',b),'timeline',{feedMode:'symbol',symbol:tvSym(a),displayMode:'regular',width:'100%',height:520}));
}

/* ---------- zoeken ---------- */
function initSearch(){
  const q=$('#q'),box=$('#sres');let sel=0,res=[];
  const draw=()=>{box.innerHTML=res.map((a,i)=>`<a href="#asset-${a.sym.toLowerCase()}" class="${i===sel?'sel':''}">${an(a)}<span class="num" style="margin-left:auto">${a.price!=null?money(a,a.price):''}</span></a>`).join('')||'<div class="empty" style="border:0">Niets gevonden</div>';box.classList.remove('hidden')};
  q.addEventListener('input',()=>{const t=q.value.trim().toLowerCase();if(!t){box.classList.add('hidden');return}
    res=allAssets().filter(a=>a.sym.toLowerCase().startsWith(t)||a.name.toLowerCase().includes(t)).sort((x,y)=>(x.sym.toLowerCase()===t?-1:0)-(y.sym.toLowerCase()===t?-1:0)||(y.volQ||0)-(x.volQ||0)).slice(0,8);sel=0;draw()});
  q.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){sel=Math.min(sel+1,res.length-1);draw();e.preventDefault()}if(e.key==='ArrowUp'){sel=Math.max(sel-1,0);draw();e.preventDefault()}if(e.key==='Enter'&&res[sel]){location.hash='#asset-'+res[sel].sym.toLowerCase();q.value='';box.classList.add('hidden');q.blur()}if(e.key==='Escape'){box.classList.add('hidden');q.blur()}});
  box.addEventListener('click',()=>{q.value='';box.classList.add('hidden');$('#searchbox').classList.remove('open')});
  document.addEventListener('click',e=>{if(!e.target.closest('#searchbox')&&!e.target.closest('#msearch')){box.classList.add('hidden');$('#searchbox').classList.remove('open')}});
  $('#msearch').onclick=()=>{$('#searchbox').classList.add('open');q.focus()};
}

/* ---------- login + 2FA (server: TOTP + back-upcodes; zonder server: demomodus) ---------- */
const Auth={
  code:null,tries:0,lockUntil:0,reg:false,pending:null,useBackup:false,
  show(id){['step1','step2','step3','step4'].forEach(x=>$('#'+x).classList.toggle('hidden',x!==id))},
  async init(){
    if(Api.on&&Api.token){try{const me=await Api.call('/api/me');Api.setSession(Api.token,me.user);LS.set('user',{email:me.user.email,name:me.user.name});this.enter();return}catch(e){Api.setSession(null)}}
    if(!Api.on){const trust=LS.get('trust',0),ses=(()=>{try{return sessionStorage.getItem('csa.session')}catch(e){return null}})();if(ses||trust>Date.now()){this.enter();return}}
    $('#login').classList.remove('hidden');
    $('#modenote').innerHTML=Api.on?'Je account en beveiliging lopen via de CSA-server. Gegevens staan versleuteld in de EU.':'<b>Demomodus:</b> de CSA-server is niet bereikbaar (bijvoorbeeld omdat je het bestand lokaal opent). Inloggen wordt in deze browser gesimuleerd.';
    $('#regline').classList.toggle('hidden',!Api.on);$('#resend').classList.toggle('hidden',Api.on);$('#usebackup').classList.toggle('hidden',!Api.on);
    const otp=$('#otp');otp.innerHTML=Array.from({length:6},(_,i)=>`<input inputmode="numeric" maxlength="1" aria-label="Cijfer ${i+1}" autocomplete="${i?'off':'one-time-code'}">`).join('');
    const ins=$$('input',otp);this.ins=ins;
    ins.forEach((inp,i)=>{inp.addEventListener('input',()=>{inp.value=inp.value.replace(/\D/g,'').slice(-1);if(inp.value&&ins[i+1])ins[i+1].focus();if(ins.every(x=>x.value))$('#step2').requestSubmit()});
      inp.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!inp.value&&ins[i-1])ins[i-1].focus()});
      inp.addEventListener('paste',e=>{const t=(e.clipboardData.getData('text')||'').replace(/\D/g,'').slice(0,6);if(t.length){e.preventDefault();t.split('').forEach((c,k)=>{if(ins[k])ins[k].value=c});(ins[t.length]||ins[5]).focus();if(t.length===6)$('#step2').requestSubmit()}})});
    $('#toreg').onclick=()=>{this.reg=!this.reg;$('#namef').classList.toggle('hidden',!this.reg);$('#s1title').textContent=this.reg?'Account aanmaken':'Inloggen';$('#s1btn').textContent=this.reg?'Account aanmaken':'Doorgaan';
      $('#s1sub').textContent=this.reg?'Maak een gratis CSA-account. Je beveiligt het direct met een authenticator-app.':'Log in op je CSA-account. Daarna vragen we altijd een beveiligingscode.';$('#toreg').textContent=this.reg?'Ik heb al een account':'Account aanmaken';$('#regline').firstChild.textContent=this.reg?'':'Nog geen account? ';$('#lgpw').autocomplete=this.reg?'new-password':'current-password';$('#err1').textContent=''};
    $('#step1').onsubmit=async e=>{e.preventDefault();const m=$('#lgmail').value.trim(),p=$('#lgpw').value;
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)){$('#err1').textContent='Vul een geldig e-mailadres in.';return}
      if(p.length<(Api.on?8:6)){$('#err1').textContent=`Wachtwoord moet minimaal ${Api.on?8:6} tekens zijn.`;return}
      $('#err1').textContent='';
      if(!Api.on){LS.set('user',{email:m,name:m.split('@')[0].replace(/[._-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase())});this.step2();return}
      const btn=$('#s1btn');btn.disabled=true;btn.textContent='Even geduld…';
      try{const r=this.reg?await Api.call('/api/auth/register',{method:'POST',body:{email:m,password:p,name:$('#lgname').value.trim()}}):await Api.call('/api/auth/login',{method:'POST',body:{email:m,password:p}});
        this.pending=r.pending;if(r.setup)this.setup(r.setup);else this.step2()}
      catch(x){$('#err1').textContent=x.message}finally{btn.disabled=false;btn.textContent=this.reg?'Account aanmaken':'Doorgaan'}};
    $('#back1').onclick=()=>this.show('step1');
    $('#resend').onclick=()=>this.step2();
    $('#usebackup').onclick=()=>{this.useBackup=!this.useBackup;$('#backupf').classList.toggle('hidden',!this.useBackup);$('#otp').classList.toggle('hidden',this.useBackup);$('#usebackup').textContent=this.useBackup?'Code uit app gebruiken':'Back-upcode gebruiken';(this.useBackup?$('#backupc'):ins[0]).focus()};
    $('#step2').onsubmit=async e=>{e.preventDefault();if(Date.now()<this.lockUntil){$('#err2').textContent='Te veel pogingen. Probeer het over een minuut opnieuw.';return}
      const c=this.useBackup?$('#backupc').value.trim():ins.map(x=>x.value).join('');if(!this.useBackup&&c.length<6){$('#err2').textContent='Vul alle 6 cijfers in.';return}
      if(Api.on){try{const r=await Api.call('/api/auth/verify',{method:'POST',body:{pending:this.pending,code:c,trust:$('#trust').checked}});this.done(r)}catch(x){ins.forEach(i=>i.value='');ins[0].focus();$('#err2').textContent=x.message;if(x.status===401&&/verlopen/.test(x.message))setTimeout(()=>this.show('step1'),1500)}return}
      const sec=LS.get('totp',null);let ok=false;try{ok=sec?await totpCheck(sec,c):c===this.code}catch(x){ok=c===this.code}
      if(!ok){this.tries++;ins.forEach(x=>x.value='');ins[0].focus();if(this.tries>=5){this.lockUntil=Date.now()+60000;this.tries=0}$('#err2').textContent='Onjuiste code.'+(this.lockUntil>Date.now()?' Account 60 seconden vergrendeld.':'');return}
      if($('#trust').checked)LS.set('trust',Date.now()+30*DAY);this.enter()};
    $('#step3').onsubmit=async e=>{e.preventDefault();const c=$('#setupcode').value.trim();if(!/^\d{6}$/.test(c)){$('#err3').textContent='Vul de 6 cijfers uit je app in.';return}
      try{const r=await Api.call('/api/auth/verify',{method:'POST',body:{pending:this.pending,code:c,trust:$('#trust3').checked}});this.done(r)}catch(x){$('#err3').textContent=x.message}};
  },
  setup(st){this.show('step3');$('#secretbox').textContent=st.secret.match(/.{1,4}/g).join(' ');const q=$('#qrbox');q.innerHTML='';
    try{if(window.QRCode)new QRCode(q,{text:st.uri,width:150,height:150,colorDark:'#17243A',colorLight:'#ffffff'});else q.outerHTML='<p class="note">QR-code niet beschikbaar; voer de sleutel in.</p>'}catch(e){}setTimeout(()=>$('#setupcode').focus(),50)},
  done(r){Api.setSession(r.token,r.user);LS.set('user',{email:r.user.email,name:r.user.name});
    if(r.backup&&r.backup.length){this.show('step4');$('#backuplist').innerHTML=r.backup.map(c=>`<code>${esc(c.slice(0,5))}-${esc(c.slice(5))}</code>`).join('');
      $('#copyb').onclick=async()=>{try{await navigator.clipboard.writeText(r.backup.join('\n'));$('#copyb').textContent='Gekopieerd'}catch(e){$('#copyb').textContent='Kopiëren lukt niet; schrijf ze over'}};$('#doneb').onclick=()=>this.enter();return}
    this.enter()},
  step2(){
    this.show('step2');$('#err2').textContent='';this.useBackup=false;$('#backupf').classList.add('hidden');$('#otp').classList.remove('hidden');
    if(Api.on){$('#democode').classList.add('hidden');$('#otpmsg').textContent='Open je authenticator-app en vul de code voor Crypto Signal AI in.'}
    else{const sec=LS.get('totp',null);
      if(sec){$('#democode').classList.add('hidden');$('#otpmsg').textContent='Open je authenticator-app en vul de code voor CSA in.'}
      else{this.code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1e6).padStart(6,'0');
        $('#otpmsg').innerHTML=`Demomodus: we simuleren een code voor <b>${esc(LS.get('user',{}).email||'je e-mail')}</b>.`;
        const dc=$('#democode');dc.innerHTML=`Demo: in de echte app komt deze code uit je authenticator-app.<b>${this.code}</b>`;dc.classList.remove('hidden')}}
    $$('#otp input').forEach(x=>x.value='');setTimeout(()=>$('#otp input').focus(),50);
  },
  enter(){try{sessionStorage.setItem('csa.session','1')}catch(e){}$('#login').classList.add('hidden');$('#app').classList.remove('hidden');$('#tabbar').classList.remove('hidden');
    const u=LS.get('user',null);if(u)$('#avatar').textContent=(u.name||'CS').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();Boot.start()},
  async logout(){if(Api.authed){try{await Api.call('/api/auth/logout',{method:'POST'})}catch(e){}}Api.setSession(null);try{sessionStorage.removeItem('csa.session')}catch(e){}LS.set('trust',0);location.hash='';location.reload()}
};
