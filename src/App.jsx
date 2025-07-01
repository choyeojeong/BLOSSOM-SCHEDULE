// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import StudentPage from './pages/StudentPage.jsx';
import OneToOneClassPage from './pages/OneToOneClassPage.jsx';
import KioskPage from './pages/KioskPage.jsx';
import StudentTodoPage from './pages/StudentTodoPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/students" element={<StudentPage />} />
        <Route path="/one-to-one" element={<OneToOneClassPage />} />
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="/student-todo/:id" element={<StudentTodoPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;