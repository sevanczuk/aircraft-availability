import React, { useMemo, useState, useCallback, useRef } from 'react';
import data from './aircraft_activity.json';
import metarData from './alb_metar.json';

// Aircraft identifiers and their colors
const tailsOrder = ['N65620', 'N854GW', 'N756VH'];
const tailColors = {
  N65620: '#E63946',
  N854GW: '#2A9D8F',
  N756VH: '#264653',
};

// Flight category colors (FAA standard)
const flightCategoryColor = {
  LIFR: '#FF00FF',
  IFR:  '#FF0000',
  MVFR: '#0000FF',
  VFR:  '#00FF00',
};

// Temperature → color mapping
function tempToColor(temp) {
  if (temp == null)      return 'transparent';
  if (temp <= -30)       return '#2c003e';
  if (temp <= -10)       return '#0033cc';
  if (temp <= 0)         return '#33ccff';
  if (temp <= 10)        return '#66ffcc';
  if (temp <= 20)        return '#ffff99';
  if (temp <= 30)        return '#ffcc00';
  return '#ff3300';
}

// Date range
const START_DATE = new Date(2024, 6, 1);
const END_DATE   = new Date(2025, 7, 1);

// Layout constants
const DEFAULT_HOUR_PX  = 4;
const BADGE_ROW_HEIGHT = 12;

// Build weeks (Mon→Sun)
function buildWeeks(start, end) {
  const weeks = [];
  const first = new Date(start);
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  let cur = new Date(first);
  while (cur <= end) {
    const wk = [];
    for (let i = 0; i < 7; i++) {
      wk.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(wk);
  }
  return weeks;
}

// Format date badges
function formatBadge(d) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const y = d.getFullYear();
  if (m === 1 && day === 1) return `${m}/${day}/${y}`;
  if (day === 1)           return `${m}/${day}`;
  return `${day}`;
}

// Background by weekday
function getBg(d) {
  const wd = d.getDay();
  if (wd === 2 || wd === 4) return '#F5F5F5';
  if (wd === 6)            return '#E6F9E6';
  if (wd === 0)            return '#E6F0FF';
  return 'transparent';
}

export default function App() {
  // Zoom control
  const [hourPx, setHourPx] = useState(DEFAULT_HOUR_PX);
  const DAY_WIDTH   = 24 * hourPx;
  const METAR_ROW_H = hourPx;
  const AC_ROW_H    = hourPx * 2;

  // Aircraft toggles
  const [visible, setVisible] = useState(
    tailsOrder.reduce((o, t) => ({ ...o, [t]: true }), {})
  );
  const toggleAC = (t) => setVisible(v => ({ ...v, [t]: !v[t] }));

  // METAR & temp toggles
  const [showFlightCat, setShowFlightCat] = useState(true);
  const [showTemp,       setShowTemp]       = useState(true);

  // Category filters
  const [catFilters, setCatFilters] = useState({
    LIFR: true, IFR: true, MVFR: true, VFR: true
  });
  const toggleCat = (c) => setCatFilters(f => ({ ...f, [c]: !f[c] }));

  // METAR lookup
  const metarLookup = useMemo(() => {
    const m = {};
    metarData.forEach(r => {
      const key = r.local_time.slice(0,10);
      const hr  = new Date(r.local_time).getHours();
      m[key] = m[key]||{};
      m[key][hr] = r;
    });
    return m;
  }, []);

  // Helper for filtering
  const blockHasCategory = useCallback((date, start, end, category) => {
    let sh = +start.slice(0,2), sm = +start.slice(2);
    let sMin = sh*60 + sm;
    let eh = +end.slice(0,2), em = +end.slice(2);
    let eMin = eh*60 + em;
    if (eMin <= sMin) eMin += 1440;
    for (let t = sMin; t < eMin; t += 60) {
      let hr = Math.floor(t/60), dKey = date.toISOString().slice(0,10);
      if (hr >= 24) {
        const nd = new Date(date);
        nd.setDate(nd.getDate()+1);
        dKey = nd.toISOString().slice(0,10);
        hr %= 24;
      }
      const rec = metarLookup[dKey]?.[hr];
      if (rec && rec.flight_category === category) return true;
    }
    return false;
  }, [metarLookup]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const cnt = { LIFR:0, IFR:0, MVFR:0, VFR:0 };
    tailsOrder.forEach(tail => {
      if (!visible[tail]) return;
      Object.entries(data[tail].blocksByDate).forEach(([dKey, blocks]) => {
        const date = new Date(dKey);
        blocks.forEach(([start,end]) =>
          Object.keys(cnt).forEach(cat => {
            if (blockHasCategory(date, start, end, cat)) cnt[cat]++;
          })
        );
      });
    });
    return cnt;
  }, [visible, blockHasCategory]);

  // Weeks
  const weeks = useMemo(() => buildWeeks(START_DATE, END_DATE), []);

  // Render blocks
  function renderBlocks(tail, date) {
    const key = date.toISOString().slice(0,10);
    return (data[tail].blocksByDate[key]||[]).map(([start,end], i) => {
      if (!Object.entries(catFilters).some(([cat,on]) =>
            on && blockHasCategory(date, start, end, cat)
      )) return null;

      let sh = +start.slice(0,2), sm = +start.slice(2);
      let sH = sh + sm/60;
      let eh = +end.slice(0,2), em = +end.slice(2);
      let eH = eh + em/60;
      if (eH <= sH) eH += 24;
      const left  = sH * hourPx;
      const width = (eH - sH) * hourPx;

      return (
        <div key={i}
             title={`${tail} ${date.toLocaleDateString()} ${start}–${end}`}
             style={{
               position:'absolute', left:`${left}px`,
               width:`${width}px`, height:'100%',
               backgroundColor: tailColors[tail]
             }}/>
      );
    });
  }

  // Drag state & refs
  const boxRef    = useRef(null);
  const handleRef = useRef(null);
  const [pos, setPos] = useState(null);

  const onPointerDown = (e) => {
    const box    = boxRef.current.getBoundingClientRect();
    const handle = handleRef.current.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const startL = pos?.left ?? box.left;
    const startT = pos?.top  ?? box.top;

    const onMove = ev => {
      let dx = ev.clientX - startX, dy = ev.clientY - startY;
      let newL = startL + dx, newT = startT + dy;
      // keep handle visible
      const minL = -(box.width - handle.width);
      const maxL = window.innerWidth - handle.width;
      const minT = 0, maxT = window.innerHeight - handle.height;
      newL = Math.min(Math.max(newL, minL), maxL);
      newT = Math.min(Math.max(newT, minT), maxT);
      setPos({ left:newL, top:newT });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    e.target.setPointerCapture(e.pointerId);
  };

  // Styles for the draggable box
  const boxStyle = pos
    ? { left:pos.left, top:pos.top }
    : { right:20, top:'50%', transform:'translateY(-50%)' };

  return (
    <div style={{ padding:20, fontFamily:'sans-serif' }}>
      <h2>Condair Flyers Aircraft Activity</h2>

      {/* Zoom */}
      <div style={{ marginBottom:16 }}>
        <label>
          Zoom:&nbsp;
          <input type="range" min="2" max="8" step="2"
                 value={hourPx}
                 onChange={e=>setHourPx(+e.target.value)}/>
          &nbsp;{hourPx}px/hour
        </label>
      </div>

      {/* Weekdays */}
      <div style={{
        display:'grid',
        gridTemplateColumns:`repeat(7, ${DAY_WIDTH}px)`,
        marginBottom:4, fontWeight:'bold', textAlign:'center'
      }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>(
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Hour ticks */}
      <div style={{
        position:'relative',
        width:`${7 * DAY_WIDTH}px`,
        height:`${BADGE_ROW_HEIGHT}px`,
        marginBottom:8
      }}>
        {['00','06','12','18'].map(h=>(
          <span key={h} style={{
            position:'absolute',
            top:0,
            left:`${(parseInt(h)/24)*7*DAY_WIDTH}px`,
            fontSize:8, color:'#666'
          }}>{h}</span>
        ))}
      </div>

      {/* Chart */}
      <div style={{ position:'relative' }}>
        <div style={{ overflowX:'auto' }}>
          {weeks.map((week,wi)=>(
            <div key={wi} style={{
              display:'grid',
              gridTemplateColumns:`repeat(7, ${DAY_WIDTH}px)`,
              gridTemplateRows:`${BADGE_ROW_HEIGHT}px repeat(3, ${AC_ROW_H}px) 2px ${METAR_ROW_H}px ${METAR_ROW_H}px`,
              marginBottom:2, borderBottom:'1px solid #DDD'
            }}>
              {/* Dates */}
              {week.map((d,di)=>(
                <div key={di} style={{
                  background:getBg(d),
                  padding:0,fontSize:8,
                  lineHeight:`${BADGE_ROW_HEIGHT}px`,
                  position:'relative'
                }}>
                  {formatBadge(d)}
                </div>
              ))}

              {/* Aircraft */}
              {tailsOrder.map((t,ti)=>
                week.map((d,di)=>(
                  <div key={`${t}-${di}`} style={{
                    gridRowStart: ti+2,
                    position:'relative',
                    width:DAY_WIDTH, height:AC_ROW_H,
                    background:getBg(d)
                  }}>
                    {visible[t] && renderBlocks(t,d)}
                  </div>
                ))
              )}

              {/* Flight cat */}
              {week.map((d,di)=>{
                const key = d.toISOString().slice(0,10),
                      hrMap = metarLookup[key]||{};
                return (
                  <div key={di} style={{
                    gridRowStart:6,
                    position:'relative',
                    width:DAY_WIDTH,height:METAR_ROW_H,
                    background:getBg(d)
                  }}>
                    {showFlightCat && Object.values(hrMap).map(rec=>{
                      const h = new Date(rec.local_time).getHours();
                      return (
                        <div key={rec.local_time}
                             title={`${rec.local_time}: ${rec.flight_category}\n${rec.raw_data}`}
                             style={{
                               position:'absolute',
                               top:0,left:`${h*hourPx}px`,
                               width:`${hourPx}px`,height:'100%',
                               backgroundColor:flightCategoryColor[rec.flight_category]
                             }}/>
                      );
                    })}
                  </div>
                );
              })}

              {/* Temp heatmap */}
              {week.map((d,di)=>{
                const key = d.toISOString().slice(0,10),
                      hrMap = metarLookup[key]||{};
                return (
                  <div key={di} style={{
                    gridRowStart:7,
                    position:'relative',
                    width:DAY_WIDTH,height:METAR_ROW_H,
                    background:getBg(d)
                  }}>
                    {showTemp && Object.values(hrMap).map(rec=>{
                      const h = new Date(rec.local_time).getHours();
                      return (
                        <div key={rec.local_time}
                             title={`${rec.local_time}: ${rec.temp_C}°C / ${rec.dewpoint_C}°C`}
                             style={{
                               position:'absolute',
                               top:0,left:`${h*hourPx}px`,
                               width:`${hourPx}px`,height:'100%',
                               backgroundColor:tempToColor(rec.temp_C)
                             }}/>
                      );
                    })}
                  </div>
                );
              })}

              {/* Tick lines */}
              {[0,6,12,18].map(h=>(
                <div key={h} style={{
                  position:'absolute',
                  top:0, left:`${h*hourPx}px`,
                  width:1,height:'100%',
                  backgroundColor:'#CCC',
                  pointerEvents:'none'
                }}/>
              ))}
            </div>
          ))}
        </div>

        {/* Draggable Tabs */}
        <div
          ref={boxRef}
          style={{
            position:'fixed',
            border:'1px solid #CCC',
            borderRadius:4,
            padding:8,
            background:'#FFF',
            zIndex:1000,
            ...boxStyle
          }}
        >
          <div
            ref={handleRef}
            onPointerDown={onPointerDown}
            style={{
              cursor:'grab',
              fontSize:10,
              color:'#666',
              marginBottom:6,
              textAlign:'center'
            }}
          >
            Use the tabs to hide/show layers<br/>and filter by flight category.
          </div>
          {tailsOrder.map(t=>(
            <button key={t} onClick={()=>toggleAC(t)} style={{
              display:'block',marginBottom:8,padding:'4px 8px',
              background: visible[t]? tailColors[t]:'#CCC',
              color:'#FFF',border:'none',cursor:'pointer',width:'100%'
            }}>{t}</button>
          ))}
          <button onClick={()=>setShowFlightCat(f=>!f)} style={{
            display:'block',marginBottom:8,padding:'4px 8px',
            background: showFlightCat?'#555':'#CCC',
            color:'#FFF',border:'none',cursor:'pointer',width:'100%'
          }}>Flight Category</button>
          <div style={{ marginLeft:4, marginBottom:8 }}>
            {['LIFR','IFR','MVFR','VFR'].map(cat=>(
              <button key={cat} onClick={()=>toggleCat(cat)} style={{
                display:'flex',justifyContent:'space-between',alignItems:'center',
                margin:'2px 0',padding:'2px 6px',
                background: catFilters[cat]? flightCategoryColor[cat]:'#CCC',
                color:'#FFF',border:'none',cursor:'pointer',width:'100%'
              }}>
                <span>{cat}</span><span>{categoryCounts[cat]}</span>
              </button>
            ))}
          </div>
          <button onClick={()=>setShowTemp(t=>!t)} style={{
            display:'block',padding:'4px 8px',
            background: showTemp?'#555':'#CCC',
            color:'#FFF',border:'none',cursor:'pointer',width:'100%'
          }}>Temperature</button>
        </div>
      </div>
    </div>
  );
}

