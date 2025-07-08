import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import StudentPage from "./pages/StudentPage";
import OneToOneClassPage from "./pages/OneToOneClassPage";
import ReadingClassPage from "./pages/ReadingClassPage";
import KioskPage from "./pages/KioskPage";
import StudentTodoPage from "./pages/StudentTodoPage"; // ✅ 추가

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/students" element={<StudentPage />} />
        <Route path="/one-to-one" element={<OneToOneClassPage />} />
        <Route path="/reading" element={<ReadingClassPage />} />
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="/student-todo/:id" element={<StudentTodoPage />} /> {/* ✅ 추가 */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
