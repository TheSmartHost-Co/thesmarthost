# TheSmartHost

A Monthly Analytics Rental Report application built with TypeScript, Next.js, Tailwind CSS, and modern React patterns.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TheSmartHost-Co/thesmarthost.git
   cd thesmarthost
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy the environment example file
   cp .env.example .env
   ```
   
   Update the `.env.` file with your specific configuration values. See the `.env.example` file for required environment variables.

## Development

**Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

## Build

**Create a production build:**

Do this after any change before pushing to production to verify no errors
```bash
npm run build
```

## Project Structure

```
thesmarthost/
├── public/                     # Static assets (images, icons, etc.)
│   └── window.svg
├── src/                        # Source code
│   ├── app/                    # Next.js App Router pages and layouts
│   │   ├── (prelogin)/         # Route group for pre-authentication pages
│   │   ├── (user)/             # Route group for user-authenticated pages
│   │   │   └── layout.tsx      # Layout for user pages
│   │   ├── favicon.ico         # Site favicon
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout component
│   │   └── page.tsx            # Home page
│   ├── components/             # Reusable UI components
│   │   ├── navbar/             # Navigation components
│   │   └── shared/             # Shared/common components
│   │       ├── modal.tsx       # Modal component
│   │       └── notification.tsx # Notification component
│   ├── lib/                    # Utility functions and configurations
│   ├── services/               # API calls and external service integrations
│   │   ├── apiClient.ts        # Main API client configuration
│   │   ├── authService.ts      # Authentication service
│   │   └── types/              # TypeScript type definitions
│   │       └── auth.ts         # Authentication types
│   └── store/                  # State management (Zustand)
│       └── useNotificationStore.ts # Notification state store
├── .gitignore                  # Git ignore rules
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies and scripts
├── postcss.config.mjs          # PostCSS configuration
└── tsconfig.json               # TypeScript configuration
```

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Heroicons](https://heroicons.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Package Manager**: npm

# Any Questions?

Please contact husseinsaab14@gmail.com or markjpcena@gmail.com