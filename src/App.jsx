import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import ManagerPage from './pages/ManagerPage';
import ProjectorPage from './pages/ProjectorPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/manager" element={<ManagerPage />} />
      <Route path="/projector" element={<ProjectorPage />} />
    </Routes>
  );
}
