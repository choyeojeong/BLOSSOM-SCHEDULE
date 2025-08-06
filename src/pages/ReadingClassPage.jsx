import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";
import { useNavigate } from "react-router-dom";

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.locale("ko");

const weekdaysOrder = ["월", "화", "수", "목", "금", "토"];

function ReadingClassPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [lessonsByDay, setLessonsByDay] = useState({});
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [absentReason, setAbsentReason] = useState("");
  const [makeupDate, setMakeupDate] = useState("");
  const [makeupTime, setMakeupTime] = useState("");

  const [manualStudentName, setManualStudentName] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");

  useEffect(() => {
    fetchLessons();
  }, [selectedDate]);

  const fetchLessons = async () => {
    const startOfWeek = selectedDate.startOf("isoWeek").format("YYYY-MM-DD");
    const endOfWeek = selectedDate.endOf("isoWeek").format("YYYY-MM-DD");

    const { data: lessons, error } = await supabase
      .from("lessons")
      .select(`
        id, date, time, status, checkin_time, memo, absent_reason, is_makeup, makeup_lesson_id, original_lesson_id,
        student_id,
        students (name, school, grade, teacher)
      `)
      .eq("type", "독해")
      .gte("date", startOfWeek)
      .lte("date", endOfWeek)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (error) {
      console.error("❌ 수업 불러오기 오류:", error);
      return;
    }

    const originalLessonIds = lessons
      .filter((l) => l.original_lesson_id)
      .map((l) => l.original_lesson_id);

    const makeupLessonIds = lessons
      .filter((l) => l.makeup_lesson_id)
      .map((l) => l.makeup_lesson_id);

    let originalLessonsMap = {};
    let makeupLessonsMap = {};

    if (originalLessonIds.length > 0) {
      const { data: originalLessons } = await supabase
        .from("lessons")
        .select("id, date, time, absent_reason")
        .in("id", originalLessonIds);

      if (originalLessons) {
        originalLessonsMap = originalLessons.reduce((acc, orig) => {
          acc[orig.id] = orig;
          return acc;
        }, {});
      }
    }

    if (makeupLessonIds.length > 0) {
      const { data: makeupLessons } = await supabase
        .from("lessons")
        .select("id, date, time")
        .in("id", makeupLessonIds);

      if (makeupLessons) {
        makeupLessonsMap = makeupLessons.reduce((acc, makeup) => {
          acc[makeup.id] = makeup;
          return acc;
        }, {});
      }
    }

    const grouped = {};
    for (const lesson of lessons) {
      if (lesson.original_lesson_id && originalLessonsMap[lesson.original_lesson_id]) {
        lesson.original_lesson = originalLessonsMap[lesson.original_lesson_id];
      }
      if (lesson.makeup_lesson_id && makeupLessonsMap[lesson.makeup_lesson_id]) {
        lesson.makeup_lesson = makeupLessonsMap[lesson.makeup_lesson_id];
      }
      if (!lesson.students && lesson.student_id) {
        const { data: studentData } = await supabase
          .from("students")
          .select("name, school, grade, teacher")
          .eq("id", lesson.student_id)
          .single();

        if (studentData) {
          lesson.students = studentData;
        } else {
          lesson.students = { name: "이름없음", school: "학교없음", grade: "-", teacher: "-" };
        }
      }

      const day = dayjs(lesson.date).locale("ko").format("dd");
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(lesson);
    }
    setLessonsByDay(grouped);
  };
  const handleCheckIn = async (lesson) => {
    const now = dayjs();
    const end = now.add(1.5, "hour");
    await supabase
      .from("lessons")
      .update({
        status: "출석",
        checkin_time: `${now.format("HH:mm")} - ${end.format("HH:mm")}`,
      })
      .eq("id", lesson.id);
    fetchLessons();
  };

  const handleAbsentStart = (lesson) => {
    setEditingLessonId(lesson.id);
    setAbsentReason("");
    setMakeupDate("");
    setMakeupTime("");
  };

  const handleAbsentSave = async (lesson) => {
    let makeupLessonId = null;

    if (makeupDate && makeupTime) {
      const { data, error } = await supabase
        .from("lessons")
        .insert({
          student_id: lesson.student_id,
          date: makeupDate,
          time: makeupTime,
          type: "독해",
          is_makeup: true,
          original_lesson_id: lesson.id,
          absent_reason: absentReason,
        })
        .select()
        .single();
      if (!error) makeupLessonId = data.id;
    }

    await supabase
      .from("lessons")
      .update({
        status: "결석",
        absent_reason: absentReason,
        makeup_lesson_id: makeupLessonId,
      })
      .eq("id", lesson.id);

    setEditingLessonId(null);
    fetchLessons();
  };

  const handleReset = async (lesson) => {
    if (lesson.makeup_lesson_id) {
      await supabase.from("lessons").delete().eq("id", lesson.makeup_lesson_id);
    }
    await supabase
      .from("lessons")
      .update({
        status: null,
        checkin_time: null,
        absent_reason: null,
        makeup_lesson_id: null,
        memo: "",
      })
      .eq("id", lesson.id);
    fetchLessons();
  };

  const handleDelete = async (lesson) => {
    if (window.confirm("이 수업을 삭제하시겠습니까?")) {
      await supabase.from("lessons").delete().eq("id", lesson.id);
      fetchLessons();
    }
  };

  const handleMemoChange = async (lessonId, memo) => {
    await supabase.from("lessons").update({ memo }).eq("id", lessonId);
    fetchLessons();
  };

  const handleManualAdd = async () => {
    if (!manualStudentName || !manualDate || !manualTime) {
      alert("학생 이름, 날짜, 시간을 모두 입력해주세요.");
      return;
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("name", manualStudentName.trim())
      .single();

    if (studentError || !student) {
      alert("해당 이름의 학생을 찾을 수 없습니다.");
      return;
    }

    const { error } = await supabase.from("lessons").insert({
      student_id: student.id,
      date: manualDate,
      time: manualTime,
      type: "독해",
      is_makeup: true,
    });

    if (error) {
      alert("보강 수업 추가 중 오류가 발생했습니다.");
      console.error(error);
    } else {
      alert("보강 수업이 추가되었습니다.");
      setManualStudentName("");
      setManualDate("");
      setManualTime("");
      fetchLessons();
    }
  };
  return (
    <div style={{ background: "#eef3f9", minHeight: "100vh", padding: "2rem" }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          backgroundColor: "#ccc",
          color: "#333",
          border: "none",
          borderRadius: "6px",
          padding: "8px 16px",
          marginBottom: "1rem",
          cursor: "pointer",
        }}
      >
        ← 뒤로가기
      </button>

      <h1 style={{ color: "#245ea8", textAlign: "center", marginBottom: "1rem" }}>
        📖 독해수업관리
      </h1>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <button onClick={() => setSelectedDate(selectedDate.subtract(1, "week"))}>
          ◀ 이전주
        </button>
        <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
          {selectedDate.startOf("isoWeek").format("YYYY.MM.DD")} ~{" "}
          {selectedDate.endOf("isoWeek").format("YYYY.MM.DD")}
        </span>
        <button onClick={() => setSelectedDate(selectedDate.add(1, "week"))}>
          다음주 ▶
        </button>
      </div>

      {weekdaysOrder.map((weekday) => (
        <div
          key={weekday}
          style={{
            background: "#fff",
            borderRadius: "8px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            marginBottom: "1.5rem",
            padding: "1rem",
          }}
        >
          <h2 style={{ color: "#245ea8" }}>
            {weekday} (
            {selectedDate
              .startOf("isoWeek")
              .add(weekdaysOrder.indexOf(weekday), "day")
              .format("MM/DD")}
            )
          </h2>
          {lessonsByDay[weekday] && lessonsByDay[weekday].length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#f0f4f8" }}>
                <tr>
                  <th style={thStyle}>번호</th>
                  <th style={thStyle}>시간</th>
                  <th style={thStyle}>이름</th>
                  <th style={thStyle}>학교</th>
                  <th style={thStyle}>학년</th>
                  <th style={thStyle}>선생님</th>
                  <th style={thStyle}>출결</th>
                  <th style={thStyle}>초기화</th>
                  <th style={thStyle}>메모</th>
                  <th style={thStyle}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {lessonsByDay[weekday].map((lesson, index) => (
                  <tr
                    key={lesson.id}
                    style={{
                      textAlign: "center",
                      backgroundColor:
                        lesson.status === "출석"
                          ? "#e3f2fd"
                          : lesson.status === "결석"
                          ? "#ffebee"
                          : lesson.is_makeup
                          ? "#fffde7"
                          : "#f9f9f9",
                    }}
                  >
                    <td style={tdStyle}>{index + 1}</td>
                    <td style={tdStyle}>{lesson.time}</td>
                    <td style={tdStyle}>{lesson.students?.name || "이름없음"}</td>
                    <td style={tdStyle}>{lesson.students?.school || "학교없음"}</td>
                    <td style={tdStyle}>{lesson.students?.grade || "-"}</td>
                    <td style={tdStyle}>{lesson.students?.teacher || "-"}</td>
                    <td style={tdStyle}>
                      {lesson.is_makeup && lesson.original_lesson && (
                        <>
                          <div style={{ fontSize: "0.9rem", color: "#333" }}>
                            원결석일: {dayjs(lesson.original_lesson.date).format("YYYY-MM-DD")}
                          </div>
                          <div style={{ fontSize: "0.9rem", color: "#333" }}>
                            결석사유: {lesson.original_lesson.absent_reason}
                          </div>
                        </>
                      )}
                      {lesson.status === "결석" && lesson.makeup_lesson && (
  <>
    <div style={{ fontSize: "0.9rem", color: "#333" }}>
      결석사유: {lesson.absent_reason}
    </div>
    <div style={{ fontSize: "0.9rem", color: "#333" }}>
      보강일: {dayjs(lesson.makeup_lesson.date).format("YYYY-MM-DD")}{" "}
      {lesson.makeup_lesson.time}
    </div>
  </>
)}
{lesson.status === "결석" && !lesson.makeup_lesson && lesson.absent_reason && (
  <div style={{ fontSize: "0.9rem", color: "#333" }}>
    결석사유: {lesson.absent_reason}
  </div>
)}
{lesson.status === "출석" ? (
  <span>{lesson.checkin_time}</span>
) : lesson.status === "결석" ? (
  <>
    {lesson.makeup_lesson ? (
      <>
        <div style={{ fontSize: "0.9rem", color: "#333" }}>
          결석사유: {lesson.absent_reason}
        </div>
        <div style={{ fontSize: "0.9rem", color: "#333" }}>
          보강일: {dayjs(lesson.makeup_lesson.date).format("YYYY-MM-DD")} {lesson.makeup_lesson.time}
        </div>
      </>
    ) : (
      lesson.absent_reason && (
        <div style={{ fontSize: "0.9rem", color: "#333" }}>
          결석사유: {lesson.absent_reason}
        </div>
      )
    )}
  </>
) : editingLessonId === lesson.id ? (
  <div>
    {/* 결석 사유 + 보강 입력 UI */}
  </div>
) : (
  <>
    <button onClick={() => handleCheckIn(lesson)}>출석</button>
    <button onClick={() => handleAbsentStart(lesson)}>결석</button>
  </>
)}
                    </td>
                    <td style={tdStyle}>
                      <button
                        style={{ ...btnStyle, backgroundColor: "#607d8b" }}
                        onClick={() => handleReset(lesson)}
                      >
                        출결상태초기화
                      </button>
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        defaultValue={lesson.memo || ""}
                        onBlur={(e) => handleMemoChange(lesson.id, e.target.value)}
                        style={{
                          width: "90%",
                          padding: "4px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                        }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <button
                        style={{ ...btnStyle, backgroundColor: "#9e9e9e" }}
                        onClick={() => handleDelete(lesson)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: "#999", textAlign: "center" }}>수업 없음</p>
          )}
        </div>
      ))}

      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          padding: "1rem",
          marginTop: "2rem",
        }}
      >
        <h3 style={{ color: "#245ea8", marginBottom: "1rem" }}>✏️ 보강 수동입력</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <input
            type="text"
            placeholder="학생 이름"
            value={manualStudentName}
            onChange={(e) => setManualStudentName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="date"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="HH:mm"
            value={manualTime}
            onChange={(e) => setManualTime(e.target.value)}
            style={inputStyle}
          />
          <button
            style={{ ...btnStyle, backgroundColor: "#245ea8" }}
            onClick={handleManualAdd}
          >
            보강수업 추가
          </button>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "10px",
  color: "#245ea8",
  fontWeight: "bold",
  borderBottom: "1px solid #ddd",
};

const tdStyle = {
  padding: "8px",
  borderBottom: "1px solid #eee",
};

const btnStyle = {
  color: "#fff",
  border: "none",
  padding: "5px 10px",
  borderRadius: "4px",
  cursor: "pointer",
  margin: "2px",
};

const inputStyle = {
  padding: "8px",
  border: "1px solid #ccc",
  borderRadius: "4px",
  width: "200px",
};

export default ReadingClassPage;
