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
            teacher: selectedTeacher,
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
        task: null,
      })
      .eq('id', lesson.id);
    fetchLessons();
  };

  const addTask = async (slot) => {
    const task = prompt(`업무 내용을 입력하세요 (${slot})`);
    if (task) {
      await supabase.from('lessons').insert([
        {
          student_id: null,
          date: selectedDate,
          time: slot,
          type: '업무',
          task: task,
          teacher: selectedTeacher,
        },
      ]);
      fetchLessons();
    }
  };

  const deleteTask = async (taskId) => {
    if (window.confirm('정말 이 업무를 삭제하시겠습니까?')) {
      await supabase.from('lessons').delete().eq('id', taskId);
      fetchLessons();
    }
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
          const items = lessons.filter(
            (l) =>
              l.date === selectedDate &&
              l.time === slot &&
              (studentsMap[l.student_id]?.teacher === selectedTeacher ||
                l.teacher === selectedTeacher)
          );

          const bgColor =
            items.find((l) => l.type !== '업무')?.type === '보강'
              ? '#fff9cc'
              : items.find((l) => l.type !== '업무')?.status === '결석'
              ? '#ffe5e5'
              : items.find((l) => l.type !== '업무')?.status === '출석'
              ? '#e0f7fa'
              : '#f0f0f0';

          const memoLesson = items.find((l) => l.type === '메모');
          const memoValue =
            memos[memoLesson?.id || slot] || memoLesson?.memo || '';

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
              {items.map((lesson) => {
                const student = lesson?.student_id
                  ? studentsMap[lesson.student_id]
                  : null;

                return (
                  <div
                    key={lesson.id}
                    style={{
                      marginTop: '8px',
                      borderRadius: '4px',
                      padding: '4px',
                      backgroundColor:
                        lesson.type === '업무' ? '#e6e6fa' : 'transparent',
                    }}
                  >
{lesson.type === '업무' ? (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
  >
    <span>📌 업무: {lesson.task || lesson.memo}</span> {/* ✅ 수정 */}
    <button
      onClick={() => deleteTask(lesson.id)}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'red',
        cursor: 'pointer',
      }}
    >
      🗑
    </button>
  </div>
) : (
  <>
                          {student && (
                          <div style={{ fontWeight: 'bold' }}>
                            <button
                              onClick={() =>
                                navigate(`/student-todo/${student.id}`)
                              }
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
                        )}
                        <div>테스트: {lesson.test_time}</div>
                        <div>수업: {lesson.time}</div>
                        {lesson.checkin_time && (
                          <div>
                            출석: {lesson.checkin_time}{' '}
                            {lesson.on_time
                              ? '정시'
                              : `${lesson.late_minutes}분 지각`}
                          </div>
                        )}
                        {lesson.absent_reason && (
                          <div>사유: {lesson.absent_reason}</div>
                        )}
                        {lesson.status === '결석' && lesson.makeup_lesson_id && (
                          <div>
                            보강일:{' '}
                            {
                              lessons.find(
                                (l) => l.id === lesson.makeup_lesson_id
                              )?.date
                            }{' '}
                            {
                              lessons.find(
                                (l) => l.id === lesson.makeup_lesson_id
                              )?.time
                            }
                          </div>
                        )}
                        {lesson.type === '보강' &&
                          lesson.original_lesson_id && (
                            <div>
                              원결석일:{' '}
                              {
                                lessons.find(
                                  (l) => l.id === lesson.original_lesson_id
                                )?.date
                              }{' '}
                              사유:{' '}
                              {
                                lessons.find(
                                  (l) => l.id === lesson.original_lesson_id
                                )?.absent_reason
                              }
                            </div>
                          )}

                        {absentEditId === lesson.id ? (
                          <div style={{ marginTop: '0.5rem' }}>
                            <textarea
                              placeholder="결석 사유 입력"
                              value={absentReasonMap[lesson.id] || ''}
                              onChange={(e) =>
                                setAbsentReasonMap((prev) => ({
                                  ...prev,
                                  [lesson.id]: e.target.value,
                                }))
                              }
                              rows={2}
                              style={{ width: '100%' }}
                            />
                            <div>
                              <label>
                                보강 여부:
                                <select
                                  value={
                                    newMakeupMap[lesson.id]?.date ? 'O' : 'X'
                                  }
                                  onChange={(e) =>
                                    setNewMakeupMap((prev) => ({
                                      ...prev,
                                      [lesson.id]: {
                                        ...prev[lesson.id],
                                        date: e.target.value === 'O' ? '' : null,
                                      },
                                    }))
                                  }
                                >
                                  <option value="X">보강X</option>
                                  <option value="O">보강O</option>
                                </select>
                              </label>
                              {newMakeupMap[lesson.id]?.date !== null && (
                                <>
                                  <input
                                    type="date"
                                    value={
                                      newMakeupMap[lesson.id]?.date || ''
                                    }
                                    onChange={(e) =>
                                      setNewMakeupMap((prev) => ({
                                        ...prev,
                                        [lesson.id]: {
                                          ...prev[lesson.id],
                                          date: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                  <input
                                    type="text"
                                    placeholder="보강 테스트시간"
                                    value={
                                      newMakeupMap[lesson.id]?.test_time || ''
                                    }
                                    onChange={(e) =>
                                      setNewMakeupMap((prev) => ({
                                        ...prev,
                                        [lesson.id]: {
                                          ...prev[lesson.id],
                                          test_time: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                  <input
                                    type="text"
                                    placeholder="보강 수업시간"
                                    value={
                                      newMakeupMap[lesson.id]?.class_time || ''
                                    }
                                    onChange={(e) =>
                                      setNewMakeupMap((prev) => ({
                                        ...prev,
                                        [lesson.id]: {
                                          ...prev[lesson.id],
                                          class_time: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                </>
                              )}
                              <button
                                onClick={() => saveAbsentAndMakeup(lesson)}
                                style={{
                                  backgroundColor: '#00bcd4',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  marginTop: '4px',
                                }}
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        ) : (
                          lesson.status === null && (
                            <div>
                              <button
                                onClick={() => handlePresent(lesson)}
                                style={{
                                  backgroundColor: '#00bcd4',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  marginRight: '4px',
                                }}
                              >
                                출석
                              </button>
                              <button
                                onClick={() => handleAbsent(lesson)}
                                style={{
                                  backgroundColor: '#00bcd4',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                }}
                              >
                                결석
                              </button>
                            </div>
                          )
                        )}

                        {lesson.status && (
                          <button
                            onClick={() => resetLesson(lesson)}
                            style={{
                              marginTop: '4px',
                              backgroundColor: '#00bcd4',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                            }}
                          >
                            출결 초기화
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {/* 메모칸 */}
              <div style={{ marginTop: '0.5rem' }}>
                <textarea
                  placeholder="메모"
                  value={memoValue}
                  onChange={(e) =>
                    setMemos((prev) => ({
                      ...prev,
                      [memoLesson?.id || slot]: e.target.value,
                    }))
                  }
                  onBlur={async (e) => {
                    if (memoLesson) {
                      await supabase
                        .from('lessons')
                        .update({ memo: e.target.value || null })
                        .eq('id', memoLesson.id);
                    } else if (e.target.value.trim() !== '') {
                      await supabase.from('lessons').insert([
                        {
                          student_id: null,
                          date: selectedDate,
                          time: slot,
                          type: '메모',
                          memo: e.target.value,
                          teacher: selectedTeacher,
                        },
                      ]);
                    }
                    fetchLessons();
                  }}
                  style={{ width: '100%' }}
                  rows={2}
                />
              </div>

              <div style={{ marginTop: '4px' }}>
                <button
                  onClick={() => addTask(slot)}
                  style={{
                    fontSize: '12px',
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
        })}
      </div>
    </div>
  );
}