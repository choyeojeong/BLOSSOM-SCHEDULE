import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";

const styles = {
  container: {
    backgroundColor: "#f4f6f8",
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
    marginBottom: "1.5rem",
    textAlign: "center",
  },
  categoryBox: {
    backgroundColor: "white",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1rem",
  },
  categoryTitle: {
    color: "#245ea8",
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "0.5rem",
  },
  lessonList: {
    listStyle: "none",
    paddingLeft: "1rem",
  },
  lessonItem: {
    padding: "6px 0",
    borderBottom: "1px solid #eee",
  },
  form: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.5rem",
  },
  input: {
    flex: 1,
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "6px",
  },
  button: {
    padding: "8px 12px",
    backgroundColor: "#245ea8",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  deleteButton: {
    background: "transparent",
    border: "none",
    color: "red",
    cursor: "pointer",
    marginLeft: "0.5rem",
  },
};

export default function LecturesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newLessons, setNewLessons] = useState({}); // category별 입력값 관리

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("lecture_categories")
      .select(`
        *,
        lessons:lecture_lessons(*)
      `)
      .order("name", { ascending: true }); // 카테고리 이름순 정렬

    if (error) {
      console.error("강의 카테고리 불러오기 오류:", error.message);
    } else {
      setCategories(data);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;

    const { error } = await supabase
      .from("lecture_categories")
      .insert({ name: newCategoryName.trim() });

    if (error) {
      console.error("카테고리 추가 오류:", error.message);
    } else {
      setNewCategoryName("");
      fetchCategories();
    }
  };

  const deleteCategory = async (categoryId) => {
    if (
      window.confirm("이 카테고리를 삭제하면 연결된 모든 강의도 함께 삭제됩니다. 진행할까요?")
    ) {
      const { error } = await supabase
        .from("lecture_categories")
        .delete()
        .eq("id", categoryId);

      if (error) {
        console.error("카테고리 삭제 오류:", error.message);
      } else {
        fetchCategories();
      }
    }
  };

  const addLesson = async (categoryId) => {
    const lessonText = newLessons[categoryId]?.trim();
    if (!lessonText) return;

    let lessonNumber, link;
    try {
      const [number, url] = lessonText.split(",");
      lessonNumber = number.trim();
      link = url.trim();
      if (!lessonNumber || !link) throw new Error();
    } catch {
      alert("형식은 '1강, https://링크'로 입력해주세요.");
      return;
    }

    const { error } = await supabase
      .from("lecture_lessons")
      .insert({
        category_id: categoryId,
        lesson_number: lessonNumber,
        link: link,
      });

    if (error) {
      console.error("강의 추가 오류:", error.message);
    } else {
      setNewLessons((prev) => ({ ...prev, [categoryId]: "" }));
      fetchCategories();
    }
  };

  const deleteLesson = async (lessonId) => {
    if (window.confirm("이 강의를 삭제하시겠습니까?")) {
      const { error } = await supabase
        .from("lecture_lessons")
        .delete()
        .eq("id", lessonId);

      if (error) {
        console.error("강의 삭제 오류:", error.message);
      } else {
        fetchCategories();
      }
    }
  };

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate("/dashboard")}>
        ← 뒤로가기
      </button>
      <h1 style={styles.title}>🎓 강의 관리</h1>

      {/* 카테고리 추가 */}
      <div style={styles.form}>
        <input
          style={styles.input}
          placeholder="새 카테고리명 입력"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
        />
        <button style={styles.button} onClick={addCategory}>
          카테고리 추가
        </button>
      </div>

      {/* 카테고리 및 강의 목록 */}
      {categories.map((cat) => (
        <div key={cat.id} style={styles.categoryBox}>
          <div style={styles.categoryTitle}>
            {cat.name}
            <button
              style={styles.deleteButton}
              onClick={() => deleteCategory(cat.id)}
            >
              🗑
            </button>
          </div>
          <ul style={styles.lessonList}>
            {cat.lessons.length === 0 ? (
              <li style={{ color: "#999" }}>등록된 강의가 없습니다.</li>
            ) : (
              cat.lessons
                .sort((a, b) =>
                  a.lesson_number.localeCompare(b.lesson_number, undefined, {
                    numeric: true,
                  })
                )
                .map((lesson) => (
                  <li key={lesson.id} style={styles.lessonItem}>
                    {lesson.lesson_number}:{" "}
                    <a
                      href={lesson.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#007bff", textDecoration: "underline" }}
                    >
                      링크
                    </a>
                    <button
                      style={styles.deleteButton}
                      onClick={() => deleteLesson(lesson.id)}
                    >
                      🗑
                    </button>
                  </li>
                ))
            )}
          </ul>
          <div style={styles.form}>
            <input
              style={styles.input}
              placeholder="1강, https://링크"
              value={newLessons[cat.id] || ""}
              onChange={(e) =>
                setNewLessons((prev) => ({
                  ...prev,
                  [cat.id]: e.target.value,
                }))
              }
            />
            <button style={styles.button} onClick={() => addLesson(cat.id)}>
              강의 추가
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
