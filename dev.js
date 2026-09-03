const { spawn } = require('child_process');

console.log('\x1b[35m============================================================\x1b[0m');
console.log('\x1b[35m  A.N.I.T.A. 引擎 · 一键全栈启动中 (Dual-Service Launcher)  \x1b[0m');
console.log('\x1b[35m============================================================\x1b[0m\n');

// 1. 启动后端 (anita-backend)
const backend = spawn('npm start', {
  cwd: 'anita-backend',
  shell: true,
  stdio: 'pipe',
});

// 2. 启动前端 (anita-frontend)
const frontend = spawn('npm run dev', {
  cwd: 'anita-frontend',
  shell: true,
  stdio: 'pipe',
});

// 管道日志转发：添加彩色服务前缀
function pipeOutput(child, prefix, color) {
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        process.stdout.write(`${color}[${prefix}]\x1b[0m ${line}\n`);
      }
    }
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        process.stderr.write(`${color}[${prefix}]\x1b[0m ${line}\n`);
      }
    }
  });
}

pipeOutput(backend, 'BACKEND ', '\x1b[36m'); // 青色
pipeOutput(frontend, 'FRONTEND', '\x1b[32m'); // 绿色

// 优雅退出：按下 Ctrl+C 时同步杀掉前后端子进程
const cleanup = () => {
  console.log('\n\x1b[33m[A.N.I.T.A.] 正在停止所有服务...\x1b[0m');
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
