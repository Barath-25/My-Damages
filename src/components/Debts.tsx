import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { User, Plus, Trash2, HandCoins, CheckCircle, X, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DebtItem {
  id: string;
  personName: string;
  amount: number;
  description: string;
  isPaid: boolean;
  uid: string;
  createdAt: Timestamp;
}

export default function Debts() {
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'debts'),
      where('uid', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DebtItem[];
      
      data.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setDebts(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'debts');
    });

    return () => unsubscribe();
  }, []);

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'debts'), {
        personName,
        amount: parseFloat(amount),
        description,
        isPaid: false,
        uid: auth.currentUser.uid,
        createdAt: Timestamp.now()
      });
      setPersonName('');
      setAmount('');
      setDescription('');
      setShowAddModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'debts');
    } finally {
      setLoading(false);
    }
  };

  const togglePaid = async (debt: DebtItem) => {
    try {
      await updateDoc(doc(db, 'debts', debt.id), {
        isPaid: !debt.isPaid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `debts/${debt.id}`);
    }
  };

  const deleteDebt = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'debts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `debts/${id}`);
    }
  };

  const totalOwed = debts.filter(d => !d.isPaid).reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-brand-dark tracking-tight">People Owe Me</h2>
          <p className="text-brand-dark/50 font-medium">Track money lent to friends and family</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand-primary/20"
        >
          <Plus className="w-5 h-5" />
          Add Person
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-brand-primary p-8 rounded-[2.5rem] text-white shadow-xl shadow-brand-primary/20">
            <HandCoins className="w-10 h-10 mb-4 opacity-50" />
            <p className="text-sm font-bold uppercase tracking-widest opacity-70 mb-1">Total Outstanding</p>
            <h3 className="text-4xl font-black tracking-tight">₹{totalOwed.toLocaleString()}</h3>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          {debts.map((debt) => (
            <motion.div
              layout
              key={debt.id}
              className={`bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm flex items-center justify-between group transition-all ${debt.isPaid ? 'opacity-50 grayscale' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${debt.isPaid ? 'bg-emerald-50 text-emerald-500' : 'bg-brand-bg text-brand-primary'}`}>
                  {debt.isPaid ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-lg font-black text-brand-dark">{debt.personName}</h4>
                  <p className="text-sm text-brand-dark/40 font-medium">{debt.description || 'No description'}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xl font-black text-brand-dark">₹{debt.amount.toLocaleString()}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${debt.isPaid ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {debt.isPaid ? 'Settled' : 'Pending'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => togglePaid(debt)}
                    className={`p-3 rounded-xl transition-all ${debt.isPaid ? 'bg-brand-bg text-brand-dark/40 hover:text-brand-dark' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteDebt(debt.id)}
                    className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {debts.length === 0 && (
            <div className="py-20 text-center bg-brand-bg/20 rounded-[2rem] border-2 border-dashed border-brand-accent/20">
              <HandCoins className="w-12 h-12 text-brand-dark/20 mx-auto mb-4" />
              <p className="text-brand-dark/40 font-black italic">No one owes you anything. Lucky you!</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Debt Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-brand-dark/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl border border-black/5"
            >
              <h3 className="text-2xl font-black text-brand-dark mb-6 tracking-tight">Lend Money</h3>
              <form onSubmit={handleAddDebt} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Person's Name</label>
                  <input
                    type="text"
                    required
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="₹0.00"
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. For lunch"
                    className="w-full px-4 py-3 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 px-6 rounded-2xl font-black text-brand-dark/60 hover:bg-brand-bg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 px-6 rounded-2xl font-black bg-brand-primary text-white hover:bg-brand-dark shadow-lg shadow-brand-primary/20 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Entry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
