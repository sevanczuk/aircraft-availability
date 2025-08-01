import React, { useMemo, useState, useCallback, useRef } from 'react';
import data from './aircraft_activity.json';
import metarData from './alb_metar.json';

// Aircraft identifiers & colors
const tailsOrder = ['N65620', 'N854GW', 'N756VH'];
const tailColors = {
  N65620: '#E63946',
  N854GW: '#2A9D8F',
  N756VH: '#264653',
};

// Flight‐category colors
const flightCategoryColor = {
  LIFR: '#FF00FF',
  IFR:  '#FF0000',
  MVFR: '#0000FF',
  VFR:  '#00FF00',
};

// Temperature heatmap
function tempToColor(temp) {
  if (temp == null)    return 'transparent';
  if (temp <= -30)     return '#2c003e';
  if (temp <= -10)     return '#0033cc';
  if (temp <= 0)       return '#33ccff';
  if (temp <= 10)      return '#66ffcc';
  if (temp <= 20)      return '#ffff99';
  if (temp <= 30)      return '#ffcc00';
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

// Badge text
function formatBadge(d) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const y = d.getFullYear();
  if (m === 1 && day === 1) return `${m}/${day}/${y}`;
  if (day === 1)           return `${m}/${day}`;
  return `${day}`;
}

// Day‐of‐week background
function getBg(d) {
  const wd = d.getDay();
  if (wd === 2 || wd === 4) return '#F5F5F5'; // Tue/Thu
  if (wd === 6)            return '#E6F9E6'; // Sat
  if (wd === 0)            return '#E6F0FF'; // Sun
  return 'transparent';                   // Mon/Wed/Fri
}

export default function App() {
  // Zoom
  const [hourPx, setHourPx] = useState(DEFAULT_HOUR_PX);
  const DAY_WIDTH   = 24 * hourPx;
  const METAR_ROW_H = hourPx;
  const AC_ROW_H    = hourPx * 2;

  // Aircraft visibility
  const [visible, setVisible] = useState(
    tailsOrder.reduce((o, t) => ({ ...o, [t]: true }), {})
  );
  const toggleAC = t => setVisible(v => ({ ...v, [t]: !v[t] }));

  // Show/hide layers
  const [showFlightCat, setShowFlightCat] = useState(true);
  const [showTemp, setShowTemp]           = useState(true);

  // Category filters
  const [catFilters, setCatFilters] = useState({
    LIFR: true,
    IFR:  true,
    MVFR: true,
    VFR:  true,
  });
  const toggleCat = c => setCatFilters(f => ({ ...f, [c]: !f[c] }));

  // METAR lookup by date/hour
  const metarLookup = useMemo(() => {
    const m = {};
    metarData.forEach(r => {
      const dateKey = r.local_time.slice(0,10);
      const hr = new Date(r.local_time).getHours();
      (m[dateKey] = m[dateKey] || {})[hr] = r;
    });
    return m;
  }, []);

  // Test if block intersects category
  const blockHasCategory = useCallback(
    (date, start, end, cat) => {
      let sh = +start.slice(0,2),
          sm = +start.slice(2),
          sMin = sh * 60 + sm;
      let eh = +end.slice(0,2),
          em = +end.slice(2),
          eMin = eh * 60 + em;
      if (eMin <= sMin) eMin += 1440;
      for (let t = sMin; t < eMin; t += 60) {
        let hr = Math.floor(t/60);
        let dKey = date.toISOString().slice(0,10);
        if (hr >= 24) {
          const nd = new Date(date);
          nd.setDate(nd.getDate() + 1);
          dKey = nd.toISOString().slice(0,10);
          hr %= 24;
        }
        const rec = metarLookup[dKey]?.[hr];
        if (rec?.flight_category === cat) return true;
      }
      return false;
    },
    [metarLookup]
  );

  // Counts per category
  const categoryCounts = useMemo(() => {
    const cnt = { LIFR:0, IFR:0, MVFR:0, VFR:0 };
    tailsOrder.forEach(tail => {
      if (!visible[tail]) return;
      Object.entries(data[tail].blocksByDate).forEach(([dKey, blocks]) => {
        const date = new Date(dKey);
        blocks.forEach(([st, et]) => {
          Object.keys(cnt).forEach(cat => {
            if (blockHasCategory(date, st, et, cat)) cnt[cat]++;
          });
        });
      });
    });
    return cnt;
  }, [visible, blockHasCategory]);

  // Weeks array
  const weeks = useMemo(() => buildWeeks(START_DATE, END_DATE), []);

  // Render one aircraft’s blocks on a date
  function renderBlocks(tail, date) {
    const key = date.toISOString().slice(0,10);
    const blocks = data[tail].blocksByDate[key] || [];
    return blocks.map(([st, et], i) => {
      if (!Object.entries(catFilters).some(([c,on]) => on && blockHasCategory(date,st,et,c)))
        return null;
      const sh = +st.slice(0,2),
            sm = +st.slice(2),
            sH = sh + sm/60,
            eh = +et.slice(0,2),
            em = +et.slice(2),
            eH = eh + em/60;
      if (eH <= sH) eH += 24;
      return (
        <div
          key={i}
          title={`${tail} ${date.toLocaleDateString()} ${st}–${et}`}
          style={{
            position:'absolute',
            left:  `${sH * hourPx}px`,
            width: `${(eH - sH) * hourPx}px`,
            height:'100%',
            backgroundColor: tailColors[tail],
          }}
        />
      );
    });
  }

  // Draggable panel
  const boxRef    = useRef(null);
  const handleRef = useRef(null);
  const [pos, setPos] = useState(null);

  const onPointerDown = e => {
    const box    = boxRef.current.getBoundingClientRect();
    const handle = handleRef.current.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const sl = pos?.left ?? box.left;
    const st = pos?.top  ?? box.top;

    const onMove = ev => {
      let dx = ev.clientX - sx, dy = ev.clientY - sy;
      let nl = sl + dx, nt = st + dy;
      const minL = -(box.width - handle.width),
            maxL = window.innerWidth - handle.width,
            minT = 0,
            maxT = window.innerHeight - handle.height;
      nl = Math.min(Math.max(nl, minL), maxL);
      nt = Math.min(Math.max(nt, minT), maxT);
      setPos({ left: nl, top: nt });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    e.target.setPointerCapture(e.pointerId);
  };

  // Panel position
  const boxStyle = pos
    ? { left: pos.left, top: pos.top }
    : { right:20, top:'50%', transform:'translateY(-50%)' };

  // Hours array
  const hours = [0,6,12,18];

  return (
    <div style={{ padding:20, fontFamily:'sans-serif' }}>
      <h2>Condair Flyers Aircraft Activity</h2>

      {/* Zoom control */}
      <div style={{ marginBottom:16 }}>
        <label>
          Zoom:&nbsp;
          <input
            type="range"
            min="2" max="8" step="2"
            value={hourPx}
            onChange={e => setHourPx(+e.target.value)}
          />
          &nbsp;{hourPx}px/hour
        </label>
      </div>

      {/* Weekday header */}
      <div style={{
        display:'grid',
        gridTemplateColumns:`repeat(7, ${DAY_WIDTH}px)`,
        marginBottom:4,
        fontWeight:'bold',
        textAlign:'center'
      }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d =>
          <div key={d}>{d}</div>
        )}
      </div>

      {/* Chart + ticks + panel */}
      <div style={{ position:'relative' }}>
        {/* Scrollable chart */}
        <div style={{ overflowX:'auto', position:'relative' }}>
          {/* Tick labels overlay */}
          <div style={{
            position:'absolute',
            top:0, left:0,
            width:`${7 * DAY_WIDTH}px`,
            height:`${BADGE_ROW_HEIGHT}px`,
            pointerEvents:'none'
          }}>
            {Array.from({ length: 7 }, (_, dayIndex) =>
              hours.map(h => (
                <span
                  key={`${dayIndex}-${h}`}
                  style={{
                    position:'absolute',
                    left: `${dayIndex * DAY_WIDTH + h * hourPx}px`,
                    top: 0,
                    fontSize:8,
                    color:'#666'
                  }}
                >
                  {h.toString().padStart(2,'0')}
                </span>
              ))
            )}
          </div>

          {/* Tick lines overlay */}
          <div style={{
            position:'absolute',
            top:0, left:0,
            width:`${7 * DAY_WIDTH}px`,
            height:'100%',
            pointerEvents:'none'
          }}>
            {Array.from({ length: 7 }, (_, dayIndex) =>
              hours.map(h => (
                <div
                  key={`${dayIndex}-${h}`}
                  style={{
                    position:'absolute',
                    left: `${dayIndex * DAY_WIDTH + h * hourPx}px`,
                    top: 0,
                    width:1,
                    height:'100%',
                    backgroundColor:'#CCC'
                  }}
                />
              ))
            )}
          </div>

          {/* Weeks grid */}
          <div>
            {weeks.map((week, wi) => (
              <div key={wi} style={{
                display:'grid',
                gridTemplateColumns:`repeat(7, ${DAY_WIDTH}px)`,
                gridTemplateRows:
                  `${BADGE_ROW_HEIGHT}px ` +
                  `repeat(3, ${AC_ROW_H}px) ` +
                  `2px ` +
                  `${METAR_ROW_H}px ${METAR_ROW_H}px`,
                position:'relative',
                marginBottom:2,
                borderBottom:'1px solid #DDD'
              }}>
                {/* Date badges */}
                {week.map((d, di) => (
                  <div key={di} style={{
                    gridRowStart:1,
                    background:getBg(d),
                    fontSize:8,
                    lineHeight:`${BADGE_ROW_HEIGHT}px`,
                    position:'relative'
                  }}>
                    {formatBadge(d)}
                  </div>
                ))}

                {/* Aircraft rows */}
                {tailsOrder.map((t, ti) =>
                  week.map((d, di) => (
                    <div key={`${t}-${di}`} style={{
                      gridRowStart: ti+2,
                      position:'relative',
                      background:getBg(d)
                    }}>
                      {visible[t] && renderBlocks(t, d)}
                    </div>
                  ))
                )}

                {/* 2px gap */}
                <div style={{ gridRowStart:5 }}/>
                {/* Flight category row */}
                {week.map((d, di) => {
                  const recs = metarLookup[d.toISOString().slice(0,10)] || {};
                  return (
                    <div key={di} style={{
                      gridRowStart:6,
                      position:'relative',
                      background:getBg(d)
                    }}>
                      {showFlightCat && Object.values(recs).map(rec => {
                        const h = new Date(rec.local_time).getHours();
                        return (
                          <div
                            key={rec.local_time}
                            title={`${rec.local_time}: ${rec.flight_category}\n${rec.raw_data}`}
                            style={{
                              position:'absolute',
                              left: `${h * hourPx}px`,
                              width: `${hourPx}px`,
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
                {week.map((d, di) => {
                  const recs = metarLookup[d.toISOString().slice(0,10)] || {};
                  return (
                    <div key={di} style={{
                      gridRowStart:7,
                      position:'relative',
                      background:getBg(d)
                    }}>
                      {showTemp && Object.values(recs).map(rec => {
                        const h = new Date(rec.local_time).getHours();
                        return (
                          <div
                            key={rec.local_time}
                            title={`${rec.local_time}: ${rec.temp_C}°C / ${rec.dewpoint_C}°C`}
                            style={{
                              position:'absolute',
                              left: `${h * hourPx}px`,
                              width: `${hourPx}px`,
                              height:'100%',
                              backgroundColor:tempToColor(rec.temp_C)
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Draggable Tabs Panel */}
        <div
          ref={boxRef}
          style={{
            position:'fixed',
            border:'1px solid #CCC',
            borderRadius:4,
            background:'#FFF',
            width:200,
            zIndex:1000,
            ...boxStyle
          }}
        >
          {/* Grab Handle */}
          <div
            ref={handleRef}
            onPointerDown={onPointerDown}
            style={{
              cursor:'grab',
              background:'#F0F0F0',
              borderBottom:'1px solid #CCC',
              padding:'6px',
              fontSize:10,
              textAlign:'center',
              userSelect:'none'
            }}
          >
            Grab in this area to move the box
            <hr style={{ margin:'4px 8px', borderColor:'#CCC' }}/>
            Use tabs to show/hide layers & filter by flight category
          </div>
          <div style={{ padding:8 }}>
            {tailsOrder.map(t => (
              <button
                key={t}
                onClick={() => toggleAC(t)}
                style={{
                  display:'block',
                  margin:'6px 0',
                  padding:'6px',
                  width:'100%',
                  background: visible[t] ? tailColors[t] : '#CCC',
                  color:'#FFF',
                  border:'none',
                  cursor:'pointer'
                }}
              >
                {t}
              </button>
            ))}
            <button
              onClick={() => setShowFlightCat(f => !f)}
              style={{
                display:'block',
                margin:'6px 0',
                padding:'6px',
                width:'100%',
                background: showFlightCat ? '#555' : '#CCC',
                color:'#FFF',
                border:'none',
                cursor:'pointer'
              }}
            >
              Flight Category
            </button>
            {['LIFR','IFR','MVFR','VFR'].map(cat => (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                style={{
                  display:'flex',
                  justifyContent:'space-between',
                  margin:'4px 0',
                  padding:'4px 8px',
                  width:'100%',
                  background: catFilters[cat] ? flightCategoryColor[cat] : '#CCC',
                  color:'#FFF',
                  border:'none',
                  cursor:'pointer'
                }}
              >
                <span>{cat}</span>
                <span>{categoryCounts[cat]}</span>
              </button>
            ))}
            <button
              onClick={() => setShowTemp(t => !t)}
              style={{
                display:'block',
                margin:'6px 0',
                padding:'6px',
                width:'100%',
                background: showTemp ? '#555' : '#CCC',
                color:'#FFF',
                border:'none',
                cursor:'pointer'
              }}
            >
              Temperature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

