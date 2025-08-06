import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import dayjs from "dayjs";

function KioskPage() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const handleCheckIn = async () => {
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("phone", phone)
      .single();

    if (studentError || !student) {
      setMessage("❌ 학생 정보를 찾을 수 없습니다.");
      return;
    }

    const today = dayjs().format("YYYY-MM-DD");

    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("*")
      .eq("student_id", student.id)
      .eq("date", today);

    if (lessonsError || !lessons || lessons.length === 0) {
      setMessage("❌ 오늘 수업이 없습니다.");
      return;
    }

    const now = dayjs();
    const nowStr = now.format("HH:mm");

    const updates = lessons.map((lesson) => {
      if (lesson.type === "독해") {
        const endTimeStr = now.add(1, "hour").add(30, "minute").format("HH:mm");
        return supabase
          .from("lessons")
          .update({
            status: "출석",
            checkin_time: `${nowStr} - ${endTimeStr}`,
          })
          .eq("id", lesson.id);
      }

      if (lesson.type === "일대일") {
        const testTimeStr = lesson.test_time?.trim();
        const testDateTime = testTimeStr
          ? dayjs(`${lesson.date} ${testTimeStr}`)
          : null;

        if (!testDateTime || !testDateTime.isValid()) {
          return supabase
            .from("lessons")
            .update({
              status: "출석",
              checkin_time: nowStr,
              late_minutes: null,
              on_time: null,
            })
            .eq("id", lesson.id);
        }

        const diff = now.diff(testDateTime, "minute");
        const isLate = diff > 0;

        return supabase
          .from("lessons")
          .update({
            status: "출석",
            checkin_time: nowStr,
            late_minutes: isLate ? diff : 0,
            on_time: !isLate,
          })
          .eq("id", lesson.id);
      }

      // 그 외 수업 타입에 대해선 기본 출석 처리
      return supabase
        .from("lessons")
        .update({
          status: "출석",
          checkin_time: nowStr,
        })
        .eq("id", lesson.id);
    });

    try {
      await Promise.all(updates);
      setMessage(`✅ ${student.name}님 오늘 ${lessons.length}개 수업 출석 처리되었습니다.`);
    } catch (err) {
      console.error(err);
      setMessage("❌ 출석 처리 중 오류 발생");
    }

    setPhone("");
  };

  return (
    <div
      style={{
        backgroundColor: "#eef3f9",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          textAlign: "center",
          width: "320px",
        }}
      >
        <h1
          style={{
            marginBottom: "24px",
            color: "#245ea8",
            fontSize: "20px",
            fontWeight: "bold",
          }}
        >
          📱 출석 체크
        </h1>
        <input
          type="text"
          placeholder="전화번호 입력"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            marginBottom: "12px",
            padding: "10px",
            fontSize: "16px",
            border: "1px solid #ccc",
            borderRadius: "6px",
          }}
        />
        <button
          onClick={handleCheckIn}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#245ea8",
            color: "white",
            fontWeight: "bold",
            fontSize: "16px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          출석
        </button>
        {message && (
          <div
            style={{
              marginTop: "12px",
              color: message.startsWith("✅") ? "green" : "red",
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default KioskPage;
