// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Composer } from "@/components/teacher/chat/composer";
import { MIN_RECORD_MS } from "@/hooks/use-voice-recorder";
import { attachmentToText } from "@/lib/attachments";

/** MediaRecorder giả: test điều khiển lúc dừng và dữ liệu thu được. */
class FakeRecorder {
  static last: FakeRecorder | null = null;
  static isTypeSupported = (t: string) => t === "audio/webm;codecs=opus";
  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(
    public stream: MediaStream,
    public options: { mimeType?: string; audioBitsPerSecond?: number },
  ) {
    this.mimeType = options.mimeType ?? "";
    FakeRecorder.last = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob([new Uint8Array(3000)], { type: this.mimeType }) });
    this.onstop?.();
  }
}

const track = { stop: vi.fn() };
const getUserMedia = vi.fn();
const fetchMock = vi.fn();

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  localStorage.clear();
  FakeRecorder.last = null;
  track.stop.mockClear();
  getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [track] });
  fetchMock.mockReset();
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "mediaDevices");
});

/** Bấm mic, để "ghi" đủ lâu rồi bấm dừng */
async function recordFor(user: ReturnType<typeof userEvent.setup>, ms = MIN_RECORD_MS + 400) {
  await user.click(screen.getAllByRole("button", { name: "Nói để nhập" })[0]);
  await waitFor(() => expect(FakeRecorder.last?.state).toBe("recording"));
  await act(async () => {
    vi.setSystemTime(Date.now() + ms);
  });
  await user.click(screen.getAllByRole("button", { name: "Dừng ghi âm" })[0]);
}

describe("Composer – ghi âm và Whisper", () => {
  it("ô trống: nút tròn là nút ghi âm; ghi → dừng → gửi lên /api/chat/transcribe → chèn chữ vào ô", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    fetchMock.mockResolvedValue(jsonResponse({ text: "Soạn trò chơi với bóng" }));
    render(<Composer onSend={vi.fn()} busy={false} />);
    expect(screen.queryByRole("button", { name: "Gửi" })).not.toBeInTheDocument();

    await recordFor(user);

    // định dạng/bitrate gọn cho giọng nói; micro được tắt ngay sau khi dừng
    expect(FakeRecorder.last?.options).toEqual({ mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 32000 });
    expect(track.stop).toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: expect.objectContaining({ noiseSuppression: true, echoCancellation: true }) });

    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("Soạn trò chơi với bóng"));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/chat/transcribe");
    const file = (init.body as FormData).get("file") as File;
    expect(file.name).toBe("voice.webm");
    expect(file.size).toBe(3000);
    // có chữ → nút tròn thành nút gửi
    expect(screen.getByRole("button", { name: "Gửi" })).toBeEnabled();
  });

  it("nói tiếp thì nối vào chữ đang có", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    fetchMock.mockResolvedValue(jsonResponse({ text: "cho lớp lá" }));
    render(<Composer onSend={vi.fn()} busy={false} />);
    await user.type(screen.getByRole("textbox"), "Soạn giáo án");
    await recordFor(user);
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("Soạn giáo án cho lớp lá"));
  });

  it("đang ghi hiện trạng thái đỏ + placeholder; đang chuyển chữ khóa nút và hiện đang xử lý", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let finish!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (finish = r)));
    render(<Composer onSend={vi.fn()} busy={false} />);

    await user.click(screen.getAllByRole("button", { name: "Nói để nhập" })[0]);
    await waitFor(() => expect(screen.getByPlaceholderText(/Đang nghe/)).toBeInTheDocument());
    expect(screen.getAllByRole("button", { name: "Dừng ghi âm" })[0]).toHaveAttribute("aria-pressed", "true");

    await act(async () => vi.setSystemTime(Date.now() + 2000));
    await user.click(screen.getAllByRole("button", { name: "Dừng ghi âm" })[0]);
    expect(await screen.findByPlaceholderText(/Đang chuyển giọng nói/)).toBeInTheDocument();
    for (const b of screen.getAllByRole("button", { name: "Nói để nhập" })) expect(b).toBeDisabled();

    await act(async () => finish(jsonResponse({ text: "xong" })));
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("xong"));
  });

  it("bấm nhầm (ghi quá ngắn) thì bỏ qua, không gọi server", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Composer onSend={vi.fn()} busy={false} />);
    await recordFor(user, 50);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Dừng ghi âm" })).not.toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("Whisper không nghe ra chữ → báo cô nói lại; lỗi server → hiện đúng lời server", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Composer onSend={vi.fn()} busy={false} />);

    fetchMock.mockResolvedValueOnce(jsonResponse({ text: "" }));
    await recordFor(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("chưa nghe rõ");

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: "ERR-STT-01", message: "Không chuyển được giọng nói thành chữ, cô thử nói lại giúp mình nhé" } }, 502));
    await recordFor(user);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Không chuyển được giọng nói"));
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("micro bị từ chối quyền / không có micro → hướng dẫn rõ ràng, không treo ở trạng thái ghi", async () => {
    const user = userEvent.setup();
    render(<Composer onSend={vi.fn()} busy={false} />);

    getUserMedia.mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"));
    await user.click(screen.getAllByRole("button", { name: "Nói để nhập" })[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Chưa cho phép dùng micro");

    getUserMedia.mockRejectedValueOnce(new DOMException("none", "NotFoundError"));
    await user.click(screen.getAllByRole("button", { name: "Nói để nhập" })[0]);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Không tìm thấy micro"));

    getUserMedia.mockRejectedValueOnce(new Error("lạ"));
    await user.click(screen.getAllByRole("button", { name: "Nói để nhập" })[0]);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Không mở được micro"));
    expect(screen.queryByRole("button", { name: "Dừng ghi âm" })).not.toBeInTheDocument();
  });

  it("gỡ component khi đang ghi thì dừng micro và không gửi gì lên server", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Composer onSend={vi.fn()} busy={false} />);
    await user.click(screen.getAllByRole("button", { name: "Nói để nhập" })[0]);
    await waitFor(() => expect(FakeRecorder.last?.state).toBe("recording"));
    unmount();
    expect(track.stop).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gửi tin khi đang ghi thì dừng ghi", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} busy={false} />);
    await user.type(screen.getByRole("textbox"), "Xin chào");
    await user.click(screen.getAllByRole("button", { name: "Nói để nhập" })[0]);
    await waitFor(() => expect(FakeRecorder.last?.state).toBe("recording"));
    await user.click(screen.getByRole("button", { name: "Gửi" }));
    expect(onSend).toHaveBeenCalledWith("Xin chào");
    expect(FakeRecorder.last?.state).toBe("inactive");
  });

  it("trình duyệt không có MediaRecorder: ẩn mic, nút tròn là nút gửi", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    render(<Composer onSend={vi.fn()} busy={false} />);
    expect(screen.queryByRole("button", { name: "Nói để nhập" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi" })).toBeDisabled();
  });
});

describe("Composer – đính kèm tài liệu", () => {
  const pick = async (user: ReturnType<typeof userEvent.setup>, ...files: File[]) => user.upload(screen.getByTestId("file-input"), files);
  const pdf = (name = "ke-hoach.pdf") => new File(["%PDF"], name, { type: "application/pdf" });

  it("nút + mở hộp chọn tệp; chọn tệp → gửi lên /api/chat/attachments → hiện chip tên tệp", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ name: "ke-hoach.pdf", text: "Nội dung", truncated: false, totalChars: 8 }));
    render(<Composer onSend={vi.fn()} busy={false} />);
    const click = vi.spyOn(screen.getByTestId("file-input"), "click");
    await user.click(screen.getByRole("button", { name: "Đính kèm tài liệu" }));
    expect(click).toHaveBeenCalled();

    await pick(user, pdf());
    expect(await screen.findByText("ke-hoach.pdf")).toBeInTheDocument();
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe("/api/chat/attachments");
    expect(screen.getByRole("list", { name: "Tài liệu đính kèm" })).toBeInTheDocument();
  });

  it("gửi kèm tài liệu: onSend nhận văn bản + danh sách tài liệu; ô và chip được dọn", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    fetchMock.mockResolvedValue(jsonResponse({ name: "a.txt", text: "Nội dung A", truncated: false, totalChars: 10 }));
    render(<Composer onSend={onSend} busy={false} />);
    await pick(user, new File(["x"], "a.txt", { type: "text/plain" }));
    await screen.findByText("a.txt");
    await user.type(screen.getByRole("textbox"), "Tóm tắt giúp mình{Enter}");
    expect(onSend).toHaveBeenCalledWith("Tóm tắt giúp mình", [{ name: "a.txt", text: "Nội dung A" }]);
    expect(screen.queryByText("a.txt")).not.toBeInTheDocument();
  });

  it("chỉ gửi tài liệu mà chưa gõ gì: dùng câu mặc định nhờ AI tóm tắt", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    fetchMock.mockResolvedValue(jsonResponse({ name: "a.txt", text: "Nội dung", truncated: false, totalChars: 8 }));
    render(<Composer onSend={onSend} busy={false} />);
    await pick(user, new File(["x"], "a.txt", { type: "text/plain" }));
    await user.click(await screen.findByRole("button", { name: "Gửi" }));
    expect(onSend).toHaveBeenCalledWith(expect.stringContaining("tóm tắt"), [{ name: "a.txt", text: "Nội dung" }]);
  });

  it("gỡ chip; báo khi tài liệu bị cắt bớt", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ name: "dai.pdf", text: "x", truncated: true, totalChars: 99999 }));
    render(<Composer onSend={vi.fn()} busy={false} />);
    await pick(user, pdf("dai.pdf"));
    expect(await screen.findByText(/chỉ đọc phần đầu/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gỡ dai.pdf" }));
    expect(screen.queryByText("dai.pdf")).not.toBeInTheDocument();
  });

  it("server từ chối (định dạng lạ) → hiện lý do, không thêm chip", async () => {
    // Tắt lọc theo `accept` của user-event để mô phỏng người dùng chọn "Tất cả tệp" trong hộp thoại
    const user = userEvent.setup({ applyAccept: false });
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: "ERR-INPUT-01", message: "Chỉ hỗ trợ tệp PDF, Word (.docx), văn bản (.txt, .md, .csv)" } }, 415));
    render(<Composer onSend={vi.fn()} busy={false} />);
    await pick(user, new File(["MZ"], "a.exe"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Chỉ hỗ trợ tệp PDF");
    expect(screen.queryByRole("list", { name: "Tài liệu đính kèm" })).not.toBeInTheDocument();
  });

  it("tối đa 3 tài liệu mỗi tin", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async () => jsonResponse({ name: "t.txt", text: "x", truncated: false, totalChars: 1 }));
    render(<Composer onSend={vi.fn()} busy={false} />);
    await pick(user, pdf("1.pdf"), pdf("2.pdf"), pdf("3.pdf"));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(3));
    expect(screen.getByRole("button", { name: "Đính kèm tài liệu" })).toBeDisabled();

    cleanup();
    render(<Composer onSend={vi.fn()} busy={false} />);
    await pick(user, pdf("1.pdf"), pdf("2.pdf"), pdf("3.pdf"), pdf("4.pdf"));
    expect(await screen.findByRole("alert")).toHaveTextContent("tối đa 3");
  });

  it("đang bận (AI đang trả lời/hết lượt) thì không đính kèm được", () => {
    render(<Composer onSend={vi.fn()} busy />);
    expect(screen.getByRole("button", { name: "Đính kèm tài liệu" })).toBeDisabled();
  });

  it("attachmentToText dùng chung với server: chip lấy được tên từ part đã lưu", () => {
    expect(attachmentToText({ name: "a.txt", text: "x" })).toContain("a.txt");
  });
});
