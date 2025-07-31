import React, { useEffect, useState } from "react";
import "./App.css";

const aircraftColors = {
  N756VH: "steelblue",
  N65620: "seagreen",
  N854GW: "darkorange",
};

const minutesInDay = 96;

function App() {
  const [data, setData] = useState({});
  const [selectedAircraft, setSelectedAircraft] = useState([
    "N756VH",
    "N65620",
    "N854GW",
  ]);

  useEffect(() => {
    fetch("./aircraft_activity_15min_state_tracked.json")
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  const toggleAircraft = (tail) => {
    setSelectedAircraft((prev) =>
      prev.includes(tail) ? prev.filter((t) => t !== tail) : [...prev, tail]
    );
  };

  const generateDateRange = (start, end) => {
    const dates = [];
    const current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const allDates = generateDateRange("2024-07-08", "2025-08-01");
  const weeks = [];
  let currentWeek = [];
  for (const d of allDates) {
    if (currentWeek.length === 0 && d.getDay() !== 1) {
      let pad = (d.getDay() + 6) % 7;
      for (let i = 0; i < pad; i++) currentWeek.push(null);
    }
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const filteredWeeks = weeks.filter((week) => {
    const hasValidDate = week.some((day) => day && day >= new Date("2024-07-08"));
    return hasValidDate;
  });

  return (
    <div className="App">
      <h2 style={{ fontWeight: "bold" }}>Condair Flyers Cessna Activity</h2>
      <p style={{ fontStyle: "italic" }}>Click an aircraft identifier to hide it.</p>

      {/* Aircraft Toggle Tabs */}
      <div style={{ marginBottom: 12 }}>
        {["N756VH", "N65620", "N854GW"].map((tail) => (
          <button
            key={tail}
            onClick={() => toggleAircraft(tail)}
            style={{
              marginRight: 10,
              padding: "4px 8px",
              backgroundColor: selectedAircraft.includes(tail)
                ? aircraftColors[tail]
                : "#ccc",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {tail}
          </button>
        ))}
      </div>

      {/* Weekly Data Rows */}
      <div style={{ overflowX: "auto" }}>
        {filteredWeeks.map((week, weekIndex) => {
          const monday = week.find((d) => d && d.getDay() === 1);
          const mondayLabel = monday
            ? `${String(monday.getMonth() + 1).padStart(2, "0")}/${String(
                monday.getDate()
              ).padStart(2, "0")}/${monday.getFullYear()}`
            : "";

          return (
            <div
              key={`week-${weekIndex}`}
              style={{ display: "flex", flexDirection: "row", marginBottom: 4 }}
            >
              {/* Week Start Date Label */}
              <div
                style={{
                  width: 70,
                  fontSize: "10px",
                  fontStyle: "italic",
                  paddingRight: 4,
                  textAlign: "right",
                  lineHeight: "8px",
                }}
              >
                {mondayLabel}
              </div>

              {/* Day Columns */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {/* Empty Header Row */}
                <div style={{ display: "flex" }}>
                  {week.map((_, dayIdx) => (
                    <div
                      key={`label-${weekIndex}-${dayIdx}`}
                      style={{
                        width: `${minutesInDay * selectedAircraft.length}px`,
                        textAlign: "center",
                        fontSize: "10px",
                        fontStyle: "italic",
                        paddingBottom: 2,
                      }}
                    ></div>
                  ))}
                </div>

                {/* Aircraft Rows */}
                {selectedAircraft.map((tail) => (
                  <div
                    key={`week-${weekIndex}-${tail}`}
                    style={{ display: "flex", marginBottom: 0 }}
                  >
                    {week.map((day, dayIdx) => {
                      const dateKey = day ? day.toISOString().slice(0, 10) : null;
                      const entry = dateKey && data[dateKey]?.[tail];
                      const active = entry?.minutes || [];

                      const dayOfWeek = day ? day.getDay() : null;
                      let bgColor = "white";
                      if (dayOfWeek === 6 || dayOfWeek === 0) bgColor = "#e0f7df";
                      else if (dayOfWeek === 2 || dayOfWeek === 4) bgColor = "#f0f0f0";

                      return (
                        <div
                          key={`${dateKey}-${tail}`}
                          style={{ display: "flex", position: "relative" }}
                        >
                          {[...Array(minutesInDay)].map((_, i) => {
                            const isMarker =
                              i % 24 === 0 || i % 24 === 24 || i % 24 === 48 || i % 24 === 72;
                            return (
                              <div
                                key={i}
                                style={{
                                  width: 1,
                                  height: 8,
                                  backgroundColor: active.includes(i)
                                    ? aircraftColors[tail]
                                    : bgColor,
                                  borderRight: isMarker ? "1px solid #ccc" : "none",
                                }}
                              ></div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;

