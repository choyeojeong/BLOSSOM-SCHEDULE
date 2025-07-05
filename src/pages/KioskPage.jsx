// src/pages/KioskPage.jsx
import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import dayjs from 'dayjs';

function KioskPage() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setMessage('');
    const today = dayjs().format('YYYY-MM-DD');
    const nowTime = dayjs();

    // 전화번호로 학생 조회
    const { data: students } = await supabase
      .from('students')
      .select('*')
      .eq('phone', phone.trim());

    if (!students || students.length === 0) {
      setMessage('학생을 찾을 수 없습니다.');
      setIsLoading(false);
      return;
    }

    const student = students[0];

    // 오늘 수업 조회 (보강 포함)
    const { data: todayLessons } = await supabase
      .from('lessons')
      .select('*')
      .eq('student_id', student.id)
      .eq('date', today);

    if (!todayLessons || todayLessons.length === 0) {
      setMessage('오늘 수업이 없습니다.');
      setIsLoading(false);
      return;
    }

    let updated = false;

    for (const lesson of todayLessons) {
      if (!lesson.status && lesson.test_time) {
        const testTime = dayjs(`${lesson.date} ${lesson.test_time}`);
        const diff = nowTime.diff(testTime, 'minute');
        const isLate = diff > 0;
        const lateText = isLate ? `${diff}분 지각` : '정시 도착';

        await supabase.from('lessons').update({
          status: '출석',
          checkin_time: nowTime.format('HH:mm'),
          late_minutes: isLate ? diff : 0,
          on_time: !isLate,
        }).eq('id', lesson.id);

        setMessage(`출석 완료 (${nowTime.format('HH:mm')}, ${lateText})`);
        updated = true;
        break;
      }
    }

    if (!updated) {
      setMessage('이미 출석 처리된 수업이거나 모든 수업이 결석 상태입니다.');
    }

    setIsLoading(false);
    setPhone('');
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>📲 키오스크 출석</h2>
      <input
        type="text"
        value={phone}
        placeholder="전화번호 입력"
        onChange={(e) => setPhone(e.target.value)}
        style={{ fontSize: '20px', padding: '10px', width: '250px' }}
        disabled={isLoading}
      />
      <br /><br />
      <button onClick={handleSubmit} disabled={isLoading} style={{ fontSize: '18px', padding: '10px 20px' }}>
        출석 확인
      </button>
      <p style={{ marginTop: '20px', fontSize: '18px', color: '#245ea8' }}>{message}</p>
    </div>
  );
}

export default KioskPage;