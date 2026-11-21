/* =====================================================================
   v13 — Vantis AI: chat-pop-up met voorspellingen, oefenorders en autopilot
   ===================================================================== */
IC.spark='<path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5-5.2-1.8 5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>';
IC.robot='<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5"/>';
const AI={open:false,tab:'chat',busy:false,msgs:LS.get('aichat',[]),auto:null,
  lang(){return (S.settings.lang||'en')==='en'?'en':'nl'},
  save(){this.msgs=this.msgs.slice(-24);LS.set('aichat',this.msgs)}};
const aiMd=t=>esc(t).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/^[•\-*] (.+)$/gm,'<li>$1</li>').replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g,'<ul>$1</ul>').replace(/<\/ul>\s*<ul>/g,'').replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>');
const aiFc=f=>{const c=f.score>=12?'up':f.score<=-12?'down':'';const pos=Math.max(0,Math.min(100,(f.score+100)/2));
  return `<div class="aifc"><div class="aifh"><b>${esc(f.sym)}</b><span class="faint">${esc(f.name&&f.name!==f.sym?f.name:'')}</span><span class="aiflab ${c}">${esc(f.label)}</span></div>
    <div class="aibar" title="Modelscore ${f.score}"><i style="left:${pos}%"></i></div>
    <div class="aifs"><span>Kans hoger (7 d) <b>${nlN(f.pUp,0)}%</b></span><span>Bandbreedte <b>${pct(f.range[0],1)} – ${pct(f.range[1],1)}</b></span><span>Trefkans model <b>${f.hitRate!=null?nlN(f.hitRate,0)+'%':'—'}</b></span></div></div>`};
const aiAct=(a,i,mi)=>`<button class="btn sm ${a.side==='sell'?'ghost':''} aiact" data-mi="${mi}" data-ai="${i}">${ico(a.side==='buy'?'up':'down')}${a.side==='buy'?'Koop':'Verkoop'} ${a.all?'alle':a.eur!=null?eur2(a.eur):''} ${esc(a.sym)}</button>`;
function aiMsgHTML(m,mi){if(m.role==='user')return `<div class="aim me"><p data-noi18n>${esc(m.content)}</p></div>`;
  return `<div class="aim"><div class="aibody" data-noi18n><p>${aiMd(m.content)}</p></div>${(m.fc||[]).length?`<div class="aifcs">${m.fc.slice(0,4).map(aiFc).join('')}</div>`:''}${(m.acts||[]).length?`<div class="aiacts">${m.acts.map((a,i)=>a.done?`<span class="aidone">${ico('check')}${esc(a.done)}</span>`:aiAct(a,i,mi)).join('')}<small class="faint">Met oefengeld, na bevestiging.</small></div>`:''}</div>`}
function aiPanelHTML(){const sug=AI.lang()==='en'?['What should I buy now?','What will BTC do this week?','How is my portfolio doing?','Explain RSI simply']:['Wat moet ik nu kopen?','Wat doet BTC deze week?','Hoe staat mijn portefeuille ervoor?','Leg RSI simpel uit'];
  return `<div class="aip" role="dialog" aria-label="Vantis AI"><div class="aiph"><span class="aiicon">${ico('spark')}</span><div><b>Vantis AI</b><small>Voorspellingen, uitleg en handelen met oefengeld</small></div><button class="ibtn" id="aix" aria-label="Sluiten">${ico('x')}</button></div>
    <div class="seg aitabs"><button data-aitab="chat" class="${AI.tab==='chat'?'on':''}">Chat</button><button data-aitab="auto" class="${AI.tab==='auto'?'on':''}">Autopilot</button></div>
    <div class="aipb" id="aipb">${AI.tab==='chat'?`<div class="aimsgs" id="aimsgs">${AI.msgs.length?AI.msgs.map(aiMsgHTML).join(''):`<div class="aiwelc"><p>Vraag wat je wilt over de markt. Ik gebruik het Vantis-model: het rekent per munt of aandeel de kans uit dat de koers over 7 dagen hoger staat, en hoe vaak dat model er in het verleden goed mee zat.</p><div class="aisug">${sug.map(s=>`<button class="chip" data-aisug="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`}</div>
      <form class="aif" id="aif"><textarea name="q" rows="1" maxlength="1500" placeholder="Vraag het Vantis AI…" aria-label="Vraag aan Vantis AI"></textarea><button class="btn" aria-label="Versturen">${ico('send')}</button></form>`:aiAutoHTML()}</div></div>`}
function aiAutoHTML(){const c=AI.auto;if(!c)return `<div class="aiauto"><p class="muted">Laden…</p></div>`;
  const R={voorzichtig:'Voorzichtig: alleen sterke signalen, kleine posities, stop-loss bij −8%.',normaal:'Normaal: sterke en redelijke signalen, stop-loss bij −12%.',actief:'Actief: meer posities en eerder instappen, stop-loss bij −18%.'};
  return `<div class="aiauto"><div class="set" style="padding-top:0"><div><b>Autopilot</b><p>Vantis AI handelt zelf voor je met je oefengeld, op basis van het Vantis-model. Hij koopt bij sterke signalen, verkoopt als het signaal omslaat of de stop-loss geraakt wordt, en houdt altijd minimaal 20% vrij saldo aan. Hij raakt alleen posities aan die hij zelf heeft gekocht.</p></div><label class="sw"><input type="checkbox" id="apon" ${c.on?'checked':''}><span></span></label></div>
    <div class="aiaf"><label>Risico<select class="inp sm" id="aprisk">${['voorzichtig','normaal','actief'].map(k=>`<option value="${k}" ${c.risk===k?'selected':''}>${k[0].toUpperCase()+k.slice(1)}</option>`).join('')}</select></label>
      <label>Markten<select class="inp sm" id="apuni">${[['alles','Crypto en aandelen'],['crypto','Alleen crypto'],['stocks','Alleen aandelen']].map(([k,l])=>`<option value="${k}" ${c.universe===k?'selected':''}>${l}</option>`).join('')}</select></label>
      <label>Max. per aankoop<input class="inp sm" id="apmax" inputmode="numeric" value="${c.max||1000}"></label>
      <label>Controleren<select class="inp sm" id="apevery">${[[1,'Elk uur'],[4,'Elke 4 uur'],[12,'Elke 12 uur'],[24,'Elke dag']].map(([k,l])=>`<option value="${k}" ${+c.every===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
    <p class="note" id="aprisknote">${R[c.risk]||R.normaal}</p>
    <div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" id="apsave">Opslaan</button><button class="btn ghost sm" id="aprun" ${c.on?'':'disabled'}>Nu controleren</button></div>
    <h3 class="aih3">Laatste acties</h3>${(c.log||[]).length?`<div class="ailog">${c.log.slice().reverse().slice(0,12).map(x=>`<div><span class="otag ${x.side}">${x.side==='buy'?'Koop':'Verkoop'}</span><b>${esc(x.sym)}</b><span>${eur2(x.eur)}</span><small class="faint">${esc(x.why||'')} · ${dmy(x.t)} ${hhmm(x.t)}</small></div>`).join('')}</div>`:'<p class="muted sm">Nog geen acties. Zet de autopilot aan; hij controleert de markt op het gekozen ritme.</p>'}
    <p class="disc" style="margin-top:12px">Werkt alleen met oefengeld. Het model geeft kansen, geen zekerheden; ook de autopilot kan verlies maken.</p></div>`}

function aiRender(){let w=$('#aiwrap');if(!w){document.body.insertAdjacentHTML('beforeend',`<div id="aiwrap"><button class="aifab" id="aifab" aria-label="Open Vantis AI" title="Vantis AI">${ico('spark')}<span>AI</span></button><div id="aipane"></div></div>`);w=$('#aiwrap');aiBind(w)}
  w.classList.toggle('open',AI.open);$('#aipane').innerHTML=AI.open?aiPanelHTML():'';if(AI.open){const m=$('#aimsgs');if(m)m.scrollTop=m.scrollHeight;if(AI.tab==='auto'&&!AI.auto)aiLoadAuto();const ta=$('#aif textarea');if(ta&&window.innerWidth>700)ta.focus()}}
async function aiLoadAuto(){if(!Api.authed){AI.auto={on:false,risk:'normaal',universe:'alles',max:1000,every:4,log:[]};}else try{AI.auto=await Api.call('/api/ai/autopilot')}catch(e){AI.auto={on:false,risk:'normaal',universe:'alles',max:1000,every:4,log:[]}}if(AI.open&&AI.tab==='auto')$('#aipb').innerHTML=aiAutoHTML()}
async function aiAsk(q){if(AI.busy||!q.trim())return;if(!Api.authed){UI.toast({title:'Log in om Vantis AI te gebruiken'});return}
  AI.msgs.push({role:'user',content:q.trim()});AI.busy=true;AI.save();aiRender();const m=$('#aimsgs');m.insertAdjacentHTML('beforeend','<div class="aim aitype" id="aityping"><span></span><span></span><span></span></div>');m.scrollTop=m.scrollHeight;
  try{const r=await Api.call('/api/ai/chat',{method:'POST',body:{lang:AI.lang(),lastActions:(AI.msgs.slice().reverse().find(x=>x.role==='assistant'&&x.acts&&x.acts.length)||{}).acts||[],messages:AI.msgs.map(x=>({role:x.role,content:x.content}))}});AI.msgs.push({role:'assistant',content:r.reply,fc:r.forecasts||[],acts:r.actions||[]})}
  catch(e){AI.msgs.push({role:'assistant',content:e.message||'Er ging iets mis. Probeer het opnieuw.'})}
  AI.busy=false;AI.save();aiRender()}
function aiBind(w){
  w.addEventListener('click',async e=>{const t=e.target;
    if(t.closest('#aifab')){AI.open=!AI.open;aiRender();return}
    if(t.closest('#aix')){AI.open=false;aiRender();return}
    const tb=t.closest('[data-aitab]');if(tb){AI.tab=tb.dataset.aitab;aiRender();return}
    const sg=t.closest('[data-aisug]');if(sg){aiAsk(sg.dataset.aisug);return}
    const ab=t.closest('[data-ai]');if(ab){const msg=AI.msgs[+ab.dataset.mi],a=msg&&msg.acts&&msg.acts[+ab.dataset.ai];if(!a)return;
      if(!ab.classList.contains('confirm')){ab.classList.add('confirm');ab.innerHTML=`${ico('check')}Bevestigen: ${a.side==='buy'?'koop':'verkoop'} ${a.all?'alle':a.eur!=null?eur2(a.eur):''} ${esc(a.sym)}`;setTimeout(()=>{if(ab.isConnected&&ab.classList.contains('confirm')){ab.classList.remove('confirm');ab.innerHTML=aiAct(a,+ab.dataset.ai,+ab.dataset.mi).replace(/^<button[^>]*>|<\/button>$/g,'')}},6000);return}
      ab.disabled=true;try{await PT.order({sym:a.sym,side:a.side,kind:a.kind||kindOf(a.sym),type:'market',...(a.all?{all:true}:{eur:a.eur}),note:'Via Vantis AI'});a.done=`${a.side==='buy'?'Gekocht':'Verkocht'}: ${a.all?'alle':eur2(a.eur)} ${a.sym}`;AI.save();aiRender();UI.toast({kind:'success',title:a.done,body:'Met oefengeld. Bekijk het bij Handelen.'})}
      catch(x){ab.disabled=false;UI.toast({kind:'error',title:'Order niet gelukt',body:x.message})}return}
    if(t.closest('#apsave')||t.closest('#aprun')){const run=!!t.closest('#aprun');const b={on:$('#apon').checked,risk:$('#aprisk').value,universe:$('#apuni').value,max:+String($('#apmax').value).replace(/\D/g,'')||1000,every:+$('#apevery').value,runNow:run||undefined,keepLast:!run};
      const bt=t.closest('button');bt.disabled=true;try{AI.auto=await Api.call('/api/ai/autopilot',{method:'PUT',body:b});$('#aipb').innerHTML=aiAutoHTML();
        UI.toast({kind:'success',title:run?(AI.auto.ran&&AI.auto.ran.length?`Autopilot: ${AI.auto.ran.length} ${AI.auto.ran.length===1?'transactie':'transacties'}`:'Autopilot: geen actie nodig'):(b.on?'Autopilot staat aan':'Autopilot staat uit'),body:run&&AI.auto.ran&&!AI.auto.ran.length?'Er zijn nu geen signalen die sterk genoeg zijn.':''});if(run)PT.load()}
      catch(x){bt.disabled=false;UI.toast({kind:'error',title:'Niet gelukt',body:x.message})}}});
  w.addEventListener('change',e=>{if(e.target.id==='aprisk'){const R={voorzichtig:'Voorzichtig: alleen sterke signalen, kleine posities, stop-loss bij −8%.',normaal:'Normaal: sterke en redelijke signalen, stop-loss bij −12%.',actief:'Actief: meer posities en eerder instappen, stop-loss bij −18%.'};$('#aprisknote').textContent=R[e.target.value]}});
  w.addEventListener('submit',e=>{if(e.target.id!=='aif')return;e.preventDefault();const ta=e.target.q;const v=ta.value;ta.value='';aiAsk(v)});
  w.addEventListener('keydown',e=>{if(e.target.matches('#aif textarea')&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.target.form.requestSubmit()}if(e.key==='Escape'&&AI.open){AI.open=false;aiRender();$('#aifab')?.focus()}});
  w.addEventListener('input',e=>{if(e.target.matches('#aif textarea')){e.target.style.height='auto';e.target.style.height=Math.min(120,e.target.scrollHeight)+'px'}})}
setTimeout(aiRender,800);

/* Vantis-model op de pagina van een munt of aandeel */
{const am=Pages.asset.mount;Pages.asset.mount=function(el,arg){am&&am.call(this,el,arg);const sym=String(arg||'').toUpperCase();if(!sym)return;
  const host=$('.card',el);if(!host)return;const box=document.createElement('div');box.className='card aiasset';box.innerHTML=`<div class="chead"><h2>${ico('spark')}Vantis-model</h2><button class="lnk" id="aiaskasset">Vraag Vantis AI</button></div><div class="aifbody"><p class="muted">Vooruitzicht berekenen…</p></div>`;host.insertAdjacentElement('afterend',box);
  $('#aiaskasset',box).onclick=()=>{AI.open=true;AI.tab='chat';aiRender();aiAsk((S.settings.lang||'en')==='en'?`What will ${sym} do this week?`:`Wat doet ${sym} deze week?`)};
  fetch(API_BASE+'/api/ai/forecast?sym='+encodeURIComponent(sym)).then(r=>r.ok?r.json():null).then(f=>{const b=$('.aifbody',box);if(!b)return;if(!f){b.innerHTML='<p class="muted">Te weinig koershistorie voor een vooruitzicht.</p>';return}
    b.innerHTML=aiFc(f)+`<p class="note" style="margin:10px 0 0">Kans dat de koers over 7 dagen hoger staat, met de bandbreedte waarbinnen hij waarschijnlijk (80%) uitkomt. Getest op ${f.tested} eerdere signalen van ${esc(sym)}. Een model geeft kansen, geen zekerheden.</p>`}).catch(()=>{const b=$('.aifbody',box);if(b)b.innerHTML='<p class="muted">Vooruitzicht niet beschikbaar.</p>'})}}

/* Engelse lesinhoud: de Academy-teksten zelf vertalen zodra het Engelse woordenboek binnen is */
{let tries=0;const apply=()=>{const D=I18N.dict;if(!D){if(I18N.lang==='en'&&tries++<40)setTimeout(apply,250);return}const M=D.__acad;if(!M)return;
  const toNL=t=>/\d[.,]\d/.test(t)?t.replace(/(?<![\d.,:])(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+)(?!\d|[.,]\d)/g,m=>m.replace(/[.,]/g,c=>c===','?'.':',')):t;/* de vertaalmotor zet Nederlandse getallen om naar Engels; Engelse lestekst dus eerst in NL-notatie */
  const tr=x=>typeof x==='string'?(M[x]!=null?toNL(M[x]):x):Array.isArray(x)?x.map(tr):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,['id','w','L'].includes(k)?v:tr(v)])):x;
  AC_PATHS.forEach((p,i)=>AC_PATHS[i]=tr(p));for(const k in AC_LESSONS)AC_LESSONS[k]=tr(AC_LESSONS[k]);AC_TERMS.splice(0,AC_TERMS.length,...tr(AC_TERMS));
  LESSONS.forEach((l,i)=>LESSONS[i]=tr(l));if(UI.cur==='leren'||UI.cur==='overzicht')UI.route()};
  if(I18N.lang==='en')apply()}

/* taalkeuze op het inlogscherm */
{const w=document.querySelector('.lglang');if(w){const cur=I18N.lang==='nl'?'nl':'en';w.querySelectorAll('[data-lglang]').forEach(b=>{b.classList.toggle('on',b.dataset.lglang===cur);b.setAttribute('aria-pressed',b.dataset.lglang===cur)});
  w.addEventListener('click',e=>{const b=e.target.closest('[data-lglang]');if(b&&b.dataset.lglang!==cur)I18N.set(b.dataset.lglang)})}}
if(location.hostname==='127.0.0.1')window.__vt={UI};/* alleen lokaal testen */
