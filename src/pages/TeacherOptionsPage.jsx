import { useNavigate } from "react-router-dom";

const styles = {
  container: {
    backgroundColor: "#eef3f9",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    position: "relative", // ✅ backButton 위치 고정을 위해 추가
  },
  backButton: {
    position: "absolute", // ✅ 왼쪽 상단 고정
    top: "1rem",
    left: "1rem",
    backgroundColor: "#ccc",
    color: "#333",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    cursor: "pointer",
  },
  title: {
    color: "#245ea8",
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "2rem",
  },
  button: {
    backgroundColor: "#245ea8",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "1rem",
    width: "220px",
  },
};

function TeacherOptionsPage() {
  const navigate = useNavigate();
  const selectedTeacher = localStorage.getItem("selectedTeacher");

  if (!selectedTeacher) {
    alert("선생님을 먼저 선택해주세요.");
    navigate("/teacher-select");
    return null;
  }

  const handleGoToOneToOne = () => {
    localStorage.setItem("selectedTeacher", selectedTeacher); // ✅ 값 유지
    navigate("/one-to-one");
  };

  const handleGoToTodo = () => {
    localStorage.setItem("selectedTeacher", selectedTeacher); // ✅ 값 유지
    navigate("/teacher-todo");
  };

  return (
    <div style={styles.container}>
      {/* 🠔 왼쪽 상단에 배치 */}
      <button
        style={styles.backButton}
        onClick={() => navigate("/teacher-select")}
      >
        ← 선생님 선택으로 돌아가기
      </button>

      <h1 style={styles.title}>👩‍🏫 {selectedTeacher}</h1>
      <button
        style={styles.button}
        onClick={handleGoToOneToOne}
      >
        📖 일대일수업관리
      </button>
      <button
        style={styles.button}
        onClick={handleGoToTodo}
      >
        📋 학생할일관리
      </button>
    </div>
  );
}

export default TeacherOptionsPage;
