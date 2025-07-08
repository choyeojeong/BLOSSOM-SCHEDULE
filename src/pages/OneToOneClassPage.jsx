// src/pages/OneToOneClassPage.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/ko';
import { useNavigate } from 'react-router-dom';

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.locale('ko');

const weekdaySlots = [
  '16:00-16:40', '16:40-17:20', '17:20-18:00', '18:00-18:40',
  '18:40-19:20', '19:20-20:00', '20:00-20:40', '20:40-21:20', '21:20-22:00',
];
const saturdaySlots = [
  '10:20-11:00', '11:00-11:40', '11:40-12:20', '12:20-13:00',
  '13:00-13:40', '14:00-14:40', '14:40-15:20', '15:20-16:00',
  '16:00-16:40', '16:40-17:20',
];

export default function OneToOneClassPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const savedDate = localStorage.getItem('selectedDate');
    return savedDate || dayjs().format('YYYY-MM-DD');
  });
  const [lessons, setLessons] = useState([]);
  const [studentsMap, setStudentsMap] = useState({});
  const [memos, setMemos] = useState({});
  const [absentEditId, setAbsentEditId] = useState(null);
  const [absentReasonMap, setAbsentReasonMap] = useState({});
  const [newMakeupMap, setNewMakeupMap] = useState({});

  useEffect(() => {
    const savedTeacher = localStorage.getItem('selectedTeacher');
    const savedDate = localStorage.getItem('selectedDate');
    if (savedTeacher) setSelectedTeacher(savedTeacher);
    if (savedDate) setSelectedDate(savedDate);
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedTeacher && selectedDate) fetchLessons();
  }, [selectedTeacher, selectedDate]);

  useEffect(() => {
    if (selectedTeacher) {
      localStorage.setItem('selectedTeacher', selectedTeacher);
    }
  }, [selectedTeacher]);

  useEffect(() => {
    if (selectedDate) {
      localStorage.setItem('selectedDate', selectedDate);
    }
  }, [selectedDate]);

  const fetchTeachers = async () => {
    const { data } = await supabase.from('students').select('teacher').neq('teacher', '');
    const unique = [...new Set(data.map((d) => d.teacher))];
    setTeachers(unique);
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*');
    const map = {};
    data.forEach((s) => (map[s.id] = s));
    setStudentsMap(map);
  };

  const fetchLessons = async () => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .or(`date.eq.${selectedDate},original_lesson_id.not.is.null`);
    setLessons(data || []);
  };

  const handlePresent = async (lesson) => {
    const now = dayjs();
    const testTime = dayjs(`${lesson.date} ${lesson.test_time}`);
    const diff = now.diff(testTime, 'minute');
    const isLate = diff > 0;

    await supabase
      .from('lessons')
      .update({
        status: '출석',
        checkin_time: now.format('HH:mm'),
        late_minutes: isLate ? diff : 0,
        on_time: !isLate,
      })
      .eq('id', lesson.id);

    fetchLessons();
  };

  const handleAbsent = (lesson) => {
    setAbsentEditId(lesson.id);
    setAbsentReasonMap((prev) => ({ ...prev, [lesson.id]: '' }));
    setNewMakeupMap((prev) => ({
      ...prev,
      [lesson.id]: { date: '', test_time: '', class_time: '' },
    }));
  };

  const saveAbsentAndMakeup = async (lesson) => {
    const reason = absentReasonMap[lesson.id] || '';
    const makeup = newMakeupMap[lesson.id] || {};
    const update = { status: '결석', absent_reason: reason };
    let makeupLessonId = null;

    if (makeup.date && makeup.test_time && makeup.class_time) {
      const { data } = await supabase
        .from('lessons')
        .insert([
          {
            student_id: lesson.student_id,
            date: makeup.date,
            time: makeup.class_time,
            test_time: makeup.test_time,
            type: '보강',
            original_lesson_id: lesson.id,
          },
        ])
        .select();
      if (data && data.length > 0) {
        makeupLessonId = data[0].id;
        update.makeup_lesson_id = makeupLessonId;
      }
    }

    await supabase.from('lessons').update(update).eq('id', lesson.id);
    setAbsentEditId(null);
    fetchLessons();
  };

  const resetLesson = async (lesson) => {
    if (lesson.makeup_lesson_id)
      await supabase.from('lessons').delete().eq('id', lesson.makeup_lesson_id);
    await supabase
      .from('lessons')
      .update({
        status: null,
        absent_reason: null,
        makeup_lesson_id: null,
        checkin_time: null,
        late_minutes: null,
        on_time: null,
      })
      .eq('id', lesson.id);
    fetchLessons();
  };

  const slots = dayjs(selectedDate).day() === 6 ? saturdaySlots : weekdaySlots;

  return (
    <div style={{ padding: '2rem' }}>
      <button onClick={() => navigate('/dashboard')}>← 뒤로가기</button>
      <h2>일대일 수업 관리</h2>
      <label>
        선생님 선택:
        <select
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
        >
          <option value="">--</option>
          {teachers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        {slots.map((slot) => {
          const lesson = lessons.find(
            (l) =>
              l.date === selectedDate &&
              l.time === slot &&
              (studentsMap[l.student_id]?.teacher === selectedTeacher ||
                l.teacher === selectedTeacher)
          );

          const student = lesson?.student_id ? studentsMap[lesson.student_id] : null;

          const bgColor =
            lesson?.type === '보강'
              ? '#fff9cc'
              : lesson?.status === '결석'
              ? '#ffe5e5'
              : lesson?.status === '출석'
              ? '#e0f7fa'
              : lesson
              ? '#f0f0f0'
              : '#ffffff';

          return (
            <div
              key={slot}
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: bgColor,
              }}
            >
              <strong>{slot}</strong>

              {lesson && student && (
                <>
                  <div style={{ fontWeight: 'bold' }}>
                    <button
                      onClick={() => navigate(`/student-todo/${student.id}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        margin: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        color: '#245ea8',
                      }}
                    >
                      {student.name} ({student.school} {student.grade})
                    </button>
                  </div>
                  <div>테스트: {lesson.test_time}</div>
                  <div>수업: {lesson.time}</div>
                  {lesson.checkin_time && (
                    <div>
                      출석: {lesson.checkin_time}{' '}
                      {lesson.on_time ? '정시' : `${lesson.late_minutes}분 지각`}
                    </div>
                  )}
                  {lesson.absent_reason && <div>사유: {lesson.absent_reason}</div>}

                  {lesson.status === null && (
                    <>
                      <button onClick={() => handlePresent(lesson)}>출석</button>
                      <button onClick={() => handleAbsent(lesson)}>결석</button>
                    </>
                  )}

                  {absentEditId === lesson.id && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <label>
                        결석 사유:
                        <input
                          type="text"
                          value={absentReasonMap[lesson.id] || ''}
                          onChange={(e) =>
                            setAbsentReasonMap((prev) => ({
                              ...prev,
                              [lesson.id]: e.target.value,
                            }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        보강 날짜:
                        <input
                          type="date"
                          value={newMakeupMap[lesson.id]?.date || ''}
                          onChange={(e) =>
                            setNewMakeupMap((prev) => ({
                              ...prev,
                              [lesson.id]: {
                                ...prev[lesson.id],
                                date: e.target.value,
                              },
                            }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        보강 테스트시간:
                        <input
                          type="text"
                          placeholder="예: 16:00"
                          value={newMakeupMap[lesson.id]?.test_time || ''}
                          onChange={(e) =>
                            setNewMakeupMap((prev) => ({
                              ...prev,
                              [lesson.id]: {
                                ...prev[lesson.id],
                                test_time: e.target.value,
                              },
                            }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        보강 수업시간:
                        <input
                          type="text"
                          placeholder="예: 16:40-17:20"
                          value={newMakeupMap[lesson.id]?.class_time || ''}
                          onChange={(e) =>
                            setNewMakeupMap((prev) => ({
                              ...prev,
                              [lesson.id]: {
                                ...prev[lesson.id],
                                class_time: e.target.value,
                              },
                            }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                      <button
                        onClick={() => saveAbsentAndMakeup(lesson)}
                        style={{
                          marginTop: '8px',
                          backgroundColor: '#ffcccb',
                          border: '1px solid #f44336',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        결석 처리
                      </button>
                    </div>
                  )}

                  {lesson.status && (
                    <button onClick={() => resetLesson(lesson)}>초기화</button>
                  )}
                </>
              )}

              {/* 메모칸 */}
              <div style={{ marginTop: '0.5rem' }}>
                <textarea
                  placeholder="메모"
                  value={memos[lesson?.id || slot] || lesson?.memo || ''}
                  onChange={(e) =>
                    setMemos((prev) => ({
                      ...prev,
                      [lesson?.id || slot]: e.target.value,
                    }))
                  }
                  onBlur={async (e) => {
                    if (lesson) {
                      await supabase
                        .from('lessons')
                        .update({ memo: e.target.value })
                        .eq('id', lesson.id);
                    }
                  }}
                  style={{ width: '100%' }}
                  rows={2}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}