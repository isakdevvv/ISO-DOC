# Agent Playbook: ISO Compliance System

This document defines the roles, responsibilities, and workflows for the AI agents within the ISO Doc Platform.

## Agent Roles

### 1. ISO Ingestor (The Librarian)
**Goal**: Convert raw uploads into structured, machine-readable text.
- **Input**: PDF, DOCX, Images.
- **Tasks**:
    - OCR and text extraction.
    - Layout analysis (identifying headers, footers, tables).
    - Metadata extraction (Author, Date, Version).
- **Output**: Clean Markdown/JSON representation of the document.

### 2. Compliance Analyst (The Auditor)
**Goal**: Analyze structured text against specific ISO standards (e.g., ISO 27001:2022).
- **Input**: Structured Document + ISO Standard Knowledge Base.
- **Tasks**:
    - Clause-by-clause mapping.
    - Semantic search to find relevant sections.
    - Identifying "Shall" vs "Should" statements.
- **Output**: Compliance Matrix (Clause -> Document Section -> Status).

### 3. Gap Reporter (The Consultant)
**Goal**: Synthesize findings into actionable advice.
- **Input**: Compliance Matrix.
- **Tasks**:
    - Summarize missing requirements.
    - Generate remediation recommendations.
    - Draft a "Gap Analysis Report".
- **Output**: Human-readable PDF/HTML report.

## Workflows

### Workflow A: New Document Upload
1.  User uploads file -> **ISO Ingestor** processes it.
2.  **ISO Ingestor** saves structured content to Database.
3.  Trigger **Compliance Analyst** (async).
4.  **Compliance Analyst** updates Document status to "Analyzed".

### Workflow B: Audit Generation
1.  User requests audit for "ISO 27001".
2.  **Compliance Analyst** retrieves all relevant documents.
3.  **Compliance Analyst** builds the matrix.
4.  **Gap Reporter** takes the matrix and writes the final report.

## Agent Collaboration Protocol (Safety Rules)

To ensure multiple agents can work on this project simultaneously without conflicts, all agents must adhere to the following rules:

### 1. File System Safety
- **Atomic Writes**: When writing to files, always write to a temporary file first and then rename it to the target filename to prevent partial reads.
- **Locking**: If editing a shared configuration file (e.g., `package.json`), check for lock files or coordinate via the user.
- **Absolute Paths**: Always use absolute paths derived from the workspace root.

### 2. Database Safety
- **Migrations**: Never run `prisma migrate dev` automatically if another agent might be modifying the schema. Always verify schema state first.
- **Idempotency**: Ensure all API endpoints and service methods are idempotent. Retrying a failed job should not duplicate data.

### 3. Testing & Verification
- **Pre-Commit Tests**: Before marking a task as complete, run the relevant test suite (`npm run test`).
- **No Broken Builds**: Leave the main branch in a buildable state. If you break it, fix it immediately.

### 4. Communication
- **Task Boundaries**: Clearly define what you are working on in `task.md`. Do not pick up a task marked as "In Progress" by another agent.
- **Artifact Updates**: Keep `implementation_plan.md` and `walkthrough.md` updated so other agents know the current architectural state.

