import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";
import { useNavigate } from "react-router-dom";

dayjs.extend(weekday);
dayjs.extend(isoWeek);

const styles = {
  container: {
    backgroundColor: '#eef3f9',
    minHeight: '100vh',
    padding: '20px',
  },
  title: {
    color: '#245ea8',
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  calendar: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  weekButton: {
    padding: '8px 16px',
    margin: '0 8px',
    backgroundColor: '#245ea8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
  },
  th: {
    backgroundColor: '#f0f4f8',
    color: '#333',
    padding: '10px',
    border: '1px solid #ddd',
  },
  td: {
    padding: '10px',
    border: '1px solid #ddd',
    textAlign: 'center',
  },
  button: {
    padding: '6px 12px',
    backgroundColor: '#245ea8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  memoInput: {
    width: '100%',
    padding: '4px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  saveButton: {
    marginTop: '4px',
    backgroundColor: '#5cb85c',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

function ReadingClassPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [lessonsByDay, setLessonsByDay] = useState({});
  const [memoStates, setMemoStates] = useState({});

  const fetchLessons = async () => {
    const startOfWeek = selectedDate.startOf("week").add(1, "day");
    const endOfWeek = startOfWeek.add(6, "day");

    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("*, students(name)")
      .eq("type", "독해")
      .gte("date", startOfWeek.format("YYYY-MM-DD"))
      .lte("date", endOfWeek.format("YYYY-MM-DD"))
      .order("time", { ascending: true });

    if (error) {
      console.error("수업 불러오기 오류:", error);
    } else {
      const grouped = {};
      lessons.forEach((lesson) => {
        const day = dayjs(lesson.date).format("ddd");
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(lesson);
      });
      setLessonsByDay(grouped);

      const memoMap = {};
      lessons.forEach((lesson) => {
        memoMap[lesson.id] = lesson.memo || "";
      });
      setMemoStates(memoMap);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [selectedDate]);

  const handleAttendance = async (lessonId, checkinTime) => {
    const startTime = dayjs(checkinTime, "HH:mm");
    const endTime = startTime.add(1, "hour").add(30, "minute");

    await supabase
      .from("lessons")
      .update({
        status: "출석",
        checkin_time: startTime.format("HH:mm"),
        end_time: endTime.format("HH:mm"),
      })
      .eq("id", lessonId);

    fetchLessons();
  };

  const handleMemoSave = async (lessonId) => {
    await supabase
      .from("lessons")
      .update({ memo: memoStates[lessonId] })
      .eq("id", lessonId);

    fetchLessons();
  };

  const handleReset = async (lessonId) => {
    await supabase
      .from("lessons")
      .update({
        status: null,
        checkin_time: null,
        end_time: null,
      })
      .eq("id", lessonId);

    fetchLessons();
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📖 독해수업관리</h1>

      {/* 주 선택 */}
      <div style={styles.calendar}>
        <button
          style={styles.weekButton}
          onClick={() => setSelectedDate(selectedDate.subtract(1, "week"))}
        >
          ◀ 이전주
        </button>
        <span style={{ lineHeight: "32px", fontWeight: "bold" }}>
          {selectedDate.startOf("week").add(1, "day").format("YYYY.MM.DD")} ~{" "}
          {selectedDate.endOf("week").add(1, "day").format("YYYY.MM.DD")}
        </span>
        <button
          style={styles.weekButton}
          onClick={() => setSelectedDate(selectedDate.add(1, "week"))}
        >
          다음주 ▶
        </button>
      </div>

      {/* 요일별 표 */}
      {Object.keys(lessonsByDay).length === 0 ? (
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          이번 주 독해수업이 없습니다.
        </p>
      ) : (
        Object.entries(lessonsByDay).map(([day, lessons]) => (
          <div key={day}>
            <h2 style={{ ...styles.title, fontSize: "18px" }}>{day}</h2>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>학생명</th>
                  <th style={styles.th}>시간</th>
                  <th style={styles.th}>상태</th>
                  <th style={styles.th}>출결</th>
                  <th style={styles.th}>메모</th>
                  <th style={styles.th}>초기화</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => (
                  <tr
                    key={lesson.id}
                    style={{
                      backgroundColor: lesson.is_makeup
                        ? "#fff9c4"
                        : "transparent",
                    }}
                  >
                    <td style={styles.td}>{lesson.students.name}</td>
                    <td style={styles.td}>{lesson.time}</td>
                    <td style={styles.td}>{lesson.status || "미처리"}</td>
                    <td style={styles.td}>
                      <input
                        type="time"
                        onChange={(e) =>
                          handleAttendance(lesson.id, e.target.value)
                        }
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="text"
                        placeholder="메모 입력"
                        value={memoStates[lesson.id]}
                        onChange={(e) =>
                          setMemoStates({
                            ...memoStates,
                            [lesson.id]: e.target.value,
                          })
                        }
                        style={styles.memoInput}
                      />
                      <button
                        style={styles.saveButton}
                        onClick={() => handleMemoSave(lesson.id)}
                      >
                        저장
                      </button>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.button}
                        onClick={() => handleReset(lesson.id)}
                      >
                        초기화
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

export default ReadingClassPage;
