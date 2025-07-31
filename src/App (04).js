import React, { useState, useMemo } from 'react';
import data from './aircraft_activity.json';

// Color lookup for each aircraft
const tailColors = {
  N756VH: '#FF5733',
  N854GW: '#33C1FF',
  N65620: '#33FF8A',
};

// Date range: July 1, 2024 → August 1, 2025
const startDate = new Date('2024-07-01');
const endDate = new Date('2025-08-01');

// Generate all dates between start and end
function getAllDates(start, end) {
  const dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

// Abbreviated weekday names, Mon (1) → Sun (7)
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Background colors by weekday: 0=Sun → 6=Sat
const bgColors = {
  1: '#f5f5f5', // Tue
  3: '#f5f5f5', // Thu
  5: '#e6f9e6', // Sat
  0: '#e6f0ff', // Sun
};

// Format badge text based on date
function getBadge(d) {
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  if (day === 1 && month === 1) return `${month}/${day}/${year}`;
  if (day === 1) return `${month}/${day}`;
  return `${day}`;
}

// Build weeks starting on Monday
function getWeeks(start, end) {
  const all = getAllDates(start, end);
  const weeks = [];
  let week = [];
  // Align first date to Monday
  const first = new Date(start);
  const dow = first.getDay(); // 0=Sun,1=Mon...
  const offset = (dow + 6) % 7; // days back to Monday
  first.setDate(first.getDate() - offset);
  for (let d = new Date(first); d <= end; d.setDate(d.getDate() + 1)) {
    week.push(new Date(d));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push(week);
  return weeks;
}

export default function App() {
  const [hidden, setHidden] = useState([]);
  const weeks = useMemo(() => getWeeks(startDate, endDate), []);

  const toggle = (tail) => {
    setHidden(h =>
      h.includes(tail) ? h.filter(x => x !== tail) : [...h, tail]
    );
  };

  // Styles
  const container = { padding: '20px', fontFamily: 'Arial, sans-serif' };
  const title = { fontSize: '24px', fontWeight: 'bold' };
  const instruction = { fontSize: '14px', fontStyle: 'italic', margin: '8px 0' };
  const tabs = { marginBottom: '12px' };
  const btnBase = tail => ({
    background: tailColors[tail],
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    marginRight: '6px',
    cursor: 'pointer',
  });

  const headerGrid = { display: 'grid', gridTemplateColumns: `100px repeat(7,48px)` };
  const weekdayCell = { textAlign: 'center', fontSize: '12px', padding: '4px' };
  const tickRow = { display: 'grid', gridTemplateColumns: `100px repeat(7,48px)`, fontSize: '8px', color: '#666' };
  const tickCellFlex = { display: 'flex', justifyContent: 'space-between', padding: '0 4px' };

  const chartGrid = headerGrid;
  const weekLabel = { textAlign: 'right', padding: '4px', fontSize: '12px' };
  const dayCellBase = date => ({
    position: 'relative',
    width: '48px',
    height: '16px',
    background: bgColors[date.getDay()] || 'transparent',
  });
  const badge = { position: 'absolute', top: '2px', left: '2px', fontSize: '8px', opacity: 0.7 };

  return (
    <div style={container}>
      <div style={title}>Condair Flyers Cessna Activity</div>
      <div style={instruction}>Click an aircraft identifier to hide it.</div>
      <div style={tabs}>
        {Object.keys(data).map(tail => (
          <button
            key={tail}
            onClick={() => toggle(tail)}
            style={{
              ...btnBase(tail),
              opacity: hidden.includes(tail) ? 0.3 : 1,
            }}
          >
            {tail}
          </button>
        ))}

      </div>

      {/* Weekday header */}
      <div style={headerGrid}>
        <div></div>
        {weekdays.map(d => <div key={d} style={weekdayCell}>{d}</div>)}
      </div>

      {/* Tick labels */}
      <div style={tickRow}>
        <div></div>
        {weekdays.map((_, i) => (
          <div key={i} style={tickCellFlex}>
            {['00','06','12','18'].map(h => <span key={h}>{h}</span>)}
          </div>
        ))}
      </div>

      {/* Chart: one row per week */}
      {weeks.map((week, wi) => {
        const weekStart = week[0];
        const wkLabel = `${weekStart.getMonth()+1}/${weekStart.getDate()}/${weekStart.getFullYear()}`;
        return (
          <div key={wi} style={chartGrid}>
            <div style={weekLabel}>{wkLabel}</div>
            {week.map((date, di) => {
              const dKey = date.toISOString().split('T')[0];
              return (
                <div key={di} style={dayCellBase(date)}>
                  {/* Day badge */}
                  <div style={badge}>{getBadge(date)}</div>

                  {/* Blocks for each aircraft */}
                  {Object.entries(data).map(([tail, info]) => {
                    if (hidden.includes(tail)) return null;
                    const blocks = info.blocksByDate[dKey] || [];
                    return blocks.map(([start, end]) => {
                      const startMin =
                        parseInt(start.slice(0,2),10)*60 + parseInt(start.slice(2),10);
                      const endMin =
                        parseInt(end.slice(0,2),10)*60 + parseInt(end.slice(2),10);
                      const leftPx = (startMin / 1440) * 48;
                      const widthPx = ((endMin - startMin) / 1440) * 48;
                      const tooltip = `${dKey} ${tail} ${start.slice(0,2)}:${start.slice(2)}–${end.slice(0,2)}:${end.slice(2)}`;
                      return (
                        <div
                          key={`${tail}-${dKey}-${start}`}
                          title={tooltip}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                            height: '100%',
                            background: tailColors[tail],
                          }}
                        />
                      );
                    });
                  })}
                </div>
              );
            })}
          </div>
        );
      })}

    </div>
  );
}

/*
Ignored flight entries:

In total, 322 rows were skipped due to missing STA or invalid STATUS.

The full sorted list of ignored entries is available in the
`aircraft_activity.json` file under the "ignored" key,
sorted by date/time for easy inspection.
*/

