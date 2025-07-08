import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import StudentPage from "./pages/StudentPage";
import OneToOneClassPage from "./pages/OneToOneClassPage";
import ReadingClassPage from "./pages/ReadingClassPage";
import KioskPage from "./pages/KioskPage";

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
