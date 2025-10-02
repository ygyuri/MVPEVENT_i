import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../utils/api';

const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    // Generate a simple UUID-like string without external dependencies
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

const getPlatform = () => {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/windows phone/i.test(ua)) return 'windows_phone';
    if (/mac/i.test(ua)) return 'macos';
    if (/windows/i.test(ua)) return 'windows';
    if (/linux/i.test(ua)) return 'linux';
    return 'web';
  }
  return 'unknown';
};

const useRegisterDevice = ({ enabled = true } = {}) => {
  const { isAuthenticated, user } = useSelector(state => state.auth);

  useEffect(() => {
    if (!enabled || !isAuthenticated || !user?._id) return;

    const deviceId = getDeviceId();
    const platform = getPlatform();

    const register = async () => {
      try {
        await api.post('/api/push/register-device', {
          token: deviceId, // Using deviceId as a unique token for now
          platform: platform,
          userId: user._id,
        });
        console.log('Device registered for push notifications.');
      } catch (error) {
        console.error('Failed to register device for push notifications:', error);
      }
    };

    register();
  }, [enabled, isAuthenticated, user?._id]);
};

export { useRegisterDevice };
export default useRegisterDevice;