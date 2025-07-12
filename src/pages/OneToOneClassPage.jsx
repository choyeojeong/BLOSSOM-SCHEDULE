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
  const [fixedSchedules, setFixedSchedules] = useState([]);
  const [memos, setMemos] = useState({});
  const [absentEditId, setAbsentEditId] = useState(null);
  const [absentReasonMap, setAbsentReasonMap] = useState({});
  const [newMakeupMap, setNewMakeupMap] = useState({});

  useEffect(() => {
    const savedTeacher = localStorage.getItem('selectedTeacher');
    if (savedTeacher) setSelectedTeacher(savedTeacher);
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchStudents();

    const studentChannel = supabase
      .channel('public:students')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        () => {
          fetchStudents();
          fetchLessons();
        }
      )
      .subscribe();

    const lessonChannel = supabase
      .channel('public:lessons')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lessons' },
        () => {
          fetchLessons();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(studentChannel);
      supabase.removeChannel(lessonChannel);
    };
  }, []);

  useEffect(() => {
    if (selectedTeacher && selectedDate) {
      fetchStudents();
      fetchLessons();
      fetchFixedSchedules();
      setMemos({});
    }
  }, [selectedTeacher, selectedDate]);

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from('students')
      .select('teacher')
      .neq('teacher', '');
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
      .eq('date', selectedDate);
    setLessons(data || []);
  };

  const fetchFixedSchedules = async () => {
    const { data } = await supabase
      .from('fixed_schedules')
      .select('*')
      .eq('teacher_name', selectedTeacher)
      .order('weekday')
      .order('time');
    setFixedSchedules(data || []);
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
    let makeupLessonId = null;

    await supabase.from('lessons').update({
      status: '결석',
      absent_reason: reason,
    }).eq('id', lesson.id);

    if (makeup.date && makeup.test_time && makeup.class_time) {
      const { data: existing } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', lesson.student_id)
        .eq('date', makeup.date)
        .eq('time', makeup.class_time)
        .eq('type', '보강');

      if (existing.length > 0) {
        alert('이미 해당 시간에 보강 수업이 있습니다.');
        return;
      }

      const { data } = await supabase
        .from('lessons')
        .insert([{
          student_id: lesson.student_id,
          date: makeup.date,
          time: makeup.class_time,
          test_time: makeup.test_time,
          type: '보강',
          original_lesson_id: lesson.id,
          teacher: selectedTeacher,
        }])
        .select();
      if (data && data[0]) {
        makeupLessonId = data[0].id;
        await supabase
          .from('lessons')
          .update({ makeup_lesson_id: makeupLessonId })
          .eq('id', lesson.id);
      }
    }

    setAbsentEditId(null);
    fetchLessons();
  };

  const resetLesson = async (lesson) => {
    if (lesson.makeup_lesson_id) {
      await supabase.from('lessons').delete().eq('id', lesson.makeup_lesson_id);
    }
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
    let task = prompt(`업무 내용을 입력하세요 (${slot})`);
    if (task) {
      task = task.trim();
      if (task !== '') {
        const { error } = await supabase.from('lessons').insert([{
          student_id: null,
          date: selectedDate,
          time: slot,
          type: '업무',
          task: task,
          teacher: selectedTeacher,
        }]);
        if (error) {
          console.error('업무 저장 오류:', error.message);
          alert('업무 저장에 실패했습니다.');
        } else {
          fetchLessons();
        }
      } else {
        alert('업무 내용을 입력해야 합니다.');
      }
    }
  };

  const deleteTask = async (taskId) => {
    if (window.confirm('정말 이 업무를 삭제하시겠습니까?')) {
      await supabase.from('lessons').delete().eq('id', taskId);
      fetchLessons();
    }
  };

  const slots = dayjs(selectedDate).day() === 6 ? saturdaySlots : weekdaySlots;

  const uniqueByStudent = (arr) => {
    const seen = new Set();
    return arr.filter((item) => {
      const key = `${item.student_id}-${item.time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <button onClick={() => navigate("/teacher-options")}>← 뒤로가기</button>
      <h2>일대일 수업 관리</h2>
      <label>
        선생님 선택:
        <select
          value={selectedTeacher}
          onChange={(e) => {
            setSelectedTeacher(e.target.value);
            localStorage.setItem('selectedTeacher', e.target.value);
          }}
        >
          <option value="">--</option>
          {teachers.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => {
          setSelectedDate(e.target.value);
          localStorage.setItem('selectedDate', e.target.value);
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
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

          const memoLesson = items.find((l) => l.type === '메모');
          const normalLessons = uniqueByStudent(items.filter((l) => l.type !== '메모'));
          const bgColor =
            normalLessons.find((l) => l.type !== '업무')?.type === '보강'
              ? '#fff9cc'
              : normalLessons.find((l) => l.type !== '업무')?.status === '결석'
              ? '#ffe5e5'
              : normalLessons.find((l) => l.type !== '업무')?.status === '출석'
              ? '#e0f7fa'
              : '#f0f0f0';

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

              {normalLessons.map((lesson) => (
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
                      <span>📌 업무: {lesson.task?.trim() || '(내용없음)'}</span>
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
                      {lesson.student_id && studentsMap[lesson.student_id] && (
                        <div style={{ fontWeight: 'bold' }}>
                          <button
                            onClick={() =>
                              navigate(`/student-todo/${lesson.student_id}`)
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
                            {studentsMap[lesson.student_id].name} (
                            {studentsMap[lesson.student_id].school}{' '}
                            {studentsMap[lesson.student_id].grade})
                          </button>
                        </div>
                      )}
                      <div>테스트: {lesson.test_time}</div>
                      <div>수업: {lesson.time}</div>
                      {lesson.status === '출석' && (
                        <div style={{ color: '#009688', marginTop: '4px' }}>
                          출석시간: {lesson.checkin_time} (
                          {lesson.on_time ? '정시 출석' : `${lesson.late_minutes}분 지각`})
                        </div>
                      )}
                      {lesson.absent_reason && (
                        <div style={{ color: 'red' }}>사유: {lesson.absent_reason}</div>
                      )}
                      {lesson.status === '결석' && lesson.makeup_lesson_id && (
                        <div style={{ color: '#ff9800' }}>
                          보강일:{' '}
                          {
                            lessons.find(l => l.id === lesson.makeup_lesson_id)
                              ?.date
                          }{' '}
                          {
                            lessons.find(l => l.id === lesson.makeup_lesson_id)
                              ?.time
                          }
                        </div>
                      )}
                      {lesson.type === '보강' && lesson.original_lesson_id && (
                        <div style={{ color: '#f44336' }}>
                          원결석일:{' '}
                          {
                            lessons.find(l => l.id === lesson.original_lesson_id)
                              ?.date
                          }
                          <br />
                          결석사유:{' '}
                          {
                            lessons.find(l => l.id === lesson.original_lesson_id)
                              ?.absent_reason
                          }
                        </div>
                      )}
                      {absentEditId === lesson.id ? (
                        <div style={{ marginTop: '4px' }}>
                          <textarea
                            placeholder="결석 사유 입력"
                            value={absentReasonMap[lesson.id]}
                            onChange={(e) =>
                              setAbsentReasonMap((prev) => ({
                                ...prev,
                                [lesson.id]: e.target.value,
                              }))
                            }
                            rows={2}
                            style={{ width: '100%', marginBottom: '4px' }}
                          />
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
                            style={{ marginBottom: '4px', width: '100%' }}
                          />
                          <input
                            type="text"
                            placeholder="보강 테스트시간"
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
                            style={{ marginBottom: '4px', width: '100%' }}
                          />
                          <input
                            type="text"
                            placeholder="보강 수업시간"
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
                            style={{ marginBottom: '4px', width: '100%' }}
                          />
                          <div>
                            <button
                              onClick={() => saveAbsentAndMakeup(lesson)}
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
                              저장
                            </button>
                            <button
                              onClick={() => setAbsentEditId(null)}
                              style={{
                                backgroundColor: '#ccc',
                                color: '#333',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                              }}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : lesson.status === null ? (
                        <div style={{ marginTop: '4px' }}>
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
                              backgroundColor: '#f44336',
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
                      ) : (
                        <button
                          onClick={() => resetLesson(lesson)}
                          style={{
                            marginTop: '4px',
                            backgroundColor: '#ff9800',
                            color: 'white',
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
              ))}
              <div style={{ marginTop: '0.5rem' }}>
                <textarea
                  placeholder="메모"
                  value={
                    memos[memoLesson?.id || slot] ?? memoLesson?.memo ?? ''
                  }
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setMemos((prev) => ({
                      ...prev,
                      [memoLesson?.id || slot]: newValue,
                    }));
                  }}
                  onBlur={async (e) => {
                    const newValue = e.target.value;
                    if (memoLesson) {
                      await supabase
                        .from('lessons')
                        .update({ memo: newValue || null })
                        .eq('id', memoLesson.id);
                    } else if (newValue !== '') {
                      const { data } = await supabase
                        .from('lessons')
                        .insert([{
                          student_id: null,
                          date: selectedDate,
                          time: slot,
                          type: '메모',
                          memo: newValue,
                          teacher: selectedTeacher,
                        }])
                        .select();
                      if (data && data[0]) {
                        setMemos((prev) => ({
                          ...prev,
                          [data[0].id]: newValue,
                        }));
                      }
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
