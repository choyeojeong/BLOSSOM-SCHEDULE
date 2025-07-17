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

    // ✅ 오늘 날짜의 모든 수업 가져오기
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("*")
      .eq("student_id", student.id)
      .eq("date", today);

    if (lessonsError || !lessons || lessons.length === 0) {
      setMessage("❌ 오늘 수업이 없습니다.");
      return;
    }

    const now = dayjs().format("HH:mm");
    const endTime = dayjs().add(1, "hour").add(30, "minute").format("HH:mm");

    // ✅ 모든 수업 출석 처리 (일대일과 독해 구분)
    const updates = lessons.map((lesson) => {
      if (lesson.type === "독해") {
        // ✅ 독해수업: 클릭 시각 +1시간30분 자동 기록
        return supabase
          .from("lessons")
          .update({
            status: "출석",
            checkin_time: `${now} - ${endTime}`, // 시작~끝으로 저장
          })
          .eq("id", lesson.id);
      } else if (lesson.type === "일대일") {
        // 📘 일대일수업: 테스트시간 기준, 시간 변경 없이 출석만 처리
        return supabase
          .from("lessons")
          .update({
            status: "출석",
          })
          .eq("id", lesson.id);
      }
    });

    try {
      await Promise.all(updates);
      setMessage(
        `✅ ${student.name}님 오늘 ${lessons.length}개 수업 출석 처리되었습니다.`
      );
    } catch (err) {
      console.error(err);
      setMessage("❌ 출석 처리 중 오류 발생");
    }

    setPhone(""); // 입력 초기화
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
