import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

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
  },
  buttonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "1rem",
  },
  teacherButton: {
    backgroundColor: "#245ea8",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

function TeacherSelectPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("teacher")
      .neq("teacher", "");
    if (error) {
      console.error("선생님 목록 가져오기 오류:", error.message);
      return;
    }
    const uniqueTeachers = [...new Set(data.map((d) => d.teacher))];
    setTeachers(uniqueTeachers);
  };

  const handleTeacherClick = (teacher) => {
    localStorage.setItem("selectedTeacher", teacher); // ✅ 선택한 선생님 저장
    navigate("/one-to-one");
  };

  return (
    <div style={styles.container}>
      <button
        style={styles.backButton}
        onClick={() => navigate("/dashboard")}
      >
        ← 뒤로가기
      </button>
      <h1 style={styles.title}>👩‍🏫 선생님 선택</h1>
      <div style={styles.buttonGrid}>
        {teachers.map((teacher) => (
          <button
            key={teacher}
            style={styles.teacherButton}
            onClick={() => handleTeacherClick(teacher)}
          >
            {teacher}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TeacherSelectPage;
