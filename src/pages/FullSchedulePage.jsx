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

const weekdayLabels = ['월', '화', '수', '목', '금', '토'];
const timeSlots = {
  weekday: [
    '16:00-16:40', '16:40-17:20', '17:20-18:00',
    '18:00-18:40', '18:40-19:20', '19:20-20:00',
    '20:00-20:40', '20:40-21:20', '21:20-22:00',
  ],
  saturday: [
    '10:20-11:00', '11:00-11:40', '11:40-12:20',
    '12:20-13:00', '13:00-13:40', '14:00-14:40',
    '14:40-15:20', '15:20-16:00', '16:00-16:40', '16:40-17:20',
  ],
};

function getTimeSlotsByDay(day) {
  return day === 6 ? timeSlots.saturday : timeSlots.weekday;
}

function getColor(type, status) {
  if (type === '보강') return '#fffacc';
  if (type === '메모') return '#f1f1f1';
  if (status === '출석') return '#d4f4fa';
  if (status === '결석') return '#ffd6d6';
  return '#eaeaea';
}
export default function FullSchedulePage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [lessons, setLessons] = useState([]);
  const [studentsMap, setStudentsMap] = useState({});
  const [memoMap, setMemoMap] = useState({});

  const weekStart = currentDate.startOf('week').add(1, 'day'); // 월요일
  const weekDates = Array.from({ length: 6 }).map((_, i) =>
    weekStart.add(i, 'day').format('YYYY-MM-DD')
  );

  useEffect(() => {
    fetchLessons();
    fetchStudents();
  }, [currentDate]);

  const fetchLessons = async () => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .gte('date', weekStart.format('YYYY-MM-DD'))
      .lte('date', weekStart.add(5, 'day').format('YYYY-MM-DD'));
    setLessons(data);
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*');
    const map = {};
    data.forEach((s) => {
      map[s.id] = s;
    });
    setStudentsMap(map);
  };

  const handleMemoChange = (teacher, date, time, value) => {
    setMemoMap((prev) => ({
      ...prev,
      [teacher]: {
        ...(prev[teacher] || {}),
        [date]: {
          ...(prev[teacher]?.[date] || {}),
          [time]: value,
        },
      },
    }));
  };
  const saveMemo = async (teacher, date, time) => {
    const content = memoMap?.[teacher]?.[date]?.[time] || '';
    const existing = lessons.find(
      (l) =>
        l.teacher === teacher &&
        l.date === date &&
        l.time === time &&
        l.type === '메모'
    );
    if (existing) {
      await supabase
        .from('lessons')
        .update({ memo: content })
        .eq('id', existing.id);
    } else {
      await supabase.from('lessons').insert([
        {
          teacher,
          date,
          time,
          type: '메모',
          memo: content,
        },
      ]);
    }
    fetchLessons();
  };

  const getCellContent = (teacher, date, time) => {
    const items = lessons.filter(
      (l) => l.teacher === teacher && l.date === date && l.time === time && l.type !== '메모'
    );
    const memo = memoMap?.[teacher]?.[date]?.[time] || '';

    return (
      <div>
        {items.map((lesson) => {
          const student = studentsMap[lesson.student_id];
          return (
            <div
              key={lesson.id}
              style={{
                backgroundColor: getColor(lesson),
                marginBottom: '4px',
                padding: '2px 4px',
                borderRadius: '4px',
              }}
            >
              {student
                ? `${student.name} (${student.school} ${student.grade})`
                : '학생정보없음'}
            </div>
          );
        })}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
          <textarea
            placeholder="메모"
            value={memo}
            onChange={(e) =>
              handleMemoChange(teacher, date, time, e.target.value)
            }
            style={{ flex: 1, fontSize: '12px' }}
          />
          <button
            onClick={() => saveMemo(teacher, date, time)}
            style={{
              marginLeft: '4px',
              fontSize: '12px',
              padding: '4px 6px',
            }}
          >
            저장
          </button>
        </div>
      </div>
    );
  };
  return (
    <div style={{ padding: '2rem' }}>
      <button onClick={() => navigate('/dashboard')}>← 뒤로가기</button>
      <h2>전체 시간표</h2>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={goToPreviousWeek}>지난주</button>
        <strong style={{ margin: '0 1rem' }}>
          {startOfWeek.format('MM월 DD일')} ~ {endOfWeek.format('MM월 DD일')}
        </strong>
        <button onClick={goToNextWeek}>다음주</button>
      </div>
      {teachers.map((teacher) => (
        <div key={teacher} style={{ marginBottom: '3rem' }}>
          <h3>{teacher} 선생님</h3>
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
                <th style={{ border: '1px solid #ccc', padding: '4px' }}>시간</th>
                {dates.map((date) => (
                  <th
                    key={date}
                    style={{ border: '1px solid #ccc', padding: '4px' }}
                  >
                    {date} ({WEEKDAYS_KR[dayjs(date).day()]})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot}>
                  <td
                    style={{
                      border: '1px solid #ccc',
                      padding: '4px',
                      backgroundColor: '#f8f8f8',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  >
                    {slot}
                  </td>
                  {dates.map((date) => (
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
      ))}
    </div>
  );
}
