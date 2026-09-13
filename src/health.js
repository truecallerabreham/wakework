export function checkHealth() {
  return {
    status: 'ok',
    uptime: process.uptime(),
    sessions: 0,
    version: '1.0.0'
  };
}
