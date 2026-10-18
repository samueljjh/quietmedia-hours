/* Quiet Media call sheet renderer. Used by the app (live preview) and by p/index.html (the page crew open).
   Input: the decrypted sheet payload. Output: HTML. Weather is fetched afterwards with QMSheet.weather(root,data). */
(function(root){
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lines=s=>String(s||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const fmtD=(ms,o)=>new Date(ms).toLocaleDateString('en-GB',o);
  const tel=p=>'tel:'+String(p||'').replace(/[^+\d]/g,'');
  const mapsUrl=q=>'https://maps.apple.com/?q='+encodeURIComponent(q);
  const gmaps=q=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);
  const CSS=`
.cs{--cs-line:rgba(128,128,128,.22);--cs-muted:#8E8A84;font-variant-numeric:tabular-nums;line-height:1.45}
.cs *{box-sizing:border-box}
.cs a{color:inherit}
.cs h1,.cs h2,.cs h3,.cs p,.cs ul,.cs dl{margin:0}
.cs .cs-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px}
.cs .cs-brand{display:flex;align-items:center;gap:9px;font-size:17px;font-weight:300;letter-spacing:-.2px}
.cs .cs-brand svg{width:24px;height:24px}
.cs .cs-kind{text-align:right;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--cs-muted)}
.cs .cs-kind b{display:block;font-size:13px;font-weight:500;letter-spacing:0;text-transform:none;color:inherit;margin-top:2px}
.cs h1{font-size:clamp(28px,5vw,40px);font-weight:300;letter-spacing:-.7px;line-height:1.05;text-wrap:balance}
.cs .cs-lead{color:var(--cs-muted);margin-top:6px;font-size:15px}
.cs .cs-day{margin-top:26px}
.cs .cs-dayhead{display:flex;align-items:baseline;gap:10px;margin-bottom:12px;padding-top:18px;border-top:1px solid var(--cs-line)}
.cs .cs-dayhead b{font-size:20px;font-weight:400;letter-spacing:-.2px}
.cs .cs-dayhead span{color:var(--cs-muted);font-size:13px}
.cs .cs-times{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px}
.cs .cs-time{border-radius:14px;padding:12px 14px;background:rgba(128,128,128,.1)}
.cs .cs-time.main{background:currentColor}
.cs .cs-time.main *{color:var(--cs-inv,#0A0A0A)}
.cs .cs-time small{display:block;font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--cs-muted);margin-bottom:2px}
.cs .cs-time b{font-size:26px;font-weight:300;letter-spacing:-.5px;line-height:1.1}
.cs .cs-sec{padding:14px 0;border-top:1px solid var(--cs-line)}
.cs .cs-sec h2{font-size:10px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--cs-muted);margin-bottom:8px}
.cs .cs-sec p{font-size:15px}
.cs .cs-sec .cs-sub{color:var(--cs-muted);font-size:13px;margin-top:4px;white-space:pre-line}
.cs .cs-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:0 24px}
.cs .cs-two>.cs-sec{border-top:1px solid var(--cs-line)}
.cs a.cs-link{color:inherit;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--cs-line)}
.cs table{width:100%;border-collapse:collapse;font-size:14px}
.cs td,.cs th{padding:7px 10px 7px 0;vertical-align:top;text-align:left;border-top:1px solid var(--cs-line)}
.cs tr:first-child td{border-top:0}
.cs td.t{white-space:nowrap;font-weight:500;width:64px}
.cs td.r,.cs th.r{text-align:right;padding-right:0;white-space:nowrap}
.cs td .cs-role{color:var(--cs-muted);font-size:13px}
.cs .cs-wx{display:flex;gap:18px;flex-wrap:wrap;font-size:14px}
.cs .cs-wx b{font-weight:500}
.cs .cs-wx span{color:var(--cs-muted)}
.cs .cs-wx .cs-wxbig{font-size:26px;font-weight:300;letter-spacing:-.5px;line-height:1}
.cs ul.cs-list{padding-left:18px;font-size:15px;display:grid;gap:3px}
.cs .cs-acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.cs .cs-btn{display:inline-flex;align-items:center;justify-content:center;padding:13px 20px;border-radius:999px;background:currentColor;text-decoration:none;font-size:13px;font-weight:500;min-height:44px}
.cs .cs-btn span{color:var(--cs-inv,#0A0A0A)}
.cs .cs-btn.ghost{background:transparent;box-shadow:inset 0 0 0 1px var(--cs-line)}
.cs .cs-btn.ghost span{color:inherit}
.cs .cs-foot{font-size:12px;color:var(--cs-muted);margin-top:22px}
.cs .cs-warn{font-size:13px;color:#C9894E}
@media print{.cs .cs-acts{display:none}}
`;
  const LOGO='<svg viewBox="0 0 400 400" aria-hidden="true"><path d="M 296.555 343.549 A 173 173 0 1 1 343.549 296.555 L 302.822 255.828 A 117 117 0 1 0 255.828 302.822 L 296.555 343.549 Z" fill="currentColor"/></svg>';
  function timeBox(label,val,main){return val?'<div class="cs-time'+(main?' main':'')+'"><small>'+label+'</small><b>'+esc(val)+'</b></div>':''}
  function dayBlock(d,i,data){
    const n=data.days.length;const dt=new Date(d.date);
    const loc=d.location||{};const hasLoc=loc.name||loc.address;
    const sched=(d.schedule||[]).filter(r=>r.item||r.time).slice().sort((a,b)=>String(a.time).localeCompare(String(b.time)));
    return '<section class="cs-day" data-day="'+i+'">'+(n>1?'<div class="cs-dayhead"><b>Day '+(i+1)+' of '+n+'</b><span>'+fmtD(d.date,{weekday:'long',day:'numeric',month:'long'})+'</span></div>':'')+
      '<div class="cs-times">'+timeBox('General call',d.call,true)+timeBox('Shooting call',d.shootCall)+timeBox('Est. wrap',d.wrap)+'</div>'+
      (data.weather!==false?'<div class="cs-sec" id="cs-wx-'+i+'"><h2>Weather</h2><div class="cs-wx">'+(d.weatherNote?'<span>'+esc(d.weatherNote)+'</span>':'<span>Forecast loads when the page opens.</span>')+'</div></div>':'')+
      (hasLoc?'<div class="cs-sec"><h2>Location</h2><p>'+(loc.name?'<b style="font-weight:500">'+esc(loc.name)+'</b>'+(loc.address?' · ':''):'')+(loc.address?'<a class="cs-link" target="_blank" rel="noopener" href="'+mapsUrl(loc.address)+'">'+esc(loc.address)+'</a>':'')+'</p>'+(loc.notes?'<p class="cs-sub">'+esc(loc.notes)+'</p>':'')+'</div>':'')+
      (sched.length?'<div class="cs-sec"><h2>Schedule</h2><table>'+sched.map(r=>'<tr><td class="t">'+esc(r.time)+'</td><td>'+esc(r.item)+'</td></tr>').join('')+'</table></div>':'')+
      '</section>';
  }
  function render(data){
    const days=data.days||[];const one=days.length===1;
    const dates=days.map(d=>fmtD(d.date,{weekday:'short',day:'numeric',month:'short'}));
    const crew=(data.crew||[]).filter(c=>c.name);
    const contacts=(data.contacts||[]).filter(c=>c.name);
    const kit=lines(data.equipment);const hosp=data.hospital||{};const hotel=data.hotel||{};
    const confirmBody=encodeURIComponent('Confirmed for '+data.title+' on '+dates.join(', ')+'. – ');
    return '<div class="cs">'+
    '<div class="cs-top"><div class="cs-brand">'+LOGO+'<span>quiet media</span></div><div class="cs-kind">Call sheet<b>'+esc(one?dates[0]:dates[0]+' – '+dates[dates.length-1])+'</b></div></div>'+
    '<h1>'+esc(data.title)+'</h1><p class="cs-lead">'+[data.production,one?fmtD(days[0].date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}):days.length+' shoot days'].filter(Boolean).map(esc).join(' · ')+'</p>'+
    days.map((d,i)=>dayBlock(d,i,data)).join('')+
    (crew.length?'<div class="cs-sec"><h2>Crew</h2><table>'+crew.map(c=>'<tr><td><b style="font-weight:500">'+esc(c.name)+'</b>'+(c.role?' <span class="cs-role">'+esc(c.role)+'</span>':'')+'</td>'+(c.call?'<td class="t">'+esc(c.call)+'</td>':'<td></td>')+'<td class="r">'+(c.phone?'<a class="cs-link" href="'+tel(c.phone)+'">'+esc(c.phone)+'</a>':'')+'</td></tr>').join('')+'</table></div>':'')+
    '<div class="cs-two">'+
    (contacts.length?'<div class="cs-sec"><h2>Contacts</h2><table>'+contacts.map(c=>'<tr><td><b style="font-weight:500">'+esc(c.name)+'</b>'+(c.role?' <span class="cs-role">'+esc(c.role)+'</span>':'')+'</td><td class="r">'+(c.phone?'<a class="cs-link" href="'+tel(c.phone)+'">'+esc(c.phone)+'</a>':'')+'</td></tr>').join('')+'</table></div>':'')+
    ((hosp.name||hosp.address)?'<div class="cs-sec"><h2>Nearest A&amp;E</h2><p><b style="font-weight:500">'+esc(hosp.name||'')+'</b></p>'+(hosp.address?'<p><a class="cs-link" target="_blank" rel="noopener" href="'+mapsUrl(hosp.address)+'">'+esc(hosp.address)+'</a></p>':'')+(hosp.phone?'<p><a class="cs-link" href="'+tel(hosp.phone)+'">'+esc(hosp.phone)+'</a></p>':'')+'<p class="cs-sub">In an emergency call 999.</p></div>':'')+
    ((hotel.name||hotel.address)?'<div class="cs-sec"><h2>'+esc(hotel.label||'Hotel')+'</h2><p><b style="font-weight:500">'+esc(hotel.name||'')+'</b></p>'+(hotel.address?'<p><a class="cs-link" target="_blank" rel="noopener" href="'+mapsUrl(hotel.address)+'">'+esc(hotel.address)+'</a></p>':'')+(hotel.notes?'<p class="cs-sub">'+esc(hotel.notes)+'</p>':'')+'</div>':'')+
    (kit.length?'<div class="cs-sec"><h2>Please bring</h2><ul class="cs-list">'+kit.map(k=>'<li>'+esc(k)+'</li>').join('')+'</ul></div>':'')+
    '</div>'+
    (data.notes?'<div class="cs-sec"><h2>Notes</h2><p style="white-space:pre-line">'+esc(data.notes)+'</p></div>':'')+
    (data.interactive!==false?'<div class="cs-sec"><h2>Can you make it?</h2><p>One tap to let '+esc(data.from||'us')+' know.</p><div class="cs-acts">'+(data.replyPhone?'<a class="cs-btn" href="sms:'+esc(String(data.replyPhone).replace(/\s+/g,''))+(/(iPhone|iPad|Mac)/.test(navigator.userAgent)?'&':'?')+'body='+confirmBody+'"><span>Confirm by text</span></a>':'')+(data.replyEmail?'<a class="cs-btn'+(data.replyPhone?' ghost':'')+'" href="mailto:'+esc(data.replyEmail)+'?subject='+encodeURIComponent('Confirmed: '+data.title+' '+dates.join(', '))+'&body='+confirmBody+'"><span>Confirm by email</span></a>':'')+'</div>'+(data.replyPhone||data.replyEmail?'<p class="cs-sub">'+(data.replyPhone?'Call or text '+esc(data.replyPhone)+'. ':'')+(data.replyEmail?'Email '+esc(data.replyEmail)+'.':'')+'</p>':'')+'</div>':'')+
    '<p class="cs-foot">'+(data.version?'Version '+data.version+' · ':'')+'Updated '+fmtD(data.updated||Date.now(),{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+'. If anything changes you will get a new message and this page updates with it.</p>'+
    '</div>';
  }
  /* Weather: Open-Meteo, no key. Geocodes the day's address, then reads that date's forecast (up to 16 days ahead). */
  const WX={0:'Clear',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Showers',81:'Showers',82:'Heavy showers',85:'Snow showers',86:'Snow showers',95:'Thunderstorm',96:'Thunderstorm',99:'Thunderstorm'};
  async function weather(rootEl,data){
    if(data.weather===false)return;
    for(let i=0;i<(data.days||[]).length;i++){const d=data.days[i];const el=rootEl.querySelector('#cs-wx-'+i+' .cs-wx');if(!el)continue;
      const q=(d.location&&(d.location.address||d.location.name))||data.baseAddress||'';
      const iso=new Date(d.date);const ymd=iso.getFullYear()+'-'+String(iso.getMonth()+1).padStart(2,'0')+'-'+String(iso.getDate()).padStart(2,'0');
      const ahead=(new Date(ymd)-new Date(new Date().toDateString()))/864e5;
      if(!q||ahead<-1||ahead>15){if(!d.weatherNote)el.innerHTML='<span>'+(q?'Forecast available from 16 days before the shoot.':'Add a location to get a forecast.')+'</span>';continue}
      try{
        const g=await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name='+encodeURIComponent(q.split(',').slice(-2).join(',').trim()||q))).json();
        const hit=g.results&&g.results[0];if(!hit)throw 0;
        const f=await (await fetch('https://api.open-meteo.com/v1/forecast?latitude='+hit.latitude+'&longitude='+hit.longitude+'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset&timezone=auto&start_date='+ymd+'&end_date='+ymd)).json();
        const dd=f.daily;if(!dd||!dd.time||!dd.time.length)throw 0;
        const t=s=>s.slice(11,16);
        el.innerHTML='<div><span class="cs-wxbig">'+Math.round(dd.temperature_2m_max[0])+'°</span> <span>/ '+Math.round(dd.temperature_2m_min[0])+'° · '+(WX[dd.weather_code[0]]||'')+'</span></div>'+
          '<div><b>'+(dd.precipitation_probability_max[0]??'–')+'%</b> <span>rain</span></div><div><b>'+Math.round(dd.wind_speed_10m_max[0])+' km/h</b> <span>wind</span></div><div><b>'+t(dd.sunrise[0])+'</b> <span>sunrise</span></div><div><b>'+t(dd.sunset[0])+'</b> <span>sunset</span></div>'+(d.weatherNote?'<div><span>'+esc(d.weatherNote)+'</span></div>':'')+
          '<div style="flex-basis:100%"><span style="font-size:12px">Forecast for '+esc(hit.name)+', Open‑Meteo.</span></div>';
      }catch(e){if(!d.weatherNote)el.innerHTML='<span>Forecast unavailable right now.</span>'}
    }
  }
  root.QMSheet={css:CSS,render,weather};
})(typeof window!=='undefined'?window:globalThis);
