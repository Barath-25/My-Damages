import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, Delete } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SecurityLockProps {
  correctPin: string;
  useBiometrics: boolean;
  onUnlock: () => void;
}

export default function SecurityLock({ correctPin, useBiometrics, onUnlock }: SecurityLockProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 500);
      }
    }
  }, [pin, correctPin, onUnlock]);

  const handleBiometric = async () => {
    if (window.PublicKeyCredential) {
      // Mock biometric success for demo purposes
      // In a real app, you'd use WebAuthn API
      onUnlock();
    }
  };

  const addDigit = (digit: string) => {
    if (pin.length < 4) setPin(prev => prev + digit);
  };

  const removeDigit = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-brand-bg flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xs w-full text-center"
      >
        <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-brand-primary" />
        </div>
        <h1 className="text-2xl font-bold text-brand-dark mb-2">Enter PIN</h1>
        <p className="text-zinc-500 text-sm mb-8">Secure access to your finances</p>

        <div className="flex justify-center gap-4 mb-12">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
              className={`w-4 h-4 rounded-full border-2 border-brand-primary transition-all ${
                pin.length > i ? 'bg-brand-primary scale-110' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => addDigit(digit.toString())}
              className="w-16 h-16 rounded-2xl bg-white border border-brand-accent/20 text-xl font-bold text-brand-dark hover:bg-brand-accent/10 active:scale-95 transition-all shadow-sm"
            >
              {digit}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {useBiometrics && (
              <button
                onClick={handleBiometric}
                className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary/20 active:scale-95 transition-all"
              >
                <Fingerprint className="w-8 h-8" />
              </button>
            )}
          </div>
          <button
            onClick={() => addDigit('0')}
            className="w-16 h-16 rounded-2xl bg-white border border-brand-accent/20 text-xl font-bold text-brand-dark hover:bg-brand-accent/10 active:scale-95 transition-all shadow-sm"
          >
            0
          </button>
          <button
            onClick={removeDigit}
            className="w-16 h-16 rounded-2xl bg-white border border-brand-accent/20 text-brand-dark flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all shadow-sm"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
