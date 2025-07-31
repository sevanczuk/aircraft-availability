import React, { useMemo, useState } from 'react';
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
const DEFAULT_HOUR_PX  = 4;   // px per hour (width)
const BADGE_ROW_HEIGHT = 12;  // px for the date badge row

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
  const m = d.getMonth() + 1, day = d.getDate(), y = d.getFullYear();
  if (m===1 && day===1) return `${m}/${day}/${y}`;
  if (day===1)          return `${m}/${day}`;
  return `${day}`;
}

// Background shading by weekday
function getBg(d) {
  const wd = d.getDay();
  if (wd===2||wd===4) return '#F5F5F5';   // Tue/Thu
  if (wd===6)        return '#E6F9E6';   // Sat
  if (wd===0)        return '#E6F0FF';   // Sun
  return 'transparent';                  // Mon/Wed/Fri
}

export default function App() {
  // Zoom control
  const [hourPx, setHourPx] = useState(DEFAULT_HOUR_PX);
  const DAY_WIDTH      = 24 * hourPx;
  const METAR_ROW_H    = hourPx;      // 4px
  const AC_ROW_H       = hourPx * 2;  // 8px

  // Show/hide toggles
  const [visible, setVisible] = useState(
    tailsOrder.reduce((o,t)=>({ ...o, [t]: true }), {})
  );
  const toggleAC = t => setVisible(v=>({...v,[t]:!v[t]}));

  const [showFlightCat, setShowFlightCat] = useState(true);
  const [showTemp,       setShowTemp]       = useState(true);

  // New category filters
  const [catFilters, setCatFilters] = useState({
    LIFR: true,
    IFR:  true,
    MVFR: true,
    VFR:  true
  });
  const toggleCat = c => setCatFilters(f=>({ ...f, [c]: !f[c] }));

  // Build METAR lookup: dateKey → hour → record
  const metarLookup = useMemo(() => {
    const m = {};
    metarData.forEach(r => {
      const dateKey = r.local_time.slice(0,10);
      const hr = new Date(r.local_time).getHours();
      m[dateKey] = m[dateKey]||{};
      m[dateKey][hr] = r;
    });
    return m;
  }, []);

  // Weeks array
  const weeks = useMemo(() => buildWeeks(START_DATE, END_DATE), []);

  // Helper: does this aircraft block intersect any selected flight category?
  function blockMatchesFilters(date, start, end) {
    // parse start/end into minutes since midnight
    const sh = +start.slice(0,2), sm = +start.slice(2);
    let sMin = sh*60 + sm;
    const eh = +end.slice(0,2), em = +end.slice(2);
    let eMin = eh*60 + em;
    if (eMin <= sMin) eMin += 1440; // cross-midnight

    // check each hour slot overlapped
    for (let tMin = sMin; tMin < eMin; tMin += 60) {
      let hour = Math.floor(tMin/60);
      let dateKey = date.toISOString().slice(0,10);
      if (hour >= 24) {
        // next day
        const next = new Date(date);
        next.setDate(next.getDate()+1);
        dateKey = next.toISOString().slice(0,10);
        hour %= 24;
      }
      const rec = metarLookup[dateKey]?.[hour];
      if (rec && catFilters[rec.flight_category]) {
        return true;
      }
    }
    return false;
  }

  // Render one aircraft's blocks for a day, with filtering
  function renderBlocks(tail, date) {
    const key = date.toISOString().slice(0,10);
    const blocks = data[tail].blocksByDate[key] || [];
    return blocks.map(([start,end], i) => {
      if (!blockMatchesFilters(date, start, end)) return null;
      const sh = +start.slice(0,2), sm = +start.slice(2);
      let sH = sh + sm/60;
      const eh = +end.slice(0,2), em = +end.slice(2);
      let eH = eh + em/60;
      if (eH <= sH) eH += 24;
      const left  = sH * hourPx;
      const width = (eH - sH) * hourPx;
      return (
        <div key={i}
          title={`${tail} ${date.toLocaleDateString()} ${start}–${end}`}
          style={{
            position: 'absolute',
            left:     `${left}px`,
            width:    `${width}px`,
            height:   '100%',
            backgroundColor: tailColors[tail],
          }}
        />
      );
    });
  }

  return (
    <div style={{ padding:20, fontFamily:'sans-serif' }}>
      <h2>Condair Flyers Aircraft Activity</h2>
      <div style={{
        fontStyle:'italic', color:'#666', fontSize:12,
        margin:'4px 0 12px'
      }}>
        Use the tabs to hide/show layers and filter by flight category.
      </div>

      {/* Zoom Control */}
      <div style={{ marginBottom:16 }}>
        <label>
          Zoom:&nbsp;
          <input
            type="range" min="2" max="8" step="2"
            value={hourPx}
            onChange={e=>setHourPx(+e.target.value)}
          />
          &nbsp;{hourPx}px/hour
        </label>
      </div>

      {/* Weekday header */}
      <div style={{
        display:'grid',
        gridTemplateColumns:`repeat(7, ${DAY_WIDTH}px)`,
        marginBottom:4, fontWeight:'bold', textAlign:'center'
      }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d =>
          <div key={d}>{d}</div>
        )}
      </div>

      {/* Tick labels */}
      <div style={{
        position:'relative',
        width:`${7*DAY_WIDTH}px`,
        height:`${BADGE_ROW_HEIGHT}px`,
        marginBottom:8
      }}>
        {['00','06','12','18'].map(h => (
          <span key={h} style={{
            position:'absolute', top:0,
            left:`${(parseInt(h,10)/24)*7*DAY_WIDTH}px`,
            fontSize:8, color:'#666'
          }}>{h}</span>
        ))}
      </div>

      {/* Chart + Floating Tabs */}
      <div style={{ position:'relative' }}>
        {/* Scrollable chart */}
        <div style={{ overflowX:'auto' }}>
          {weeks.map((week,wi)=>(
            <div key={wi} style={{
              display:'grid',
              gridTemplateColumns:`repeat(7, ${DAY_WIDTH}px)`,
              gridTemplateRows:`${BADGE_ROW_HEIGHT}px repeat(3, ${AC_ROW_H}px) 2px ${METAR_ROW_H}px ${METAR_ROW_H}px`,
              marginBottom:2,
              borderBottom:'1px solid #DDD'
            }}>
              {/* Date badge row */}
              {week.map((d,di)=>(
                <div key={di} style={{
                  background:getBg(d), padding:'0px',
                  fontSize:8, lineHeight:`${BADGE_ROW_HEIGHT}px`,
                  position:'relative'
                }}>{formatBadge(d)}</div>
              ))}

              {/* Aircraft rows */}
              {tailsOrder.map((tail,ti)=>
                week.map((d,di)=>(
                  <div key={`${tail}-${di}`} style={{
                    gridRowStart: ti+2,
                    position:'relative',
                    width:DAY_WIDTH,
                    height:AC_ROW_H,
                    background:getBg(d)
                  }}>
                    {visible[tail] && renderBlocks(tail,d)}
                  </div>
                ))
              )}

              {/* Flight Category row */}
              {week.map((d,di)=> {
                const dateKey = d.toISOString().slice(0,10);
                const hrMap   = metarLookup[dateKey]||{};
                return (
                  <div key={di} style={{
                    gridRowStart:6,
                    position:'relative',
                    width:DAY_WIDTH,
                    height:METAR_ROW_H,
                    background:getBg(d)
                  }}>
                    {showFlightCat && Object.values(hrMap).map(rec=>{
                      const h = new Date(rec.local_time).getHours();
                      return (
                        <div key={rec.local_time}
                          title={`${rec.local_time}: ${rec.flight_category}\n${rec.raw_data}`}
                          style={{
                            position:'absolute',
                            top:0, left:`${h*hourPx}px`,
                            width:`${hourPx}px`,
                            height:'100%',
                            backgroundColor:flightCategoryColor[rec.flight_category]
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}

              {/* Temperature row */}
              {week.map((d,di)=> {
                const dateKey = d.toISOString().slice(0,10);
                const hrMap   = metarLookup[dateKey]||{};
                return (
                  <div key={di} style={{
                    gridRowStart:7,
                    position:'relative',
                    width:DAY_WIDTH,
                    height:METAR_ROW_H,
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
                            width:`${hourPx}px`,
                            height:'100%',
                            backgroundColor:tempToColor(rec.temp_C)
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}

              {/* Vertical tick lines */}
              {[0,6,12,18].map(h=>(
                <div key={h} style={{
                  position:'absolute',
                  top:0,left:`${h*hourPx}px`,
                  width:1,height:'100%',
                  backgroundColor:'#CCC',
                  pointerEvents:'none'
                }}/>
              ))}
            </div>
          ))}
        </div>

        {/* Floating Tabs */}
        <div style={{
          position:'fixed',
          right:20,
          top:'50%',
          transform:'translateY(-50%)',
          border:'1px solid #CCC',
          borderRadius:4,
          padding:8,
          background:'#FFF',
          zIndex:1000
        }}>
          {tailsOrder.map(t=>(
            <button key={t}
              onClick={()=>toggleAC(t)}
              style={{
                display:'block',
                marginBottom:8,
                padding:'4px 8px',
                background: visible[t] ? tailColors[t] : '#CCC',
                color:'#FFF', border:'none', cursor:'pointer', width:'100%'
              }}>
              {t}
            </button>
          ))}
          <button
            onClick={()=>setShowFlightCat(f=>!f)}
            style={{
              display:'block', marginBottom:8,
              padding:'4px 8px',
              background: showFlightCat ? '#555' : '#CCC',
              color:'#FFF', border:'none', cursor:'pointer', width:'100%'
            }}>
            Flight Category
          </button>
          <div style={{ marginLeft:4, marginBottom:8 }}>
            {['LIFR','IFR','MVFR','VFR'].map(cat=>(
              <button key={cat}
                onClick={()=>toggleCat(cat)}
                style={{
                  display:'block',
                  margin:'2px 0',
                  padding:'2px 6px',
                  background: catFilters[cat] ? flightCategoryColor[cat] : '#CCC',
                  color:'#FFF', border:'none', cursor:'pointer', width:'100%'
                }}>
                {cat}
              </button>
            ))}
          </div>
          <button
            onClick={()=>setShowTemp(t=>!t)}
            style={{
              display:'block',
              padding:'4px 8px',
              background: showTemp ? '#555' : '#CCC',
              color:'#FFF', border:'none', cursor:'pointer', width:'100%'
            }}>
            Temperature
          </button>
        </div>

      </div>
    </div>
  );
}

