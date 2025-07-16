import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { supabase } from "../utils/supabaseClient";
import weekday from "dayjs/plugin/weekday";
import isoWeek from "dayjs/plugin/isoWeek";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import "dayjs/locale/ko";

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.extend(isSameOrBefore);
dayjs.locale("ko");

const WEEKDAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

export default function StudentTodoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [startDate, setStartDate] = useState(() =>
    localStorage.getItem("todoStartDate") || dayjs().format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState(() =>
    localStorage.getItem("todoEndDate") ||
    dayjs().add(7, "day").format("YYYY-MM-DD")
  );
  const [todos, setTodos] = useState({});
  const [memos, setMemos] = useState({});
  const [newTodos, setNewTodos] = useState({});
  const [message, setMessage] = useState("");

  const [lectures, setLectures] = useState([]);
  const [selectedLectures, setSelectedLectures] = useState([]);
  const [selectedLectureId, setSelectedLectureId] = useState("");
  const [lectureLessonRange, setLectureLessonRange] = useState("");

  const [copied, setCopied] = useState(false); // 복사 알림

  useEffect(() => {
    localStorage.setItem("todoStartDate", startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem("todoEndDate", endDate);
  }, [endDate]);

  useEffect(() => {
    fetchStudent();
    fetchLectureCategories();
  }, [id]);

  useEffect(() => {
    fetchTodos();
    fetchMemos();
  }, [startDate, endDate, id]);

  const fetchStudent = async () => {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();
    setStudent(data);
  };

  const fetchTodos = async () => {
    const { data } = await supabase
      .from("todos")
      .select("*")
      .eq("student_id", id)
      .gte("date", startDate)
      .lte("date", endDate);

    const grouped = {};
    data.forEach((todo) => {
      if (!grouped[todo.date]) grouped[todo.date] = [];
      grouped[todo.date].push(todo);
    });
    setTodos(grouped);
  };

  const fetchMemos = async () => {
    const { data } = await supabase
      .from("memos")
      .select("*")
      .eq("student_id", id)
      .gte("date", startDate)
      .lte("date", endDate);

    const memoData = {};
    data.forEach((memo) => {
      memoData[memo.date] = memo.content;
    });
    setMemos(memoData);
  };

  const fetchLectureCategories = async () => {
    const { data, error } = await supabase
      .from("lecture_categories")
      .select("*, lessons:lecture_lessons(*)")
      .order("name");

    if (error) {
      console.error("강의 카테고리 불러오기 오류:", error.message);
      return;
    }
    setLectures(data);
  };

  const getDatesInRange = () => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    if (start.isAfter(end)) return [];

    const dates = [];
    let current = start;
    while (current.isSameOrBefore(end)) {
      dates.push(current.format("YYYY-MM-DD"));
      current = current.add(1, "day");
    }
    return dates;
  };

  const addTodo = async (date) => {
    const content = newTodos[date]?.trim();
    if (!content) return;
    await supabase.from("todos").insert([{ student_id: id, date, content }]);
    setNewTodos((prev) => ({ ...prev, [date]: "" }));
    fetchTodos();
  };

  const toggleDone = async (todo) => {
    await supabase.from("todos").update({ done: !todo.done }).eq("id", todo.id);
    fetchTodos();
  };

  const deleteTodo = async (todo) => {
    await supabase.from("todos").delete().eq("id", todo.id);
    fetchTodos();
  };

  const saveMemo = async (date) => {
    const content = memos[date] || "";
    await supabase.from("memos").upsert({ student_id: id, date, content });
    fetchMemos();
  };

  const handleAddLecture = () => {
    if (!selectedLectureId || !lectureLessonRange.trim()) {
      alert("강의를 선택하고 범위를 입력하세요.");
      return;
    }

    const lecture = lectures.find((l) => l.id === selectedLectureId);
    if (!lecture) {
      alert("선택한 강의를 찾을 수 없습니다.");
      return;
    }

    const ranges = lectureLessonRange
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part !== "");

    const selectedNumbers = new Set();
    ranges.forEach((range) => {
      if (range.includes("-")) {
        const [start, end] = range.split("-").map((n) => parseInt(n, 10));
        for (let i = start; i <= end; i++) {
          selectedNumbers.add(`${i}강`);
        }
      } else {
        selectedNumbers.add(`${range}강`);
      }
    });

    const lessonsToAdd = lecture.lessons.filter(
      (lesson) =>
        selectedNumbers.has(lesson.lesson_number) &&
        !selectedLectures.some((sel) => sel.id === lesson.id)
    );

    if (lessonsToAdd.length === 0) {
      alert("선택한 범위에 추가할 강의가 없습니다.");
      return;
    }

    setSelectedLectures((prev) => [
      ...prev,
      ...lessonsToAdd.map((l) => ({
        id: l.id,
        category: lecture.name,
        lessonNumber: l.lesson_number,
        link: l.link,
      })),
    ]);

    setLectureLessonRange("");
  };

  const handleRemoveLecture = (lessonId) => {
    setSelectedLectures((prev) => prev.filter((l) => l.id !== lessonId));
  };

  const generateMessage = () => {
    let msg = `[${student?.name}학생 다음 한주간 할 일🔥]\n\n`;

    const dates = getDatesInRange();
    dates.forEach((d) => {
      if (todos[d]?.length > 0) {
        const weekday = WEEKDAYS_KR[dayjs(d).day()];
        const mmdd = dayjs(d).format("MM/DD");
        msg += `${weekday} (${mmdd})\n`;
        todos[d].forEach((t) => {
          msg += `- ${t.content}\n`;
        });
        msg += "\n";
      }
    });

    if (selectedLectures.length > 0) {
      msg += `[강의목록]\n`;
      selectedLectures.forEach((l) => {
        msg += `${l.lessonNumber} ${l.link}\n`;
      });
      msg += "\n";
    }

    msg += `[단어시험]\n`;
    msg += `▶단어시험 보는 날 전까지 다 외워오기!\n60문제, -3컷\n\n`;

    msg += `▼공부방법▼\n`;
    msg += `① 단어는 매일 조금씩 공부하는 게 가장 효율적입니다.\n`;
    msg += `② 강의수강 시 필기는 3색볼펜+형광펜 활용\n`;
    msg += `③ 강의 듣는 건 기본 + 필기한 부분 다시 공부하는 시간 필수!`;

    setMessage(msg);
  };

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "1rem" }}>
        ← 뒤로가기
      </button>
      <h2>{student?.name} 학생 할일 관리</h2>
      <div style={{ marginBottom: "1rem" }}>
        시작일:{" "}
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        종료일:{" "}
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {/* 할일 목록 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        {getDatesInRange().map((date) => (
          <div
            key={date}
            style={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            <strong>{dayjs(date).format("MM/DD (dd)")}</strong>
            <ul style={{ paddingLeft: "1rem" }}>
              {(todos[date] || []).map((todo) => (
                <li
                  key={todo.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <span>
                    <input
                      type="checkbox"
                      checked={todo.done}
                      onChange={() => toggleDone(todo)}
                    />{" "}
                    {todo.content}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "red",
                      cursor: "pointer",
                    }}
                  >
                    ❌
                  </button>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: "0.5rem" }}>
              <input
                type="text"
                value={newTodos[date] || ""}
                onChange={(e) =>
                  setNewTodos((prev) => ({ ...prev, [date]: e.target.value }))
                }
                placeholder="할일 추가"
                style={{ width: "100%" }}
              />
              <button onClick={() => addTodo(date)} style={{ marginTop: "4px" }}>
                추가
              </button>
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              메모: <br />
              <textarea
                value={memos[date] || ""}
                onChange={(e) =>
                  setMemos((prev) => ({ ...prev, [date]: e.target.value }))
                }
                onBlur={() => saveMemo(date)}
                rows={3}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 강의 태그형 UI */}
      <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h3>📚 강의 선택</h3>
        <select
          value={selectedLectureId}
          onChange={(e) => setSelectedLectureId(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        >
          <option value="">강의 선택</option>
          {lectures.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="몇강? (예: 1-3,5)"
          value={lectureLessonRange}
          onChange={(e) => setLectureLessonRange(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <button onClick={handleAddLecture}>추가</button>
        <div style={{ marginTop: "0.5rem" }}>
          {selectedLectures.map((l) => (
            <span
              key={l.id}
              style={{
                display: "inline-block",
                background: "#245ea8",
                color: "#fff",
                padding: "4px 8px",
                borderRadius: "12px",
                margin: "2px",
                fontSize: "12px",
              }}
            >
              {l.category} {l.lessonNumber}
              <button
                onClick={() => handleRemoveLecture(l.id)}
                style={{
                  marginLeft: "4px",
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                ✖
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* 자동 메시지 생성 */}
      <div style={{ marginTop: "2rem" }}>
        <h3>📋 자동 메시지 생성</h3>
        <button onClick={generateMessage}>메시지 생성</button>
        <button onClick={copyMessage} style={{ marginLeft: "8px" }}>
          복사하기
        </button>
        {copied && <span style={{ color: "green", marginLeft: "1rem" }}>복사됨 ✅</span>}
        <pre
          style={{
            whiteSpace: "pre-wrap",
            marginTop: "1rem",
            background: "#f8f8f8",
            padding: "1rem",
            borderRadius: "8px",
          }}
        >
          {message}
        </pre>
      </div>
    </div>
  );
}
