# GradeUp NIL

A modern Name, Image, and Likeness (NIL) platform that connects student-athletes with brands and sponsors based on both academic excellence and athletic performance. GradeUp NIL uniquely rewards scholar-athletes by showcasing their GPAs alongside their athletic achievements.

## Overview

GradeUp NIL provides a comprehensive marketplace where:

- **Student-Athletes** can manage their NIL profile, track deals, and monetize their brand
- **Brands** can discover and partner with verified student-athletes for campaigns
- **Athletic Directors** can oversee compliance, manage athlete rosters, and monitor program-wide NIL activity

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 16](https://nextjs.org/) with App Router |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| UI | [React 19](https://react.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Database & Auth | [Supabase](https://supabase.com/) |
| Charts | [Recharts](https://recharts.org/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Testing | [Jest 30](https://jestjs.io/) + [React Testing Library](https://testing-library.com/) |
| Deployment | [Vercel](https://vercel.com/) |

## Quick Start

### Prerequisites

- Node.js 20 or later
- npm 10 or later
- A Supabase project (for full functionality)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Hempp/gradeup-nil.git
   cd gradeup-nil/gradeup-next
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example environment file and configure your Supabase credentials:

   ```bash
   cp .env.local.example .env.local
   ```

   Then edit `.env.local` with your values (see [Environment Variables](#environment-variables) below).

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run type-check` | Run TypeScript type checking |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ci` | Run tests for CI environment |
| `npm run validate` | Run type-check, lint, and tests |

## Project Structure

```
gradeup-next/
├── .github/                    # GitHub workflows and templates
│   ├── workflows/
│   │   └── ci.yml              # CI pipeline (lint, test, build)
│   └── pull_request_template.md
├── public/                     # Static assets
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Authentication routes
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── athlete/        # Athlete dashboard
│   │   │   ├── brand/          # Brand dashboard
│   │   │   └── director/       # Athletic Director dashboard
│   │   ├── (marketing)/        # Public marketing pages
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── form-field.tsx
│   │   │   ├── data-table.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── layout/             # Layout components (header, sidebar, nav)
│   │   ├── athlete/            # Athlete-specific components
│   │   ├── brand/              # Brand-specific components
│   │   ├── director/           # Director-specific components
│   │   └── shared/             # Shared components
│   ├── lib/
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── use-action.ts   # Server action hook
│   │   │   ├── use-data.ts     # Data fetching hook
│   │   │   ├── use-realtime.ts # Supabase realtime hook
│   │   │   └── use-search.ts   # Search hook
│   │   ├── services/           # Business logic services
│   │   │   ├── auth.ts
│   │   │   ├── athlete.ts
│   │   │   ├── brand.ts
│   │   │   ├── deals.ts
│   │   │   ├── messaging.ts
│   │   │   └── payments.ts
│   │   ├── supabase/           # Supabase client utilities
│   │   └── utils/              # Utility functions
│   ├── context/                # React context providers
│   │   └── AuthContext.tsx
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts
│   ├── data/                   # Mock/seed data
│   ├── __tests__/              # Test files
│   └── middleware.ts           # Next.js middleware (auth, routing)
├── supabase/                   # Supabase configuration
├── coverage/                   # Test coverage reports
├── jest.config.ts              # Jest configuration
├── jest.setup.ts               # Jest setup file
├── eslint.config.mjs           # ESLint configuration
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json
```

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Service role key for admin operations
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Getting Supabase Credentials

1. Create a project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy the **Project URL** and **anon public** key

## Key Features

### Athlete Dashboard

- **Profile Management** - Update personal info, social handles, and media
- **Deal Management** - View, accept, and track NIL deals
- **Earnings Tracking** - Monitor payments and earnings history
- **Messaging** - Communicate with brands directly
- **Analytics** - View profile performance and engagement metrics

### Brand Dashboard

- **Athlete Discovery** - Search and filter athletes by sport, school, GPA, followers
- **Campaign Management** - Create and manage NIL campaigns
- **Deal Workflow** - Send offers, negotiate, and track deal status
- **ROI Analytics** - Measure campaign performance
- **Messaging** - Direct communication with athletes

### Athletic Director Dashboard

- **Athlete Roster** - View and manage program athletes
- **Verification** - Verify enrollment, sport participation, and grades
- **Compliance Monitoring** - Track NIL activities for compliance
- **Brand Management** - Approve/review brand partnerships
- **Analytics** - Program-wide NIL metrics and reporting

### Core Platform Features

- **Multi-step Verification** - Enrollment, sport, grades, and identity verification
- **Real-time Messaging** - Powered by Supabase Realtime
- **Secure Authentication** - Supabase Auth with role-based access
- **Responsive Design** - Mobile-first approach
- **Dark/Light Theme** - System preference detection

## Development

### Code Quality

The project uses several tools to maintain code quality:

- **ESLint** - Linting with Next.js and TypeScript rules
- **TypeScript** - Strict type checking enabled
- **Husky** - Git hooks for pre-commit validation
- **lint-staged** - Run linters on staged files only

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Coverage thresholds are set at 50% for branches, functions, lines, and statements.

### CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on every push and pull request:

1. **Lint & Type Check** - ESLint and TypeScript validation
2. **Unit Tests** - Jest tests with coverage reporting
3. **Build** - Production build verification

## Deployment

The application is configured for deployment on Vercel. For comprehensive deployment instructions, including:

- Environment variable configuration
- Database migrations
- Stripe/Resend/Sentry setup
- Post-deployment checklist
- Troubleshooting guide

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the complete deployment guide.

### Quick Deploy

```bash
# Deploy to Vercel
vercel --prod

# Or connect your GitHub repository to Vercel for automatic deployments
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/Hempp/gradeup-nil/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Hempp/gradeup-nil/discussions)

---

Built with care for student-athletes.
