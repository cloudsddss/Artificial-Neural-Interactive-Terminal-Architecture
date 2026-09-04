import { Navigate, Outlet } from 'react-router-dom';
import { getStoredToken } from '../utils/api';

/**
 * 🛡️ 路由安全守卫组件 (Auth Route Guard)
 * 职责：检查本地是否存在身份令牌（Token）。
 * - 存在 Token：放行渲染子路由（<Outlet />）；
 * - 缺少 Token：强制重定向回登录页（/），阻止越权访问。
 */
export default function ProtectedRoute() {
  const token = getStoredToken();

  if (!token) {
    console.warn('[A.N.I.T.A. 防火墙] 检测到未授权路由访问，已强制拦截并退回登录终端。');
    return <Navigate to="/" replace />;
  }

  // 凭据存在，正常放行
  return <Outlet />;
}