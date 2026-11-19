/* =====================================================================
   VISUALS v2 — iconen, meters, grafieken, heatmap
   ===================================================================== */
const ICON_CDN='https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/';
const NOICON=new Set(LS.get('noicon',[]));
function noIcon(img){const s=img.dataset.s;if(s){NOICON.add(s);LS.set('noicon',[...NOICON])}img.remove()}
window.__csaNoIcon=noIcon;
// overschrijft ab(): coin-icoon met letters als terugval
ab=function(a,lg){const sym=a.sym||'?';const t=sym.slice(0,a.kind==='stock'?4:3);
  const img=a.kind==='crypto'&&!NOICON.has(sym)?`<img src="${ICON_CDN}${sym.toLowerCase()}.svg" alt="" loading="lazy" data-s="${sym}" onerror="__csaNoIcon(this)">`:'';
  return `<span class="ab${lg?' lg':''}${a.kind==='stock'?' st':''}" aria-hidden="true">${esc(t)}${img}</span>`};

/* halve-cirkel sentimentmeter */
function gauge(score,opts={}){
  const w=opts.w||220,h=w*.58,cx=w/2,cy=w*.5,r=w*.42,sw=opts.sw||w*.07;
  const seg=[['#CC3340',-100,-40],['#E08A93',-40,-15],['#AEB8C8',-15,15],['#7CC9A3',15,40],['#0A8754',40,100]];
  const ang=v=>Math.PI*(1-(v+100)/200);const pt=(v,rr)=>[cx+rr*Math.cos(ang(v)),cy-rr*Math.sin(ang(v))];
  const arcs=seg.map(([c,a,b])=>{const [x1,y1]=pt(a+1.2,r),[x2,y2]=pt(b-1.2,r);return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${c}" stroke-width="${sw}" fill="none"/>`}).join('');
  const v=score==null?0:clamp(score,-100,100);const [nx,ny]=pt(v,r-sw*.9);
  const needle=score==null?'':`<line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="var(--gauge-needle,var(--ink))" stroke-width="${Math.max(2,w/80)}" stroke-linecap="round" class="needle"/><circle cx="${cx}" cy="${cy}" r="${w/30}" fill="var(--gauge-needle,var(--ink))"/>`;
  return `<svg class="gauge" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Sentimentscore ${score==null?'onbekend':Math.round(score)}">${arcs}${needle}</svg>`;
}
/* impact-ring */
function ring(score,size=56){const r=size/2-4,c=2*Math.PI*r,p=clamp(score,0,100)/100;const col=score>=80?'var(--down)':score>=60?'var(--ring-hi)':score>=40?'var(--warn)':'var(--ink3)';
  return `<span class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--bg3)" stroke-width="4"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${col}" stroke-width="4" stroke-dasharray="${(c*p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size/2} ${size/2})"/></svg><b>${score}</b></span>`}
/* vlakgrafiek met verloop */
function area(vals,opts={}){
  if(!vals||vals.length<3)return `<div class="achart empty">${opts.empty||'Grafiek laden…'}</div>`;
  const W=600,H=opts.h||200,mn=Math.min(...vals),mx=Math.max(...vals),r=mx-mn||1,pad=r*.12;const lo=mn-pad,hi=mx+pad;
  const X=i=>i/(vals.length-1)*W,Y=v=>H-(v-lo)/(hi-lo)*H;const up=vals[vals.length-1]>=vals[0];const col=up?'var(--up)':'var(--down)';const id='g'+Math.random().toString(36).slice(2,7);
  const d=vals.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const yMax=(Y(mx)/H*100).toFixed(1),yMin=(Y(mn)/H*100).toFixed(1),yLast=(Y(vals[vals.length-1])/H*100).toFixed(1);
  return `<div class="achart" style="height:${H}px"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
  ${[.25,.5,.75].map(f=>`<line x1="0" x2="${W}" y1="${H*f}" y2="${H*f}" stroke="var(--line)" stroke-dasharray="3 5" vector-effect="non-scaling-stroke"/>`).join('')}
  <path d="${d} L${W} ${H} L0 ${H} Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
  <span class="alab" style="top:${yMax}%">${opts.fmt?opts.fmt(mx):mx}</span><span class="alab" style="top:${yMin}%">${opts.fmt?opts.fmt(mn):mn}</span>
  <span class="adot" style="top:${yLast}%;background:${col}"></span>
  ${opts.from?`<span class="axl l">${opts.from}</span><span class="axl r">${opts.to||'nu'}</span>`:''}</div>`;
}
/* heatmap */
function heatmap(list){
  return `<div class="heat">${list.map((a,i)=>{const ch=a.ch24||0,k=clamp(Math.abs(ch)/6,.12,1);const c=ch>=0?`color-mix(in srgb,var(--up) ${Math.round(k*100)}%,var(--heat0))`:`color-mix(in srgb,var(--down) ${Math.round(k*100)}%,var(--heat0))`;
    const big=i<2?'b2':i<8?'b1':'';const tc=Math.abs(ch)>=2.2?'#fff':'var(--ink)';return `<a class="${big}" href="#asset-${a.sym.toLowerCase()}" style="background:${c};color:${tc};text-shadow:${Math.abs(ch)>=2.2?'0 1px 1px rgba(0,0,0,.2)':'none'}" title="${esc(a.name)} ${pct(ch)}"><b>${esc(a.sym)}</b><span>${pct(ch,1)}</span>${big==='b2'?`<small>${eur(a.price)}</small>`:''}</a>`}).join('')}</div>`;
}
/* KPI-tegel */
function kpi(label,value,sub,extra,href){return `<${href?`a href="${href}"`:'div'} class="kpi">${`<div class="kl">${label}</div><div class="kv">${value}</div><div class="ks">${sub||''}</div>${extra||''}`}</${href?'a':'div'}>`}
