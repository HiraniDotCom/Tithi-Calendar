"use client";
import React, { useState, useEffect } from "react";

export default function CalendarPage() {
    const [year, setYear] = useState(null);
    const [month, setMonth] = useState(null);
    const [daysData, setDaysData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [timelineData, setTimelineData] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    useEffect(() => {
        const now = new Date();
        setYear(now.getFullYear());
        setMonth(now.getMonth() + 1);
    }, []);

    useEffect(() => {
        if (year === null || month === null) return;

        async function fetchCalendar() {
            setLoading(true);
            setErrorMsg(null);
            try {
                const res = await fetch(
                    `/api/tithi/calendar?year=${year}&month=${month}`,
                );
                if (!res.ok) {
                    throw new Error(
                        `HTTP Error status returned: ${res.status}`,
                    );
                }
                const data = await res.json();
                if (data.success && Array.isArray(data.days)) {
                    setDaysData(data.days);
                } else {
                    throw new Error(
                        data.error ||
                            "The API structure failed to return a proper array mapping.",
                    );
                }
            } catch (err) {
                console.error("Critical fetching issue:", err);
                setErrorMsg(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchCalendar();
        setSelectedDay(null);
    }, [year, month]);

    useEffect(() => {
        if (!selectedDay) return;

        async function buildDayTimeline() {
            setLoadingTimeline(true);
            try {
                const hours = [];
                for (let h = 0; h <= 24; h += 3) {
                    const hourPad = String(h === 24 ? 23 : h).padStart(2, "0");
                    const minPad = h === 24 ? "59" : "00";
                    const timeISO = `${selectedDay.dateString}T${hourPad}:${minPad}:00Z`;

                    const targetDate = new Date(timeISO);
                    hours.push({
                        timeLabel: targetDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        }),
                        hourVal: h,
                    });
                }
                setTimelineData(hours);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingTimeline(false);
            }
        }
        buildDayTimeline();
    }, [selectedDay]);

    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    if (year === null || month === null) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center font-mono text-sm">
                Initializing chronological context parameters...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative overflow-x-hidden">
            <div
                className={`max-w-6xl mx-auto transition-all duration-300 ${selectedDay ? "pr-0 lg:pr-100" : ""}`}
            >
                {/* Top Control Panel Header */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-amber-400">
                            Gregorian Lunisolar Calendar
                        </h1>
                        <p className="text-slate-400 text-sm">
                            Click any day to analyze its hourly cosmic timeline
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700 outline-none cursor-pointer"
                        >
                            {monthNames.map((name, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700 w-24 outline-none text-center"
                        />
                    </div>
                </div>
                {/* Informative Error State Feedback Bar */}
                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-950/40 border border-red-900 text-red-200 rounded-xl font-mono text-xs text-center">
                        ⚠️ API Connection Error: {errorMsg}. Verify that your
                        file is located exactly at{" "}
                        <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-400">
                            app/api/tithi/calendar/route.js
                        </code>
                    </div>
                )}
                {/* Calendar Grid Container */}
                {loading ? (
                    <div className="text-center py-20 text-slate-400 animate-pulse font-mono text-xs">
                        Running bisection orbital scans...
                    </div>
                ) : daysData.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                        No calendar data rendered. Check your browser developer
                        network console.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {daysData.map((item) => (
                            <button
                                key={item.day}
                                onClick={() => setSelectedDay(item)}
                                className={`bg-slate-900 border text-left rounded-xl p-3 min-h-32.5 flex flex-col justify-between transition-all hover:border-amber-500/50 hover:bg-slate-900/80 active:scale-[0.98] ${selectedDay?.day === item.day ? "border-amber-400 ring-2 ring-amber-400/20" : "border-slate-800"}`}
                            >
                                <div className="flex justify-between items-start w-full gap-2">
                                    <span className="text-lg font-bold text-slate-400 font-mono">
                                        {item.day}
                                    </span>
                                    <span
                                        className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-amber-400 font-medium truncate max-w-27.5"
                                        title={item.sunriseTithi}
                                    >
                                        ☀️{" "}
                                        {item.sunriseTithi
                                            ? item.sunriseTithi.replace(
                                                  " Paksha",
                                                  "",
                                              )
                                            : "N/A"}
                                    </span>
                                </div>
                                <div className="mt-3 w-full space-y-1">
                                    {item.transitions &&
                                    item.transitions.length > 0 ? (
                                        item.transitions.map((trans, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-slate-950 p-1.5 rounded border border-emerald-950/40"
                                            >
                                                <div className="text-[10px] text-emerald-400 font-semibold truncate">
                                                    {trans.name}
                                                </div>
                                                <div className="text-[9px] text-slate-500 font-mono">
                                                    Ends: {trans.time}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-[10px] text-slate-600 italic">
                                            No boundary crossings
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {/* Sliding Side-Drawer Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-full sm:w-100 bg-slate-900 border-l border-slate-800 shadow-2xl p-6 z-50 transform transition-transform duration-300 ease-in-out flex flex-col justify-between ${selectedDay ? "translate-x-0" : "translate-x-full"}`}
            >
                {selectedDay && (
                    <>
                        <div>
                            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-amber-400">
                                        Day Details: Matrix Analysis
                                    </h3>
                                    <p className="text-slate-400 text-xs font-mono">
                                        {selectedDay.dateString}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedDay(null)}
                                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-sm transition-colors"
                                >
                                    ✕ Close
                                </button>
                            </div>
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 space-y-2">
                                <span className="text-[11px] text-slate-500 uppercase font-mono tracking-wider block">
                                    Active at Sunrise (06:00 AM)
                                </span>
                                <span className="text-xl font-bold text-slate-200 block">
                                    {selectedDay.sunriseTithi}
                                </span>
                            </div>
                            <div className="mb-6">
                                <h4 className="text-sm font-semibold text-slate-400 mb-3">
                                    Today's Terminal Boundaries
                                </h4>
                                {selectedDay.transitions &&
                                selectedDay.transitions.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedDay.transitions.map((t, i) => (
                                            <div
                                                key={i}
                                                className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-emerald-950/60 font-mono text-xs"
                                            >
                                                <span className="text-emerald-400 font-semibold">
                                                    {t.name}
                                                </span>
                                                <span className="text-slate-400">
                                                    Ends at {t.time}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs italic text-slate-500 bg-slate-950/50 p-3 rounded-lg text-center">
                                        The lunar angle resides safely within a
                                        single 12° slice across this civil day.
                                    </p>
                                )}
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-3">
                                    24-Hour Orbital Trend
                                </h4>
                                {loadingTimeline ? (
                                    <div className="text-center py-8 font-mono text-xs text-slate-500 animate-pulse">
                                        Plotting angular vector velocities...
                                    </div>
                                ) : (
                                    <div className="relative border-l-2 border-slate-800 pl-4 ml-2 space-y-4 max-h-80 overflow-y-auto pr-2">
                                        {timelineData.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="relative group"
                                            >
                                                <div className="absolute -left-5.25 top-1 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-900 group-hover:bg-amber-400 transition-colors"></div>
                                                <div className="flex justify-between text-xs font-mono">
                                                    <span className="text-slate-400">
                                                        {item.timeLabel}
                                                    </span>
                                                    <span className="text-indigo-400 text-[11px]">
                                                        🌕 Angular Sweep Vector
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="border-t border-slate-800 pt-4 text-center">
                            <span className="text-[10px] text-slate-500 font-mono block">
                                Calculations mapped via geocentric true ecliptic
                                parameters
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
