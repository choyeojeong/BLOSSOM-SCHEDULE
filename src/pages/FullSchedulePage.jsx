// src/pages/FullSchedulePage.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/ko';

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.locale('ko');

const WEEKDAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];
const weekdaySlots = [
  '16:00-16:40', '16:40-17:20', '17:20-18:00',
  '18:00-18:40', '18:40-19:20', '19:20-20:00',
  '20:00-20:40', '20:40-21:20', '21:20-22:00',
];
const saturdaySlots = [
  '10:20-11:00', '11:00-11:40', '11:40-12:20',
  '12:20-13:00', '13:00-13:40', '14:00-14:40',
  '14:40-15:20', '15:20-16:00', '16:00-16:40', '16:40-17:20',
];

function getColor(type, status) {
  if (type === '업무') return '#e6e6fa'; // 업무 색상(연보라)
  if (type === '보강') return '#fffacc'; // 보강 색상(연노랑)
  if (status === '출석') return '#d4f4fa'; // 출석 색상(연하늘)
  if (status === '결석') return '#ffd6d6'; // 결석 색상(연분홍)
  return '#eaeaea'; // 기본 색상(연회색)
}

export default function FullSchedulePage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [lessons, setLessons] = useState([]);
  const [studentsMap, setStudentsMap] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekStart = currentDate.startOf('week').add(1, 'day'); // 월요일
  const weekDates = Array.from({ length: 6 }).map((_, i) =>
    weekStart.add(i, 'day').format('YYYY-MM-DD')
  );

  const fetchLessons = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .gte('date', weekStart.format('YYYY-MM-DD'))
      .lte('date', weekStart.add(5, 'day').format('YYYY-MM-DD'));
    if (error) {
      console.error('레슨 불러오기 오류:', error.message);
    }
    setLessons(data || []);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase.from('students').select('*');
    if (error) {
      console.error('학생 불러오기 오류:', error.message);
    }
    const map = {};
    const teacherSet = new Set();
    (data || []).forEach((s) => {
      map[s.id] = s;
      if (s.teacher) teacherSet.add(s.teacher);
    });
    setStudentsMap(map);
    setTeachers(Array.from(teacherSet));
  };

  const goToPreviousWeek = () => {
    setCurrentDate((prev) => prev.subtract(1, 'week'));
  };

  const goToNextWeek = () => {
    setCurrentDate((prev) => prev.add(1, 'week'));
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchStudents();
      await fetchLessons();
      setLoading(false);
    };
    loadData();
  }, [currentDate]);

  const addTask = async (teacher, date, time) => {
    const task = prompt(`${teacher} 선생님\n${date} ${time}에 추가할 업무 내용을 입력하세요:`);
    if (task) {
      const { error } = await supabase.from('lessons').insert([
        {
          student_id: null, // 업무는 학생 없이 저장
          teacher: teacher,
          date: date,
          time: time,
          type: '업무',
          task: task,
        },
      ]);
      if (error) {
        console.error('업무 저장 오류:', error.message);
        alert('업무 저장에 실패했습니다: ' + error.message);
      } else {
        fetchLessons(); // 새로고침
      }
    }
  };

  const deleteTask = async (taskId) => {
    if (window.confirm('정말 이 업무를 삭제하시겠습니까?')) {
      await supabase.from('lessons').delete().eq('id', taskId);
      fetchLessons();
    }
  };

  const getCellContent = (teacher, date, time) => {
    const items = lessons.filter(
      (l) =>
        (l.teacher || studentsMap[l.student_id]?.teacher) === teacher &&
        l.date === date &&
        l.time === time
    );

    return (
      <div>
        {items.map((lesson) => (
          <div
            key={lesson.id}
            style={{
              backgroundColor: getColor(lesson.type, lesson.status),
              marginBottom: '4px',
              padding: '2px 4px',
              borderRadius: '4px',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              {lesson.type === '업무'
                ? `📌 업무: ${lesson.task || lesson.memo}`
                : lesson.student_id && studentsMap[lesson.student_id]
                ? `${studentsMap[lesson.student_id].name} (${studentsMap[lesson.student_id].school} ${studentsMap[lesson.student_id].grade})`
                : '학생정보없음'}
            </span>
            {lesson.type === '업무' && (
              <button
                onClick={() => deleteTask(lesson.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'red',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginLeft: '4px',
                }}
              >
                🗑
              </button>
            )}
          </div>
        ))}
        <div style={{ marginTop: '4px' }}>
          <button
            onClick={() => addTask(teacher, date, time)}
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              backgroundColor: '#00bcd4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            업무 추가
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ padding: '2rem' }}>로딩 중...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          marginBottom: '1rem',
          padding: '6px 12px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        ← 뒤로가기
      </button>
      <h2 style={{ marginBottom: '1rem' }}>전체 시간표</h2>
      <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <button
          onClick={goToPreviousWeek}
          style={{
            padding: '4px 8px',
            marginRight: '8px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          지난주
        </button>
        <strong style={{ fontSize: '16px' }}>
          {weekStart.format('MM월 DD일')} ~ {weekStart.add(5, 'day').format('MM월 DD일')}
        </strong>
        <button
          onClick={goToNextWeek}
          style={{
            padding: '4px 8px',
            marginLeft: '8px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          다음주
        </button>
      </div>

      {/* 선생님별 월~금 시간표 */}
      {teachers.length === 0 ? (
        <div>등록된 선생님이 없습니다.</div>
      ) : (
        teachers.map((teacher) => (
          <div key={teacher} style={{ marginBottom: '3rem' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#333' }}>
              {teacher} 선생님 (월~금)
            </h3>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #ccc',
                backgroundColor: 'white',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th
                    style={{
                      border: '1px solid #ccc',
                      padding: '6px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    시간
                  </th>
                  {weekDates.slice(0, 5).map((date) => (
                    <th
                      key={date}
                      style={{
                        border: '1px solid #ccc',
                        padding: '6px',
                        textAlign: 'center',
                      }}
                    >
                      {date} ({WEEKDAYS_KR[dayjs(date).day()]})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekdaySlots.map((slot) => (
                  <tr key={slot}>
                    <td
                      style={{
                        border: '1px solid #ccc',
                        padding: '6px',
                        backgroundColor: '#f9f9f9',
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}
                    >
                      {slot}
                    </td>
                    {weekDates.slice(0, 5).map((date) => (
                      <td
                        key={date}
                        style={{
                          border: '1px solid #ccc',
                          padding: '4px',
                          verticalAlign: 'top',
                        }}
                      >
                        {getCellContent(teacher, date, slot)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* 토요일 시간표 */}
      <h3 style={{ margin: '2rem 0 0.5rem', color: '#333' }}>토요일 시간표</h3>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #ccc',
          backgroundColor: 'white',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th
              style={{
                border: '1px solid #ccc',
                padding: '6px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              시간
            </th>
            {teachers.map((teacher) => (
              <th
                key={teacher}
                style={{
                  border: '1px solid #ccc',
                  padding: '6px',
                  textAlign: 'center',
                }}
              >
                {teacher}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {saturdaySlots.map((slot) => (
            <tr key={slot}>
              <td
                style={{
                  border: '1px solid #ccc',
                  padding: '6px',
                  backgroundColor: '#f9f9f9',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                {slot}
              </td>
              {teachers.map((teacher) => (
                <td
                  key={teacher}
                  style={{
                    border: '1px solid #ccc',
                    padding: '4px',
                    verticalAlign: 'top',
                  }}
                >
                  {getCellContent(teacher, weekDates[5], slot)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
