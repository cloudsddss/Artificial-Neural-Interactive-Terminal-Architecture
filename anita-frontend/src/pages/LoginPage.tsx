// LoginPage — 登录页
// 职责：收集操作员代号，拉取/初始化存档，成功后跳转到 /game
import LoginScreen from '../components/LoginScreen';
import { useNavigate } from 'react-router-dom';
import type { Message, PlayerState } from '../types/type';

export default function LoginPage() {
  const navigate = useNavigate();

  // 登录成功回调：把数据通过 location.state 传给 GamePage
  const handleLoginSuccess = (playerId: string) => {
    console.log('Login successful:', { playerId });
     navigate('/hub', { state: { playerId } });
  };

  return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
}
