import { NextResponse } from "next/server";
import { MoonPhase, MakeTime } from "astronomy-engine";
import SunCalc from "suncalc3";
import { DateTime } from "luxon";

const TITHI = [
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
    "10th",
    "11th",
    "12th",
    "13th",
    "14th",
    "15th/30th",
];

// Helper to get geocentric elongation using the official MoonPhase API
function getElongation(jsDate) {
    // Pass the JS Date object directly into MakeTime
    const astroTime = MakeTime(jsDate);
    // MoonPhase natively returns the moon's ecliptic elongation from the sun (0 to 360 degrees)
    return MoonPhase(astroTime);
}

async function getTimezone(latitude, longitude) {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Timezone lookup failed with status ${response.status}`);
    }

    const data = await response.json();
    const timezone =
        data.ianaId ||
        data.localityInfo?.informative?.find(
            (item) => item.description === "time zone",
        )?.name;
    if (!timezone) {
        throw new Error("Timezone lookup did not return a timezone for this location.");
    }

    return timezone;
}

function getSunrise(date, latitude, longitude) {
    const sunTimes = SunCalc.getSunTimes(date, latitude, longitude);
    const sunriseValue =
        sunTimes.sunrise?.value ??
        sunTimes.sunriseStart?.value ??
        sunTimes.sunrise ??
        sunTimes.sunriseStart;
    const sunrise = new Date(sunriseValue);

    if (Number.isNaN(sunrise.getTime())) {
        throw new Error("A sunrise could not be calculated for this location and date.");
    }

    return sunrise;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const now = new Date();
        const year = parseInt(searchParams.get("year")) || now.getFullYear();
        const month = parseInt(searchParams.get("month")) || now.getMonth() + 1;
        const latitudeParam = searchParams.get("latitude");
        const longitudeParam = searchParams.get("longitude");
        const hasCoordinates =
            latitudeParam !== null || longitudeParam !== null;
        const latitude = Number(latitudeParam);
        const longitude = Number(longitudeParam);

        if (
            hasCoordinates &&
            (latitudeParam === null ||
                longitudeParam === null ||
                !Number.isFinite(latitude) ||
                latitude < -90 ||
                latitude > 90 ||
                !Number.isFinite(longitude) ||
                longitude < -180 ||
                longitude > 180)
        ) {
            return NextResponse.json(
                { success: false, error: "Valid latitude and longitude are required." },
                { status: 400 },
            );
        }

        const timezone = hasCoordinates
            ? await getTimezone(latitude, longitude)
            : "UTC";
        const tithiTransitions = [];
        const monthStart = DateTime.fromObject(
            { year, month, day: 1 },
            { zone: timezone },
        ).startOf("day");
        const startJsDate = monthStart.toUTC().toJSDate();
        const endJsDate = monthStart.plus({ months: 1 }).toUTC().toJSDate();
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
                const localTransitionDate = DateTime.fromJSDate(
                    transitionDate,
                ).setZone(timezone);
                let paksha = prevTithiNum <= 15 ? "Sud" : "Vad";
                let relativeIdx =
                    prevTithiNum <= 15 ? prevTithiNum : prevTithiNum - 15;
                let displayName =
                    relativeIdx === 15
                        ? prevTithiNum === 15
                            ? "15th"
                            : "30th"
                        : TITHI[relativeIdx - 1];
                const isoString = transitionDate.toISOString();
                tithiTransitions.push({
                    tithiNumber: prevTithiNum,
                    name: `${paksha} ${displayName}`,
                    endTime: isoString,
                    dateKey: localTransitionDate.toFormat("yyyy-MM-dd"),
                    localTime: localTransitionDate.toFormat("hh:mm a"),
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
            const sunriseCheckDate = hasCoordinates
                ? getSunrise(
                      DateTime.fromObject(
                          { year, month, day: d, hour: 12 },
                          { zone: timezone },
                      ).toJSDate(),
                      latitude,
                      longitude,
                  )
                : new Date(`${dateKey}T06:00:00Z`);
            const sunriseElongation = getElongation(sunriseCheckDate);
            const sunriseTithiNum = Math.floor(sunriseElongation / 12) + 1;
            let paksha = sunriseTithiNum <= 15 ? "Sud" : "Vad";
            let relativeIdx =
                sunriseTithiNum <= 15 ? sunriseTithiNum : sunriseTithiNum - 15;
            const sunriseTithiName =
                relativeIdx === 15
                    ? sunriseTithiNum === 15
                        ? "15th"
                        : "30th"
                    : TITHI[relativeIdx - 1];
            calendarDays.push({
                day: d,
                dateString: dateKey,
                sunriseTithi: `${paksha} ${sunriseTithiName}`,
                transitions: endsToday.map((t) => ({
                    name: t.name,
                    time: t.localTime,
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
