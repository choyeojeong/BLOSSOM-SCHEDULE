// src/pages/StudentTodoPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { supabase } from '../utils/supabaseClient';
import weekday from 'dayjs/plugin/weekday';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import 'dayjs/locale/ko';

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.extend(isSameOrBefore);
dayjs.locale('ko');

const WEEKDAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

export default function StudentTodoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    return localStorage.getItem('todoStartDate') || dayjs().format('YYYY-MM-DD');
  });
  const [endDate, setEndDate] = useState(() => {
    return localStorage.getItem('todoEndDate') || dayjs().add(7, 'day').format('YYYY-MM-DD');
  });
  const [todos, setTodos] = useState([]);
  const [memos, setMemos] = useState({});
  const [newTodos, setNewTodos] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('todoStartDate', startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('todoEndDate', endDate);
  }, [endDate]);

  useEffect(() => {
    fetchStudent();
  }, [id]);

  useEffect(() => {
    fetchTodos();
    fetchMemos();
  }, [startDate, endDate, id]);

  const fetchStudent = async () => {
    const { data } = await supabase.from('students').select('*').eq('id', id).single();
    setStudent(data);
  };

  const fetchTodos = async () => {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('student_id', id)
      .gte('date', startDate)
      .lte('date', endDate);

    const grouped = {};
    data.forEach((todo) => {
      if (!grouped[todo.date]) grouped[todo.date] = [];
      grouped[todo.date].push(todo);
    });
    setTodos(grouped);
  };

  const fetchMemos = async () => {
    const { data } = await supabase
      .from('memos')
      .select('*')
      .eq('student_id', id)
      .gte('date', startDate)
      .lte('date', endDate);

    const memoData = {};
    data.forEach((memo) => {
      memoData[memo.date] = memo.content;
    });
    setMemos(memoData);
  };

  const getDatesInRange = () => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const dates = [];
    let current = start;
    while (current.isSameOrBefore(end)) {
      dates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }
    return dates;
  };

  const addTodo = async (date) => {
    const content = newTodos[date];
    if (!content) return;
    await supabase.from('todos').insert([{ student_id: id, date, content }]);
    setNewTodos((prev) => ({ ...prev, [date]: '' }));
    fetchTodos();
  };

  const toggleDone = async (todo) => {
    await supabase.from('todos').update({ done: !todo.done }).eq('id', todo.id);
    fetchTodos();
  };

  const deleteTodo = async (todo) => {
    await supabase.from('todos').delete().eq('id', todo.id);
    fetchTodos();
  };

  const saveMemo = async (date) => {
    const content = memos[date] || '';
    const { data: existing } = await supabase
      .from('memos')
      .select('*')
      .eq('student_id', id)
      .eq('date', date)
      .single();

    if (existing) {
      await supabase.from('memos').update({ content }).eq('id', existing.id);
    } else {
      await supabase.from('memos').insert([{ student_id: id, date, content }]);
    }
    fetchMemos();
  };

  const generateMessage = () => {
    const dates = getDatesInRange();
    let msg = `[${student?.name} 학생 다음주차 할 일 (🔥)]\n\n`;
    dates.forEach((d) => {
      const weekday = WEEKDAYS_KR[dayjs(d).day()];
      const mmdd = dayjs(d).format('MM/DD');
      if (todos[d]?.length > 0) {
        msg += `${weekday} (${mmdd})\n`;
        todos[d].forEach((t) => {
          msg += `- ${t.content}\n`;
        });
        msg += '\n';
      }
    });
    msg += '[강의목록]\n\n[단어시험]\n60문제, -3컷';
    setMessage(msg);
  };

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message);
    alert('복사되었습니다!');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <button onClick={() => navigate(-1)}>← 뒤로가기</button>
      <h2>{student?.name} 학생 할일 관리</h2>
      <div style={{ marginBottom: '1rem' }}>
        시작일:{' '}
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        종료일:{' '}
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        {getDatesInRange().map((date) => (
          <div
            key={date}
            style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem' }}
          >
            <strong>{dayjs(date).format('MM/DD (dd)')}</strong>
            <ul style={{ paddingLeft: '1rem' }}>
              {(todos[date] || []).map((todo) => (
                <li
                  key={todo.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}
                >
                  <span>
                    <input
                      type="checkbox"
                      checked={todo.done}
                      onChange={() => toggleDone(todo)}
                    />{' '}
                    {todo.content}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'red',
                      cursor: 'pointer',
                    }}
                  >
                    ❌
                  </button>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: '0.5rem' }}>
              <input
                type="text"
                value={newTodos[date] || ''}
                onChange={(e) =>
                  setNewTodos((prev) => ({ ...prev, [date]: e.target.value }))
                }
                placeholder="할일 추가"
                style={{ width: '100%' }}
              />
              <button onClick={() => addTodo(date)} style={{ marginTop: '4px' }}>
                추가
              </button>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              메모: <br />
              <textarea
                value={memos[date] || ''}
                onChange={(e) =>
                  setMemos((prev) => ({ ...prev, [date]: e.target.value }))
                }
                onBlur={() => saveMemo(date)} // 🆕 포커스 잃을 때 자동 저장
                rows={3}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '2rem' }}>
        <h3>📋 자동 메시지 생성</h3>
        <button onClick={generateMessage}>메시지 생성</button>
        <button onClick={copyMessage} style={{ marginLeft: '8px' }}>
          복사하기
        </button>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            marginTop: '1rem',
            background: '#f8f8f8',
            padding: '1rem',
            borderRadius: '8px',
          }}
        >
          {message}
        </pre>
      </div>
    </div>
  );
}
