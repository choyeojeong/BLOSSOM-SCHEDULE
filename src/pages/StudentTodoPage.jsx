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
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
  const [todos, setTodos] = useState([]);
  const [memos, setMemos] = useState({});
  const [newTodos, setNewTodos] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStudent();
  }, [id]);

  useEffect(() => {
    fetchTodos();
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
    const memoData = {};
    data.forEach((todo) => {
      if (!grouped[todo.date]) grouped[todo.date] = [];
      grouped[todo.date].push(todo);
      if (todo.memo) memoData[todo.date] = todo.memo;
    });
    setTodos(grouped);
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
    const memo = memos[date] || '';
    const existing = todos[date]?.find((t) => t.memo !== undefined);
    if (existing) {
      await supabase.from('todos').update({ memo }).eq('id', existing.id);
    } else {
      await supabase.from('todos').insert([{ student_id: id, date, memo }]);
    }
    fetchTodos();
  };

  const generateMessage = () => {
    const dates = getDatesInRange();
    let msg = `[다음주차 할 일 (🔥)]\n\n`;
    dates.forEach((d) => {
      if (todos[d] && todos[d].length > 0) {
        const weekday = WEEKDAYS_KR[dayjs(d).day()];
        const mmdd = dayjs(d).format('MM/DD');
        msg += `${weekday}요일 (${mmdd})\n`;
        todos[d].forEach((t) => {
          if (t.content) msg += `- ${t.content}\n`;
        });
        msg += '\n';
      }
    });
    msg += '[강의목록]\n\n[단어시험]\n60문제, -3컷';
    setMessage(msg);
  };

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message);
    alert('복사되었습니다');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <button onClick={() => navigate(-1)}>← 뒤로가기</button>
      <h2>{student?.name} 학생 할일 관리</h2>
      <div>
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
          <div key={date} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem' }}>
            <strong>{dayjs(date).format('MM/DD (dd)')}</strong>
            <ul>
              {(todos[date] || []).filter(t => t.content).map((todo) => (
                <li key={todo.id}>
                  <input type="checkbox" checked={todo.done} onChange={() => toggleDone(todo)} /> {todo.content}
                  <button onClick={() => deleteTodo(todo)}>❌</button>
                </li>
              ))}
            </ul>
            <input
              type="text"
              value={newTodos[date] || ''}
              onChange={(e) => setNewTodos((prev) => ({ ...prev, [date]: e.target.value }))}
              placeholder="할일 추가"
            />
            <button onClick={() => addTodo(date)}>추가</button>
            <div style={{ marginTop: '0.5rem' }}>
              메모: <br />
              <textarea
                value={memos[date] || ''}
                onChange={(e) => setMemos((prev) => ({ ...prev, [date]: e.target.value }))}
                rows={3}
                style={{ width: '100%' }}
              />
              <button onClick={() => saveMemo(date)}>메모 저장</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '2rem' }}>
        <h3>📋 자동 메시지 생성</h3>
        <button onClick={generateMessage}>메시지 생성</button>
        <button onClick={copyMessage}>복사하기</button>
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', background: '#f8f8f8', padding: '1rem' }}>
          {message}
        </pre>
      </div>
    </div>
  );
}
