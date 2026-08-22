import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

export default function App() {
  const [status, setStatus] = useState('Connecting to real-time server...');

  useEffect(() => {
    socket.on('connect', () => {
      setStatus('Connected to real-time sync server!');
    });
    socket.on('disconnect', () => {
      setStatus('Disconnected from server.');
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-extrabold text-orange-500 mb-4">CS2 Stratbook & Tactics</h1>
      <p className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg text-emerald-400 font-mono">
        {status}
      </p>
    </div>
  );
}