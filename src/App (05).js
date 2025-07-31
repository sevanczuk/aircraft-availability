import React, { useMemo, useState } from 'react';
import data from './aircraft_activity.json';

// Parameterized tail colors and order
const tailsOrder = ['N65620', 'N854GW', 'N756VH'];
const tailColors = {
  N65620: '#E63946', // red
  N854GW: '#2A9D8F', // teal
  N756VH: '#264653', // navy
};

// Date range constants
const START_DATE = new Date(2024, 6, 1); // July 1, 2024
const END_DATE = new Date(2025, 7, 1);  // August 1, 2025

// Helper: format badge text
function formatBadge(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const y = date.getFullYear();
  if (m === 1 && d === 1) return `${m}/${d}/${y}`;
  if (d === 1) return `${m}/${d}`;
  return d;
}

// Helper: day background class
function getBgColor(date) {
  const wd = date.getDay(); // Sun=0, Mon=1...
  if (wd === 2 || wd === 4) return '#F5F5F5';      // Tue, Thu
  if (wd === 6) return '#E6F9E6';                  // Sat
  if (wd === 0) return '#E6F0FF';                  // Sun
  return 'transparent';                            // Mon, Wed, Fri
}

// Build weeks array: each item is array of 7 Date objects (Mon to Sun)
function buildWeeks(start, end) {
  const weeks = [];
  // find Monday on or before start
  const first = new Date(start);
  const day = first.getDay();
  const diff = (day + 6) % 7; // days since Monday
  first.setDate(first.getDate() - diff);

  let current = new Date(first);
  while (current <= end) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// React component
export default function App() {
  const [visible, setVisible] = useState(
    tailsOrder.reduce((acc, t) => ({ ...acc, [t]: true }), {})
  );
  const weeks = useMemo(() => buildWeeks(START_DATE, END_DATE), []);

  // Toggle visibility
  const toggle = (tail) => setVisible(v => ({ ...v, [tail]: !v[tail] }));

  // Render a block for each time span
  function renderBlocksForDay(tail, date) {
    const key = date.toISOString().slice(0,10);
    const blocks = (data[tail].blocksByDate[key] || []);
    return blocks.map((blk, idx) => {
      const [start, end] = blk;
      // calculate position & size in px
      const [sh, sm] = [parseInt(start.slice(0,2)), parseInt(start.slice(2))];
      const [eh, em] = [parseInt(end.slice(0,2)), parseInt(end.slice(2))];
      let startPx = (sh + sm/60) * 2;
      let endTotal = eh + em/60;
      // cross-midnight adjust
      if (endTotal < sh + sm/60) endTotal += 24;
      const widthPx = (endTotal*2 - startPx);
      return (
        <div
          key={idx}
          title={`${tail} ${date.toLocaleDateString()} ${start}–${end}`}
          style={{
            position: 'absolute',
            left: `${startPx}px`,
            width: `${widthPx}px`,
            height: '100%',
            backgroundColor: tailColors[tail],
          }}
        />
      );
    });
  }

  // Main render
  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Aircraft Activity (15‑min state)</h2>
      <div style={{ marginBottom: 10 }}>
        {tailsOrder.map(tail => (
          <button
            key={tail}
            onClick={() => toggle(tail)}
            style={{
              marginRight: 8,
              padding: '4px 8px',
              background: visible[tail] ? tailColors[tail] : '#ccc',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >{tail}</button>
        ))}
      </div>

      {/* Header rows */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 48px)', marginBottom: 2 }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: 'bold' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 48px)', marginBottom: 8, fontSize: 8, color: '#666' }}>
        {['00','06','12','18'].map((t,i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              width: 48,
              gridColumnStart: Math.floor(i*7/4)+1
            }}
          >{t}</div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div
          key={wi}
          style={{
            display: 'grid',
            gridTemplateRows: '20px repeat(3, 20px)',
            gridTemplateColumns: 'repeat(7, 48px)',
            position: 'relative',
            marginBottom: 4,
            borderBottom: '1px solid #ddd'
          }}
        >
          {/* Day badges row */}
          {week.map((day, di) => (
            <div
              key={di}
              style={{
                background: getBgColor(day),
                textAlign: 'left',
                padding: '2px',
                fontSize: 10,
                opacity: 0.7
              }}
            >{formatBadge(day)}</div>
          ))}

          {/* Vertical tick lines overlay */}
          {[0,6,12,18].map((h, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                top: 0,
                left: `${(h/24)*7*48}px`,  // week width = 7*48
                width: 1,
                height: '100%',
                backgroundColor: '#ccc',
                pointerEvents: 'none'
              }}
            />
          ))}

          {/* Aircraft rows */}
          {tailsOrder.map((tail, ti) => (
            <div
              key={tail}
              style={{
                gridRowStart: ti+2,
                gridColumn: '1 / span 7',
                position: 'relative',
                background: 'transparent'
              }}
            >
              {visible[tail] && week.map((day, di) => (
                <div
                  key={di}
                  style={{
                    position: 'relative',
                    width: 48,
                    height: 20,
                    background: getBgColor(day),
                    float: 'left'
                  }}
                >
                  {renderBlocksForDay(tail, day)}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      {/*
        Ignored flight entries remain in JSON under "ignored" key,
        plus "duplicates" and "overlap" for data validation.
      */}
    </div>
  );
}
