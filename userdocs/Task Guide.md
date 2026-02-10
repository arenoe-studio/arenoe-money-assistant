# 🚀 UNIVERSAL AI AGENT PROMPT TEMPLATE

## 📖 TENTANG TEMPLATE INI

Template prompt ini dirancang untuk **ANY PROJECT** yang menggunakan AI agent seperti Antigravity, Cursor, Windsurf, atau IDE AI-powered lainnya. Template ini **GENERIC** dan dapat digunakan berulang kali untuk project apapun tanpa perlu modifikasi prompt.

## 🎯 CARA PENGGUNAAN

### Persiapan Awal
1. Siapkan 2 file dokumentasi project Anda:
   - **PROJECT_CONTEXT.md** - Konteks lengkap aplikasi (tujuan, fitur, alur, dll)
   - **TECH_STACK.md** - Spesifikasi teknis (framework, database, API, dll)

2. Upload kedua file ke AI agent Anda

3. Copy-paste prompt sesuai fase yang sedang dikerjakan

4. **JANGAN SKIP FASE** - ikuti urutan untuk hasil optimal

---

## 🔄 WORKFLOW DEVELOPMENT

```
FASE 0: Inisialisasi & Pemahaman
    ↓
FASE 1: Setup Struktur Project
    ↓
FASE 2: Core Configuration & Utilities
    ↓
FASE 3: External Integrations (jika ada)
    ↓
FASE 4: Feature Implementation (Main Logic)
    ↓
FASE 5: Integration & Orchestration
    ↓
FASE 6: Testing & Validation
    ↓
FASE 7: Deployment Preparation
    ↓
FASE 8: Optimization & Refactoring
    ↓
FASE 9+: New Features / Debugging
```

---

## 📋 PROMPT TEMPLATES

### 🔵 FASE 0: INISIALISASI & PEMAHAMAN

```
Saya sudah mengunggah 2 file dokumentasi untuk project ini:
1. PROJECT_CONTEXT.md - Berisi konteks lengkap aplikasi
2. TECH_STACK.md - Berisi spesifikasi teknis dan tech stack

Tolong baca dan pahami KEDUA file tersebut dengan seksama.

Setelah selesai membaca, konfirmasikan pemahaman Anda dengan membuat ringkasan mencakup:
1. Tujuan utama aplikasi dan target pengguna
2. Fitur-fitur utama yang akan diimplementasikan
3. Tech stack yang akan digunakan
4. Arsitektur sistem secara high-level
5. Dependencies atau external services yang diperlukan
6. Tantangan teknis yang mungkin dihadapi

JANGAN menulis kode apapun dulu. Pastikan kita memiliki pemahaman yang sama sebelum mulai development.
```

**✅ Kapan menggunakan:**
- Saat pertama kali memulai project baru
- Saat onboarding AI agent baru ke existing project
- Setelah update major pada dokumentasi

---

### 🔵 FASE 1: SETUP STRUKTUR PROJECT

```
Berdasarkan PROJECT_CONTEXT.md dan TECH_STACK.md yang sudah kita bahas:

Task:
1. Buatkan struktur folder/file lengkap untuk project ini sesuai dengan best practices dari framework/teknologi yang digunakan
2. Generate semua file konfigurasi yang diperlukan (package manager, compiler/transpiler config, environment variables template, dll)
3. Buat .gitignore yang sesuai dengan tech stack yang digunakan
4. Berikan penjelasan singkat fungsi setiap folder/file utama dalam struktur tersebut

Output yang diharapkan:
- Tree structure lengkap project
- File-file konfigurasi (tanpa implementasi logic dulu)
- Dokumentasi singkat struktur folder

CATATAN: 
- Ikuti konvensi penamaan dan struktur yang standar di industri
- Pastikan modular dan scalable
- Pisahkan concerns dengan jelas (config, utils, features, dll)
```

**✅ Kapan menggunakan:**
- Setelah FASE 0 selesai dan pemahaman sudah aligned
- Saat ingin restructure existing project
- Saat memulai project dari scratch

---

### 🔵 FASE 2: CORE CONFIGURATION & UTILITIES

```
Berdasarkan struktur yang sudah dibuat dan spesifikasi di TECH_STACK.md:

Task:
1. Implementasikan file konfigurasi inti:
   - Database connection/ORM setup (jika ada)
   - Environment variables handler
   - Logger utility
   - Error handler utilities
   - Response/Output formatters

2. Buatkan base utilities yang akan digunakan di seluruh aplikasi:
   - Validation helpers
   - Type definitions/interfaces
   - Constants
   - Helper functions yang reusable

3. Setup testing configuration (jika ada di tech stack)

Requirements:
- Ikuti prinsip DRY (Don't Repeat Yourself)
- Include JSDoc/docstring comments untuk dokumentasi
- Type-safe implementation (jika menggunakan TypeScript atau typed language)
- Proper error handling di setiap utility
- Export clean interfaces

JANGAN implementasi business logic dulu, fokus pada foundational code.
```

**✅ Kapan menggunakan:**
- Setelah struktur project selesai (FASE 1)
- Saat perlu menambah utility baru yang reusable
- Saat refactoring core utilities

---

### 🔵 FASE 3: EXTERNAL INTEGRATIONS SETUP

```
Berdasarkan external services/APIs yang disebutkan di TECH_STACK.md:

Task:
Untuk setiap external service yang digunakan, buatkan integration module yang mencakup:

1. Client initialization
2. Authentication/authorization handling
3. Core methods untuk interact dengan service
4. Error handling spesifik untuk service tersebut
5. Rate limiting awareness (jika applicable)
6. Retry logic untuk network failures
7. Type definitions untuk request/response

External services dari TECH_STACK.md: [AI akan membaca dari file]

Requirements:
- Setiap integration dalam file/module terpisah
- Consistent error handling pattern
- Proper logging untuk debugging
- Clean API/interface untuk digunakan di business logic
- Include usage examples di comments

PENTING: Jangan hardcode credentials, gunakan environment variables.
```

**✅ Kapan menggunakan:**
- Setelah core utilities selesai (FASE 2)
- Saat menambah external service baru
- Saat perlu refactor existing integration

**⏭️ Skip jika:**
- Project tidak menggunakan external services/APIs

---

### 🔵 FASE 4: FEATURE IMPLEMENTATION - BACKEND/LOGIC

```
Sekarang implementasikan business logic untuk fitur: [NAMA FITUR]

Berdasarkan PROJECT_CONTEXT.md, implementasikan:

1. Service Layer (Business Logic):
   - Core functionality sesuai spesifikasi di PROJECT_CONTEXT.md
   - Data processing/transformation
   - Business rules validation
   - Integration dengan external services (gunakan modules dari FASE 3)

2. Controller/Handler Layer (jika applicable):
   - Request handling
   - Input validation
   - Call service layer
   - Response formatting

3. Data Layer (jika applicable):
   - Database queries/operations
   - Data models
   - Migrations (jika ada)

Requirements:
- Separation of concerns (Service, Controller, Data)
- Comprehensive error handling
- Input validation menggunakan utilities dari FASE 2
- Logging untuk debugging dan monitoring
- Follow coding standards dan best practices
- Include comments untuk complex logic

Test scenarios yang harus dihandle: [sebutkan edge cases dari PROJECT_CONTEXT.md]
```

**✅ Kapan menggunakan:**
- Untuk setiap fitur baru yang akan diimplementasi
- Gunakan prompt ini BERKALI-KALI, ganti [NAMA FITUR] sesuai kebutuhan
- Implementasi satu fitur per waktu untuk fokus yang lebih baik

**💡 Tips:**
- Mulai dari fitur paling critical/core
- Implementasi fitur simple dulu sebelum yang complex
- Test setiap fitur sebelum lanjut ke fitur berikutnya

---

### 🔵 FASE 4B: FEATURE IMPLEMENTATION - FRONTEND/UI

```
Implementasikan user interface/presentation layer untuk fitur: [NAMA FITUR]

Berdasarkan PROJECT_CONTEXT.md:

1. UI Components:
   - Sesuai dengan spesifikasi design/UX di PROJECT_CONTEXT.md
   - Reusable components
   - Responsive design (jika required)
   - Accessibility considerations

2. State Management:
   - Local state untuk UI
   - Global state (jika menggunakan state management)
   - Form handling
   - Loading states
   - Error states

3. Integration dengan Backend:
   - API calls/data fetching
   - Error handling dan user feedback
   - Loading indicators
   - Success/error notifications

Requirements:
- Clean and readable code
- Component composition
- Proper TypeScript types (jika applicable)
- Follow UI framework best practices
- Consistent styling approach
- User-friendly error messages

PENTING: Pastikan UX flow sesuai dengan yang dijelaskan di PROJECT_CONTEXT.md
```

**✅ Kapan menggunakan:**
- Setelah backend logic selesai untuk fitur tersebut
- Untuk aplikasi yang memiliki UI/frontend
- Gunakan berkali-kali untuk setiap fitur yang berbeda

**⏭️ Skip jika:**
- Project adalah backend-only (API, CLI, bot, dll)
- Project belum sampai tahap frontend

---

### 🔵 FASE 5: INTEGRATION & ORCHESTRATION

```
Sekarang hubungkan semua komponen menjadi complete flow:

Berdasarkan workflow di PROJECT_CONTEXT.md, buatkan orchestration logic yang:

1. Mengintegrasikan semua fitur yang sudah dibuat
2. Mengatur flow/sequence eksekusi
3. Handle state transitions
4. Coordinate antara different services/modules
5. Implement main application entry point

Specific requirements:
- Flow harus match dengan yang dijelaskan di PROJECT_CONTEXT.md
- Error recovery di setiap step
- Proper logging untuk tracing flow
- Transaction management (jika applicable)
- Cleanup/rollback handling
- Concurrent operation handling (jika applicable)

Edge cases yang harus dihandle:
- User/system actions di tengah process
- Network failures
- Timeout scenarios
- Invalid state transitions
- Race conditions (jika applicable)

Buatkan sequence diagram atau flowchart (dalam komentar/markdown) untuk visualisasi flow.
```

**✅ Kapan menggunakan:**
- Setelah semua fitur individual selesai diimplementasi
- Saat perlu refactor application flow
- Saat menambah fitur baru yang affect existing flow

---

### 🔵 FASE 6: TESTING & VALIDATION

```
Setup testing dan validation untuk project:

1. Test Strategy:
   - Buatkan testing checklist berdasarkan PROJECT_CONTEXT.md
   - Define test scenarios (happy path, edge cases, error cases)
   - Prioritize critical paths

2. Implementation:
   - Unit tests untuk core functions/utilities
   - Integration tests untuk feature flows
   - E2E tests untuk critical user journeys (jika applicable)
   - Validation scripts untuk configuration/environment

3. Testing Documentation:
   - Create TESTING.md atau TESTING_CHECKLIST.md
   - Include manual testing procedures
   - Document expected results
   - Setup instructions untuk running tests

Output yang diharapkan:
- Test files/suites
- Testing documentation
- CI/CD test pipeline config (jika applicable)
- Scripts untuk running tests

Framework/tools: [Gunakan yang disebutkan di TECH_STACK.md]
```

**✅ Kapan menggunakan:**
- Setelah main features dan integration selesai
- Before deployment preparation
- Saat menambah test coverage untuk existing code

**💡 Tips:**
- Jika budget waktu terbatas, fokus pada critical path tests dulu
- Manual testing checklist tetap valuable meskipun belum ada automated tests

---

### 🔵 FASE 7: DEPLOYMENT PREPARATION

```
Persiapkan project untuk deployment:

1. Deployment Documentation:
   - Create DEPLOYMENT.md dengan step-by-step deployment guide
   - Environment-specific configurations (dev, staging, production)
   - Pre-deployment checklist
   - Post-deployment validation steps
   - Rollback procedures

2. Production Readiness:
   - Security audit checklist
   - Performance optimization checklist
   - Error monitoring setup
   - Logging configuration
   - Backup strategy (untuk database/critical data)

3. CI/CD Setup (jika applicable):
   - Pipeline configuration
   - Automated deployment scripts
   - Environment variable management
   - Build optimization

4. Monitoring & Maintenance:
   - Health check endpoints (jika applicable)
   - Monitoring strategy
   - Alert configuration
   - Maintenance procedures

Deployment platform: [Dari TECH_STACK.md]

Include troubleshooting section untuk common deployment issues.
```

**✅ Kapan menggunakan:**
- Setelah testing selesai dan aplikasi ready untuk deploy
- Before first deployment
- Saat update deployment strategy/platform

---

### 🔵 FASE 8: OPTIMIZATION & REFACTORING

```
Review dan optimize codebase:

1. Code Quality Audit:
   - Identify code duplication → suggest refactoring
   - Check code complexity → suggest simplification
   - Review naming conventions → suggest improvements
   - Validate design patterns → ensure consistency
   - Type safety check (jika applicable)

2. Performance Optimization:
   - Analyze bottlenecks berdasarkan profiling (jika ada)
   - Database query optimization
   - Caching strategy implementation
   - Bundle size optimization (untuk web apps)
   - Memory usage optimization
   - Network request optimization

3. Security Hardening:
   - Input validation review
   - Authentication/authorization check
   - Secrets management audit
   - Dependency security check
   - API security review
   - Common vulnerabilities check (SQL injection, XSS, CSRF, dll)

4. Documentation Update:
   - Code comments untuk complex logic
   - API documentation
   - Architecture documentation
   - Update README jika ada perubahan significant

Berikan specific recommendations dengan prioritas (high/medium/low impact).
```

**✅ Kapan menggunakan:**
- Setelah aplikasi berjalan dan sebelum production release
- Periodic maintenance (setiap sprint/release)
- Setelah major feature addition
- Saat ada performance issues

---

### 🔵 FASE 9: NEW FEATURE PLANNING

```
Saya ingin menambahkan fitur baru: [DESKRIPSI FITUR BARU]

Task:
1. Analyze Feature Requirements:
   - User stories/use cases
   - Acceptance criteria
   - Dependencies dengan existing features
   - Potential conflicts/impacts

2. Technical Design:
   - Proposed architecture/approach
   - Files/modules yang akan dibuat/dimodifikasi
   - Database changes (jika ada)
   - API changes (jika ada)
   - External services needed (jika ada)

3. Implementation Plan:
   - Break down ke sub-tasks
   - Estimate complexity untuk each task
   - Identify prerequisites/blockers
   - Suggest implementation sequence

4. Impact Analysis:
   - Backward compatibility concerns
   - Performance implications
   - Security considerations
   - Testing requirements

Output: Design document atau implementation plan, BUKAN code.

Tunggu approval sebelum proceed ke implementation.
```

**✅ Kapan menggunakan:**
- Saat ingin menambah fitur baru setelah MVP/v1.0
- Planning untuk major features
- Before sprint planning

**💡 Tips:**
- Discuss design dulu sebelum coding
- Consider alternative approaches
- Think about future scalability

---

### 🔵 FASE 10: DEBUGGING & TROUBLESHOOTING

```
Saya mengalami issue/bug:

**Issue Description:**
[Jelaskan masalah yang terjadi]

**Context:**
- Feature/module: [Nama feature]
- Development phase: [FASE berapa]
- Environment: [Development/Staging/Production]

**Error Details:**
- Error message: [Paste error message atau screenshot]
- Stack trace: [Jika ada]
- Steps to reproduce: [Langkah-langkah]

**Expected vs Actual:**
- Expected behavior: [Apa yang seharusnya terjadi]
- Actual behavior: [Apa yang sebenarnya terjadi]

**Additional Info:**
- Recent changes: [Perubahan terakhir yang dilakukan]
- Related files: [File yang mungkin terkait]

Task:
1. Analyze root cause berdasarkan dokumentasi project
2. Suggest solutions (ranked by likelihood of success)
3. Provide code fixes dengan penjelasan
4. Suggest debugging steps untuk verify fix
5. Recommend preventive measures untuk future

Include logging/debugging commands yang bisa digunakan untuk investigate.
```

**✅ Kapan menggunakan:**
- Kapan saja ada bug atau unexpected behavior
- Saat stuck pada error tertentu
- For production issues

**💡 Tips:**
- Berikan konteks selengkap mungkin
- Include error logs lengkap
- Mention apa yang sudah dicoba

---

### 🔵 FASE 11: DOCUMENTATION UPDATE

```
Update dokumentasi untuk perubahan: [DESKRIPSI PERUBAHAN]

Task:
1. Review dokumen yang perlu di-update:
   - PROJECT_CONTEXT.md - [Bagian apa yang berubah?]
   - TECH_STACK.md - [Ada tech stack baru?]
   - README.md - [Perlu update setup instructions?]
   - API Documentation - [Ada endpoint baru/berubah?]

2. Update Content:
   - Add new features ke documentation
   - Update changed workflows/flows
   - Document new dependencies
   - Update configuration examples
   - Revise outdated information

3. Maintain Consistency:
   - Ensure formatting consistency
   - Update version numbers
   - Update date stamps
   - Cross-reference updates

Output: Updated markdown files atau documentation.

PENTING: Keep documentation in sync dengan actual implementation.
```

**✅ Kapan menggunakan:**
- Setelah implement fitur baru
- Setelah major refactoring
- Setelah perubahan tech stack
- Periodic documentation review

---

### 🔵 FASE 12: CODE REVIEW & BEST PRACTICES

```
Lakukan code review untuk: [SPECIFIC FILES/FEATURES]

Review Aspects:

1. Code Quality:
   - Readability dan maintainability
   - Naming conventions
   - Code organization
   - Comments dan documentation
   - DRY principles
   - SOLID principles (jika OOP)

2. Functionality:
   - Logic correctness
   - Edge case handling
   - Error handling completeness
   - Input validation
   - Output consistency

3. Performance:
   - Potential bottlenecks
   - Resource usage
   - Algorithmic efficiency
   - Database query optimization
   - Caching opportunities

4. Security:
   - Input sanitization
   - Authentication/authorization
   - Data exposure risks
   - Dependency vulnerabilities
   - Best practices compliance

5. Testing:
   - Test coverage adequacy
   - Test quality
   - Missing test scenarios

Output:
- List of findings dengan severity (critical/major/minor)
- Specific recommendations untuk each finding
- Code examples untuk suggested fixes
- Prioritized action items

Format review sebagai structured feedback, bukan just list.
```

**✅ Kapan menggunakan:**
- Sebelum merge ke main branch
- Periodic code quality checks
- After completing major features
- Before production deployment

---

## 🎯 QUICK REFERENCE GUIDE

### Typical Development Flow

1. **Starting New Project:**
   ```
   FASE 0 → FASE 1 → FASE 2 → FASE 3 (if needed) →
   FASE 4 (untuk setiap fitur) → FASE 5 → FASE 6 →
   FASE 7 → FASE 8
   ```

2. **Adding New Feature:**
   ```
   FASE 9 (planning) → FASE 4 (implementation) →
   FASE 5 (integration) → FASE 6 (testing) →
   FASE 11 (documentation)
   ```

3. **Bug Fixing:**
   ```
   FASE 10 (troubleshooting) → Fix → FASE 6 (test) →
   FASE 12 (review) → Deploy
   ```

4. **Maintenance Sprint:**
   ```
   FASE 8 (optimization) → FASE 12 (code review) →
   FASE 11 (documentation update)
   ```

---

## 💡 BEST PRACTICES

### Do's ✅

- **Selalu upload PROJECT_CONTEXT.md dan TECH_STACK.md** di awal session
- **Ikuti fase secara berurutan** untuk hasil optimal
- **Confirm understanding** sebelum proceed ke coding (FASE 0)
- **Test setiap fitur** sebelum lanjut ke fitur berikutnya
- **Update documentation** setelah perubahan significant
- **Ask for clarification** jika AI agent output tidak sesuai ekspektasi

### Don'ts ❌

- **Jangan skip FASE 0** - pemahaman yang salah = implementasi yang salah
- **Jangan langsung minta full implementation** - breakdown ke fase-fase
- **Jangan modify prompt template** - ini designed untuk reusable
- **Jangan skip documentation update** - outdated docs = future confusion
- **Jangan proceed jika ada blocker** - resolve dulu sebelum lanjut

---

## 🔧 CUSTOMIZATION GUIDE

Template ini dirancang **GENERIC**, tapi Anda bisa customize dengan:

### 1. Menambah Fase Custom
Jika project Anda punya kebutuhan khusus (e.g., ML model training, blockchain deployment), tambahkan fase custom:

```
### 🔵 FASE X: [CUSTOM PHASE NAME]

[Your custom prompt here]
```

### 2. Modify Fase yang Ada
Jika suatu fase tidak applicable, skip saja atau modify sesuai kebutuhan:

```
⏭️ FASE 3 tidak applicable - skip
✏️ FASE 4 di-modify untuk CLI app instead of web app
```

### 3. Combine Phases
Untuk project kecil, Anda bisa combine beberapa fase:

```
FASE 1+2 (combined): Setup + Configuration
```

---

## 📚 ADDITIONAL RESOURCES

### Complementary Templates

Untuk hasil maksimal, gunakan template ini bersama dengan:

1. **PROJECT_CONTEXT.md Template** - Dokumentasi konteks aplikasi
2. **TECH_STACK.md Template** - Spesifikasi teknis
3. **PRD Template** - Product Requirements Document
4. **API Documentation Template** - Untuk API projects

### Recommended Tools

- **Version Control:** Git + GitHub/GitLab
- **Project Management:** Linear, Jira, atau Notion
- **Documentation:** Markdown editors, Notion, Confluence
- **AI Agents:** Antigravity, Cursor, Windsurf, GitHub Copilot

---

## 🆘 TROUBLESHOOTING TEMPLATE

### Jika AI Agent Tidak Mengikuti Instruksi

```
RESET CONVERSATION

Saya akan mulai ulang dengan konteks yang jelas:

1. Ini adalah project: [Nama Project]
2. Saya sudah upload PROJECT_CONTEXT.md dan TECH_STACK.md
3. Kita sedang di FASE: [Nomor Fase]
4. Specific task: [Deskripsi task]

Tolong confirm Anda sudah baca kedua file dan understand task yang diminta.
Jangan langsung code, confirm dulu.
```

### Jika Output Tidak Sesuai Ekspektasi

```
Output Anda tidak sesuai yang saya harapkan.

Yang saya harapkan:
[Deskripsi spesifik]

Yang Anda berikan:
[Deskripsi output yang diberikan]

Tolong revise dengan fokus pada: [Specific points]

Refer kembali ke [PROJECT_CONTEXT.md / TECH_STACK.md] untuk guidance.
```

---

## 📝 VERSION HISTORY

- **v1.0** - Initial universal template
- Compatible dengan: Next.js, React, Node.js, Python, dan framework lainnya
- Platform: Antigravity, Cursor, Windsurf, Claude, ChatGPT, dan AI agents lainnya

---

## 📄 LICENSE & USAGE

Template ini **FREE** untuk digunakan pada project personal maupun commercial.

**You are free to:**
- ✅ Use untuk unlimited projects
- ✅ Modify sesuai kebutuhan
- ✅ Share dengan team
- ✅ Adapt untuk different programming languages/frameworks

**Attribution appreciated but not required.**

---

**Made with ❤️ for developers who want efficient AI-assisted development**

*Last Updated: [Current Date]*
*Template Version: 1.0*
