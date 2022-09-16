export function sigintOrsigTerm() {
  // 发送 SIGINT、 SIGTERM 和 SIGKILL 会导致目标进程被无条件地终止
  // 然后子进程会报告该进程已被信号终止
  // 'SIGINT' 在终端运行时，可以被所有平台支持
  // 'SIGTERM' 在 Windows 中不支持，可以给其绑定监听器
  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) =>
    process.on(signal, () => {
      process.exit(1);
    })
  );
}
