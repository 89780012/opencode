/** 先启动会话中止，再独立取消持久化工作流；取消请求不会阻塞中止完成。 */
export function halt(abort: () => Promise<void>, cancel: () => Promise<unknown>) {
  const stopping = abort()
  void Promise.resolve()
    .then(cancel)
    .catch(() => undefined)
  return stopping
}
