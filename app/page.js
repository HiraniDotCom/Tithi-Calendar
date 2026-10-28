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
                    const timeISO = `${selectedDay.dateString}T${hourPad}:${minPad}:00`;

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
                            Gregorian Tithi Calendar
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

                {/* Fixed Day-of-Week Header Row */}
                <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-2 text-center text-xs font-bold text-amber-500/70 tracking-wider uppercase font-sans">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                </div>

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
                    <div className="grid grid-cols-7 gap-2 sm:gap-4">
                        {/* Unified Layout Spacer Calculation Engine */}
                        {(() => {
                            if (daysData.length === 0) return null;

                            // Native integer calculations to bypass browser parsing bugs
                            const firstDateObj = new Date(year, month - 1, 1);
                            const startDayOfWeek = !isNaN(
                                firstDateObj.getTime(),
                            )
                                ? firstDateObj.getDay()
                                : 0;

                            return Array.from({ length: startDayOfWeek }).map(
                                (_, idx) => (
                                    <div
                                        key={`start-pad-${idx}`}
                                        className="bg-slate-950/20 border border-slate-900/30 rounded-xl min-h-24 sm:min-h-32.5 pointer-events-none hidden sm:block"
                                    />
                                ),
                            );
                        })()}

                        {/* Main Grid Mapping Pass Loop */}
                        {daysData.map((item) => {
                            const localString = `${year}-${String(month).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
                            const dateObj = new Date(localString + "T00:00:00");
                            const dayName = !isNaN(dateObj)
                                ? dateObj.toLocaleDateString("en-US", {
                                      weekday: "short",
                                  })
                                : "";

                            const isEkadashi =
                                item.isEkadashi ||
                                item.sunriseTithi
                                    ?.toLowerCase()
                                    .includes("11th");

                            let displayTithiName = "N/A";
                            let isPrimaryCelebrationDay = false;

                            if (item.sunriseTithi) {
                                const baseTithi = item.sunriseTithi.replace(
                                    " Paksha",
                                    "",
                                );
                                displayTithiName = baseTithi;

                                const tithiEndingTransition =
                                    item.transitions?.find(
                                        (trans) => trans.time,
                                    );

                                if (tithiEndingTransition) {
                                    const [hours] = tithiEndingTransition.time
                                        .split(":")
                                        .map(Number);
                                    if (hours >= 13) {
                                        isPrimaryCelebrationDay = true;
                                    }
                                } else {
                                    isPrimaryCelebrationDay = true;
                                }
                            }
                            // 3. Fallback check for new incoming morning Tithis
                            if (
                                !isPrimaryCelebrationDay &&
                                item.transitions &&
                                item.transitions.length > 0
                            ) {
                                const primaryIncomingTransition =
                                    item.transitions[0];
                                if (
                                    primaryIncomingTransition &&
                                    primaryIncomingTransition.name
                                ) {
                                    displayTithiName =
                                        primaryIncomingTransition.name.replace(
                                            " Paksha",
                                            "",
                                        );
                                    isPrimaryCelebrationDay = true;
                                }
                            }

                            const isMajorFestalDay =
                                isPrimaryCelebrationDay && !isEkadashi;

                            const isNavami = displayTithiName
                                .toLowerCase()
                                .includes("sud 9th");
                            const isPurnima = displayTithiName
                                .toLowerCase()
                                .includes("15th");

                            const badgeColorClass = isNavami
                                ? "from-blue-500 to-indigo-600 text-white"
                                : isPurnima
                                  ? "from-purple-500 to-pink-600 text-white"
                                  : null;

                            const borderColorClass =
                                selectedDay?.day === item.day
                                    ? "border-amber-400 ring-2 ring-amber-400/20"
                                    : isEkadashi
                                      ? "border-amber-500/40 bg-slate-900/90 shadow-md shadow-amber-950/20"
                                      : isMajorFestalDay
                                        ? isNavami
                                            ? "border-blue-500/30 bg-slate-900/60"
                                            : "border-slate-750 bg-slate-900/40"
                                        : "border-slate-800 opacity-75";

                            return (
                                <button
                                    key={item.day}
                                    onClick={() => setSelectedDay(item)}
                                    className={`bg-slate-900 border text-left rounded-xl p-2 sm:p-3 min-h-24 sm:min-h-32.5 flex flex-col justify-between transition-all hover:border-amber-500/50 hover:bg-slate-900/80 active:scale-[0.98]`}
                                >
                                    <div className="flex flex-col items-center justify-center text-center w-full gap-2 pt-1">
                                        {/* Centered Numeric Day Marker */}
                                        <span
                                            className={`text-2xl font-black font-mono leading-none ${
                                                isEkadashi
                                                    ? "text-amber-400"
                                                    : isMajorFestalDay
                                                      ? "text-slate-200"
                                                      : "text-slate-400"
                                            }`}
                                        >
                                            {item.day}
                                        </span>
                                        {/* Centered Dynamic Holy Day Indicator Target Pill */}
                                        {isEkadashi ? (
                                            <div className="flex flex-col items-center gap-1.5 w-full">
                                                <span className="text-[9px] bg-linear-to-r from-amber-500 to-yellow-600 text-slate-950 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide shadow-sm">
                                                    Ekadashi
                                                </span>
                                                <span className="text-[9px] text-amber-500/70 font-semibold font-mono truncate max-w-full px-1">
                                                    {displayTithiName}
                                                </span>
                                            </div>
                                        ) : isMajorFestalDay ? (
                                            <div className="flex flex-col items-center gap-1.5 w-full">
                                                <span
                                                    className={`text-[9px] bg-linear-to-r ${badgeColorClass} px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide shadow-sm`}
                                                >
                                                    {isNavami
                                                        ? "Navami"
                                                        : isPurnima
                                                          ? "Purnima"
                                                          : null}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-semibold font-mono truncate max-w-full px-1">
                                                    {displayTithiName}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] bg-slate-950/80 px-2 py-0.5 rounded-md text-slate-400 font-medium truncate max-w-full border border-slate-850/60 font-mono">
                                                {displayTithiName}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-3 w-full space-y-1 text-center">
                                        {item.transitions &&
                                        item.transitions.length > 0 ? (
                                            item.transitions
                                                // Strict Filter: Only allow the transition that belongs to the current primary display Tithi,
                                                // OR if it's the solitary transition on the card.
                                                .filter((trans, idx, self) => {
                                                    if (!trans.time)
                                                        return false;
                                                    // Match against our calculated primary Tithi name for the day
                                                    const matchesCurrentTithi =
                                                        trans.name
                                                            ?.toLowerCase()
                                                            .includes(
                                                                displayTithiName.toLowerCase(),
                                                            ) ||
                                                        displayTithiName
                                                            .toLowerCase()
                                                            .includes(
                                                                trans.name?.toLowerCase() ||
                                                                    "",
                                                            );
                                                    // If it matches our primary headline Tithi, prioritize it!
                                                    if (matchesCurrentTithi)
                                                        return true;
                                                    // Tie-breaker fallback: If none of the transitions perfectly match the text string name,
                                                    // just show the last transition of the day (which is usually the real Tithi ending)
                                                    return (
                                                        idx === self.length - 1
                                                    );
                                                })
                                                // Take only the top match to guarantee exactly one label per card
                                                .slice(0, 1)
                                                .map((trans, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`bg-slate-950 p-1.5 rounded border inline-block w-full ${
                                                            isEkadashi
                                                                ? "border-amber-950/40"
                                                                : isMajorFestalDay
                                                                  ? "border-slate-800/60"
                                                                  : "border-slate-900/40"
                                                        }`}
                                                    >
                                                        <div className="text-[9px] text-slate-400 font-mono tracking-tight">
                                                            {trans.name
                                                                ? `${trans.name.replace(" Paksha", "")} Ends: `
                                                                : "Ends: "}
                                                            <span className="text-slate-200 font-semibold">
                                                                {trans.time}
                                                            </span>
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
                            );
                        })}
                        {/* Append Rear Spacers */}
                        {(() => {
                            if (daysData.length === 0) return null;
                            const firstDateObj = new Date(year, month - 1, 1);
                            const startDayOfWeek = !isNaN(
                                firstDateObj.getTime(),
                            )
                                ? firstDateObj.getDay()
                                : 0;
                            const totalSlotsUsed =
                                startDayOfWeek + daysData.length;
                            const endDayPaddingNeeded =
                                (7 - (totalSlotsUsed % 7)) % 7;

                            return Array.from({
                                length: endDayPaddingNeeded,
                            }).map((_, idx) => (
                                <div
                                    key={`end-pad-${idx}`}
                                    className="bg-slate-950/20 border border-slate-900/30 rounded-xl min-h-24 sm:min-h-32.5 pointer-events-none hidden sm:block"
                                />
                            ));
                        })()}
                    </div>
                )}
            </div>
            {/* Right Drawer Panel Slider */}
            <div
                className={`fixed top-0 right-0 h-full w-full sm:w-100 bg-slate-900 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 z-50 p-6 overflow-y-auto ${selectedDay ? "translate-x-0" : "translate-x-full"}`}
            >
                {selectedDay && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-amber-400">
                                    Day Analysis
                                </h3>
                                <p className="text-slate-400 text-xs font-mono">
                                    Date:{" "}
                                    {selectedDay.dateString ||
                                        `Day ${selectedDay.day}`}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDay(null)}
                                className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg border border-slate-700 text-xs transition-colors"
                                type="button"
                            >
                                Close ✕
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <span className="text-[10px] text-slate-500 block mb-1 font-mono">
                                    SUNRISE TITHI OBTAINED
                                </span>
                                <div className="text-sm font-semibold text-slate-200">
                                    {selectedDay.sunriseTithi || "N/A"}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    Calculated Hourly Projections
                                </h4>
                                {loadingTimeline ? (
                                    <div className="text-xs text-slate-500 font-mono py-4">
                                        Assembling chronological matrices...
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {timelineData.map((slot, i) => (
                                            <div
                                                key={i}
                                                className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 flex justify-between items-center text-xs"
                                            >
                                                <span className="font-mono text-amber-500/90 font-medium">
                                                    {slot.timeLabel}
                                                </span>
                                                <span className="text-slate-400">
                                                    Hour {slot.hourVal}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
