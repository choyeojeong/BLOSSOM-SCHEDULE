import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

const styles = {
  container: {
    backgroundColor: "#eef3f9",
    minHeight: "100vh",
    padding: "2rem",
  },
  backButton: {
    backgroundColor: "#ccc",
    color: "#333",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    cursor: "pointer",
    marginBottom: "1rem",
  },
  title: {
    color: "#245ea8",
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "1rem",
    textAlign: "center",
  },
  dateInput: {
    display: "block",
    margin: "0 auto 1rem",
    padding: "8px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "6px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "1rem",
  },
  studentCard: {
    backgroundColor: "white",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "200px",
  },
  studentTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "0.5rem",
    cursor: "pointer", // ✅ 클릭 가능하게 커서 추가
    color: "#245ea8",  // ✅ 강조 색상
  },
  todoList: {
    flexGrow: 1,
    overflowY: "auto",
    marginBottom: "0.5rem",
  },
  todoItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "2px 0",
    borderBottom: "1px solid #eee",
  },
  checkbox: {
    marginRight: "0.5rem",
  },
  deleteButton: {
    background: "transparent",
    border: "none",
    color: "red",
    cursor: "pointer",
  },
};

function TeacherTodoPage() {
  const navigate = useNavigate();
  const selectedTeacher = localStorage.getItem("selectedTeacher");
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD")); // 🗓 기본 오늘

  useEffect(() => {
    if (!selectedTeacher) {
      alert("선생님을 먼저 선택해주세요.");
      navigate("/teacher-select"); // ✅ teacher 값 없으면 선택페이지로 이동
      return;
    }
    fetchTodos(selectedDate);
  }, [selectedDate]); // ✅ 날짜 변경될 때마다 새로 조회

  const fetchTodos = async (date) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("todos")
      .select("id, content, done, teacher, student:student_id (id, name, school, grade)")
      .eq("teacher", selectedTeacher)
      .eq("date", date)
      .not("student_id", "is", null); // ✅ student_id가 null인 데이터 제외

    if (error) {
      console.error("할일 불러오기 오류:", error.message);
      alert("할일을 불러오는 중 오류가 발생했습니다.");
    } else {
      const filteredData = (data || []).filter(
        (todo) => todo.teacher === selectedTeacher && todo.student
      );
      const sortedData = filteredData.sort((a, b) =>
        a.student.name.localeCompare(b.student.name)
      );
      setTodos(sortedData);
    }
    setLoading(false);
  };

  const toggleDone = async (todoId, isDone) => {
    const { error } = await supabase
      .from("todos")
      .update({ done: !isDone })
      .eq("id", todoId);
    if (error) {
      console.error("완료 상태 변경 오류:", error.message);
      alert("완료 상태 변경 실패");
    } else {
      fetchTodos(selectedDate); // ✅ 현재 날짜로 다시 조회
    }
  };

  const deleteTodo = async (todoId) => {
    if (window.confirm("정말 이 할일을 삭제하시겠습니까?")) {
      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", todoId);
      if (error) {
        console.error("할일 삭제 오류:", error.message);
        alert("할일 삭제 실패");
      } else {
        fetchTodos(selectedDate); // ✅ 현재 날짜로 다시 조회
      }
    }
  };

  const handleStudentClick = (studentId) => {
    navigate(`/student-todo/${studentId}`); // ✅ 학생 개별 할일 페이지로 이동
  };

  return (
    <div style={styles.container}>
      <button
        style={styles.backButton}
        onClick={() => navigate("/teacher-options")} // ✅ 항상 TeacherOptionsPage로 이동
      >
        ← 뒤로가기
      </button>
      <h1 style={styles.title}>📋 {selectedTeacher} 학생 할일관리</h1>
      {/* 🗓 날짜 선택 */}
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        style={styles.dateInput}
      />
      {loading ? (
        <p>할일 불러오는 중...</p>
      ) : todos.length === 0 ? (
        <p>{selectedDate}에 등록된 할일이 없습니다.</p>
      ) : (
        <div style={styles.grid}>
          {Object.values(
            todos.reduce((acc, todo) => {
              const studentId = todo.student.id;
              if (!acc[studentId]) {
                acc[studentId] = {
                  student: todo.student,
                  items: [],
                };
              }
              acc[studentId].items.push(todo);
              return acc;
            }, {})
          ).map(({ student, items }) => (
            <div key={student.id} style={styles.studentCard}>
              {/* 🛠 학생 이름 클릭 시 개별 할일 페이지로 이동 */}
              <div
                style={styles.studentTitle}
                onClick={() => handleStudentClick(student.id)}
              >
                👩‍🎓 {student.name} ({student.school} {student.grade})
              </div>
              <div style={styles.todoList}>
                {items.map((todo) => (
                  <div key={todo.id} style={styles.todoItem}>
                    <div>
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() => toggleDone(todo.id, todo.done)}
                        style={styles.checkbox}
                      />
                      {todo.content}
                    </div>
                    <button
                      style={styles.deleteButton}
                      onClick={() => deleteTodo(todo.id)}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TeacherTodoPage;
