# Contributing to GradeUp NIL

Thank you for your interest in contributing to GradeUp NIL! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Commit Message Format](#commit-message-format)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please be considerate in your interactions with other contributors.

## Development Setup

### Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later
- **Git**
- A code editor (VS Code recommended)

### Initial Setup

1. **Fork the repository**

   Click the "Fork" button on GitHub to create your own copy of the repository.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/gradeup-nil.git
   cd gradeup-nil/gradeup-next
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/Hempp/gradeup-nil.git
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Set up environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your Supabase credentials.

6. **Set up Husky hooks**

   Git hooks are automatically installed when you run `npm install`. They will run linting on staged files before each commit.

7. **Start the development server**

   ```bash
   npm run dev
   ```

### Recommended VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new files
- Enable strict mode (already configured in `tsconfig.json`)
- Prefer explicit type annotations for function parameters and return types
- Use interface for object types, type for unions/intersections

```typescript
// Good
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<UserProfile> {
  // ...
}

// Avoid
function getUser(id) {
  // ...
}
```

### React Components

- Use functional components with hooks
- Use TypeScript interfaces for props
- Place components in appropriate directories based on their scope

```typescript
// Good
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick
}: ButtonProps) {
  return (
    <button
      className={cn('btn', `btn-${variant}`, `btn-${size}`)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### File Organization

```
src/
├── app/                    # Next.js pages and layouts
├── components/
│   ├── ui/                 # Generic, reusable components
│   ├── layout/             # Layout components
│   ├── athlete/            # Athlete-specific components
│   ├── brand/              # Brand-specific components
│   ├── director/           # Director-specific components
│   └── shared/             # Shared across multiple dashboards
├── lib/
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API/business logic services
│   ├── supabase/           # Supabase utilities
│   └── utils/              # Utility functions
├── context/                # React contexts
└── types/                  # TypeScript type definitions
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |
| CSS Classes | kebab-case | `user-profile` |

### Tailwind CSS

- Use Tailwind utility classes for styling
- Use `cn()` utility (from `clsx` + `tailwind-merge`) for conditional classes
- Create component-level abstractions for repeated patterns

```typescript
import { cn } from '@/lib/utils';

// Good
<div className={cn(
  'flex items-center gap-4 p-4',
  isActive && 'bg-primary text-white',
  className
)}>
```

### Imports

- Use absolute imports with the `@/` prefix
- Group imports: React, external packages, internal modules, types, styles

```typescript
// 1. React
import { useState, useEffect } from 'react';

// 2. External packages
import { format } from 'date-fns';
import { User } from 'lucide-react';

// 3. Internal modules
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks';

// 4. Types
import type { UserProfile } from '@/types';
```

## Pull Request Process

### Before Creating a PR

1. **Sync with upstream**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Run validation**

   ```bash
   npm run validate
   ```

   This runs type checking, linting, and tests.

4. **Fix any issues**

   ```bash
   npm run lint:fix  # Auto-fix linting issues
   ```

### Creating the PR

1. **Push your branch**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request**

   - Use the PR template provided
   - Fill out all sections completely
   - Link related issues using "Fixes #123" or "Relates to #123"

3. **PR Title Format**

   Use a clear, descriptive title:
   - `feat: Add athlete search filters`
   - `fix: Resolve login redirect issue`
   - `docs: Update README with setup instructions`
   - `refactor: Simplify deal status logic`

### PR Requirements

- [ ] All CI checks pass (lint, type-check, tests, build)
- [ ] Code follows style guidelines
- [ ] Tests added for new functionality
- [ ] Documentation updated if needed
- [ ] No console.log statements (except error/warn)
- [ ] No TypeScript `any` types without justification

### Review Process

1. At least one maintainer review required
2. Address all review comments
3. Keep PR scope focused - split large changes into multiple PRs
4. Squash commits before merging (if requested)

## Testing Requirements

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Writing Tests

#### Unit Tests

- Place test files in `src/__tests__/` or alongside components as `*.test.tsx`
- Use React Testing Library for component tests
- Test user behavior, not implementation details

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes correctly', () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });
});
```

#### Test Coverage

- Minimum 50% coverage required for branches, functions, lines, and statements
- Aim for higher coverage on critical business logic
- Focus on meaningful tests over coverage numbers

### What to Test

- User interactions (clicks, form submissions)
- Conditional rendering
- Edge cases and error states
- Integration between components
- Custom hooks

### What Not to Test

- Third-party library internals
- Implementation details (internal state, private methods)
- Trivial code (simple getters/setters)

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code changes that neither fix bugs nor add features |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `build` | Build system or dependency changes |
| `ci` | CI configuration changes |
| `chore` | Other changes that don't modify src or test files |

### Scope (Optional)

The scope indicates the area of the codebase affected:
- `athlete` - Athlete dashboard/features
- `brand` - Brand dashboard/features
- `director` - Director dashboard/features
- `auth` - Authentication
- `ui` - UI components
- `api` - API/services
- `types` - Type definitions

### Examples

```bash
# Feature
feat(athlete): add earnings breakdown chart

# Bug fix
fix(auth): resolve redirect loop on login

# Documentation
docs: update contributing guidelines

# Refactor
refactor(ui): simplify button component variants

# Tests
test(deals): add unit tests for deal status transitions

# Build/Dependencies
build: upgrade Next.js to 16.1.6

# CI
ci: add code coverage reporting
```

### Commit Message Guidelines

1. **Subject line**
   - Use imperative mood ("Add feature" not "Added feature")
   - Keep under 72 characters
   - Don't end with a period

2. **Body (optional)**
   - Explain the "why" not the "what"
   - Wrap at 72 characters
   - Separate from subject with blank line

3. **Footer (optional)**
   - Reference issues: `Fixes #123`, `Closes #456`
   - Note breaking changes: `BREAKING CHANGE: description`

### Example with Body

```
feat(brand): add athlete comparison feature

Allow brands to compare up to 3 athletes side-by-side
when evaluating potential partnerships. Comparison
includes social metrics, GPA, and deal history.

Fixes #234
```

---

## Questions?

If you have questions about contributing, feel free to:
- Open a [GitHub Discussion](https://github.com/Hempp/gradeup-nil/discussions)
- Create an [Issue](https://github.com/Hempp/gradeup-nil/issues) for bugs or feature requests

Thank you for contributing to GradeUp NIL!
