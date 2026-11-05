// The engine accepts this tiny synchronous port; rendering and backend choice stay separate.
export function createPlatformStorage(runtime = globalThis) {
  if (runtime.wx?.getStorageSync && runtime.wx?.setStorageSync) {
    return {
      getItem(key) {
        const value = runtime.wx.getStorageSync(key);
        return typeof value === "string" && value ? value : null;
      },
      setItem(key, value) {
        runtime.wx.setStorageSync(key, String(value));
      },
      removeItem(key) {
        runtime.wx.removeStorageSync(key);
      },
    };
  }
  if (runtime.localStorage) return runtime.localStorage;
  throw new Error("当前环境未提供本地存储，请注入存储适配器。");
}
