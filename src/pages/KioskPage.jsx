import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import dayjs from "dayjs";

const styles = {
  container: {
    backgroundColor: '#eef3f9',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    textAlign: 'center',
    width: '320px',
  },
  title: {
    marginBottom: '24px',
    color: '#245ea8',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  input: {
    display: 'block',
    width: '100%',
    marginBottom: '12px',
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '6px',
  },
  button: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#245ea8',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  success: {
    marginTop: '12px',
    color: 'green',
  },
  error: {
    marginTop: '12px',
    color: 'red',
  },
};

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
    const endTime = now.add(1, "hour").add(30, "minute").format("HH:mm");

    const updates = lessons.map((lesson) => {
      if (lesson.type === "독해") {
        return supabase
          .from("lessons")
          .update({
            status: "출석",
            checkin_time: `${nowStr} - ${endTime}`,
          })
          .eq("id", lesson.id);
      } else if (lesson.type === "일대일") {
        // ✅ 테스트시간 기준으로 지각 여부 계산
        if (!lesson.test_time) {
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

        const testTime = dayjs(`${lesson.date} ${lesson.test_time}`);
        if (!testTime.isValid()) {
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

        const diff = now.diff(testTime, "minute");
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
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.title}>📱 출석 체크</h1>
        <input
          type="text"
          placeholder="전화번호 입력"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={styles.input}
        />
        <button onClick={handleCheckIn} style={styles.button}>
          출석
        </button>
        {message && (
          <div
            style={message.startsWith("✅") ? styles.success : styles.error}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default KioskPage;
