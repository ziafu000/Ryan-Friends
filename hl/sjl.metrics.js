
// SJL Metrics Engine (rolling 7-day) — window.SJL.*
(function(){
  const MIN_PER_DAY = 1440;

  function hmToMin(hm){
    if(!hm) return null;
    const [h,m] = hm.split(":").map(Number);
    if(Number.isNaN(h) || Number.isNaN(m)) return null;
    return (h*60 + m) % MIN_PER_DAY;
  }
  function minToHM(min){
    if(min==null) return "";
    min = ((min % MIN_PER_DAY)+MIN_PER_DAY)%MIN_PER_DAY;
    const h = Math.floor(min/60);
    const m = min % 60;
    return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
  }
  function sleepDurationMin(bedHM, wakeHM){
    const b = hmToMin(bedHM), w = hmToMin(wakeHM);
    if(b==null || w==null) return null;
    let d = w - b;
    if(d <= 0) d += MIN_PER_DAY; // crossed midnight
    return d;
  }
  function midsleepMin(bedHM, wakeHM){
    const b = hmToMin(bedHM), w = hmToMin(wakeHM);
    const dur = sleepDurationMin(bedHM, wakeHM);
    if(b==null || dur==null) return null;
    return (b + Math.round(dur/2)) % MIN_PER_DAY;
  }
  function circularMean(mins){
    if(!mins || mins.length===0) return null;
    // convert minutes to angle on unit circle
    let X=0, Y=0;
    for(const m of mins){
      const theta = 2*Math.PI * (m / MIN_PER_DAY);
      X += Math.cos(theta);
      Y += Math.sin(theta);
    }
    const ang = Math.atan2(Y, X);
    const angPos = (ang<0 ? ang + 2*Math.PI : ang);
    return Math.round( (angPos / (2*Math.PI)) * MIN_PER_DAY ) % MIN_PER_DAY;
  }
  function avg(arr){
    if(!arr || arr.length===0) return null;
    return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
  }
  function parseISO(iso){ const [y,m,d]=iso.split("-").map(Number); return new Date(y, m-1, d); }
  function fmtISO(d){ d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
  function isoAdd(iso, days){ const d=parseISO(iso); d.setDate(d.getDate()+days); return fmtISO(d); }
  function inRange(dateISO, startISO, endISO){
    const d = parseISO(dateISO), s=parseISO(startISO), e=parseISO(endISO);
    return d>=s && d<=e;
  }

  // Compute MSW, MSF, MSFsc, SJL for window [D-6..D]
  function computeWindow(dateISO, logs){
    const startISO = isoAdd(dateISO, -6);
    const window = (logs||[]).filter(x=> x && x.date && x.bed && x.wake && inRange(x.date, startISO, dateISO));
    const work = window.filter(x=> (x.kind||"work").toLowerCase()==="work");
    const free = window.filter(x=> (x.kind||"free").toLowerCase()==="free");

    const midsW = work.map(x=> midsleepMin(x.bed, x.wake)).filter(m=>m!=null);
    const midsF = free.map(x=> midsleepMin(x.bed, x.wake)).filter(m=>m!=null);
    const durW  = work.map(x=> sleepDurationMin(x.bed, x.wake)).filter(m=>m!=null);
    const durF  = free.map(x=> sleepDurationMin(x.bed, x.wake)).filter(m=>m!=null);

    if(midsW.length<1 || midsF.length<1){
      return { hasData:false };
    }
    const MSW = circularMean(midsW);
    const MSF = circularMean(midsF);
    const SDw = avg(durW);  // mean duration (work)
    const SDf = avg(durF);  // mean duration (free)

    // Scaled MSF (MSFsc) correction using duration difference
    let MSFsc = MSF;
    if(SDf!=null && SDw!=null && SDf>SDw){
      const correction = Math.round(0.5 * (SDf - SDw)); // minutes
      MSFsc = (MSF - correction + MIN_PER_DAY) % MIN_PER_DAY;
    }

    let SJL = Math.abs(MSF - MSW);
    if(SJL > MIN_PER_DAY/2) SJL = MIN_PER_DAY - SJL; // shortest arc on circle

    const color = sjlColor(SJL);

    return { hasData:true, MSW, MSF, MSFsc, SDw, SDf, SJL, color };
  }

  function sjlColor(sjlMin){
    if(sjlMin==null) return "#1f2937"; // gray
    if(sjlMin <= 30) return "#16a34a"; // green ok
    if(sjlMin <= 60) return "#22d3ee"; // cyan mild
    if(sjlMin <= 120) return "#f59e0b"; // amber warn
    return "#ef4444"; // red
  }

  function series(lastDays=28){
    const s = (window.HL && HL.getState && HL.getState()) || {logs:[]};
    const logs = s.logs || [];
    // find end date = max(log date) or today
    let end = new Date();
    if(logs.length){
      const maxISO = logs.map(x=>x.date).filter(Boolean).sort().slice(-1)[0];
      if(maxISO) end = parseISO(maxISO);
    }
    const endISO = fmtISO(end);
    const startISO = fmtISO(new Date(end.getFullYear(), end.getMonth(), end.getDate()-lastDays+1));
    // Build daily array
    const days = [];
    for(let d = parseISO(startISO); d <= end; d.setDate(d.getDate()+1)){
      const iso = fmtISO(d);
      const r = computeWindow(iso, logs);
      days.push({ date: iso, ...r });
    }
    return days;
  }

  window.SJL = { hmToMin, minToHM, sleepDurationMin, midsleepMin, circularMean, computeWindow, series, sjlColor };
})();
