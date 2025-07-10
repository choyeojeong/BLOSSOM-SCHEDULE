import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

const styles = {
  container: {
    backgroundColor: '#eef3f9',
    minHeight: '100vh',
    padding: '40px',
  },
  box: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  title: {
    color: '#245ea8',
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
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
  label: {
    marginBottom: '8px',
    color: '#245ea8',
    fontWeight: 'bold',
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
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
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
  searchBox: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  searchInput: {
    flex: "1",
    marginRight: "10px",
    padding: "10px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "6px",
  },
};

const weekdays = ["월", "화", "수", "목", "금", "토"];

function StudentPage() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    school: "",
    grade: "",
    teacher: "",
    phone: "",
    first_day: "",
    one_day: "",
    one_test_time: "",
    one_class_time: "",
    reading_times: {}, // { "월": "10:00", "수": "14:00" }
  });
  const [editingId, setEditingId] = useState(null);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .is("leave_day", null) // ✅ 퇴원하지 않은 학생만
      .order("name", { ascending: true });
    if (error) console.error(error);
    else {
      setStudents(data);
      setFilteredStudents(data); // 초기 필터링
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const createLessonsForStudent = async (studentId, updatedForm) => {
    const lessons = [];
    const startDate = new Date(updatedForm.first_day);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 7);

    // ✅ 독해시간 JSON 파싱
    const readingTimes = JSON.parse(updatedForm.reading_times);

    // 📌 일대일 수업 생성
    const oneDays = updatedForm.one_day.split(",").map((d) => d.trim());
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dayName = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
      if (oneDays.includes(dayName)) {
        lessons.push({
          student_id: studentId,
          date: d.toISOString().substring(0, 10),
          time: updatedForm.one_class_time,
          test_time: updatedForm.one_test_time,
          type: "일대일",
        });
      }
    }

    // 📌 독해수업 생성
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dayName = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
      if (readingTimes[dayName]?.trim()) {
        lessons.push({
          student_id: studentId,
          date: d.toISOString().substring(0, 10),
          time: readingTimes[dayName],
          type: "독해",
        });
      }
    }

    if (lessons.length > 0) {
      const { error: lessonsError } = await supabase
        .from("lessons")
        .insert(lessons);
      if (lessonsError) console.error(lessonsError);
    }
  };

  const handleSubmit = async () => {
    const updatedForm = {
      ...form,
      reading_times: JSON.stringify(form.reading_times), // JSON 형태로 저장
    };

    if (editingId) {
      // 기존 수업 삭제 후 새로 생성
      await supabase.from("students").update(updatedForm).eq("id", editingId);
      await supabase
        .from("lessons")
        .delete()
        .eq("student_id", editingId);

      await createLessonsForStudent(editingId, updatedForm);
    } else {
      // ✅ 중복 체크
      const { data: existing } = await supabase
        .from("students")
        .select("*")
        .eq("name", form.name)
        .eq("school", form.school)
        .eq("grade", form.grade)
        .eq("teacher", form.teacher)
        .is("leave_day", null);

      if (existing && existing.length > 0) {
        alert("이미 등록된 학생입니다 ❌");
        return;
      }

      const { data, error } = await supabase
        .from("students")
        .insert([updatedForm])
        .select();
      if (error) {
        console.error(error);
        alert("학생 등록 실패 ❌");
        return;
      }
      const studentId = data[0].id;
      await createLessonsForStudent(studentId, updatedForm);
    }

    setForm({
      name: "",
      school: "",
      grade: "",
      teacher: "",
      phone: "",
      first_day: "",
      one_day: "",
      one_test_time: "",
      one_class_time: "",
      reading_times: {},
    });
    setEditingId(null);
    fetchStudents();
  };

  const handleEdit = (student) => {
    setForm({
      ...student,
      reading_times: student.reading_times
        ? JSON.parse(student.reading_times)
        : {},
    });
    setEditingId(student.id);
  };

  const handleDelete = async (student) => {
    const leaveDay = prompt(
      `퇴원일을 입력하세요 (예: ${new Date()
        .toISOString()
        .substring(0, 10)} 형식)`
    );
    if (!leaveDay) return;

    try {
      // 1️⃣ 퇴원일 업데이트
      await supabase
        .from("students")
        .update({ leave_day: leaveDay })
        .eq("id", student.id);

      // 2️⃣ 퇴원일 이후 수업 삭제
      await supabase
        .from("lessons")
        .delete()
        .eq("student_id", student.id)
        .gte("date", leaveDay);

      alert("퇴원 처리 완료 ✅");
      fetchStudents(); // ✅ 퇴원한 학생 자동 제거
    } catch (err) {
      console.error(err);
      alert("퇴원 처리 중 오류 발생 ❌");
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    const filtered = students.filter((s) =>
      [s.name, s.school, s.grade, s.teacher]
        .join(" ")
        .toLowerCase()
        .includes(value.toLowerCase())
    );
    setFilteredStudents(filtered);
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h2 style={styles.title}>
          {editingId ? "학생 수정" : "학생 등록"}
        </h2>
        {/* 기본 정보 */}
        <input
          type="text"
          placeholder="이름"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="학교"
          value={form.school}
          onChange={(e) => setForm({ ...form, school: e.target.value })}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="학년"
          value={form.grade}
          onChange={(e) => setForm({ ...form, grade: e.target.value })}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="담당선생님"
          value={form.teacher}
          onChange={(e) => setForm({ ...form, teacher: e.target.value })}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="전화번호"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          style={styles.input}
        />
        <input
          type="date"
          placeholder="첫수업일"
          value={form.first_day}
          onChange={(e) => setForm({ ...form, first_day: e.target.value })}
          style={styles.input}
        />

        {/* ✅ 일대일 수업 */}
        <div style={styles.label}>📝 일대일 수업</div>
        <input
          type="text"
          placeholder="일대일 수업 요일 (예: 월,수)"
          value={form.one_day}
          onChange={(e) => setForm({ ...form, one_day: e.target.value })}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="일대일 테스트 시간 (예: 16:00)"
          value={form.one_test_time}
          onChange={(e) =>
            setForm({ ...form, one_test_time: e.target.value })
          }
          style={styles.input}
        />
        <input
          type="text"
          placeholder="일대일 수업 시간 (예: 16:40)"
          value={form.one_class_time}
          onChange={(e) =>
            setForm({ ...form, one_class_time: e.target.value })
          }
          style={styles.input}
        />

        {/* ✅ 독해수업 */}
        <div style={styles.label}>📖 독해수업 요일별 시간</div>
        {weekdays.map((day) => (
          <div key={day} style={{ marginBottom: "8px" }}>
            <label style={{ marginRight: "8px" }}>{day}</label>
            <input
              type="text"
              placeholder="시간 입력 (예: 10:00)"
              value={form.reading_times[day] || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  reading_times: {
                    ...form.reading_times,
                    [day]: e.target.value,
                  },
                })
              }
              style={styles.input}
            />
          </div>
        ))}

        <button onClick={handleSubmit} style={styles.button}>
          {editingId ? "수정" : "등록"}
        </button>
      </div>

      {/* ✅ 검색 */}
      <div style={styles.searchBox}>
        <input
          type="text"
          placeholder="이름, 학교, 학년, 담당선생님 검색"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* 학생 목록 */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>이름</th>
            <th style={styles.th}>학교</th>
            <th style={styles.th}>학년</th>
            <th style={styles.th}>일대일 요일</th>
            <th style={styles.th}>일대일 테스트</th>
            <th style={styles.th}>일대일 수업</th>
            <th style={styles.th}>독해수업</th>
            <th style={styles.th}>관리</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map((s) => (
            <tr key={s.id}>
              <td style={styles.td}>{s.name}</td>
              <td style={styles.td}>{s.school}</td>
              <td style={styles.td}>{s.grade}</td>
              <td style={styles.td}>{s.one_day}</td>
              <td style={styles.td}>{s.one_test_time}</td>
              <td style={styles.td}>{s.one_class_time}</td>
              <td style={styles.td}>
                {s.reading_times &&
                  Object.entries(JSON.parse(s.reading_times))
                    .map(([day, time]) => `${day} ${time}`)
                    .join(", ")}
              </td>
              <td style={styles.td}>
                <button
                  onClick={() => handleEdit(s)}
                  style={{
                    ...styles.button,
                    backgroundColor: "#f0ad4e",
                    marginBottom: "5px",
                  }}
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  style={{
                    ...styles.button,
                    backgroundColor: "#d9534f",
                  }}
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StudentPage;
