import React, { useMemo, useState } from 'react';
import data from './aircraft_activity.json';

// 1. Aircraft order and colors
const tailsOrder = ['N65620', 'N854GW', 'N756VH'];
const tailColors = {
  N65620: '#E63946', // red
  N854GW: '#2A9D8F', // teal
  N756VH: '#264653', // navy
};

// 2. Date range
const START_DATE = new Date(2024, 6, 1);  // July 1, 2024
const END_DATE   = new Date(2025, 7, 1);  // August 1, 2025

// 3. Layout constants
const DEFAULT_HOUR_PX    = 4;    // 4px per hour block (square)
const BADGE_ROW_HEIGHT   = 20;   // fixed badge row height

// Build weeks array: each element is an array of 7 Date objects (Mon→Sun)
function buildWeeks(start, end) {
  const weeks = [];
  const first = new Date(start);
  const day = first.getDay();           // Sun=0, Mon=1...
  const backToMon = (day + 6) % 7;
  first.setDate(first.getDate() - backToMon);
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

// Badge text: day-of-month, with m/d on 1st-of-month, and m/d/yyyy on 1st-of-year
function formatBadge(d) {
  const m = d.getMonth() + 1, day = d.getDate(), y = d.getFullYear();
  if (m === 1 && day === 1) return `${m}/${day}/${y}`;
  if (day === 1) return `${m}/${day}`;
  return `${day}`;
}

// Day background by weekday
function getBg(date) {
  const wd = date.getDay(); // Sun=0, Mon=1...
  if (wd === 2 || wd === 4) return '#F5F5F5'; // Tue, Thu
  if (wd === 6)         return '#E6F9E6';     // Sat
  if (wd === 0)         return '#E6F0FF';     // Sun
  return 'transparent';                     // Mon, Wed, Fri
}

// Main App
export default function App() {
  // 4. Zoom state (px per hour)
  const [hourPx, setHourPx] = useState(DEFAULT_HOUR_PX);

  // Derived dimensions
  const DAY_CELL_WIDTH = 24 * hourPx;     // e.g. 96px at 4px/hr
  const ROW_HEIGHT     = hourPx;          // e.g. 4px

  // Precompute weeks
  const weeks = useMemo(() => buildWeeks(START_DATE, END_DATE), []);

  // Visibility toggles
  const [visible, setVisible] = useState(
    tailsOrder.reduce((o, t) => ({ ...o, [t]: true }), {})
  );
  const toggle = (t) => setVisible(v => ({ ...v, [t]: !v[t] }));

  // Helper: render flight blocks for one tail on one day
  function renderBlocks(tail, date) {
    const key    = date.toISOString().slice(0,10);
    const blocks = data[tail].blocksByDate[key] || [];
    return blocks.map(([start, end], i) => {
      // parse times
      const sh = +start.slice(0,2), sm = +start.slice(2);
      const eh = +end.slice(0,2),   em = +end.slice(2);

      let startHour = sh + sm/60;
      let endHour   = eh + em/60;
      // cross-midnight?
      if (endHour < startHour) endHour += 24;

      const left  = startHour * hourPx;
      const width = (endHour - startHour) * hourPx;

      return (
        <div
          key={i}
          title={`${tail} ${date.toLocaleDateString()} ${start}–${end}`}
          style={{
            position: 'absolute',
            left:   `${left}px`,
            width:  `${width}px`,
            height: '100%',
            backgroundColor: tailColors[tail]
          }}
        />
      );
    });
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Aircraft Activity (15-min state)</h2>

      {/* Tabs */}
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
              cursor:     'pointer'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ====== ZOOM CONTROL (placeholder) ======
      To enable, simply uncomment the block below. No regen needed.
      <div style={{ marginBottom: '16px' }}>
        <label>
          Zoom:&nbsp;
          <input
            type="range"
            min="2"
            max="8"
            step="2"
            value={hourPx}
            onChange={e => setHourPx(Number(e.target.value))}
          />
          &nbsp;{hourPx}px/hour
        </label>
      </div>
      ========================================== */}

      {/* Weekday header */}
      <div style={{
        display:           'grid',
        gridTemplateColumns: `repeat(7, ${DAY_CELL_WIDTH}px)`,
        marginBottom:      4,
        fontWeight:       'bold',
        textAlign:        'center'
      }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Tick labels below header */}
      <div style={{
        display:            'grid',
        gridTemplateColumns: `repeat(7, ${DAY_CELL_WIDTH}px)`,
        marginBottom:      8,
        fontSize:         8,
        color:            '#666'
      }}>
        {Array(7).fill(0).map((_,ci) => (
          <div
            key={ci}
            style={{
              position: 'relative',
              width:    DAY_CELL_WIDTH
            }}
          >
            <div style={{
              display:       'flex',
              justifyContent:'space-between',
              padding:       '0 4px'
            }}>
              {['00','06','12','18'].map(h => (
                <span key={h}>{h}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Chart: one block per week */}
      {weeks.map((week, wi) => (
        <div
          key={wi}
          style={{
            display:            'grid',
            gridTemplateColumns: `repeat(7, ${DAY_CELL_WIDTH}px)`,
            gridTemplateRows:   `${BADGE_ROW_HEIGHT}px repeat(3, ${ROW_HEIGHT}px)`,
            position:           'relative',
            marginBottom:       6,
            borderBottom:      '1px solid #DDD'
          }}
        >
          {/* 1) Badge row */}
          {week.map((d,i) => (
            <div
              key={i}
              style={{
                background: getBg(d),
                padding:    '2px',
                fontSize:   10,
                opacity:    0.7
              }}
            >
              {formatBadge(d)}
            </div>
          ))}

          {/* 2) Vertical tick lines */}
          {[0,6,12,18].map(h => (
            <div
              key={h}
              style={{
                position: 'absolute',
                top:      0,
                left:     `${(h/24) * 7 * DAY_CELL_WIDTH}px`,
                width:    1,
                height:   '100%',
                backgroundColor: '#CCC',
                pointerEvents:   'none'
              }}
            />
          ))}

          {/* 3) Aircraft rows (one per tail) */}
          {tailsOrder.map((tail, ti) => (
            <React.Fragment key={tail}>
              {week.map((d, di) => (
                <div
                  key={di}
                  style={{
                    gridRowStart:  ti + 2,
                    position:      'relative',
                    width:         DAY_CELL_WIDTH,
                    height:        ROW_HEIGHT,
                    background:    getBg(d),
                    float:         'left'
                  }}
                >
                  {visible[tail] && renderBlocks(tail, d)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      ))}

      {/* 
        Ignored, duplicates, and overlap arrays live under 
        the corresponding keys in aircraft_activity.json 
      */}
    </div>
  );
}
