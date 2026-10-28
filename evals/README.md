# Eval chất lượng AI (giáo án mầm non tiếng Việt)

Đo chất lượng đầu ra AI theo thời gian để đổi prompt/model/rubric có số liệu thay vì cảm tính.

## Cấu trúc

- `cases/lesson-plan.json` — 30 case: đầu vào giống form soạn giáo án + kỳ vọng dạng checklist.
- `baseline.json` — điểm từng case của lần chạy chuẩn (được commit).
- `lib/` — logic thuần (kiểm tra case, chấm điểm, so baseline), có unit test ở `tests/unit/evals/`.
- `run.ts` — script chạy với engine thật (cần `OPENAI_API_KEY`, tốn API).

## Cách chấm

Điểm một case = tỉ lệ đạt trên (các tiêu chí của `lessonPlanRubric`, gồm bộ chấm AI + kiểm tra tất định) + (kỳ vọng riêng của case).
Kỳ vọng riêng là kiểm tra từ khóa: `mention` (phải nhắc tới ít nhất một từ) hoặc `avoid` (không được xuất hiện).
Lỗi hạ tầng (API lỗi, bộ chấm không chạy) KHÔNG tính là điểm thấp: run báo lỗi và không so sánh/ghi baseline.

## Lệnh

| Lệnh | Việc |
| --- | --- |
| `npm run eval` | Chạy đủ 30 case, so với baseline |
| `npm run eval:light` | Mẫu 6 case (lấy đều, tất định) — dùng cho CI |
| `npm run eval:baseline` | Chạy đủ và GHI ĐÈ `baseline.json` |
| `npm run eval -- --threshold 0.05` | Đổi ngưỡng giảm điểm cho phép (mặc định 0.03) |

Run **fail** (exit 1) khi: điểm trung bình giảm quá ngưỡng, hoặc số vi phạm bắt buộc tăng so với baseline (trên cùng các case đã chạy).

## Khi nào cập nhật baseline

Chỉ khi chủ động chấp nhận mức chất lượng mới (đổi model, đổi rubric có chủ đích). Xem diff `baseline.json` trong PR.

## CI

`.github/workflows/ci.yml` job `eval-light` chạy khi PR đụng `src/ai/`, `src/core/guardrails/` hoặc `evals/`, và chỉ bật khi đặt biến repo `EVAL_ENABLED=true` cùng secret `OPENAI_API_KEY`.
