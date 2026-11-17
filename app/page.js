"use client";
import React, { useState, useEffect, useRef } from "react";

export default function CalendarPage() {
    const [year, setYear] = useState(null);
    const [month, setMonth] = useState(null);
    const [daysData, setDaysData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [calendarTimezone, setCalendarTimezone] = useState("UTC");
    const [selectedDay, setSelectedDay] = useState(null);
    const [address, setAddress] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [timelineData, setTimelineData] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const locationInputRef = useRef(null);

    useEffect(() => {
        const now = new Date();
        setYear(now.getFullYear());
        setMonth(now.getMonth() + 1);
    }, []);

    useEffect(() => {
        if (year === null || month === null) return;

        const controller = new AbortController();
        async function fetchCalendar() {
            setLoading(true);
            setErrorMsg(null);
            try {
                const params = new URLSearchParams({
                    year: String(year),
                    month: String(month),
                });
                if (selectedLocation) {
                    params.set("latitude", String(selectedLocation.latitude));
                    params.set("longitude", String(selectedLocation.longitude));
                }
                const res = await fetch(`/api/tithi/calendar?${params}`, {
                    signal: controller.signal,
                });
                const data = await res.json();
                if (
                    !res.ok ||
                    !data.success ||
                    !Array.isArray(data.days) ||
                    typeof data.timezone !== "string"
                ) {
                    throw new Error(
                        data.error ||
                            `Calendar request failed with status ${res.status}.`,
                    );
                }
                setDaysData(data.days);
                setCalendarTimezone(data.timezone);
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("Critical fetching issue:", err);
                    setErrorMsg(err.message);
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        fetchCalendar();
        return () => controller.abort();
    }, [year, month, selectedLocation]);

    useEffect(() => {
        setSelectedDay(null);
    }, [year, month]);

    useEffect(() => {
        if (selectedLocation?.display_name === address) {
            setSuggestions([]);
            return;
        }
        if (address.trim().length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const controller = new AbortController();
        const delayDebounce = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/api/autocomplete?q=${encodeURIComponent(address.trim())}`,
                    { signal: controller.signal },
                );
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Location search failed.");
                }
                if (!Array.isArray(data)) {
                    throw new Error("Location search returned invalid suggestions.");
                }
                setSuggestions(data);
                setShowSuggestions(true);
                setLocationError(null);
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("Location autocomplete failed:", err);
                    setSuggestions([]);
                    setLocationError(err.message);
                }
            }
        }, 400);

        return () => {
            clearTimeout(delayDebounce);
            controller.abort();
        };
    }, [address, selectedLocation]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                locationInputRef.current &&
                !locationInputRef.current.contains(event.target)
            ) {
                setShowSuggestions(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    const [activeChoghadiya, setActiveChoghadiya] = useState(null);
    const [loadingChoghadiya, setLoadingChoghadiya] = useState(false);
    const [choghadiyaError, setChoghadiyaError] = useState(null);
    const [activeTimeline, setActiveTimeline] = useState("day");
    const [currentTimeMs, setCurrentTimeMs] = useState(null);

    useEffect(() => {
        if (!selectedDay || !selectedDay.dateString || !selectedLocation) {
            setActiveChoghadiya(null);
            setLoadingChoghadiya(false);
            setChoghadiyaError(null);
            return;
        }

        const controller = new AbortController();
        async function fetchChoghadiyaForDay() {
            setLoadingChoghadiya(true);
            setActiveChoghadiya(null);
            setChoghadiyaError(null);
            try {
                const locationQuery = `${selectedLocation.latitude},${selectedLocation.longitude}`;
                const res = await fetch(
                    `/api/choghadiya?address=${encodeURIComponent(locationQuery)}&date=${selectedDay.dateString}`,
                    { signal: controller.signal },
                );
                const result = await res.json();
                if (!res.ok || !result.success) {
                    throw new Error(
                        result.error || "Unable to load Choghadiya timings.",
                    );
                }
                setActiveChoghadiya(result);
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error(
                        "Failed to load Choghadiya slots for selected date:",
                        err,
                    );
                    setChoghadiyaError(err.message);
                }
            } finally {
                if (!controller.signal.aborted) setLoadingChoghadiya(false);
            }
        }

        fetchChoghadiyaForDay();
        return () => controller.abort();
    }, [selectedDay, selectedLocation]);

    useEffect(() => {
        if (!selectedDay?.dateString) {
            setCurrentTimeMs(null);
            return;
        }

        const updateCurrentTime = () => setCurrentTimeMs(Date.now());
        updateCurrentTime();
        const intervalId = setInterval(updateCurrentTime, 15_000);
        return () => clearInterval(intervalId);
    }, [selectedDay?.dateString]);

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

    const todayAtLocation = new Intl.DateTimeFormat("en-US", {
        timeZone: calendarTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    })
        .formatToParts(new Date())
        .reduce((date, part) => {
            if (part.type !== "literal") date[part.type] = part.value;
            return date;
        }, {});
    const todayDateString = `${todayAtLocation.year}-${todayAtLocation.month}-${todayAtLocation.day}`;

    function SlotCard({ slot, index, isActive }) {
        if (!slot) return null;

        // Extract properties safely based on API shape variants
        const name = slot.name || slot.choghadiya || "Chala";
        const nature = slot.nature || slot.type || "";
        const start = slot.startTime || slot.start || "--:--";
        const end = slot.endTime || slot.end || "--:--";

        // Match core Astrological states
        const isGood =
            nature.includes("Good") ||
            ["Amrit", "Shubha", "Labha"].includes(name);
        const isBad =
            nature.includes("Bad") || ["Udveg", "Kala", "Roga"].includes(name);

        // Default Neutral formatting style
        let bgStyles =
            "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 text-blue-700 dark:text-blue-300";

        if (isGood) {
            bgStyles =
                "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300";
        } else if (isBad) {
            bgStyles =
                "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 text-rose-700 dark:text-rose-300";
        }

        return (
            <div
                className={`p-3 rounded-lg border flex flex-col justify-between transition-all hover:shadow-sm ${bgStyles} ${isActive ? "animate-pulse ring-2 ring-amber-400 shadow-lg shadow-amber-500/30" : ""}`}
            >
                <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[13px] tracking-wide">
                        {name} - {nature}
                    </span>
                    <span className="text-[12px] uppercase font-semibold opacity-75">
                        {start} - {end}
                    </span>
                </div>
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
                            {selectedLocation
                                ? `Calendar location: ${selectedLocation.display_name}`
                                : "Choose a location, then a date to view its local tithi calendar"}
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
                <div
                    className="relative z-40 mb-6"
                    ref={locationInputRef}
                >
                    <label
                        htmlFor="preferred-location"
                        className="block text-sm font-medium text-slate-300 mb-2"
                    >
                        Preferred location
                    </label>
                    <input
                        id="preferred-location"
                        type="search"
                        autoComplete="off"
                        placeholder="Enter a city, address, ZIP code, or landmark"
                        value={address}
                        onChange={(event) => {
                            setAddress(event.target.value);
                            setSelectedLocation(null);
                            setShowSuggestions(true);
                            setLocationError(null);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        aria-autocomplete="list"
                        aria-expanded={showSuggestions && suggestions.length > 0}
                        className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-amber-500"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                        <ul
                            role="listbox"
                            className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-xl divide-y divide-slate-800"
                        >
                            {suggestions.map((item) => (
                                <li key={item.place_id} role="option">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const latitude = Number(item.latitude);
                                            const longitude = Number(item.longitude);
                                            if (
                                                !Number.isFinite(latitude) ||
                                                !Number.isFinite(longitude)
                                            ) {
                                                setLocationError(
                                                    "The selected location did not include valid coordinates.",
                                                );
                                                return;
                                            }
                                            setSelectedLocation({
                                                ...item,
                                                latitude,
                                                longitude,
                                            });
                                            setAddress(item.display_name);
                                            setSuggestions([]);
                                            setShowSuggestions(false);
                                            setLocationError(null);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none"
                                    >
                                        {item.display_name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {locationError && (
                    <div className="mb-6 p-3 bg-red-950/40 border border-red-900 text-red-200 rounded-xl text-sm">
                        Location search error: {locationError}
                    </div>
                )}
                {/* Informative Error State Feedback Bar */}
                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-950/40 border border-red-900 text-red-200 rounded-xl font-mono text-xs text-center">
                        Calendar error: {errorMsg}
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
                        {daysData.map((item, index) => {
                            const isToday = item.dateString === todayDateString;
                            const localString = `${year}-${String(month).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
                            const dateObj = new Date(localString + "T00:00:00");
                            const dayName = !isNaN(dateObj)
                                ? dateObj.toLocaleDateString("en-US", {
                                      weekday: "short",
                                  })
                                : "";

                            const previousDayHadEkadashi =
                                daysData[index - 1]?.sunriseTithi
                                    ?.toLowerCase()
                                    .includes("11th");
                            const ekadashiEndsToday = item.transitions?.some(
                                (transition) =>
                                    transition.name
                                        ?.toLowerCase()
                                        .includes("11th"),
                            );
                            const isEkadashi =
                                item.isEkadashi ||
                                item.sunriseTithi
                                    ?.toLowerCase()
                                    .includes("11th") ||
                                (ekadashiEndsToday &&
                                    !previousDayHadEkadashi);

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
                            const isWaxing = displayTithiName
                                .toLowerCase()
                                .includes("sud");

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
                                            ? "border-blue-500 bg-slate-900"
                                            : "border-slate-750 bg-slate-900"
                                        : "border-slate-800 opacity-75";

                            return (
                                <button
                                    key={item.day}
                                    onClick={() => setSelectedDay(item)}
                                    className={`${isWaxing ? "bg-slate-400 text-slate-900 hover:bg-slate-900" : "bg-slate-900 text-white hover:bg-slate-400"} border text-left rounded-xl p-2 sm:p-3 min-h-24 sm:min-h-32.5 flex flex-col justify-between transition-all hover:border-amber-500/50 active:scale-[0.98]`}
                                    style={
                                        isToday
                                            ? {
                                                  transform: "scale(1.1)",
                                                  animation: "pulse 2s infinite alternate",
                                                  transition: "all 0.3s ease-in-out",
                                                  zIndex: 1,
                                              }
                                            : undefined
                                    }
                                >
                                    <div className="flex flex-col items-center justify-center text-center w-full gap-2 pt-1">
                                        <span
                                            className={`text-2xl font-black font-mono leading-none ${
                                                isEkadashi
                                                    ? "text-amber-400"
                                                    : isNavami
                                                      ? "text-blue-600"
                                                      : isPurnima
                                                        ? "text-pink-600"
                                                        : "text-slate-200"
                                            }`}
                                        >
                                            {item.day}
                                        </span>
                                        {isEkadashi ? (
                                            <div className="flex flex-col items-center gap-1.5 w-full">
                                                <span className="text-[9px] bg-linear-to-r from-amber-400 to-yellow-700 text-slate-950 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide shadow-sm">
                                                    Ekadashi
                                                </span>
                                                <span className="text-[9px] text-slate-400 bg-black rounded-2xl font-semibold font-mono truncate max-w-full p-1">
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
                                                <span className="text-[9px] text-slate-400 bg-black rounded-2xl font-semibold font-mono truncate max-w-full p-1">
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
                                                // Strict Filter: Only allow the transition that belongs to the current primary display Tithi, OR if it's the solitary transition on the card.
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
                                                    // Tie-breaker fallback: If none of the transitions perfectly match the text string name, just show the last transition of the day (which is usually the real Tithi ending)
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
                                                        <div className="text-[9px] text-center text-slate-400 font-mono tracking-tight">
                                                            <span className="text-slate-200 font-semibold">
                                                                Until{" "}
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
            {selectedDay && (
                <button
                    type="button"
                    aria-label="Close Choghadiya timings"
                    title="Close Choghadiya timings"
                    onClick={() => setSelectedDay(null)}
                    className="fixed inset-0 z-40 cursor-default bg-black/50"
                />
            )}
            <div
                role={selectedDay ? "dialog" : undefined}
                aria-modal={selectedDay ? "true" : undefined}
                aria-labelledby={selectedDay ? "choghadiya-title" : undefined}
                className={`fixed top-0 right-0 h-full w-full sm:w-90 bg-slate-900 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 z-50 p-3 overflow-y-auto ${selectedDay ? "translate-x-0" : "translate-x-full"}`}
            >
                {selectedDay && (
                    <div className="relative mt-1 p-1 bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
                        {/* Top Control Panel Info Bar */}
                        <button
                            type="button"
                            aria-label="Close Choghadiya timings"
                            onClick={() => setSelectedDay(null)}
                            className="absolute top-1 right-1 z-10 inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                            <span aria-hidden="true">X</span>
                            <span>Close</span>
                        </button>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-6 pb-4 mb-6 border-b border-slate-800 gap-4">
                            <div>
                                <h3
                                    id="choghadiya-title"
                                    className="text-xl font-bold text-amber-400"
                                >
                                    Choghadiya Timings
                                </h3>
                                <p className="text-sm text-slate-400 mt-1 font-mono">
                                    {selectedDay.dateString
                                        ? new Date(
                                              selectedDay.dateString +
                                                  "T12:00:00",
                                          ).toLocaleDateString("en-US", {
                                              weekday: "short",
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                          })
                                        : "--"}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {selectedLocation?.display_name ||
                                        "Choose a location to load local timings"}
                                </p>
                            </div>

                            {/* Dynamic Solar Context Highlights */}
                            <div className="text-xs sm:text-right text-slate-400 space-y-1 font-mono bg-slate-950/50 p-2 rounded border border-slate-800">
                                <div>
                                    ☀️:{" "}
                                    {activeChoghadiya?.meta?.sunrise || "--:--"}
                                </div>
                                <div>
                                    🌙:{" "}
                                    {activeChoghadiya?.meta?.sunset || "--:--"}
                                </div>
                            </div>
                        </div>

                        {/* Timelines with location and day/night selection */}
                        {loadingChoghadiya ? (
                            <div className="text-center py-12 text-slate-400 font-mono text-xs animate-pulse">
                                Calculating localized solar bisection vectors...
                            </div>
                        ) : choghadiyaError ? (
                            <div className="p-4 text-sm text-red-200 bg-red-950/40 border border-red-900 rounded-xl">
                                Unable to load timings: {choghadiyaError}
                            </div>
                        ) : (
                            <div>
                                <div className="flex gap-2 mb-4">
                                    {["day", "night"].map((timeline) => (
                                        <button
                                            key={timeline}
                                            type="button"
                                            onClick={() =>
                                                setActiveTimeline(timeline)
                                            }
                                            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                                                activeTimeline === timeline
                                                    ? timeline === "day"
                                                        ? "bg-amber-500 text-slate-950"
                                                        : "bg-indigo-500 text-white"
                                                    : "bg-slate-800 text-slate-400 hover:text-white"
                                            }`}
                                        >
                                            {timeline}
                                        </button>
                                    ))}
                                </div>
                                <h4
                                    className={`text-xs font-bold uppercase tracking-wider mb-3 font-mono ${
                                        activeTimeline === "day"
                                            ? "text-amber-400"
                                            : "text-indigo-400"
                                    }`}
                                >
                                    {activeTimeline === "day"
                                        ? "☀️ Day Slots"
                                        : "🌙 Night Slots"}
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {activeChoghadiya?.data?.[
                                        activeTimeline === "day"
                                            ? "dayTimeline"
                                            : "nightTimeline"
                                    ]?.length > 0 ? (
                                        activeChoghadiya.data[
                                            activeTimeline === "day"
                                                ? "dayTimeline"
                                                : "nightTimeline"
                                        ].map((slot, index) => {
                                            const startMs = Date.parse(
                                                slot.rawStart,
                                            );
                                            const endMs = Date.parse(
                                                slot.rawEnd,
                                            );
                                            const isActive =
                                                selectedDay.dateString ===
                                                    todayDateString &&
                                                currentTimeMs !== null &&
                                                Number.isFinite(startMs) &&
                                                Number.isFinite(endMs) &&
                                                currentTimeMs >= startMs &&
                                                currentTimeMs < endMs;

                                            return (
                                                <SlotCard
                                                    key={`${activeTimeline}-${index}`}
                                                    slot={slot}
                                                    index={index + 1}
                                                    isActive={isActive}
                                                />
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full text-xs font-mono text-slate-500 italic bg-slate-950/40 p-4 rounded-xl text-center border border-dashed border-slate-800">
                                            {selectedLocation
                                                ? "No timings are available for this date."
                                                : "Select a location to render localized timings."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
