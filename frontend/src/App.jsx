import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

export default function App() {
  const [status, setStatus] = useState('Connecting...');
  const [players, setPlayers] = useState([
    { id: 'T1', type: 'T', x: 150, y: 200, label: '1' },
    { id: 'T2', type: 'T', x: 150, y: 260, label: '2' },
    { id: 'CT1', type: 'CT', x: 500, y: 200, label: '1' },
    { id: 'CT2', type: 'CT', x: 500, y: 260, label: '2' }
  ]);
  
  const [draggingId, setDraggingId] = useState(null);
  const boardRef = useRef(null);

  useEffect(() => {
    socket.on('connect', () => setStatus('Connected'));
    socket.on('disconnect', () => setStatus('Disconnected'));
    
    socket.on('strat-update', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('strat-update');
    };
  }, []);

  const handleMouseDown = (id) => {
    setDraggingId(id);
  };

  const handleMouseMove = (e) => {
    if (!draggingId || !boardRef.current) return;
    
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.max(20, Math.min(rect.width - 20, e.clientX - rect.left));
    const y = Math.max(20, Math.min(rect.height - 20, e.clientY - rect.top));

    const updated = players.map(p => p.id === draggingId ? { ...p, x, y } : p);
    setPlayers(updated);
    
    socket.emit('strat-update', updated);
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header with Custom Branding */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-black tracking-wider text-cyan-400 uppercase">CS2 Stratbook</h1>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">v1.0 Scratch Edition</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`h-2.5 w-2.5 rounded-full ${status === 'Connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
          <span className="text-xs text-slate-400 font-mono">{status}</span>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-6 flex gap-6 select-none">
        {/* Interactive Tactics Board */}
        <div 
          ref={boardRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden h-[650px] shadow-2xl flex items-center justify-center cursor-crosshair"
        >
          {/* Tactical Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none"></div>
          
          <div className="absolute uppercase tracking-widest text-slate-700 text-7xl font-black pointer-events-none opacity-20">
            DE_MIRAGE
          </div>

          {/* Draggable Player Tokens */}
          {players.map(player => (
            <div
              key={player.id}
              onMouseDown={() => handleMouseDown(player.id)}
              style={{ left: `${player.x}px`, top: `${player.y}px` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-shadow hover:shadow-cyan-500/20 ${
                player.type === 'T' 
                  ? 'bg-amber-600 text-white border-2 border-amber-400' 
                  : 'bg-blue-600 text-white border-2 border-blue-400'
              }`}
            >
              {player.type}{player.label}
            </div>
          ))}

          <div className="absolute bottom-4 left-4 text-xs text-slate-400 bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800 pointer-events-none">
            💡 Click and drag player tokens to position them. Open two browser tabs to test real-time sync!
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-80 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <h2 className="font-bold text-slate-200 border-b border-slate-800 pb-3 text-sm uppercase tracking-wider">Strategy Info</h2>
          <div className="text-sm space-y-2 text-slate-400">
            <p><strong className="text-slate-200">Active Map:</strong> Mirage</p>
            <p><strong className="text-slate-200">Side:</strong> T-Side Execute</p>
            <p><strong className="text-slate-200">Synced Clients:</strong> Active</p>
          </div>
          <div className="mt-auto">
            <button 
              onClick={() => alert('Strategy saved locally!')}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-cyan-900/20"
            >
              Save Strategy State
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}