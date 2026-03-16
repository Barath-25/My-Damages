import React from 'react';
export default function SecurityLock({ correctPin, useBiometrics, onUnlock }: any) { 
  return <div onClick={onUnlock}>Click to Unlock</div>; 
}