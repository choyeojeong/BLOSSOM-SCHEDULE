// src/pages/StudentPage.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

function StudentPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    name: '',
    school: '',
    grade: '',
    teacher: '',
    phone: '',
    first_day: '',
    one_day: '',
    one_test_time: '',
    one_class_time: '',
    reading_days: [],
    reading_times: {},
  });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*');
    setStudents(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      reading_days: form.reading_days,
      reading_times: form.reading_times,
    };
    if (editingId) {
      await supabase.from('students').update(payload).eq('id', editingId);
    } else {
      await supabase.from('students').insert(payload);
    }
    setForm({
      name: '',
      school: '',
      grade: '',
      teacher: '',
      phone: '',
      first_day: '',
      one_day: '',
      one_test_time: '',
      one_class_time: '',
      reading_days: [],
      reading_times: {},
    });
    setEditingId(null);
    fetchStudents();
  };

  const handleEdit = (student) => {
    setForm(student);
    setEditingId(student.id);
  };

  const handleDelete = async (id) => {
    const withdraw = prompt('퇴원일을 YYYY-MM-DD 형식으로 입력하세요');
    if (withdraw) {
      await supabase.from('lessons').delete().match({ student_id: id }).gte('date', withdraw);
      await supabase.from('students').delete().eq('id', id);
      fetchStudents();
    }
  };

  const filteredStudents = students.filter((s) => {
    const keyword = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(keyword) ||
      s.school?.toLowerCase().includes(keyword) ||
      s.grade?.toLowerCase().includes(keyword) ||
      s.teacher?.toLowerCase().includes(keyword)
    );
  });

  const toggleReadingDay = (day) => {
    const newDays = form.reading_days.includes(day)
      ? form.reading_days.filter((d) => d !== day)
      : [...form.reading_days, day];
    setForm({ ...form, reading_days: newDays });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>학생 등록</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '8px' }}>
        <input required placeholder="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="학교" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
        <input placeholder="학년" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
        <input placeholder="담당 선생님" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
        <input placeholder="전화번호 (숫자만)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <label>
          첫 수업일: <input type="date" value={form.first_day} onChange={(e) => setForm({ ...form, first_day: e.target.value })} />
        </label>
        <input placeholder="일대일 요일 (예: 월)" value={form.one_day} onChange={(e) => setForm({ ...form, one_day: e.target.value })} />
        <input placeholder="일대일 테스트시간" value={form.one_test_time} onChange={(e) => setForm({ ...form, one_test_time: e.target.value })} />
        <input placeholder="일대일 수업시간" value={form.one_class_time} onChange={(e) => setForm({ ...form, one_class_time: e.target.value })} />
        <div>
          <div>독해 요일 선택 (최대 4일)</div>
          {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
            <label key={day} style={{ marginRight: '8px' }}>
              <input
                type="checkbox"
                checked={form.reading_days.includes(day)}
                onChange={() => toggleReadingDay(day)}
              />{' '}
              {day}
            </label>
          ))}
        </div>
        {form.reading_days.map((day) => (
          <input
            key={day}
            placeholder={`${day} 독해시간`}
            value={form.reading_times[day] || ''}
            onChange={(e) =>
              setForm({
                ...form,
                reading_times: { ...form.reading_times, [day]: e.target.value },
              })
            }
          />
        ))}
        <button type="submit">{editingId ? '수정' : '등록'}</button>
      </form>

      <h2 style={{ marginTop: '40px' }}>학생 목록</h2>
      <input
        type="text"
        placeholder="이름, 학교, 학년, 담당T 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '12px', width: '300px' }}
      />

      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>번호</th>
            <th>이름</th>
            <th>학교</th>
            <th>학년</th>
            <th>담당T</th>
            <th>일대일 요일</th>
            <th>일대일 테스트시간</th>
            <th>일대일 수업시간</th>
            <th>수정</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map((s, idx) => (
            <tr key={s.id} style={{ textAlign: 'center' }}>
              <td>{idx + 1}</td>
              <td>{s.name}</td>
              <td>{s.school}</td>
              <td>{s.grade}</td>
              <td>{s.teacher}</td>
              <td>{s.one_day}</td>
              <td>{s.one_test_time}</td>
              <td>{s.one_class_time}</td>
              <td>
                <button onClick={() => handleEdit(s)}>수정</button>
              </td>
              <td>
                <button onClick={() => handleDelete(s.id)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StudentPage;
