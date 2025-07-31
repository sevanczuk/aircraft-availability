import React, { useMemo, useState } from 'react';
import data from './aircraft_activity.json';

// 1. Aircraft order & colors
const tailsOrder = ['N65620', 'N854GW', 'N756VH'];
const tailColors = {
  N65620: '#E63946',
  N854GW: '#2A9D8F',
  N756VH: '#264653',
};

// 2. Date range
const START_DATE = new Date(2024, 6, 1);
const END_DATE   = new Date(2025, 7, 1);

// 3. Layout constants (tightened)
const DEFAULT_HOUR_PX    = 4;    // 4 px per hour → square
const BADGE_ROW_HEIGHT   = 16;   // reduced from 20px for tighter stack

// Build week arrays (Mon→Sun)
function buildWeeks(start, end) {
  const weeks = [];
  const first = new Date(start);
  const dow   = first.getDay();           // Sun=0, Mon=1
  first.setDate(first.getDate() - ((dow + 6) % 7));
  let cursor = new Date(first);

  while (cursor <= end) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// Badge text: day-of-month, m/d on 1st-of-month, m/d/yyyy on 1st-of-year
function formatBadge(d) {
  const m = d.getMonth() + 1, day = d.getDate(), y = d.getFullYear();
  if (m === 1 && day === 1) return `${m}/${day}/${y}`;
  if (day === 1)          return `${m}/${day}`;
  return `${day}`;
}

// Cell background by weekday
function getBg(d) {
  const wd = d.getDay();
  if (wd === 2 || wd === 4) return '#F5F5F5'; // Tue/Thu
  if (wd === 6)           return '#E6F9E6';  // Sat
  if (wd === 0)           return '#E6F0FF';  // Sun
  return 'transparent';                    // Mon/Wed/Fri
}

export default function App() {
  // Zoom state (placeholder—uncomment to enable)
  const [hourPx] = useState(DEFAULT_HOUR_PX);
  const DAY_WIDTH = 24 * hourPx;
  const ROW_H     = hourPx;

  const weeks = useMemo(() => buildWeeks(START_DATE, END_DATE), []);
  const [visible, setVisible] = useState(
    tailsOrder.reduce((o, t) => ({ ...o, [t]: true }), {})
  );
  const toggle = (t) => setVisible(v => ({ ...v, [t]: !v[t] }));

  // Renders one tail’s blocks for a given day
  function renderBlocks(tail, date) {
    const key    = date.toISOString().slice(0,10);
    const blocks = data[tail].blocksByDate[key] || [];
    return blocks.map(([start,end], i) => {
      const sh = +start.slice(0,2), sm = +start.slice(2);
      const eh = +end.slice(0,2),   em = +end.slice(2);
      let sH = sh + sm/60, eH = eh + em/60;
      if (eH < sH) eH += 24;  // cross-midnight
      const left  = sH * hourPx;
      const width = (eH - sH) * hourPx;
      return (
        <div
          key={i}
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
      {/* Title & subtitle */}
      <h2>Condair Flyers Aircraft Activity</h2>
      <div style={{
        fontStyle: 'italic',
        color:     '#666',
        fontSize:  12,
        marginTop: 4,
        marginBottom: 12
      }}>
        Click on an aircraft identifier tab to hide/show its activity.
      </div>

      {/* Aircraft tabs */}
      <div style={{ marginBottom: 12 }}>
        {tailsOrder.map(t => (
          <button
            key={t}
            onClick={() => toggle(t)}
            style={{
              marginRight: 8,
              padding:     '4px 8px',
              background:  visible[t] ? tailColors[t] : '#CCC',
              color:       '#FFF',
              border:      'none',
              cursor:      'pointer'
            }}
          >{t}</button>
        ))}
      </div>

      {/* Weekday header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(7, ${DAY_WIDTH}px)`,
        marginBottom: 4,
        fontWeight: 'bold',
        textAlign:  'center'
      }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d =>
          <div key={d}>{d}</div>
        )}
      </div>

      {/* Tick labels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(7, ${DAY_WIDTH}px)`,
        marginBottom: 8,
        fontSize: 8,
        color: '#666'
      }}>
        {Array(7).fill(0).map((_,ci) =>
          <div key={ci} style={{ position:'relative', width:DAY_WIDTH }}>
            <div style={{
              display:'flex',
              justifyContent:'space-between',
              padding:'0 4px'
            }}>
              {['00','06','12','18'].map(h =>
                <span key={h}>{h}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart: one week after another */}
      {weeks.map((week, wi) => (
        <div key={wi} style={{
          display: 'grid',
          gridTemplateColumns: `repeat(7, ${DAY_WIDTH}px)`,
          gridTemplateRows:   `${BADGE_ROW_HEIGHT}px repeat(3, ${ROW_H}px)`,
          position: 'relative',
          marginBottom: 2,         // tighter between weeks
          borderBottom: '1px solid #DDD'
        }}>
          {/* Badge row (dates) */}
          {week.map((d, di) => (
            <div key={di} style={{
              background: getBg(d),
              padding:    '0px',     // removed extra padding
              fontSize:   8,         // smaller badges
              opacity:    0.8,
              lineHeight: `${BADGE_ROW_HEIGHT}px`,
              position:   'relative'
            }}>
              {formatBadge(d)}

              {/* Vertical tick lines for this day */}
              {[0,6,12,18].map(h => (
                <div key={h} style={{
                  position:'absolute',
                  top:     0,
                  left:    `${h * hourPx}px`,
                  width:   1,
                  height:  '100%',
                  backgroundColor:'#CCC',
                  pointerEvents:'none'
                }}/>
              ))}
            </div>
          ))}

          {/* Aircraft rows */}
          {tailsOrder.map((tail, ti) =>
            week.map((d, di) => (
              <div key={`${tail}-${di}`} style={{
                gridRowStart: ti + 2,
                position:     'relative',
                width:        DAY_WIDTH,
                height:       ROW_H,
                background:   getBg(d),
                float:        'left'
              }}>
                {/* Also draw ticks in each aircraft cell */}
                {[0,6,12,18].map(h => (
                  <div key={h} style={{
                    position:'absolute',
                    top:     0,
                    left:    `${h * hourPx}px`,
                    width:   1,
                    height:  '100%',
                    backgroundColor:'#CCC',
                    pointerEvents:'none'
                  }}/>
                ))}

                {visible[tail] && renderBlocks(tail, d)}
              </div>
            ))
          )}
        </div>
      ))}

      {/* Data issues (ignored/duplicates/overlap) are in aircraft_activity.json */}
    </div>
  );
}
