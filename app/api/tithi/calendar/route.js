import { NextResponse } from "next/server";
import { MoonPhase, MakeTime } from "astronomy-engine";

const TITHI_NAMES = [
    "Pratipada",
    "Dwitiya",
    "Tritiya",
    "Chaturthi",
    "Panchami",
    "Shasthi",
    "Saptami",
    "Ashtami",
    "Navami",
    "Dashami",
    "Ekadashi",
    "Dwadashi",
    "Trayodashi",
    "Chaturdashi",
    "Purnima/Amavasya",
];

// Helper to get geocentric elongation using the official MoonPhase API
function getElongation(jsDate) {
    // Pass the JS Date object directly into MakeTime
    const astroTime = MakeTime(jsDate);
    // MoonPhase natively returns the moon's ecliptic elongation from the sun (0 to 360 degrees)
    return MoonPhase(astroTime);
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const now = new Date();
        const year = parseInt(searchParams.get("year")) || now.getFullYear();
        const month = parseInt(searchParams.get("month")) || now.getMonth() + 1;
        const tithiTransitions = [];
        // Establish month boundaries in UTC
        const startJsDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endJsDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));
        let currentCheckMs = startJsDate.getTime();
        const endCheckMs = endJsDate.getTime();
        // Scan month in 2-hour increments to locate transition crossings
        const stepSize = 2 * 60 * 60 * 1000;
        let prevTimeMs = currentCheckMs;
        let prevElongation = getElongation(new Date(prevTimeMs));
        let prevTithiNum = Math.floor(prevElongation / 12) + 1;

        while (currentCheckMs <= endCheckMs) {
            currentCheckMs += stepSize;
            const evalDate = new Date(currentCheckMs);
            const currElongation = getElongation(evalDate);
            const currTithiNum = Math.floor(currElongation / 12) + 1;

            if (currTithiNum !== prevTithiNum) {
                // Bisection optimization search to target exact terminal timestamp
                let lowMs = prevTimeMs;
                let highMs = currentCheckMs;
                let exactTransitionMs = lowMs;
                for (let b = 0; b < 10; b++) {
                    const midMs = (lowMs + highMs) / 2;
                    const midTithiNum =
                        Math.floor(getElongation(new Date(midMs)) / 12) + 1;
                    if (midTithiNum === prevTithiNum) {
                        lowMs = midMs;
                    } else {
                        highMs = midMs;
                    }
                    exactTransitionMs = lowMs;
                }

                const transitionDate = new Date(exactTransitionMs);
                let paksha = prevTithiNum <= 15 ? "Shukla" : "Krishna";
                let relativeIdx =
                    prevTithiNum <= 15 ? prevTithiNum : prevTithiNum - 15;
                let displayName =
                    relativeIdx === 15
                        ? prevTithiNum === 15
                            ? "Purnima"
                            : "Amavasya"
                        : TITHI_NAMES[relativeIdx - 1];
                const isoString = transitionDate.toISOString();
                tithiTransitions.push({
                    tithiNumber: prevTithiNum,
                    name: `${paksha} ${displayName}`,
                    endTime: isoString,
                    dateKey: isoString.split("T")[0], // Safely extracts "YYYY-MM-DD" string
                });
            }

            prevTimeMs = currentCheckMs;
            prevElongation = currElongation;
            prevTithiNum = currTithiNum;
        }
        // Map transitions safely into structural calendar grid blocks
        const daysInMonth = new Date(year, month, 0).getDate();
        const calendarDays = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            // Isolate transitions ending inside this specific Gregorian day
            const endsToday = tithiTransitions.filter(
                (t) => t.dateKey === dateKey,
            );
            // Sunrise check (6:00 AM UTC baseline evaluation)
            const sunriseCheckDate = new Date(`${dateKey}T06:00:00Z`);
            const sunriseElongation = getElongation(sunriseCheckDate);
            const sunriseTithiNum = Math.floor(sunriseElongation / 12) + 1;
            let paksha = sunriseTithiNum <= 15 ? "Shukla" : "Krishna";
            let relativeIdx =
                sunriseTithiNum <= 15 ? sunriseTithiNum : sunriseTithiNum - 15;
            const sunriseTithiName =
                relativeIdx === 15
                    ? sunriseTithiNum === 15
                        ? "Purnima"
                        : "Amavasya"
                    : TITHI_NAMES[relativeIdx - 1];
            calendarDays.push({
                day: d,
                dateString: dateKey,
                sunriseTithi: `${paksha} ${sunriseTithiName}`,
                transitions: endsToday.map((t) => ({
                    name: t.name,
                    time: new Date(t.endTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                })),
            });
        }

        return NextResponse.json({
            success: true,
            year,
            month,
            days: calendarDays,
        });
    } catch (error) {
        console.error("Calendar API internal error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 },
        );
    }
}
