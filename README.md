# Tithi Calendar App

A full-stack web application built with **Next.js (App Router)** and **Tailwind CSS** that computes and displays real-time, precision-accurate Hindu astrological timelines—including **Tithis**.

Instead of relying on hardcoded almanac data, this application leverages raw astronomical algorithms to calculate exact solar and lunar positions dynamically based on geographical coordinates and timezones.

## 🌟 Features

- **Dynamic Tithi Calendar:** Displays a classic monthly Gregorian grid overlaid with precision Tithi start and end times, handling complex lunar day transitions, multi-tithi days, and Navmi, Ekadashi & Purnima calculations.
- **Astronomical Precision:** Replaces naive linear calculations with highly efficient binary bisection search loops to isolate exact 12-degree lunar/solar angular differences (`PairLongitude`).
- **Hourly Breakdown:** Side-drawer modal detailing a 24-hour astronomical timeline breakdown for any selected calendar date.

## 🛠️ Tech Stack

- **Framework:** Next.js 15+ (App Router)
- **Styling:** Tailwind CSS (with fully responsive grid layouts)
- **Astronomy Engine:** `astronomy-engine`

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org) (v18.x or higher) installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/HiraniDotCom/Tithi-Calendar
   cd tithi-calendar
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## 📁 Architecture & API Routes

The project is structured around isolated backend calculation engines and modern React client components:

```text
├── app/
│   ├── api/
│   │   ├── tithi/
│   │   │   └── calendar/      # Bisection search engine tracking lunar phase boundaries
│   ├── page.jsx           # Main defensive dashboard UI with state fallbacks
│   └── layout.jsx
```

## ⚙️ How It Works (The Math)

1. **Tithi Mapping:** A Tithi represents a 12-degree elongation of the Moon relative to the Sun. The backend calculates the angular difference between the coordinates via longitudinal pairing.
2. **Bisection Search Optimization:** To accurately catch exact transition moments without crashing server memory, the API initializes a daily scan window and deploys a 2-hour binary bisection loop to pinpoint exactly when the phase crosses a 12-degree boundary threshold.

## 🛡️ Error Handling & Resilience

The application implements strict defensive engineering boundaries:
- **API Guardrails:** All astronomical routes explicitly check for coordinate parameters to prevent unhandled `TypeError` exceptions.
- **Hydration Syncing:** Handles strict client-server timezone matching gracefully to avoid layout shifts or browser rendering crashes.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
