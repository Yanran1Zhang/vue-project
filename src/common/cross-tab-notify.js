/**
 * 跨标签页通知工具
 * 使用 localStorage + storage 事件实现同一 origin 下不同标签页之间的消息通知
 */

const STORAGE_KEY = 'cne_config_update';

/**
 * 发送配置更新通知（由保存方调用）
 * @param {String} source 更新来源，如 'kpi-edit'、'threshold-config'
 */
export function notifyConfigUpdate(source) {
  const timestamp = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({source, timestamp}));
}

/**
 * 监听配置更新通知（由消费方调用）
 * @param {Function} callback 收到通知时的回调，参数为 {source, timestamp}
 * @returns {Function} 取消监听的函数
 */
export function onConfigUpdate(callback) {
  function handler(event) {
    if (event.key !== STORAGE_KEY) {
      return;
    }
    try {
      const data = JSON.parse(event.newValue);
      if (data && data.source && data.timestamp) {
        callback(data);
      }
    } catch (e) {
      // ignore
    }
  }
  window.addEventListener('storage', handler);
  return function off() {
    window.removeEventListener('storage', handler);
  };
}
