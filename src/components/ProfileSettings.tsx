import React, { useState } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { UserCircle, Camera, Shield, ArrowRight } from 'lucide-react';

interface ProfileSettingsProps {
  user: User;
  onComplete: () => void;
}

export default function ProfileSettings({ user, onComplete }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [upiId, setUpiId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create user profile
      try {
        await setDoc(doc(db, 'users', user.uid), {
          displayName,
          photoURL,
          upiId: upiId || null,
          securityPin: pin || null,
          setupComplete: true,
          uid: user.uid,
          createdAt: Timestamp.now(),
          email: user.email,
          role: 'user'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }

      // Create default account
      try {
        await addDoc(collection(db, 'accounts'), {
          name: 'Main Account',
          type: 'bank',
          balance: 0,
          uid: user.uid,
          createdAt: Timestamp.now(),
          isMain: true
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'accounts');
      }

      onComplete();
    } catch (error) {
      console.error('Error setting up profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-black/5">
        <div className="text-center mb-8">
          <div className="relative inline-block">
            {photoURL ? (
              <img src={photoURL} className="w-20 h-20 rounded-2xl border-2 border-brand-accent shadow-lg" alt="Profile" />
            ) : (
              <div className="w-20 h-20 bg-brand-bg rounded-2xl flex items-center justify-center border-2 border-brand-accent shadow-lg">
                <UserCircle className="w-10 h-10 text-brand-primary" />
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 p-2 bg-brand-primary text-white rounded-lg shadow-lg">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-brand-dark mt-4">Complete Your Profile</h1>
          <p className="text-zinc-500 text-sm">Let's personalize your My Damages experience</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-brand-dark uppercase tracking-widest mb-2">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
              placeholder="How should we call you?"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark uppercase tracking-widest mb-2">Photo URL</label>
            <input
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
              placeholder="https://example.com/photo.jpg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark uppercase tracking-widest mb-2">UPI ID (for QR generation)</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
              placeholder="yourname@upi"
            />
          </div>

          <div className="p-4 bg-brand-bg/20 rounded-2xl border border-brand-accent/10">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-brand-primary" />
              <h3 className="font-bold text-brand-dark">App Security</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-dark uppercase tracking-widest mb-2">Security PIN (4 digits)</label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-white border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-center text-2xl tracking-[1em]"
                  placeholder="••••"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Optional: Leave blank to skip PIN security</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-dark transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20"
          >
            {loading ? 'Setting up...' : 'Start Tracking'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
