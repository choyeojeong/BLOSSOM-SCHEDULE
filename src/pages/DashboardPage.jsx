import { useNavigate } from "react-router-dom";

const styles = {
  container: {
    backgroundColor: '#eef3f9',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    textAlign: 'center',
    width: '320px',
  },
  title: {
    marginBottom: '24px',
    color: '#245ea8',
    fontSize: '22px',
    fontWeight: 'bold',
  },
  button: {
    width: '100%',
    padding: '12px',
    marginBottom: '12px',
    backgroundColor: '#245ea8',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.title}>📘 블라썸에듀 산본 수업시간표</h1>
        <button style={styles.button} onClick={() => navigate("/students")}>
          👩‍🎓 학생관리
        </button>
        <button style={styles.button} onClick={() => navigate("/teacher-select")}>
          📖 일대일수업관리
        </button>
        <button style={styles.button} onClick={() => navigate("/reading")}>
          📚 독해수업관리
        </button>
        <button style={styles.button} onClick={() => navigate("/kiosk")}>
          📝 키오스크
        </button>
        <button style={styles.button} onClick={() => navigate("/full-schedule")}>
          🗓 전체시간표
        </button>
        <button style={styles.button} onClick={() => navigate("/lectures")}>
          🎥 강의관리 {/* ✅ 강의 관리 버튼 */}
        </button>
      </div>
    </div>
  );
}

export default DashboardPage;
