import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import dayjs from "dayjs";
import "dayjs/locale/ko"; // ✅ 한글 로케일
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";
import { useNavigate } from "react-router-dom";

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.locale("ko"); // ✅ 한글 로케일 적용

const weekdaysOrder = ["월", "화", "수", "목", "금", "토"];

function ReadingClassPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [lessonsByDay, setLessonsByDay] = useState({});

  useEffect(() => {
    fetchLessons();
  }, [selectedDate]);

  const fetchLessons = async () => {
    const startOfWeek = selectedDate.startOf("isoWeek");
    const endOfWeek = startOfWeek.add(5, "day");

    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("*, students(name, school, grade, teacher)")
      .eq("type", "독해") // ✅ 독해수업만 가져오기
      .gte("date", startOfWeek.format("YYYY-MM-DD"))
      .lte("date", endOfWeek.format("YYYY-MM-DD"))
      .order("time", { ascending: true });

    if (error) {
      console.error("수업 불러오기 오류:", error);
      return;
    }

    // ✅ 요일별 그룹핑 (한글 요일 사용)
    const grouped = {};
    lessons.forEach((lesson) => {
      const day = dayjs(lesson.date).format("dd"); // "월", "화" 형태
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(lesson);
    });
    setLessonsByDay(grouped);
  };

  return (
    <div>
      <h1>📖 독해수업관리</h1>

      <div>
        <button onClick={() => setSelectedDate(selectedDate.subtract(1, "week"))}>
          ◀ 이전주
        </button>
        <span>
          {selectedDate.startOf("isoWeek").format("YYYY.MM.DD")} ~{" "}
          {selectedDate.endOf("isoWeek").format("YYYY.MM.DD")}
        </span>
        <button onClick={() => setSelectedDate(selectedDate.add(1, "week"))}>
          다음주 ▶
        </button>
      </div>

      {weekdaysOrder.map((weekday) => (
        <div key={weekday}>
          <h2>{weekday}</h2>
          {lessonsByDay[weekday] && lessonsByDay[weekday].length > 0 ? (
            <ul>
              {lessonsByDay[weekday].map((lesson) => (
                <li key={lesson.id}>
                  {lesson.students?.name} - {lesson.time}
                </li>
              ))}
            </ul>
          ) : (
            <p>수업 없음</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default ReadingClassPage;
