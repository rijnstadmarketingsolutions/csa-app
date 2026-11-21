/* =====================================================================
   v11 — één stijlknop: licht/donker en stijl samen in één menu
   ===================================================================== */
SKINS.splice(0,SKINS.length,
  ['luxdark','Dark Luxury','Zwart met chroom en zilver, glas en glans. De Vantis-stijl.'],
  ['oled','OLED zwart','Puur zwart zonder glas: rustig voor de ogen en zuinig op OLED-schermen.'],
  ['navygold','Navy & goud','Diep marineblauw met gouden accenten.'],
  ['noirblue','Zwart & blauw','Pikzwart met elektrisch blauwe accenten.'],
  ['noirgreen','Zwart & groen','Pikzwart met fel groene accenten.'],
  ['emerald','Smaragd','Donkergroen met mintgroene glans.'],
  ['bordeaux','Bordeaux & roségoud','Warm wijnrood met roségouden accenten.'],
  ['luxlight','Light Luxury','Parelwit met gepolijst zilver en matglas.'],
  ['arctic','Arctisch licht','Koel wit met staalblauwe accenten.'],
  ['classic-dark','Klassiek donker','Het vertrouwde navy, in donkere tinten.'],
  ['classic-light','Klassiek licht','Het vertrouwde navy en wit.']);
const _skinGet=Skin.get.bind(Skin);
Skin.cur=function(){const k=_skinGet();return k==='classic'?(S.settings.theme==='dark'?'classic-dark':'classic-light'):k};
Skin.set=function(k){const base=k.startsWith('classic')?'classic':k;if(base==='classic')S.settings.theme=k==='classic-dark'?'dark':'light';
  S.settings.skin=base;LS.set('skin',base);saveSettings();this.apply(base);if(UI.el)UI.route();const s=SKINS.find(x=>x[0]===k);UI.toast({kind:'success',title:'Stijl: '+(s?s[1]:k)})};
{const om=Skin.menu.bind(Skin);Skin.menu=function(btn){const og=this.get;this.get=()=>this.cur();try{om(btn)}finally{this.get=og}}}
{const im=Pages.instellingen.mount;Pages.instellingen.mount=function(el,arg){im.call(this,el,arg);$$('[data-skinset]',el).forEach(b=>b.setAttribute('aria-checked',b.dataset.skinset===Skin.cur()))}}
{const sb=$('#skinbtn');if(sb){sb.setAttribute('aria-label','Stijl en licht of donker');sb.title='Stijl'}const tb=$('#themebtn');if(tb){tb.hidden=true;tb.setAttribute('aria-hidden','true');tb.tabIndex=-1}}

/* thema per stijl: donker of licht, ook voor de browserbalk */
{const DARKS=['luxdark','oled','navygold','emerald','bordeaux','noirblue','noirgreen'],LIGHTS=['luxlight','arctic'],TC={luxdark:'#050505',oled:'#000000',navygold:'#0A1224',emerald:'#05110D',bordeaux:'#120709',noirblue:'#020306',noirgreen:'#020403',luxlight:'#F3F4F6',arctic:'#EDF2F8'};
  const oa=Skin.apply.bind(Skin);Skin.apply=function(k){oa(k);const R=document.documentElement;if(DARKS.includes(k))R.dataset.theme='dark';else if(LIGHTS.includes(k))R.dataset.theme='light';
    if(TC[k])document.querySelector('meta[name=theme-color]')?.setAttribute('content',TC[k])};Skin.apply(Skin.get())}
