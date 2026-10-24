Bộ **6 sơ đồ kiến trúc kỹ thuật (Architecture & Database Diagrams)** cho dự án **Mầm Học AI (StuGuide)** được xây dựng dựa trên tài liệu đặc tả `spec.md` (Phiên bản 3.0 - AI-Native Unified Master Specification).

Toàn bộ sơ đồ được thiết kế bằng chuẩn **Mermaid.js** với đầy đủ tên bảng, kiểu dữ liệu, khóa chính (PK), khóa ngoại (FK), ràng buộc duy nhất (UK), cấu trúc JSON và luồng điều phối giữa Next.js 15, Vercel AI SDK, Gemini 2.5 Pro/Flash, Domain Guardrails và Supabase PostgreSQL (`pgvector`). Bạn có thể copy trực tiếp vào tài liệu kỹ thuật, Notion, GitHub hoặc trình tạo sơ đồ.

---

## 1. SƠ ĐỒ KIẾN TRÚC TỔNG THỂ HỆ THỐNG (5-LAYER AI-NATIVE ARCHITECTURE)

Sơ đồ này thể hiện cách 5 tầng kiến trúc (Presentation, Application, Domain Guardrails, AI Core, Infrastructure) liên kết một chiều và đặt **AI Engine** làm trung tâm điều phối nghiệp vụ.

```mermaid
flowchart TB
    %% ==================== 1. PRESENTATION LAYER ====================
    subgraph L1_Presentation ["1. PRESENTATION LAYER (Next.js 15 App Router + React 19)"]
        direction LR
        subgraph UI_Screens ["8 Màn hình Nghiệp vụ & Role Switcher"]
            MH1["MH1: Login & Role Switcher\n(/login)"]
            MH2["MH2: Dashboard Giáo viên\n(/teacher)"]
            MH3["MH3: Form Tạo Kế hoạch 1-Click\n(/teacher/create)"]
            MH4["MH4: Chi tiết Giáo án & Duyệt\n(/teacher/plan/[id])"]
            MH5["MH5: Checklist Đánh giá 30s\n(/teacher/assess/[id])"]
            MH6["MH6: Quản lý Thẻ PH & Thống kê\n(/teacher/parent-cards)"]
            MH7["MH7: Giao diện Mobile Phụ huynh\n(/parent/[token])"]
            MH8["MH8: Dashboard Ban Giám hiệu\n(/principal)"]
        end
        subgraph Client_State ["Client Hooks & State"]
            H_Stream["Vercel AI SDK (useObject)\nHTTP SSE Streaming"]
            H_RT["useRealtimeFeedback\n(Supabase WebSocket)"]
            Z_Store["Zustand Store + LocalStorage\n(Debounced Auto-save 500ms)"]
        end
    end

    %% ==================== 2. APPLICATION LAYER ====================
    subgraph L2_Application ["2. APPLICATION LAYER (Route Handlers & Service Orchestrators)"]
        direction LR
        subgraph API_Routes ["Next.js API Route Handlers"]
            API_GenPlan["POST /api/ai/generate-lesson"]
            API_Rewrite["POST /api/ai/regenerate-section"]
            API_GenCheck["POST /api/ai/generate-checklist"]
            API_Analyze["POST /api/ai/analyze-behavior"]
            API_GenCard["POST /api/ai/generate-parent-card"]
            API_Feedback["POST /api/feedback"]
            API_Export["GET /api/export/report"]
        end
        subgraph App_Services ["Application Services (src/services/)"]
            S_Plan["LessonPlannerService"]
            S_Assess["AssessmentService"]
            S_Card["ParentCardService"]
            S_Feed["FeedbackService"]
            S_Audit["AuditService"]
        end
    end

    %% ==================== 3. DOMAIN LAYER ====================
    subgraph L3_Domain ["3. DOMAIN LAYER (Schemas, Entities & 7 Business Guardrails)"]
        direction LR
        subgraph Zod_Contracts ["Single Source of Truth (Zod 3.x)"]
            Z_Plan["lesson-plan.schema.ts"]
            Z_Assess["assessment.schema.ts"]
            Z_Card["parent-card.schema.ts"]
            Z_Feed["feedback.schema.ts"]
        end
        subgraph Guardrails_Engine ["Hệ thống Bộ lọc Bảo vệ (src/core/guardrails/)"]
            G_Pre["Pre-check Input Validation\n(BR-001: Status = ai_draft)"]
            G_Safety["safety-guard.ts\n(BR-002: Ràng buộc Thông tư 45)"]
            G_Legal["legal-citation.ts\n(BR-003: Đối chiếu mã VBHN 01)"]
            G_Lang["language-guard.ts\n(BR-004: Cấm từ bệnh lý/dán nhãn)"]
            G_Screen["screen-free-guard.ts\n(BR-005: 100% Không màn hình)"]
            G_Privacy["Privacy Token Guard\n(BR-006: Nghị định 13 & Luật Trẻ em)"]
        end
    end

    %% ==================== 4. AI ENGINE LAYER ====================
    subgraph L4_AI ["4. AI ENGINE LAYER (src/ai/ - Core Intelligence)"]
        direction LR
        AI_Orch["engine.ts (AI Orchestrator)"]
        M_Router["model-router.ts\n• Gemini 2.5 Pro (Temp 0.9 / 0.75 / 0.25)\n• Gemini 2.5 Flash (Temp 0.2 / 0.35)"]
        P_Comp["prompt-composer.ts &\ncreative-enhancer.ts\n(Ẩn dụ đồ vật, Kể chuyện, STEM)"]
        subgraph AI_Tools ["Function / Tool Calling & RAG"]
            T_Legal["search-legal-docs.ts"]
            T_Safety["check-safety-rules.ts"]
            RAG_Pipe["RAG Retriever & Embedder\n(Gemini Vector 768-dim)"]
        end
    end

    %% ==================== 5. INFRASTRUCTURE LAYER ====================
    subgraph L5_Infra ["5. INFRASTRUCTURE LAYER (Prisma 6.x + Supabase + PostgreSQL 16)"]
        direction LR
        Prisma_Repo["Prisma Repositories\n(lesson-plan, student, assessment)"]
        PG_DB[("PostgreSQL 16 Relational DB\n(13 Bảng Nghiệp vụ ACID)")]
        PG_Vec[("pgvector Extension (HNSW)\nKnowledgeChunk:\n• vbhn01 • tt45-safety\n• folklore • stem")]
        Supa_RT["Supabase Auth, Storage &\nRealtime WebSocket Channel"]
    end

    %% ==================== CONNECTIONS ====================
    UI_Screens <--> Client_State
    Client_State <==>|"SSE Stream / REST"| API_Routes
    API_Routes --> App_Services
    App_Services --> Zod_Contracts
    App_Services --> Guardrails_Engine
    Guardrails_Engine --> AI_Orch
    AI_Orch --> M_Router
    AI_Orch --> P_Comp
    AI_Orch --> AI_Tools
    RAG_Pipe <==>|"Cosine Similarity Search"| PG_Vec
    App_Services --> Prisma_Repo
    Prisma_Repo <==>|"Type-safe Queries"| PG_DB
    S_Feed --> Supa_RT
    Supa_RT -.->|"Push Event (<150ms)"| H_RT

```

---

## 2. SƠ ĐỒ CƠ SỞ DỮ LIỆU CHI TIẾT (PHYSICAL DATABASE SCHEMA & JSONB MAPPING)

Sơ đồ dưới đây phản ánh chính xác 100% toàn bộ **13 bảng (Models)**, **4 Enums**, các khóa chính (`PK`), khóa ngoại (`FK`), khóa duy nhất kết hợp (`UK`), kiểu mảng (`String[]`), cấu trúc nội tại của các cột `Json` và phần mở rộng `vector(768)` trong file `prisma/schema.prisma` của bạn.

```mermaid
erDiagram
    %% ==================== QUAN HỆ GIỮA CÁC BẢNG ====================
    School ||--o{ User : "1 trường có nhiều user (schoolId)"
    School ||--o{ Class : "1 trường có nhiều lớp (schoolId)"
    
    Class ||--o{ ClassTeacher : "phân công (classId)"
    User ||--o{ ClassTeacher : "đứng lớp (teacherId)"
    
    Class ||--o{ Student : "quản lý học sinh (classId)"
    Student ||--o{ StudentParent : "con của (studentId)"
    User ||--o{ StudentParent : "phụ huynh của (parentId)"
    
    Class ||--o{ LessonPlan : "triển khai tại (classId)"
    User ||--o{ LessonPlan : "soạn bởi GV (teacherId)"
    
    LessonPlan ||--o{ PlanVersion : "lưu vết sửa đổi (planId)"
    LessonPlan ||--o{ ObservationChecklist : "sinh tiêu chí (lessonPlanId)"
    LessonPlan ||--o{ ParentCard : "tóm tắt thành (lessonPlanId)"
    
    ObservationChecklist ||--o{ StudentAssessment : "ghi nhận (checklistId)"
    Student ||--o{ StudentAssessment : "được đánh giá (studentId)"
    
    Student ||--o{ BehavioralAlert : "cảnh báo chuỗi tuần (studentId)"
    
    ParentCard ||--o{ ParentFeedback : "nhận phản hồi (cardId)"
    Student ||--o{ ParentFeedback : "cho học sinh (studentId)"
    User ||--o{ ParentFeedback : "gửi bởi PH (parentId)"
    
    User ||--o{ AuditLog : "ghi vết bảo mật (userId)"

    %% ==================== CHI TIẾT TỪNG BẢNG ====================
    School {
        uuid id PK "default(uuid())"
        string name "Tên trường mầm non"
        string address "Nullable"
    }

    User {
        uuid id PK "default(uuid())"
        string fullName "Họ và tên"
        string email UK "Nullable, Unique"
        string phone UK "Nullable, Unique"
        enum role "ENUM: teacher | principal | parent"
        uuid schoolId FK "Ref -> School.id"
        datetime createdAt "default(now())"
    }

    Class {
        uuid id PK "default(uuid())"
        string name "VD: Lớp Mẫu giáo nhỡ B1"
        string ageGroup "24-36m | 3-4y | 4-5y | 5-6y"
        string ageLabel "VD: 4-5 tuổi"
        uuid schoolId FK "Ref -> School.id"
    }

    ClassTeacher {
        uuid classId PK,FK "Composite PK (classId, teacherId)"
        uuid teacherId PK,FK "Ref -> User.id"
        boolean isPrimary "default(false)"
    }

    Student {
        uuid id PK "default(uuid())"
        string fullName "Họ tên bé"
        datetime dateOfBirth "Ngày sinh"
        string gender "Giới tính"
        uuid classId FK "Ref -> Class.id"
        string avatarEmoji "default('👶')"
        datetime createdAt "default(now())"
    }

    StudentParent {
        uuid studentId PK,FK "Composite PK (studentId, parentId)"
        uuid parentId PK,FK "Ref -> User.id"
    }

    LessonPlan {
        uuid id PK "default(uuid())"
        uuid classId FK "Ref -> Class.id"
        uuid teacherId FK "Ref -> User.id"
        enum status "ENUM: ai_draft | needs_review | approved | shared"
        datetime createdAt "default(now())"
        datetime updatedAt "updatedAt"
        datetime approvedAt "Nullable"
        string approvedBy "Nullable"
        string ageGroup "Độ tuổi đầu vào"
        string developmentArea "1 trong 5 mảng GDMN"
        boolean stemEnabled "default(false)"
        boolean folkGameEnabled "default(false)"
        string topic "Chủ đề bài học"
        int duration "15 | 20 | 25 | 30 (phút)"
        string space "Trong lớp | Ngoài sân"
        string_array materials "String[] - Mảng vật liệu tái chế"
        string classNotes "Nullable"
        string gameName "Tên trò chơi AI sinh"
        jsonb legalReference "JSON: {documentCode, section, summary, isVerified}"
        jsonb safetyWarnings "JSON[]: [{level, material, description, ruleRef}]"
        string_array objectives "String[] - Mục tiêu 3 phần"
        string_array preparation "String[] - Đồ dùng 100% Screen-Free"
        jsonb procedure "JSON[]: [{phase, title, duration, instructions, teacherTip}]"
        string teacherScript "Lời dẫn mẫu truyền cảm hứng"
        string_array flashcardPrompts "String[] - Ý tưởng thẻ in ấn A4"
        string_array observationCriteria "String[] - 3-5 tiêu chí quan sát"
    }

    PlanVersion {
        uuid id PK "default(uuid())"
        uuid planId FK "Ref -> LessonPlan.id"
        int versionNumber "Số thứ tự phiên bản"
        string editedBy "Người sửa"
        datetime editedAt "default(now())"
        string sectionEdited "objectives | procedure | safety"
        string changeDescription "Mô tả thay đổi"
        string contentSnapshot "Bản lưu nội dung"
    }

    ObservationChecklist {
        uuid id PK "default(uuid())"
        uuid lessonPlanId FK "Ref -> LessonPlan.id"
        uuid classId "ID lớp học"
        datetime date "Ngày quan sát"
        string_array criteria "String[] - Danh sách tiêu chí"
        datetime savedAt "Nullable"
    }

    StudentAssessment {
        uuid id PK "default(uuid())"
        uuid checklistId FK,UK "Unique(checklistId, studentId)"
        uuid studentId FK,UK "Ref -> Student.id"
        enum overallRating "ENUM: excellent | achieved | needs_practice"
        jsonb ratings "JSON: Record<criterionIndex, AssessmentRating>"
        string note "Ghi chú khách quan (Nullable)"
    }

    BehavioralAlert {
        uuid id PK "default(uuid())"
        uuid studentId FK "Ref -> Student.id"
        string pattern "VD: Ngại giao tiếp nhóm"
        int weekCount "Số tuần lặp lại liên tiếp (>= 3)"
        string skillArea "Mảng kỹ năng"
        string suggestedActivity "Kịch bản trò chơi điều chỉnh 1-1"
        string disclaimer "default('Đây không phải chẩn đoán y khoa...')"
        datetime createdAt "default(now())"
    }

    ParentCard {
        uuid id PK "default(uuid())"
        uuid lessonPlanId FK "Ref -> LessonPlan.id"
        uuid classId "ID lớp học"
        datetime date "Ngày gửi"
        string status "draft | sent"
        jsonb content "JSON: {greeting, classSummary, missionTitle, duration, eqQuestions, adultRole}"
    }

    ParentFeedback {
        uuid id PK "default(uuid())"
        uuid cardId FK,UK "Unique(cardId, studentId)"
        uuid studentId FK,UK "Ref -> Student.id"
        uuid parentId FK "Ref -> User.id"
        enum response "ENUM: completed | needs_practice"
        string message "Lời nhắn của PH (Nullable)"
        datetime respondedAt "default(now())"
    }

    AuditLog {
        uuid id PK "default(uuid())"
        uuid userId FK "Ref -> User.id"
        string action "login | approve_plan | export_report | access_denied"
        string target "Đối tượng tác động (Nullable)"
        string details "Chi tiết log (Nullable)"
        datetime timestamp "default(now())"
    }

    KnowledgeChunk {
        uuid id PK "default(uuid()) - Bảng độc lập phục vụ RAG"
        string collection "INDEX: vbhn01 | tt45-safety | folklore | stem"
        string content "Nội dung điều khoản (~500 tokens)"
        vector_768 embedding "Unsupported('vector(768)') - HNSW Cosine Index"
        jsonb metadata "JSON: {source, page, ageGroup, article}"
        datetime createdAt "default(now())"
    }

```

---

## 3. SƠ ĐỒ PIPELINE AI ENGINE, MODEL ROUTER, RAG & GUARDRAILS

Sơ đồ này mô tả chi tiết luồng xử lý bên trong thư mục `src/ai/` và `src/core/guardrails/`, giải thích cách hệ thống kết hợp **RAG (`pgvector`)**, **Định tuyến mô hình (Model Router)** và **Bộ lọc an toàn 2 đầu (Pre-check & Post-check Guardrails)**.

```mermaid
flowchart LR
    %% INPUT
    Input["👩‍🏫 Input từ Giáo viên\n(Tuổi, Mảng GDMN, Chủ đề,\nVật liệu, STEM/Dân gian)"] --> PreGuard

    %% PRE-CHECK GUARDRAILS
    subgraph PreGuard ["Tầng 1: Pre-Check Guardrails"]
        V_Input["Kiểm tra đủ trường bắt buộc\n(ERR-INPUT-01)"]
        V_AgeMat["Kiểm tra chéo Tuổi x Vật liệu\n(VD: 24-36 tháng cảnh báo vật nhỏ)"]
        V_Input --> V_AgeMat
    end

    %% RAG PIPELINE
    PreGuard --> RAG_Step
    subgraph RAG_Step ["Tầng 2: RAG Pipeline (src/ai/rag/)"]
        Embed["embedder.ts\n(Gemini Embedding 768-dim)"]
        VecDB[("KnowledgeChunk\n(pgvector HNSW)")]
        TopK["retriever.ts (Cosine Similarity)\n• Top-5 đoạn VBHN 01/VBHN-BGDĐT\n• Top-3 quy tắc an toàn TT 45/2021\n• Gợi ý Đồng dao / STEM"]
        Embed --> VecDB --> TopK
    end

    %% PROMPT COMPOSER & CREATIVE ENHANCER
    RAG_Step --> Composer
    subgraph Composer ["Tầng 3: Prompt as Code (src/ai/prompts/)"]
        SysID["SYSTEM_IDENTITY\n(Cố vấn Sư phạm 20 năm, Screen-Free)"]
        Creative["creative-enhancer.ts\n1. Ẩn dụ đồ vật (Hộp sữa -> Xe buýt)\n2. Kể chuyện nhập vai (Storytelling)\n3. Tích hợp STEM & Dân gian"]
        SysID --> Creative
    end

    %% MODEL ROUTER
    Composer --> Router
    subgraph Router ["Tầng 4: Model Router (src/ai/model-router.ts)"]
        direction TB
        R_Pro1["Gemini 2.5 Pro (Temp: 0.90)\nSoạn Giáo án & Kịch bản Trò chơi"]
        R_Pro2["Gemini 2.5 Pro (Temp: 0.75)\nViết lại từng phần (Section Rewrite)"]
        R_Pro3["Gemini 2.5 Pro (Temp: 0.25)\nPhân tích Chuỗi Hành vi (>= 3 tuần)"]
        R_Flash1["Gemini 2.5 Flash (Temp: 0.20)\nRút trích 3-5 Tiêu chí Checklist"]
        R_Flash2["Gemini 2.5 Flash (Temp: 0.35)\nTóm tắt Thẻ Nhiệm vụ 5 Phút (<1s)"]
    end

    %% POST-CHECK GUARDRAILS
    Router --> PostGuard
    subgraph PostGuard ["Tầng 5: Post-Check Sanitizer & Zod Contract"]
        ZodParse["Zod Schema Enforcement\n(Output.object)"]
        G_BR002["BR-002: safety-guard.ts\n(Bắt buộc có khối safetyWarnings)"]
        G_BR003["BR-003: legal-citation.ts\n(Khớp mã văn bản VBHN 01)"]
        G_BR004["BR-004: language-guard.ts\n(Quét & xóa từ bệnh lý/tự kỷ/tăng động)"]
        G_BR005["BR-005: screen-free-guard.ts\n(Cấm thiết bị điện tử cho trẻ)"]
        ZodParse --> G_BR002 --> G_BR003 --> G_BR004 --> G_BR005
    end

    %% OUTPUT
    PostGuard --> StreamOut["⚡ HTTP SSE Stream (useObject)\nLưu DB với status = 'ai_draft' (BR-001)"]

```

---

## 4. SƠ ĐỒ MÁY TRẠNG THÁI VÒNG ĐỜI BÀI HỌC & KIỂM SOÁT QUYỀN (STATE MACHINE)

Sơ đồ này đảm bảo quy tắc **Human-in-the-Loop (BR-001)**: Mọi dữ liệu AI sinh ra không bao giờ được tự động gửi tới phụ huynh nếu chưa qua bước phê duyệt của con người.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> ai_draft : AI sinh bản nháp mới\n(POST /api/ai/generate-lesson)

    state "ai_draft (Bản nháp AI - Nhãn Xám)" as ai_draft {
        [*] --> DangChinhSua
        DangChinhSua --> DangChinhSua : GV sửa trực tiếp hoặc gọi AI viết lại đoạn\n(Ghi thêm bản ghi vào bảng PlanVersion)\n[Auto-save 500ms - BR-007]
    }

    ai_draft --> needs_review : GV bấm "Gửi BGH duyệt"\nhoặc BGH bấm "Yêu cầu sửa lại"
    
    state "needs_review (Cần rà soát - Nhãn Vàng)" as needs_review {
        [*] --> ChoRasoát
        ChoRasoát --> CapNhatTheoGopY : GV chỉnh sửa theo ghi chú BGH
    }

    ai_draft --> approved : GV / BGH bấm "✅ Phê duyệt kế hoạch"\n(Cập nhật approvedAt, approvedBy + Ghi AuditLog)
    needs_review --> approved : BGH bấm "✅ Phê duyệt"

    state "approved (Đã duyệt - Nhãn Xanh Lá)" as approved {
        [*] --> SanSangDay
        SanSangDay --> TaoChecklist : Tự động sinh ObservationChecklist (3-5 tiêu chí)
        TaoChecklist --> DanhGiaCuoiNgay : GV tích chọn 30s (StudentAssessment)
        DanhGiaCuoiNgay --> KiemTraChuoi : Nếu >= 3 tuần 'needs_practice' -> Sinh BehavioralAlert
        DanhGiaCuoiNgay --> NhapThePH : AI sinh ParentCard (status = 'draft')
    }

    approved --> shared : GV duyệt Thẻ 5 phút & Bấm "Gửi Zalo/Web"\n(ParentCard.status = 'sent')

    state "shared (Đã chia sẻ - Nhãn Xanh Dương)" as shared {
        [*] --> ChoPhanHoiPH
        ChoPhanHoiPH --> DongBoRealtime : PH bấm 1-Click -> Lưu ParentFeedback\n-> Bắn WebSocket cập nhật % lớp
    }

    note right of ai_draft
        🚫 CHẶN PHÁT HÀNH (ERR-FLOW-01):
        Khi đang ở trạng thái ai_draft hoặc needs_review,
        hệ thống khóa hoàn toàn chức năng gửi Phụ huynh.
    end note

```

---

## 5. SƠ ĐỒ ĐIỀU HƯỚNG 8 MÀN HÌNH & KIỂM SOÁT TRUY CẬP (RBAC & NAVIGATION MAP)

Sơ đồ này thể hiện luồng di chuyển giữa 8 màn hình trong Next.js App Router và cơ chế chặn truy cập trái phép theo **Nghị định 13/2023/NĐ-CP (BR-006)**.

```mermaid
flowchart TD
    Start(("Người dùng truy cập")) --> MH1["Màn hình 1: Đăng nhập & Role Switcher Demo\nRoute: /login"]

    %% PHÂN LUỒNG THEO VAI TRÒ
    MH1 -->|"Role = teacher"| MH2["Màn hình 2: Dashboard Giáo viên\nRoute: /teacher\n• 3 nút hành động lớn\n• Danh sách bài học theo màu Status\n• Thông báo nhanh % PH & Gợi ý quan sát sâu"]
    MH1 -->|"Role = principal"| MH8["Màn hình 8: Dashboard Ban Giám hiệu\nRoute: /principal\n• 4 KPI Cards toàn trường\n• Biểu đồ 5 mảng GDMN (Recharts)\n• Duyệt giáo án các lớp\n• Xuất Báo cáo Kiểm định PDF & Xem AuditLog"]
    MH1 -->|"Role = parent (Link Zalo)"| TokenCheck{"Kiểm tra Token & Quyền\n(BR-006: Nghị định 13)"}

    %% LUỒNG GIÁO VIÊN
    MH2 -->|"Bấm ➕ Tạo kế hoạch"| MH3["Màn hình 3: Form Tạo Kế hoạch 1-Click\nRoute: /teacher/create\n• Chọn Tuổi, Mảng GDMN, STEM/Dân gian\n• Chọn Chủ đề, Thời lượng, Không gian, Vật liệu"]
    MH3 -->|"Bấm ✨ Tạo bản nháp bằng AI\n(Streaming SSE)"| MH4["Màn hình 4: Chi tiết Giáo án & Phê duyệt\nRoute: /teacher/plan/[id]\n• Hộp Pháp lý VBHN 01\n• Hộp An toàn Thông tư 45\n• Giáo án 3 phần + Lời dẫn (Inline Edit)\n• In học liệu Flashcard A4"]
    MH2 -->|"Chọn bài học có sẵn"| MH4
    MH4 -->|"Bấm ✅ Phê duyệt &\nTạo Checklist"| MH5["Màn hình 5: Checklist Đánh giá 30s\nRoute: /teacher/assess/[id]\n• Nút 'Đánh dấu tất cả Đã đạt'\n• Tích chọn: 🌟 Tốt / ✅ Đã đạt / 🌱 Cần rèn thêm\n• Hộp Gợi ý quan sát sâu (BehavioralAlert)"]
    MH2 -->|"Bấm 📋 Ghi nhận quan sát"| MH5
    MH5 -->|"Bấm Lưu minh chứng &\nTạo Thẻ 5 phút"| MH6["Màn hình 6: Quản lý Thẻ PH & Thống kê\nRoute: /teacher/parent-cards\n• Duyệt nội dung Thẻ 5 phút & Copy link Zalo\n• Biểu đồ tròn % hoàn thành Real-time\n• Danh sách lọc các bé 'Cần rèn thêm'"]
    MH2 -->|"Bấm 👨‍👩‍👧 Soạn nội dung PH"| MH6

    %% LUỒNG PHỤ HUYNH & BẢO MẬT
    TokenCheck -->|"Hợp lệ (Đúng con mình)"| MH7["Màn hình 7: Giao diện Mobile Phụ huynh\nRoute: /parent/[token]\n• Tóm tắt bài học trên lớp\n• Thẻ Nhiệm vụ 5 phút + Câu hỏi EQ\n• 2 nút 1-Click: [✅ Đã hoàn thành] / [🌱 Cần rèn thêm]"]
    TokenCheck -->|"Sửa URL xem bé khác\n(ERR-AUTH-01)"| AccessDenied["🚫 Màn hình Từ chối Truy cập\nGhi ngay vào bảng AuditLog\n(action = 'access_denied')"]

    %% REALTIME SYNC
    MH7 ===>|"WebSocket (<150ms)\nCập nhật tức thì không cần F5"| MH6
    MH4 -.->|"Gửi duyệt cấp trường"| MH8

```

---

## 6. SƠ ĐỒ TUẦN TỰ XỬ LÝ LỖI, PHÂN TÍCH HÀNH VI 3 TUẦN & ĐỒNG BỘ REALTIME

Sơ đồ Sequence này làm rõ 2 luồng kỹ thuật phức tạp nhất trong bản đặc tả của bạn: **Thuật toán phát hiện chuỗi hành vi lặp lại 3 tuần (AI Behavioral Analytics)** và **Đồng bộ phản hồi thời gian thực qua Supabase WebSocket**.

```mermaid
sequenceDiagram
    autonumber
    actor GV as 👩‍🏫 Giáo viên
    participant MH5 as 📋 MH5: Checklist 30s
    participant API as ⚙️ Assessment & Card API
    participant Guard as 🛡️ Language Guard (BR-004)
    participant AI as 🧠 Gemini 2.5 Pro/Flash
    participant DB as 🗄️ PostgreSQL (Prisma)
    participant RT as ⚡ Supabase Realtime
    participant MH6 as 📊 MH6: Thống kê GV
    participant MH7 as 📱 MH7: Mobile Phụ huynh

    %% LUỒNG 1: ĐÁNH GIÁ 30 GIÂY & PHÁT HIỆN CHUỖI HÀNH VI 3 TUẦN
    rect rgb(235, 248, 242)
        Note over GV,DB: LUỒNG A: ĐÁNH GIÁ 30 GIÂY & AI PHÂN TÍCH CHUỖI HÀNH VI NHIỀU TUẦN
        GV->>MH5: Bấm "⚡ Đánh dấu tất cả Đã đạt", chỉnh riêng bé Gia Huy = "🌱 Cần rèn thêm"
        GV->>MH5: Bấm "💾 Lưu hồ sơ minh chứng"
        MH5->>API: POST /api/ai/analyze-behavior (checklistId, assessments)
        API->>DB: Upsert bảng StudentAssessment & Cập nhật ObservationChecklist.savedAt
        API->>DB: Truy vấn lịch sử đánh giá 3 tuần gần nhất của từng học sinh
        DB-->>API: Phát hiện bé Trần Gia Huy có 3 tuần liên tiếp = 'needs_practice' (Giao tiếp nhóm)
        API->>AI: Gọi Gemini 2.5 Pro (Temp 0.25) phân tích chuỗi hành vi & đề xuất trò chơi 1-1
        AI-->>Guard: Trả về bản nháp cảnh báo & gợi ý hoạt động điều chỉnh
        Guard->>Guard: Quét từ cấm (tự kỷ, tăng động, bệnh lý...) & gắn Disclaimer bắt buộc
        Guard->>DB: Lưu bản ghi vào bảng BehavioralAlert (weekCount = 3)
        DB-->>MH5: Hiển thị thẻ vàng "Gợi ý quan sát sâu cho bé Trần Gia Huy" + "Trò chơi Cặp đôi tí hon"
    end

    %% LUỒNG 2: TẠO THẺ PHỤ HUYNH & ĐỒNG BỘ REALTIME 1-CLICK
    rect rgb(254, 249, 231)
        Note over GV,MH7: LUỒNG B: THẺ NHIỆM VỤ 5 PHÚT & ĐỒNG BỘ REAL-TIME 2 CHIỀU (<150ms)
        GV->>MH5: Bấm "➡️ Tạo Thẻ hoạt động 5 phút gửi Phụ huynh"
        MH5->>API: POST /api/ai/generate-parent-card
        API->>AI: Gọi Gemini 2.5 Flash (Temp 0.35) tóm tắt bài học & tạo 2 câu hỏi EQ
        AI-->>MH6: Hiển thị bản nháp Thẻ 5 phút trên Màn hình 6
        GV->>MH6: Rà soát & Bấm "✅ Duyệt & Gửi qua Zalo/Web"
        MH6->>DB: Cập nhật ParentCard (status='sent') & LessonPlan (status='shared')
        
        MH7->>DB: Phụ huynh mở link /parent/[token] (Kiểm tra khớp StudentParent)
        DB-->>MH7: Hiển thị đúng Thẻ 5 phút của bé
        MH7->>API: Phụ huynh chạm nút 1-Click: [✅ Bé đã hoàn thành] (POST /api/feedback)
        API->>DB: Upsert vào bảng ParentFeedback (response = 'completed')
        DB-)RT: Trigger Postgres Changes Event trên bảng ParentFeedback
        RT--)MH6: Push WebSocket payload tới trình duyệt của Cô giáo
        MH6->>MH6: Tự động nhảy tăng % hoàn thành của lớp & cập nhật danh sách (Không cần F5)
    end

```

