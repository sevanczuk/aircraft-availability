import React, { useMemo, useState } from 'react';
import data from './aircraft_activity.json';
import metarData from './alb_metar.json';   // new import

// Aircraft order & colors
const tailsOrder = ['N65620', 'N854GW', 'N756VH'];
const tailColors = {
  N65620: '#E63946',
  N854GW: '#2A9D8F',
  N756VH: '#264653',
};

// Flight category colors
const flightCategoryColor = {
  LIFR: '#FF00FF',
  IFR:  '#FF0000',
  MVFR: '#0000FF',
  VFR:  '#00FF00'
};

// Temperature heatmap color function
function tempToColor(temp) {
  if (temp == null) return 'transparent';
  if (temp <= -30) return '#2c003e';
  if (temp <= -10) return '#0033cc';
  if (temp <= 0)   return '#33ccff';
  if (temp <= 10)  return '#66ffcc';
  if (temp <= 20)  return '#ffff99';
  if (temp <= 30)  return '#ffcc00';
  return '#ff3300';
}

// Date range
const START_DATE = new Date(2024, 6, 1);
const END_DATE   = new Date(2025, 7, 1);

// Layout constants (tight)
const DEFAULT_HOUR_PX  = 4;    // square px/hour
const BADGE_ROW_HEIGHT = 12;   // px

// Build Mon–Sun weeks
function buildWeeks(start, end) {
  const weeks = [];
  const first = new Date(start);
  first.setDate(first.getDate() - ((first.getDay()+6)%7));
  let cursor = new Date(first);
  while (cursor <= end) {
    const wk = [];
    for (let i = 0; i < 7; i++) {
      wk.push(new Date(cursor));
      cursor.setDate(cursor.getDate()+1);
    }
    weeks.push(wk);
  }
  return weeks;
}

// Date badge formatting
function formatBadge(d) {
  const m = d.getMonth()+1, day = d.getDate(), y = d.getFullYear();
  if (m===1 && day===1) return `${m}/${day}/${y}`;
  if (day===1) return `${m}/${day}`;
  return `${day}`;
}

// Background by weekday
function getBg(d) {
  const wd = d.getDay();
  if (wd===2||wd===4) return '#F5F5F5';  // Tue/Thu
  if (wd===6)        return '#E6F9E6';  // Sat
  if (wd===0)        return '#E6F0FF';  // Sun
  return 'transparent';                 // Mon/Wed/Fri
}

// Main App
export default function App() {
  // Zoom (px/hour)
  const [hourPx] = useState(DEFAULT_HOUR_PX);
  const DAY_WIDTH = 24 * hourPx;
  const ROW_H     = hourPx;

  // Precompute weeks
  const weeks = useMemo(() => buildWeeks(START_DATE, END_DATE), []);

  // Visibility toggles
  const [visible, setVisible] = useState(
    tailsOrder.reduce((o,t)=>({ ...o, [t]: true }), {})
  );
  const toggle = t => setVisible(v=>({ ...v, [t]: !v[t] }));

  // Build METAR lookup by date and hour
  const metarLookupByDateHour = useMemo(() => {
    const map = {};
    metarData.forEach(rec => {
      const dateKey = rec.local_time.slice(0,10);
      const hr = new Date(rec.local_time).getHours();
      map[dateKey] = map[dateKey] || {};
      map[dateKey][hr] = rec;
    });
    return map;
  }, []);

  // Render aircraft blocks as before (minute-level)
  function renderBlocks(tail, date) {
    const key    = date.toISOString().slice(0,10);
    const blocks = data[tail].blocksByDate[key] || [];
    return blocks.map(([start,end], idx) => {
      const sh = +start.slice(0,2), sm = +start.slice(2);
      const eh = +end.slice(0,2),   em = +end.slice(2);
      let sH = sh + sm/60, eH = eh + em/60;
      if (eH < sH) eH += 24;  // cross-midnight
      const left  = sH * hourPx;
      const width = (eH - sH) * hourPx;
      return (
        <div
          key={idx}
          title={`${tail} ${date.toLocaleDateString()} ${start}–${end}`}
          style={{
            position: 'absolute',
            left:     `${left}px`,
            width:    `${width}px`,
            height:   '100%',
            backgroundColor: tailColors[tail]
          }}
        />
      );
    });
  }

  return (
    <div style={{ padding:20, fontFamily:'sans-serif' }}>
      <h2>Condair Flyers Aircraft Activity</h2>
      <div style={{
        fontStyle:'italic', color:'#666',
        fontSize:12, margin:'4px 0 12px'
      }}>
        Click on an aircraft identifier tab to hide/show its activity.
      </div>

      {/* Tabs */}
      <div style={{ marginBottom:12 }}>
        {tailsOrder.map(t => (
          <button
            key={t}
            onClick={()=>toggle(t)}
            style={{
              marginRight:8, padding:'4px 8px',
              background: visible[t] ? tailColors[t] : '#CCC',
              color:'#FFF', border:'none', cursor:'pointer'
            }}
          >{t}</button>
        ))}
      </div>

      {/* Weekday header */}
      <div style={{
        display:'grid',
        gridTemplateColumns:`repeat(7, ${DAY_WIDTH}px)`,
        marginBottom:4,fontWeight:'bold',textAlign:'center'
      }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>
          <div key={d}>{d}</div>
        )}
      </div>

      {/* Tick labels */}
      <div style={{
        position:'relative',
        width:`${7*DAY_WIDTH}px`,
        height: `${BADGE_ROW_HEIGHT}px`,
        marginBottom:8
      }}>
        {['00','06','12','18'].map(h=>(
          <span key={h} style={{
            position:'absolute',
            top:0,
            left:`${(parseInt(h,10)/24)*7*DAY_WIDTH}px`,
            fontSize:8, color:'#666'
          }}>{h}</span>
        ))}
      </div>

      {/* Chart weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} style={{
          display:'grid',
          gridTemplateColumns:`repeat(7, ${DAY_WIDTH}px)`,
          gridTemplateRows:`${BADGE_ROW_HEIGHT}px repeat(3, ${ROW_H}px) ${ROW_H}px ${ROW_H}px`,
          position:'relative',
          marginBottom:2,
          borderBottom:'1px solid #DDD'
        }}>
          {/* Date badges + tick overlay */}
          {week.map((d, di)=>(
            <div key={di} style={{
              background:getBg(d),
              padding:'0px', fontSize:8,
              lineHeight:`${BADGE_ROW_HEIGHT}px`,
              position:'relative'
            }}>
              {formatBadge(d)}
            </div>
          ))}

          {/* Aircraft rows */}
          {tailsOrder.map((tail, ti)=>
            week.map((d, di)=>(
              <div key={`${tail}-${di}`} style={{
                gridRowStart: ti+2,
                position:'relative',
                width: DAY_WIDTH, height: ROW_H,
                background: getBg(d),
                float: 'left'
              }}>
                {renderBlocks(tail, d)}
              </div>
            ))
          )}

          {/* Flight category row */}
          {week.map((d, di)=> {
            const dateKey = d.toISOString().slice(0,10);
            const hrMap = metarLookupByDateHour[dateKey]||{};
            return (
              <div key={`fc-${di}`} style={{
                gridRowStart: 5,
                position:'relative',
                width: DAY_WIDTH, height: ROW_H,
                background: getBg(d), float:'left'
              }}>
                {Object.values(hrMap).map(rec=>{
                  const h = new Date(rec.local_time).getHours();
                  return (
                    <div key={rec.local_time} style={{
                      position:'absolute',
                      top:0,
                      left:`${h*hourPx}px`,
                      width:`${hourPx}px`,
                      height:'100%',
                      backgroundColor: flightCategoryColor[rec.flight_category]
                    }}/>
                  );
                })}
              </div>
            );
          })}

          {/* Temperature heatmap row */}
          {week.map((d, di)=> {
            const dateKey = d.toISOString().slice(0,10);
            const hrMap = metarLookupByDateHour[dateKey]||{};
            return (
              <div key={`temp-${di}`} style={{
                gridRowStart:6,
                position:'relative',
                width: DAY_WIDTH, height: ROW_H,
                background: getBg(d), float:'left'
              }}>
                {Object.values(hrMap).map(rec=>{
                  const h = new Date(rec.local_time).getHours();
                  return (
                    <div key={rec.local_time} style={{
                      position:'absolute',
                      top:0,
                      left:`${h*hourPx}px`,
                      width:`${hourPx}px`,
                      height:'100%',
                      backgroundColor: tempToColor(rec.temp_C)
                    }}/>
                  );
                })}
              </div>
            );
          })}

          {/* Vertical tick lines overlay */}
          {[0,6,12,18].map(h=>(
            <div key={h} style={{
              position:'absolute',
              top:0,
              left:`${h*hourPx}px`,
              width:1,
              height:'100%',
              backgroundColor:'#CCC',
              pointerEvents:'none'
            }}/>
          ))}
        </div>
      ))}
    </div>
  );
}
