// App.tsx — 路由入口
// 职责：定义路由规则，不包含业务逻辑
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import GamePage from './pages/GamePage';
import ScenarioHubPage from './pages/ScenarioHubPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/hub" element={<ScenarioHubPage />} /> {/* 👈 新增 /hub 路由 */}
        <Route path="/game" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  );
}
