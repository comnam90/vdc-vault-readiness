# VDC Vault Readiness Analyzer

A client-side web application that validates whether a Veeam Backup & Replication (VBR) environment is ready to integrate with Veeam Data Cloud (VDC) Vault.

Upload a Veeam Healthcheck JSON file and get instant pre-flight checks for encryption requirements, version compatibility, and workload support.

## Features

- **Local Processing**: All data stays in your browser. No uploads to external servers.
- **Version Validation**: Checks VBR version meets 12.1.2+ requirement
- **Encryption Audit**: Identifies unencrypted jobs that would block Vault integration
- **Workload Analysis**: Flags unsupported workloads (AWS Backup, standalone agents)
- **Actionable Results**: Clear pass/fail/warning indicators with remediation guidance

## Tech Stack

| Technology     | Version | Purpose           |
| -------------- | ------- | ----------------- |
| React          | 19.x    | UI framework      |
| Vite           | 7.3.1   | Build tool        |
| TypeScript     | 5.9.3   | Language          |
| Tailwind CSS   | 4.1.18  | Styling           |
| shadcn/ui      | 3.8.3   | Component library |
| TanStack Table | 8.21.3  | Data grid         |
| Recharts       | 3.7.0   | Visualization     |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## Usage

1. Export a Healthcheck JSON from your VBR environment
2. Open the app in your browser
3. Upload or drag-and-drop the JSON file
4. Review the readiness report and address any blockers

## Validation Rules

| Check             | Severity | Requirement                           |
| ----------------- | -------- | ------------------------------------- |
| VBR Version       | Blocker  | Must be 12.1.2 or higher              |
| Job Encryption    | Blocker  | All jobs must have encryption enabled |
| AWS Workloads     | Blocker  | Cannot target Vault directly          |
| Config Encryption | Warning  | Global encryption should be enabled   |
| Agent Jobs        | Warning  | Require Gateway Server configuration  |
| Community Edition | Info     | SOBR limitations apply                |

## Project Structure

```
├── src/
│   ├── components/      # React components
│   ├── lib/             # Utilities and validation logic
│   ├── types/           # TypeScript interfaces
│   └── __tests__/       # Test files
├── PRD.md               # Product requirements
├── VDCVAULT-CHEETSHEET.md # Domain knowledge
├── CONTRIBUTING.md      # Contribution guide
└── AGENTS.md            # Engineering standards
```

## Documentation

| Document                                           | Description                                |
| -------------------------------------------------- | ------------------------------------------ |
| [PRD.md](./PRD.md)                                 | Functional requirements and specifications |
| [VDCVAULT-CHEETSHEET.md](./VDCVAULT-CHEETSHEET.md) | VDC Vault limitations and gotchas          |
| [CONTRIBUTING.md](./CONTRIBUTING.md)               | How to contribute (humans & AI agents)     |
| [AGENTS.md](./AGENTS.md)                           | Engineering standards and protocols        |

## Development

This project uses **Test-Driven Development**. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow.

```bash
# Watch mode for development
npm run test

# Single test run
npm run test:run

# With coverage
npm run test:coverage

# Lint check
npm run lint
```

## Deployment

Built for static hosting on Cloudflare Pages. The production build outputs to `dist/`.

```bash
npm run build
npm run preview  # Local preview of production build
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines covering:

- Branch and commit conventions
- TDD requirements
- Code standards
- Pull request process
- AI agent protocols

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
