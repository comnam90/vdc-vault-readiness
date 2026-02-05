# Normalizer Validation Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand normalization test coverage and align the input contract so missing sections default safely.

**Architecture:** The `normalizeHealthcheck()` function remains the normalization boundary and already converts/filters raw rows. We will expand tests in `src/__tests__/normalizer.test.ts` to cover missing sections, required-field drops across all sections, and boolean parsing edge cases. We will adjust the function signature to accept `Partial<ParsedHealthcheckSections>` so missing keys can be passed explicitly and default to empty arrays.

**Tech Stack:** TypeScript 5.9, Vitest 4, Vite 7

---

### Task 1: Accept missing sections and default to empty arrays

**Files:**

- Modify: `src/__tests__/normalizer.test.ts`
- Modify: `src/lib/normalizer.ts`

**Step 1: Write the failing test**

Add this test in `src/__tests__/normalizer.test.ts`:

```ts
it("defaults missing sections to empty arrays", () => {
  const raw: Partial<ParsedHealthcheckSections> = {
    jobInfo: [],
  };

  const result = normalizeHealthcheck(raw);

  expect(result).toEqual({
    backupServer: [],
    securitySummary: [],
    jobInfo: [],
    Licenses: [],
    dataErrors: [],
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```
npm run test:run -- src/__tests__/normalizer.test.ts
```

Expected: FAIL with a type error such as “Argument of type ‘Partial<ParsedHealthcheckSections>’ is not assignable to parameter of type ‘ParsedHealthcheckSections’”.

**Step 3: Write minimal implementation**

Update the signature in `src/lib/normalizer.ts`:

```ts
export function normalizeHealthcheck(
  raw: Partial<ParsedHealthcheckSections>,
): NormalizedDataset {
```

No other code change should be necessary because defaults already use `raw.section ?? []`.

**Step 4: Run test to verify it passes**

Run:

```
npm run test:run -- src/__tests__/normalizer.test.ts
```

Expected: PASS for the new test and existing tests.

**Step 5: Commit**

```bash
git add src/__tests__/normalizer.test.ts src/lib/normalizer.ts
git commit -m "fix(normalizer): allow missing sections to default"
```

---

### Task 2: Required-field coverage for all sections

**Files:**

- Modify: `src/__tests__/normalizer.test.ts`

**Step 1: Write the failing tests**

Add tests similar to these (use separate `it()` blocks):

```ts
it("drops backup servers missing required fields", () => {
  const raw: ParsedHealthcheckSections = {
    backupServer: [
      { Version: null, Name: "ServerA" },
      { Version: "13.0.1.1071", Name: "ServerB" },
    ],
    securitySummary: [],
    jobInfo: [],
    Licenses: [],
  };

  const result = normalizeHealthcheck(raw);

  expect(result.backupServer).toHaveLength(1);
  expect(result.dataErrors).toHaveLength(1);
  expect(result.dataErrors[0]).toMatchObject({
    level: "Data Error",
    section: "backupServer",
    rowIndex: 0,
    field: "Version",
  });
});

it("drops security summaries with invalid booleans", () => {
  const raw: ParsedHealthcheckSections = {
    backupServer: [],
    securitySummary: [
      {
        BackupFileEncryptionEnabled: "Maybe",
        ConfigBackupEncryptionEnabled: "True",
      },
      {
        BackupFileEncryptionEnabled: "True",
        ConfigBackupEncryptionEnabled: "False",
      },
    ],
    jobInfo: [],
    Licenses: [],
  };

  const result = normalizeHealthcheck(raw);

  expect(result.securitySummary).toHaveLength(1);
  expect(result.dataErrors).toHaveLength(1);
  expect(result.dataErrors[0]).toMatchObject({
    level: "Data Error",
    section: "securitySummary",
    rowIndex: 0,
    field: "BackupFileEncryptionEnabled",
  });
});

it("drops licenses missing required fields", () => {
  const raw: ParsedHealthcheckSections = {
    backupServer: [],
    securitySummary: [],
    jobInfo: [],
    Licenses: [
      { Edition: "Enterprise", Status: "" },
      { Edition: "Enterprise", Status: "Active" },
    ],
  };

  const result = normalizeHealthcheck(raw);

  expect(result.Licenses).toHaveLength(1);
  expect(result.dataErrors).toHaveLength(1);
  expect(result.dataErrors[0]).toMatchObject({
    level: "Data Error",
    section: "Licenses",
    rowIndex: 0,
    field: "Status",
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```
npm run test:run -- src/__tests__/normalizer.test.ts
```

Expected: FAIL if required-field handling is missing. If it passes, note that the behavior already exists.

**Step 3: Write minimal implementation (if failing)**

If any test fails, update `normalizeHealthcheck()` to ensure the missing field is detected and logged with `buildError()`.

**Step 4: Run test to verify it passes**

Run:

```
npm run test:run -- src/__tests__/normalizer.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/__tests__/normalizer.test.ts
git commit -m "test(normalizer): cover required fields by section"
```

---

### Task 3: Boolean parsing edge cases

**Files:**

- Modify: `src/__tests__/normalizer.test.ts`

**Step 1: Write the failing tests**

Add tests like these:

```ts
it("trims and lowercases boolean strings", () => {
  const raw: ParsedHealthcheckSections = {
    backupServer: [],
    securitySummary: [
      {
        BackupFileEncryptionEnabled: " TRUE ",
        ConfigBackupEncryptionEnabled: "false",
      },
    ],
    jobInfo: [],
    Licenses: [],
  };

  const result = normalizeHealthcheck(raw);

  expect(result.securitySummary[0].BackupFileEncryptionEnabled).toBe(true);
  expect(result.securitySummary[0].ConfigBackupEncryptionEnabled).toBe(false);
});

it("drops jobs with invalid boolean values", () => {
  const raw: ParsedHealthcheckSections = {
    backupServer: [],
    securitySummary: [],
    jobInfo: [
      {
        JobName: "Job A",
        JobType: "Backup",
        Encrypted: "yes",
        RepoName: "Repo1",
      },
      {
        JobName: "Job B",
        JobType: "Backup",
        Encrypted: "True",
        RepoName: "Repo2",
      },
    ],
    Licenses: [],
  };

  const result = normalizeHealthcheck(raw);

  expect(result.jobInfo).toHaveLength(1);
  expect(result.dataErrors).toHaveLength(1);
  expect(result.dataErrors[0]).toMatchObject({
    level: "Data Error",
    section: "jobInfo",
    rowIndex: 0,
    field: "Encrypted",
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```
npm run test:run -- src/__tests__/normalizer.test.ts
```

Expected: FAIL if boolean parsing is not robust.

**Step 3: Write minimal implementation (if failing)**

If any test fails, update `parseBoolean()` to ensure it trims whitespace and handles case-insensitive comparisons, returning `null` for invalid values.

**Step 4: Run test to verify it passes**

Run:

```
npm run test:run -- src/__tests__/normalizer.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/__tests__/normalizer.test.ts
git commit -m "test(normalizer): cover boolean parsing edge cases"
```

---

### Task 4: Final verification

**Files:** none

**Step 1: Run full test suite**

Run:

```
npm run test:run
```

Expected: PASS.

**Step 2: Run build**

Run:

```
npm run build
```

Expected: PASS.
