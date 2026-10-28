# 🌱 StuGuide — Prototype

Trợ lý AI cho giáo viên mầm non Việt Nam: **chat để soạn kế hoạch & trò chơi**, kiểm tra an toàn/pháp lý, ghi nhận quan sát 30 giây, gửi thẻ 5 phút cho phụ huynh và theo dõi phản hồi **realtime**.
*AI hỗ trợ người lớn – Trẻ học qua trải nghiệm thật (Screen-Free).*

Prototype bám theo `docs/spec.md`, `docs/architecture.md`, `docs/diagram.md`, `docs/tmp.md` (monolith Next.js, 5 tầng, 3 vai trò, 8 màn hình), nhưng **lấy chatbot làm trung tâm**.

## Chạy nhanh

```bash
npm install
cp .env.example .env.local      # bắt buộc điền OPENAI_API_KEY và SESSION_SECRET (≥ 32 ký tự)
npm run setup                   # prisma generate + tạo SQLite + nạp dữ liệu demo
npm run dev                     # http://localhost:3000
```

- **AI luôn là AI thật** (OpenAI qua LangChain). Không có chế độ giả lập; thiếu `OPENAI_API_KEY` thì app báo lỗi rõ ràng. Đổi model qua `OPENAI_CHAT_MODEL`, `OPENAI_FAST_MODEL`, `OPENAI_EMBEDDING_MODEL`. Model được **pin theo snapshot có ngày** (mặc định `gpt-4.1-2025-04-14`, `gpt-4.1-mini-2025-04-14`); nâng version là quyết định có chủ đích: đổi giá trị, chạy `npm run eval` và so với `evals/baseline.json` trước khi merge. Khi model chính lỗi nhà cung cấp (429/5xx/hết quota), chat tự hạ xuống model nhanh và ghi log `llm_fallback`; các task sáng tạo (soạn giáo án, viết lại, phân tích) báo lỗi thân thiện `ERR-AI-01` thay vì lặng lẽ dùng model yếu hơn.
- Đăng nhập bằng mật khẩu ở `/login` (bảng tài khoản bên dưới). Không còn lối vào demo một chạm. Dữ liệu demo chỉ tự nạp khi `NODE_ENV` khác `production`.

## Tài khoản thử nghiệm (mật khẩu chung `stuguide`)

| Vai trò | Tên đăng nhập | Ghi chú |
|---|---|---|
| Giáo viên | `lan@hoamai.edu.vn` | Lớp MG nhỡ B1 |
| Giáo viên | `thu@hoamai.edu.vn` | Lớp MG lớn A2 |
| Ban giám hiệu | `minh@hoamai.edu.vn` | |
| Phụ huynh | `0900000001` … `0900000008` | `…01` là mẹ bé Gia Huy, `…02` là bố bé Minh Anh |

## Kịch bản trình diễn (~5 phút)

| # | Vai | Thao tác | Điểm nhấn |
|---|-----|----------|-----------|
| 1 | Giáo viên | Bấm thẻ **“Tạo Kế hoạch & Trò chơi mới”** (hoặc gõ yêu cầu bằng lời) | Tiến trình THẬT từ server: *Tra cứu VBHN 01 → Kiểm tra TT 45 → Sinh → Chấm theo tiêu chí (→ AI tự sửa nếu chưa đạt)*; thẻ giáo án **Bản nháp AI** với hộp pháp lý + cảnh báo an toàn + danh sách điểm cần cô xem lại |
| 2 | Giáo viên | Nhắn “Viết lại lời dẫn vui hơn” hoặc **Mở chi tiết** → Sửa / AI viết lại từng phần | Lịch sử phiên bản; sửa xong bài đã duyệt phải duyệt lại |
| 3 | Giáo viên | Bấm **Phê duyệt & Tạo checklist** (hoặc nói “phê duyệt” – trợ lý chỉ chuẩn bị thẻ, cô vẫn phải bấm) | Human-in-the-loop: AI không tự duyệt, không tự gửi; còn vi phạm luật bắt buộc (an toàn, screen-free, ngôn ngữ, căn cứ) thì nút duyệt báo lý do và từ chối |
| 4 | Giáo viên | **Ghi nhận quan sát** → ⚡ Đánh dấu tất cả “Đã đạt” → sửa 1 bé → Lưu | Bé Trần Gia Huy có 3 tuần liên tiếp “cần rèn thêm” → thẻ **Gợi ý quan sát sâu** (không chẩn đoán, có disclaimer) |
| 5 | Giáo viên | Nhắn “Soạn thẻ nhiệm vụ 5 phút” → **Duyệt & Gửi** | Link riêng cho từng phụ huynh |
| 6 | Phụ huynh (mobile) | Mở link → **✅ Bé đã hoàn thành** | Máy cô giáo (mở sẵn `/teacher/parent-cards`) **tự nhảy %** không cần F5 |
| 7 | Phụ huynh | Đổi URL `/family/child/<id bé khác>` | 404 + ghi AuditLog `access_denied` |
| 8 | BGH | Duyệt giáo án ở hàng đợi, **Xuất báo cáo kiểm định**, xem nhật ký an ninh | KPI, radar 5 mảng, audit có sự kiện `Truy cập bị từ chối` |
| 9 | Mọi vai | **Đăng xuất** rồi quay lại trang cũ | Phiên bị thu hồi phía server, cookie cũ mất hiệu lực |
| 11 | Phụ huynh (iPad) | Đăng nhập → xem con học gì → **Gợi ý tối nay cho con** → tick bước, chọn phản ứng của bé, ghi chú → đóng tab → mở lại | Gợi ý dùng đúng sở thích đã nhớ của bé; trí nhớ mới chỉ xuất hiện **sau khi đóng tab** ("Mình ghi nhận") |
| 10 | Giáo viên | Nhắn “Nhớ giúp mình: lớp có 2 bé dị ứng đậu phộng”, mở chat mới và nhờ gợi ý món ăn nhẹ | AI tự ghi nhớ dài hạn, áp dụng ở cuộc trò chuyện khác; mở lại cuộc trò chuyện cũ vẫn còn thẻ giáo án với trạng thái mới nhất |



### Cách dùng LangChain và AI SDK

- **LangChain / LangGraph** (`langchain`, `@langchain/core`, `@langchain/openai`, `@langchain/langgraph`):
  - `createAgent` điều phối chatbot, model tự chọn công cụ (`create_lesson_plan`, `approve_plan`, `search_legal_docs`, …).
  - Công cụ tra cứu RAG viết bằng `tool()` + Zod; `withStructuredOutput(zodSchema)` bắt buộc output đúng cấu trúc.
  - `Embeddings` + `VectorStore` của LangChain cho kho tri thức; `fakeModel` của LangChain chỉ dùng trong test.
- **Vercel AI SDK** chỉ làm lớp UI chat: `useChat` + `createUIMessageStream`. Cầu nối `src/ai/stream/agent-to-ui.ts` đổi stream LangGraph thành text-delta (từng từ), `data-status` (bước tiến trình) và `data-card` (thẻ kết quả).

### Trí nhớ & quản lý ngữ cảnh

Chatbot không phụ thuộc vào việc client gửi lại lịch sử. **Server giữ toàn bộ trạng thái hội thoại** (SQLite: `Conversation`, `ChatMessage`, `TeacherMemory`):

| Tầng nhớ | Lưu ở đâu | Cách dùng |
|----------|-----------|-----------|
| Hội thoại đang diễn ra | `ChatMessage` (cả văn bản lẫn thẻ kết quả) | Cửa sổ trượt ≤ 5000 token gửi cho LLM; mỗi thẻ kết quả được tóm gọn thành một dòng có `planId`/`cardId` để AI biết "bài vừa rồi" là bài nào |
| Tóm tắt cuộn | `Conversation.summary` + `summaryUpTo` | Khi phần chưa tóm tắt > 3500 token, model nhanh gộp tin cũ nhất vào bản tóm tắt (còn ≈ 2000 token); chạy nền sau mỗi lượt, có độ trễ để không tóm tắt liên tục; tin bị đẩy khỏi cửa sổ luôn nằm trong phần cần tóm tắt nên không mất thông tin |
| Trí nhớ dài hạn | `TeacherMemory` | Công cụ `save_memory` (AI tự ghi khi cô kể điều bền vững về lớp), tối đa 30 mục, loại trùng, lọc từ dán nhãn trẻ; nạp vào system prompt của **mọi** cuộc trò chuyện; cô xem/thêm/xóa ở cột "Mầm Học AI nhớ về cô" |
| Giáo án đang làm việc | `Conversation.focusPlanId` | AI hiểu "bài này / bài vừa rồi" mà client không cần gửi id |

Quyền sở hữu: cuộc trò chuyện và trí nhớ gắn với từng giáo viên; người khác truy cập bị `403`. Mã: `src/ai/memory/*`, `src/services/conversation.service.ts`.

### Cổng phụ huynh trên iPad & cá nhân hóa từng bé

Đăng nhập (số điện thoại + mật khẩu, hoặc nút demo) cấp **phiên phụ huynh** và vào `/family` (link Zalo theo token `/parent/[token]` vẫn dùng được). **Phụ huynh là người dẫn dắt**: bé không chat với AI và không học trên màn hình, đúng nguyên tắc Screen-Free của spec.

- **Con đang học gì:** bài học đã chia sẻ, mức đạt theo từng mảng phát triển (chỉ từ đánh giá của chính bé, nhãn tích cực "Tốt / Đã đạt / Đang rèn thêm"). Phụ huynh **không** thấy ghi chú của cô và cảnh báo quan sát sâu (tránh dán nhãn).
- **Hồ sơ cá nhân hóa (`ChildMemory`):** sở thích và điều bé hợp, do phụ huynh kể hoặc AI chắt lọc từ phiên dùng ở nhà; tối đa 30 mục, loại trùng, **bỏ hẳn** điều chứa nhãn chẩn đoán, phụ huynh xem/thêm/xóa. Cùng với tuổi, bài học gần đây và mảng bé đang rèn, nó được nạp vào prompt để AI gợi ý **riêng cho đúng bé**.
- **Trợ lý gia đình** (LangChain agent): `suggest_home_activity`, `get_child_progress`, `get_recent_lessons`, `save_child_memory`. Mọi công cụ bị khóa theo bé của phụ huynh đang đăng nhập (BR-006, truy cập sai ghi AuditLog).
- **Bộ nhớ ngắn hạn ở RAM trình duyệt:** hội thoại và thao tác (đánh dấu bước, phản ứng của bé, ghi chú) chỉ nằm trong `ShortTermStore` (RAM) khi đang dùng; server không lưu từng lượt. Khi tab **ẩn hoặc đóng** (`visibilitychange=hidden`, `pagehide`) hoặc rời trang, trình duyệt gửi một lần bằng `sendBeacon` tới `/api/family/sessions`; server ghi `LearningSession` (idempotent theo `sessionId` + `seq`) rồi AI chắt lọc thành `ChildMemory`.
  *Lưu ý:* nếu iPadOS kill tab đột ngột hoặc trình duyệt sập thì phần chưa gửi sẽ mất; vì vậy chuyển app (tab ẩn) cũng được tính là điểm gửi.

**Chia sẻ hồ sơ bé với cô giáo (cần phụ huynh đồng ý):** công tắc "Chia sẻ với cô giáo" ở cổng phụ huynh, **mặc định tắt** cho từng bé, bật/thu hồi có hiệu lực ngay và ghi AuditLog (`share_profile` / `revoke_profile`). Khi bật, trợ lý của cô dùng công cụ `get_child_profile` để đọc các điều đã ghi nhớ về sở thích của bé và thiết kế hoạt động riêng. Cô **không** thấy nội dung trò chuyện hay tóm tắt từng phiên ở nhà. Bé chưa được đồng ý thì AI báo rõ là chưa xem được và không đoán. Dữ liệu mẫu: phụ huynh của Gia Huy đã bật, các bé khác tắt.

### Pipeline bảo mật nhiều lớp

| Lớp | Nơi cài | Làm gì |
|----|---------|--------|
| 1. Proxy (trước app) | `src/proxy.ts`, `server/security/request-guard.ts` | Chặn path traversal/byte NUL, phương thức lạ, CSRF (Origin/Sec-Fetch-Site), body quá lớn hoặc không phải JSON; từ chối sớm request chưa đăng nhập; header bảo mật (CSP, X-Frame-Options, Referrer-Policy, no-store cho API) |
| 2. Route (`route()`) | `server/http.ts`, `server/security/input.ts`, `rate-limit.ts` | Bắt buộc khai báo vai trò; phiên đối chiếu DB (hạn dùng + phiên bản); rate limit theo nhóm (AI 20/phút, đăng nhập theo IP + tài khoản); đếm byte thật; chuẩn hóa Unicode, bỏ ký tự vô hình, chặn prototype pollution; Zod `strictObject` cho params/query/body |
| 3. Service | `services/access.ts` và từng service | Phân quyền theo dữ liệu: lớp (giáo viên), trường (BGH), con mình (phụ huynh); luật nghiệp vụ, cổng phê duyệt |
| 4. Ranh giới AI | `ai/prompts/_shared/untrusted.ts`, `action-tools.ts` | Dữ liệu do người dùng/phụ huynh viết được rào «DỮ LIỆU …» và không được coi là chỉ dẫn; phê duyệt/gửi chỉ qua nút bấm; lượt đã đọc hồ sơ phụ huynh thì chặn `save_memory` |

### AI tự sinh, chỉ bị ràng buộc bởi tiêu chí đánh giá

Prompt không còn khuôn mẫu cố định (cấu trúc câu chuyện 4 hồi, “2–3 hướng”, giá trị mặc định chủ đề/học liệu…). Mỗi tác vụ sinh (giáo án, viết lại phần, checklist, thẻ phụ huynh, hoạt động ở nhà, phân tích hành vi) có một **rubric** trong `src/ai/quality/rubrics.ts`:

1. AI sinh dựa trên bối cảnh thật (trí nhớ của cô, các bài lớp đã học, kho tri thức) và danh sách tiêu chí.
2. Kiểm tra tất định (an toàn theo tuổi, screen-free, ngôn ngữ, căn cứ, thời lượng…) + bộ chấm độc lập bằng mô hình (nhiệt độ 0) chấm các tiêu chí định tính.
3. Chưa đạt → AI tự viết lại theo nhận xét, tối đa `AI_MAX_REVISIONS` vòng (mặc định 2); giữ bản tốt nhất.
4. Còn vi phạm **bắt buộc** → giáo án không phê duyệt được; hoạt động ở nhà không được trả cho phụ huynh.

### Guardrails (đều có unit test)

| Mã | Nội dung | Nơi cài |
|----|----------|---------|
| BR-001 | Mọi nội dung AI là `ai_draft`; phê duyệt/gửi chỉ qua nút bấm của người thật; còn vi phạm bắt buộc thì không duyệt được | `lesson-planner.service.ts` (`blockingIssues`), `action-tools.ts` |
| BR-002 | Suy ra rủi ro bắt buộc theo tuổi × vật liệu và KIỂM TRA cảnh báo do AI viết (không tự chèn nội dung) | `safety-guard.ts`, tiêu chí `an-toan-vat-lieu` |
| BR-003 | Trích dẫn pháp lý phải khớp kho tri thức, nếu không hạ cờ `isVerified` | `legal-citation.ts` |
| BR-004 | Cấm từ chẩn đoán/dán nhãn: là tiêu chí bắt buộc để AI tự sửa; còn sót thì lưới an toàn cuối thay bằng cụm trung lập | `language-guard.ts`, `finalizePlanOutput` |
| BR-005 | Screen-Free: quét hướng dẫn có video/điện thoại/máy tính | `screen-free-guard.ts` |
| BR-006 | Phụ huynh chỉ thấy con mình; giáo viên chỉ lớp mình; BGH chỉ trường mình (fail-closed) + AuditLog | `services/access.ts`, `child-profile.service.ts` |
| BR-007 | Tự lưu nháp 500ms (chat, checklist, sửa giáo án) + cảnh báo `beforeunload` | `hooks/use-auto-save.ts` |

## Kiểm thử (làm theo TDD: test đỏ trước, code sau)

```bash
npm test          # Vitest, không tốn API: guardrails, schema, RAG, services, API, bộ nhớ, component
npm run test:live # Vitest với OpenAI THẬT: RAG, sáng tạo, chat nhiều lượt, trí nhớ, tóm tắt, cá nhân hóa từng bé, chắt lọc phiên
npm run e2e       # Playwright với AI thật: 11 kịch bản 3 vai trò, hội thoại được lưu, luồng iPad của phụ huynh (DB riêng e2e.db)
npm run typecheck && npm run lint
```

- `npm test` dùng *test double* đặt trong `tests/helpers` (engine giả, `fakeModel` của LangChain, embedding băm) để kiểm tra nghiệp vụ nhanh và tất định. Không có mock nào trong `src/`.
- `tests/live` kiểm tra hành vi AI thật theo tiêu chí spec: tên trò chơi gợi hình và khác nhau giữa các lần, ẩn dụ đồ vật, lời dẫn kể chuyện, STEM/dân gian, căn cứ pháp lý được xác minh, không từ dán nhãn, Screen-Free; chat brainstorm trước khi soạn; AI nhớ dị ứng của lớp ở cuộc trò chuyện khác; nhớ lại tin đã bị gộp vào tóm tắt. Vì LLM không tất định, assertion kiểm tra ý nghĩa thay vì chuỗi cố định.

## Khác biệt so với tài liệu & hạn chế (nói rõ khi trình bày)

| Hạng mục | Tài liệu | Prototype | Lên production |
|----------|----------|-----------|----------------|
| AI toolkit | Vercel AI SDK + Gemini | **LangChain agent + OpenAI**, AI SDK cho UI | Đổi model trong `model-router.ts` (Gemini qua `@langchain/google-genai`) |
| CSDL | PostgreSQL + pgvector + Supabase | **SQLite + Prisma 7**, vector store **trong bộ nhớ** | Khôi phục enum/`String[]`/`KnowledgeChunk` trong `schema.prisma`, thay `InMemoryKnowledgeStore` bằng `PGVectorStore` |
| Realtime | Supabase Realtime | **SSE** trong cùng tiến trình (`server/event-bus.ts`) | Giữ interface `FeedbackEvents`, thay bằng Supabase/LISTEN-NOTIFY (cần khi chạy nhiều instance) |
| Supabase | Auth, Realtime, pgvector, Storage | **Chưa cần cho prototype.** Nên nối khi cho phụ huynh dùng thật trên iPad của họ: cần DB online, OTP thật, realtime qua nhiều server; dữ liệu trẻ em cần chọn vùng lưu trữ và có đồng ý của phụ huynh (Nghị định 13) | Nối qua các interface sẵn có (`FeedbackEvents`, repository, `InMemoryKnowledgeStore`) |
| Đăng nhập | Supabase Auth | Mật khẩu scrypt (salt riêng, so sánh thời gian hằng) + cookie phiên ký HMAC có hạn 12 giờ, thu hồi khi đăng xuất; khóa tạm sau 5 lần sai/15 phút; chưa có quên/đổi mật khẩu | Supabase Auth (OTP/magic link); rate limit lưu Redis khi chạy nhiều instance |
| Kho tri thức | VBHN 01, TT 45 … | **Tóm lược minh họa tự soạn** (đánh dấu `isSummary`), không phải trích nguyên văn | Nạp văn bản gốc đã kiểm định rồi chia đoạn + embedding (kho hiện nạp trực tiếp các đoạn soạn sẵn ở `src/data/knowledge-base`) |
| Flashcard | Ảnh do AI minh họa | Emoji do AI chọn theo nội dung + khung tô màu A4 để in | Gắn model sinh ảnh |
| Zalo | Gửi qua Zalo | Sao chép nội dung + link riêng từng bé | Zalo OA API |
| Độ trễ | 2–3 giây | Sinh giáo án thật bằng `gpt-4.1` khoảng 15–20 giây (có stepper; sau 20 giây hiện banner mời gửi lại — ERR-NET-01) | Stream partial object, hoặc dùng model nhanh hơn qua `OPENAI_CHAT_MODEL` |
| Chỉ số BGH | — | Số liệu đo từ DB: giáo án AI/giáo viên (30 ngày), trung vị thời gian soạn → duyệt | Thêm đo thời gian soạn thực tế của giáo viên |
| Dữ liệu trường lớp | — | Dữ liệu mẫu (trường Hoa Mai, lớp B1, bé Gia Huy theo spec mục 18) để trình diễn nghiệp vụ; AI không dùng dữ liệu giả | Dữ liệu thật của trường |

Nội dung trong prototype không thay thế tư vấn chuyên môn hay pháp lý; mọi nội dung AI đều là bản nháp cần giáo viên rà soát.
