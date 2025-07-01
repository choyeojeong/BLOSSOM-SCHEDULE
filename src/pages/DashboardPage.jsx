// src/pages/DashboardPage.jsx
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function DashboardPage() {
  const navigate = useNavigate();

  // 로그인 상태 확인
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true') {
      navigate('/');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📘 블라썸에듀 산본<br />일대일수업시간표</h1>
      <div style={styles.buttonContainer}>
        <button onClick={() => navigate('/students')} style={styles.button}>
          👩‍🎓 학생관리
        </button>
        <button onClick={() => navigate('/one-to-one')} style={styles.button}>
          🗓️ 수업관리
        </button>
      </div>
      <button onClick={handleLogout} style={styles.logout}>
        로그아웃
      </button>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#f2f6fc',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '80px',
  },
  title: {
    color: '#245ea8',
    fontSize: '28px',
    textAlign: 'center',
    marginBottom: '50px',
  },
  buttonContainer: {
    display: 'flex',
    gap: '30px',
    marginBottom: '40px',
  },
  button: {
    backgroundColor: '#245ea8',
    color: 'white',
    fontSize: '18px',
    padding: '16px 28px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  logout: {
    backgroundColor: '#aaa',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default DashboardPage;
