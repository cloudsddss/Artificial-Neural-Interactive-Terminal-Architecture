// App.tsx — 路由入口
// 职责：定义路由规则，不包含业务逻辑
import { BrowserRouter, Routes, Route,Navigate  } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import GamePage from './pages/GamePage';
import ScenarioHubPage from './pages/ScenarioHubPage';
import ProtectedRoute from './components/ProtectedRoute'; // 👈 引入守卫组件

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/hub" element={<ScenarioHubPage />} /> {/* 👈 新增 /hub 路由 */}
          <Route path="/game" element={<GamePage />} />
        </Route>
        {/* 3. 404 兜底路由：未知路径自动退回登录页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
