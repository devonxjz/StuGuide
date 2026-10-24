import type { Db } from "../prisma";
import { hashPassword } from "@/server/password";
import { CHUYEN_XE_PARENT_CARD, CHUYEN_XE_TINH_BAN } from "@/core/samples/chuyen-xe-tinh-ban";
import type { LessonPlanOutput } from "@/core/schemas/lesson-plan.schema";
import type { AssessmentRating } from "@/core/constants/status";

const DAY = 24 * 3600 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

/** ID cố định để link demo ổn định giữa các lần seed. */
/** Mật khẩu của các tài khoản dữ liệu mẫu (chỉ để thử nghiệm; mỗi tài khoản được băm với salt riêng). */
export const DEMO_PASSWORD = "stuguide";

export const DEMO_IDS = {
  schoolId: "demo-school",
  classId: "demo-class-b1",
  class2Id: "demo-class-a2",
  teacherId: "demo-teacher-lan",
  teacher2Id: "demo-teacher-thu",
  principalId: "demo-principal-minh",
} as const;

const STUDENTS = [
  { name: "Trần Gia Huy", gender: "Nam", emoji: "🐻", parent: "Chị Trần Thị Mai" },
  { name: "Nguyễn Minh Anh", gender: "Nữ", emoji: "🐰", parent: "Anh Nguyễn Văn Hải" },
  { name: "Lê Bảo Châu", gender: "Nữ", emoji: "🦋", parent: "Chị Lê Thu Hà" },
  { name: "Phạm Gia Bảo", gender: "Nam", emoji: "🐯", parent: "Anh Phạm Quốc Việt" },
  { name: "Hoàng Thảo Nguyên", gender: "Nữ", emoji: "🌼", parent: "Chị Hoàng Thị Lý" },
  { name: "Vũ Đức Khang", gender: "Nam", emoji: "🦖", parent: "Anh Vũ Đức Long" },
  { name: "Đặng Khánh Linh", gender: "Nữ", emoji: "🐱", parent: "Chị Đặng Ngọc Bích" },
  { name: "Bùi Tuấn Kiệt", gender: "Nam", emoji: "🚀", parent: "Anh Bùi Tuấn Anh" },
] as const;

const GROUP_NOTES = [
  "Bé ngồi chơi một mình ở góc, chưa chủ động nói chuyện rủ bạn chơi cùng.",
  "Bé đứng quan sát các bạn, khi cô mời vào chơi thì chỉ gật đầu không nói.",
  "Bé chịu nắm tay bạn khi được cô dắt, nhưng chưa tự tin giao tiếp.",
];

const OTHER_PLAN: LessonPlanOutput = {
  ...CHUYEN_XE_TINH_BAN,
  gameName: "Rồng rắn lên mây – Chuyến tàu hơi nước",
  legalReference: {
    ...CHUYEN_XE_TINH_BAN.legalReference,
    relevantSection: "Mục tiêu Phát triển Thể chất – Trẻ mẫu giáo 5–6 tuổi",
    summary: "Trẻ phối hợp vận động nhịp nhàng, tuân theo luật chơi của trò chơi dân gian.",
  },
  teacherScript:
    "Rồng rắn lên mây, có cây núc nắc… Hôm nay đoàn tàu hơi nước của chúng mình sẽ chở những bó lúa vàng về làng, các con nắm áo nhau thật chắc nhé!",
};

const GARDEN_PLAN: LessonPlanOutput = {
  ...CHUYEN_XE_TINH_BAN,
  gameName: "Khu vườn bí ẩn – Thám tử nhí và tấm bản đồ lá",
  legalReference: {
    ...CHUYEN_XE_TINH_BAN.legalReference,
    relevantSection: "Mục tiêu Phát triển Nhận thức – Trẻ mẫu giáo 4–5 tuổi",
    summary: "Trẻ quan sát, so sánh và phân loại đối tượng theo một hoặc hai dấu hiệu.",
  },
  preparation: ["Lá cây khô đã rửa sạch, phơi khô", "Giấy màu A4", "Bút sáp màu"],
  teacherScript:
    "Các thám tử nhí ơi, cô vừa nhặt được những tấm bản đồ bí ẩn từ khu vườn cổ! Nhưng bản đồ bị mờ rồi, chúng mình dùng bút sáp tô nhẹ lên lá để hiện ra hoa văn bí mật nhé!",
};

async function reset(db: Db) {
  await db.parentFeedback.deleteMany();
  await db.parentToken.deleteMany();
  await db.parentCard.deleteMany();
  await db.studentAssessment.deleteMany();
  await db.observationChecklist.deleteMany();
  await db.behavioralAlert.deleteMany();
  await db.planVersion.deleteMany();
  await db.lessonPlan.deleteMany();
  await db.chatMessage.deleteMany();
  await db.conversation.deleteMany();
  await db.teacherMemory.deleteMany();
  await db.auditLog.deleteMany();
  await db.childMemory.deleteMany();
  await db.learningSession.deleteMany();
  await db.studentParent.deleteMany();
  await db.student.deleteMany();
  await db.classTeacher.deleteMany();
  await db.class.deleteMany();
  await db.user.deleteMany();
  await db.school.deleteMany();
}

function planData(content: LessonPlanOutput, extra: Record<string, unknown>) {
  return {
    classId: DEMO_IDS.classId,
    teacherId: DEMO_IDS.teacherId,
    ageGroup: "4-5y",
    developmentArea: "social-emotional",
    stemEnabled: true,
    folkGameEnabled: false,
    topic: "Bản thân & Tình bạn",
    duration: 20,
    space: "indoor",
    materials: ["Vỏ hộp sữa tươi", "Rổ nhựa", "Bóng nhựa nhỏ"],
    gameName: content.gameName,
    legalReference: content.legalReference,
    safetyWarnings: content.safetyWarnings,
    objectives: content.objectives,
    preparation: content.preparation,
    procedure: content.procedure,
    teacherScript: content.teacherScript,
    flashcardPrompts: content.flashcards,
    observationCriteria: content.observationCriteria,
    eqQuestions: content.eqQuestions,
    guardViolations: [],
    ...extra,
  };
}

export async function seedDemoData(db: Db) {
  await reset(db);

  await db.school.create({ data: { id: DEMO_IDS.schoolId, name: "Trường Mầm non Hoa Mai", address: "Quận Cầu Giấy, Hà Nội" } });
  await db.user.createMany({
    data: [
      { id: DEMO_IDS.teacherId, fullName: "Cô Nguyễn Thị Lan", email: "lan@hoamai.edu.vn", role: "teacher", schoolId: DEMO_IDS.schoolId, passwordHash: hashPassword(DEMO_PASSWORD) },
      { id: DEMO_IDS.teacher2Id, fullName: "Cô Phạm Thị Thu", email: "thu@hoamai.edu.vn", role: "teacher", schoolId: DEMO_IDS.schoolId, passwordHash: hashPassword(DEMO_PASSWORD) },
      { id: DEMO_IDS.principalId, fullName: "Cô Lê Hồng Minh", email: "minh@hoamai.edu.vn", role: "principal", schoolId: DEMO_IDS.schoolId, passwordHash: hashPassword(DEMO_PASSWORD) },
    ],
  });
  await db.class.createMany({
    data: [
      { id: DEMO_IDS.classId, name: "Lớp MG nhỡ B1", ageGroup: "4-5y", ageLabel: "4–5 tuổi", schoolId: DEMO_IDS.schoolId },
      { id: DEMO_IDS.class2Id, name: "Lớp MG lớn A2", ageGroup: "5-6y", ageLabel: "5–6 tuổi", schoolId: DEMO_IDS.schoolId },
    ],
  });
  await db.classTeacher.createMany({
    data: [
      { classId: DEMO_IDS.classId, teacherId: DEMO_IDS.teacherId, isPrimary: true },
      { classId: DEMO_IDS.class2Id, teacherId: DEMO_IDS.teacher2Id, isPrimary: true },
    ],
  });

  // Học sinh + phụ huynh (mỗi bé một phụ huynh)
  const studentIds: string[] = [];
  const parentIds: string[] = [];
  for (const [i, s] of STUDENTS.entries()) {
    const studentId = `demo-student-${i + 1}`;
    const parentId = `demo-parent-${i + 1}`;
    await db.user.create({
      data: { id: parentId, fullName: s.parent, phone: `09000000${String(i + 1).padStart(2, "0")}`, role: "parent", schoolId: DEMO_IDS.schoolId, passwordHash: hashPassword(DEMO_PASSWORD) },
    });
    await db.student.create({
      data: { id: studentId, fullName: s.name, dateOfBirth: new Date(2021, i, 10 + i), gender: s.gender, classId: DEMO_IDS.classId, avatarEmoji: s.emoji },
    });
    await db.studentParent.create({ data: { studentId, parentId } });
    studentIds.push(studentId);
    parentIds.push(parentId);
  }
  const huyId = studentIds[0];
  await db.childMemory.createMany({
    data: [
      { studentId: huyId, source: "parent", authorId: parentIds[0], content: "Bé thích xe cứu hỏa và chơi xếp hình bằng hộp giấy" },
      { studentId: huyId, source: "parent", authorId: parentIds[0], content: "Bé thích chơi cùng một bạn thân hơn là chơi nhóm đông" },
    ],
  });
  // Phụ huynh của Gia Huy đã đồng ý chia sẻ hồ sơ với cô (các bé khác mặc định chưa chia sẻ)
  await db.student.update({ where: { id: huyId }, data: { profileSharedWithTeacher: true, profileSharedAt: new Date(), profileSharedBy: parentIds[0] } });

  // 3 buổi gần nhất, cùng thứ trong tuần => 3 tuần liên tiếp (spec 18.2)
  const weeks = [
    { daysAgo: 15, area: "cognitive", title: "Xây tháp hộp sữa", plan: { ...CHUYEN_XE_TINH_BAN, gameName: "Xây tháp hộp sữa – Tòa tháp kỳ lân" } },
    { daysAgo: 8, area: "physical", title: "Kéo co mini", plan: { ...CHUYEN_XE_TINH_BAN, gameName: "Kéo co mini – Đội kéo thuyền" } },
    { daysAgo: 1, area: "social-emotional", title: "Chuyến xe tình bạn", plan: CHUYEN_XE_TINH_BAN },
  ];

  let sharedPlanId = "";
  let cardId = "";
  for (const [wi, w] of weeks.entries()) {
    const plan = await db.lessonPlan.create({
      data: planData(w.plan, {
        status: "shared",
        developmentArea: w.area,
        createdAt: daysAgo(w.daysAgo + 1),
        approvedAt: daysAgo(w.daysAgo + 1),
        approvedBy: DEMO_IDS.teacherId,
      }),
    });
    const checklist = await db.observationChecklist.create({
      data: {
        lessonPlanId: plan.id,
        classId: DEMO_IDS.classId,
        date: daysAgo(w.daysAgo),
        savedAt: daysAgo(w.daysAgo),
        criteria: w.plan.observationCriteria,
      },
    });
    for (const [si, studentId] of studentIds.entries()) {
      const isHuy = studentId === huyId;
      const overall: AssessmentRating = isHuy ? "needs_practice" : si % 3 === 0 ? "excellent" : "achieved";
      await db.studentAssessment.create({
        data: {
          checklistId: checklist.id,
          studentId,
          overallRating: overall,
          ratings: Object.fromEntries(w.plan.observationCriteria.map((_, ci) => [String(ci), isHuy && ci === 0 ? "needs_practice" : overall === "needs_practice" ? "achieved" : overall])),
          note: isHuy ? GROUP_NOTES[wi] : null,
        },
      });
    }

    if (wi === weeks.length - 1) {
      sharedPlanId = plan.id;
      const card = await db.parentCard.create({
        data: { lessonPlanId: plan.id, classId: DEMO_IDS.classId, date: daysAgo(1), status: "sent", content: CHUYEN_XE_PARENT_CARD },
      });
      cardId = card.id;
    }
  }

  // Thẻ đã gửi: token riêng + một số phụ huynh đã phản hồi (6/8)
  const tokens: Record<string, string> = {};
  for (const [i, studentId] of studentIds.entries()) {
    const token = `demo-token-${i + 1}`;
    tokens[studentId] = token;
    await db.parentToken.create({ data: { token, cardId, studentId, parentId: parentIds[i] } });
  }
  for (const i of [1, 2, 3, 4, 5]) {
    await db.parentFeedback.create({ data: { cardId, studentId: studentIds[i], parentId: parentIds[i], response: "completed" } });
  }
  await db.parentFeedback.create({
    data: { cardId, studentId: studentIds[6], parentId: parentIds[6], response: "needs_practice", message: "Bé hơi ngại kể lại, mai mẹ thử lại ạ." },
  });

  await db.behavioralAlert.create({
    data: {
      studentId: huyId,
      pattern: "Có biểu hiện ngập ngừng trong giao tiếp nhóm qua 3 tuần liên tiếp",
      weekCount: 3,
      skillArea: "Kỹ năng giao tiếp nhóm",
      suggestedActivity:
        "Trò chơi \"Cặp đôi tí hon\": cô ghép Gia Huy với một bạn thân thiện để cùng xếp và chuyển hộp sữa, mỗi lượt chỉ cần trao đổi một câu ngắn.",
    },
  });

  // Bản nháp AI hôm nay (lớp B1) và bản chờ BGH duyệt (lớp A2)
  const draft = await db.lessonPlan.create({
    data: planData(GARDEN_PLAN, {
      status: "ai_draft",
      developmentArea: "cognitive",
      topic: "Thế giới thực vật",
      materials: ["Lá cây khô", "Giấy màu"],
    }),
  });
  const review = await db.lessonPlan.create({
    data: planData(OTHER_PLAN, {
      classId: DEMO_IDS.class2Id,
      teacherId: DEMO_IDS.teacher2Id,
      status: "needs_review",
      ageGroup: "5-6y",
      developmentArea: "physical",
      folkGameEnabled: true,
      stemEnabled: false,
      topic: "Giao thông",
    }),
  });

  await db.auditLog.createMany({
    data: [
      { userId: DEMO_IDS.teacherId, action: "login", details: "Đăng nhập vai Giáo viên" },
      { userId: DEMO_IDS.teacherId, action: "approve_plan", target: sharedPlanId },
      { userId: DEMO_IDS.principalId, action: "login", details: "Đăng nhập vai Ban giám hiệu" },
    ],
  });

  return {
    ...DEMO_IDS,
    studentIds,
    parentIds,
    huyId,
    huyParentId: parentIds[0],
    otherStudentId: studentIds[1],
    sharedPlanId,
    draftPlanId: draft.id,
    reviewPlanId: review.id,
    cardId,
    tokens,
  };
}

export type SeedIds = Awaited<ReturnType<typeof seedDemoData>>;
