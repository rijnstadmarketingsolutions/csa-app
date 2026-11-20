/* =====================================================================
   v7 — Engelse versie (23): vertaallaag over de hele interface
   ===================================================================== */
const I18N={lang:S.settings.lang||'nl',dict:null,obs:null,
  NUM:/[−+\-]?(?:€|\$)?\s?\d[\d.,]*(?:\s?(?:%|×|x\b|k\b|mln\b|mld\b))?/g,
  norm(t){return t.replace(/\s+/g,' ').trim()},
  key(t){const nums=[];const k=this.norm(t).replace(this.NUM,m=>{nums.push(m);return '{}'});return [k,nums]},
  DAYS:{maandag:'Monday',dinsdag:'Tuesday',woensdag:'Wednesday',donderdag:'Thursday',vrijdag:'Friday',zaterdag:'Saturday',zondag:'Sunday',ma:'Mon',di:'Tue',wo:'Wed',do:'Thu',vr:'Fri',za:'Sat',zo:'Sun'},
  MONTHS:{januari:'January',februari:'February',maart:'March',april:'April',mei:'May',juni:'June',juli:'July',augustus:'August',september:'September',oktober:'October',november:'November',december:'December',jan:'Jan',feb:'Feb',mrt:'Mar',apr:'Apr',jun:'Jun',jul:'Jul',aug:'Aug',sep:'Sep',okt:'Oct',nov:'Nov',dec:'Dec'},
  dates(s){if(!/\d/.test(s))return s;return s.replace(/\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vr|za|zo)\b(?=[\s.,])/g,m=>this.DAYS[m]).replace(/\b(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|jan|feb|mrt|apr|jun|jul|aug|sep|okt|nov|dec)\b/g,m=>this.MONTHS[m])},
  tr(s){if(!s||!/[a-zA-Zà-ü]/.test(s))return s;const D=this.dict;const lead=s.match(/^\s*/)[0],tail=s.match(/\s*$/)[0];const core=this.norm(s);
    if(D[core]!=null)return lead+D[core]+tail;const [k,nums]=this.key(core);const t=D[k];if(t!=null){let i=0;return lead+t.replace(/\{\}/g,()=>nums[i++]??'')+tail}
    if(D.__rx){if(!this.rx)this.rx=D.__rx.map(([p,r])=>[new RegExp(p),r]);for(const [re,r] of this.rx)if(re.test(core)){const o=core.replace(re,r);return lead+this.dates(o)+tail}}
    const d=this.dates(core);return d!==core?lead+d+tail:s},
  skip(el){return !el||el.closest&&el.closest('script,style,[data-noi18n],.ctitle,.nt,code,textarea')},
  walk(root){if(!this.dict)return;const W=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;const L=[];while((n=W.nextNode()))L.push(n);
    for(const t of L){if(this.skip(t.parentElement))continue;const v=t.nodeValue;if(!v.trim())continue;const r=this.tr(v);if(r!==v)t.nodeValue=r}
    const E=root.querySelectorAll?root.querySelectorAll('[placeholder],[aria-label],[title]'):[];for(const e of [root,...E]){if(!e.getAttribute)continue;for(const a of ['placeholder','aria-label','title']){const v=e.getAttribute(a);if(v){const r=this.tr(v);if(r!==v)e.setAttribute(a,r)}}}},
  async start(){if(this.lang!=='en')return;document.documentElement.lang='en';try{this.dict=window.VANTIS_EN||await (await fetch('i18n/en.json',{cache:'force-cache'})).json()}catch(e){return}
    this.walk(document.body);document.title=this.tr(document.title);let busy=false;
    this.obs=new MutationObserver(ms=>{if(busy)return;busy=true;try{for(const m of ms){if(m.type==='characterData'){const t=m.target;if(!this.skip(t.parentElement)){const r=this.tr(t.nodeValue);if(r!==t.nodeValue)t.nodeValue=r}}else for(const n of m.addedNodes){if(n.nodeType===3){if(!this.skip(n.parentElement)){const r=this.tr(n.nodeValue);if(r!==n.nodeValue)n.nodeValue=r}}else if(n.nodeType===1)this.walk(n)}}}finally{busy=false}});
    this.obs.observe(document.body,{subtree:true,childList:true,characterData:true})},
  set(l){S.settings.lang=l;saveSettings();location.reload()}
};
I18N.start();
{const ih=Pages.instellingen.html,im=Pages.instellingen.mount;
  Pages.instellingen.html=function(){return ih.call(this)+`<div class="card" style="margin-top:16px"><div class="chead"><h2>Taal · Language</h2></div><div class="set"><div><b>Taal van de app · App language</b><p>Nederlands of English. De app herlaadt na het wisselen.</p></div><div class="seg" id="langseg"><button data-l="nl" class="${I18N.lang==='nl'?'on':''}">Nederlands</button><button data-l="en" class="${I18N.lang==='en'?'on':''}">English</button></div></div></div>`};
  Pages.instellingen.mount=function(el,arg){im.call(this,el,arg);$('#langseg',el)&&($('#langseg',el).onclick=e=>{const b=e.target.closest('[data-l]');if(b&&b.dataset.l!==I18N.lang)I18N.set(b.dataset.l)})}}
