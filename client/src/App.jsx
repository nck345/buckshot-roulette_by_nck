import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameTable from './components/GameTable';
import GameOverModal from './components/GameOverModal';
import { soundManager } from './audio/soundManager';
import { LocalGameEngine } from './utils/localGameEngine';
import './styles/theme.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [privateHint, setPrivateHint] = useState('');
  const [isShake, setIsShake] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);

  const localEngineRef = useRef(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server:', newSocket.id);
    });

    newSocket.on('game_state_update', (state) => {
      if (!isLocalMode) {
        setGameState(state);
        if (state.code) setRoomCode(state.code);

        const lastLog = state.logs?.[state.logs.length - 1];
        if (lastLog?.text.includes('💥')) {
          triggerShake();
        }
      }
    });

    newSocket.on('private_hint', ({ hint }) => {
      setPrivateHint(hint);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isLocalMode]);

  const triggerShake = () => {
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
  };

  // ONLINE ACTIONS WITH CUSTOM INITIAL HP & ITEMS
  const handleCreateRoom = (nickname, initialHp, initialItems) => {
    if (!socket) return;
    setIsLocalMode(false);
    socket.emit('create_room', { nickname, initialHp, initialItems }, (res) => {
      if (res?.code) {
        setRoomCode(res.code);
      }
    });
  };

  const handleJoinRoom = (code, nickname) => {
    if (!socket) return;
    setIsLocalMode(false);
    socket.emit('join_room', { code, nickname }, (res) => {
      if (res?.error) {
        alert(res.error);
      } else if (res?.code) {
        setRoomCode(res.code);
      }
    });
  };

  // LOCAL 2-PLAYER MODE ACTIONS WITH CUSTOM INITIAL HP & ITEMS
  const handleStartLocalGame = (p1Name, p2Name, initialHp, initialItems) => {
    setIsLocalMode(true);
    const engine = new LocalGameEngine(p1Name, p2Name, initialHp, initialItems);
    localEngineRef.current = engine;
    const initialState = engine.getState();
    setGameState(initialState);
    setRoomCode('LOCAL');
  };

  // LEAVE ROOM HANDLER
  const handleLeaveRoom = () => {
    if (isLocalMode) {
      setIsLocalMode(false);
      localEngineRef.current = null;
      setGameState(null);
      setRoomCode('');
    } else {
      if (socket && roomCode) {
        socket.emit('leave_room', { code: roomCode });
      }
      setGameState(null);
      setRoomCode('');
    }
  };

  // ACTION HANDLERS (ONLINE + LOCAL)
  const handleShoot = (target) => {
    if (isLocalMode && localEngineRef.current) {
      const newState = localEngineRef.current.handleShoot(target);
      setGameState(newState);
      const lastLog = newState.logs?.[newState.logs.length - 1];
      if (lastLog?.text.includes('💥')) {
        triggerShake();
      }
    } else {
      if (!socket || !roomCode) return;
      socket.emit('shoot', { code: roomCode, target }, (res) => {
        if (res?.error) alert(res.error);
      });
    }
  };

  const handleUseItem = (itemIndex, extraTarget = null) => {
    if (isLocalMode && localEngineRef.current) {
      const result = localEngineRef.current.handleUseItem(itemIndex, extraTarget);
      if (result) {
        setGameState(result.state);
        if (result.privateFeedback) {
          setPrivateHint(result.privateFeedback);
        }
      }
    } else {
      if (!socket || !roomCode) return;
      socket.emit('use_item', { code: roomCode, itemIndex, extraTarget }, (res) => {
        if (res?.error) alert(res.error);
      });
    }
  };

  const handleRematch = () => {
    if (isLocalMode && localEngineRef.current) {
      localEngineRef.current.startGame();
      setGameState(localEngineRef.current.getState());
      setPrivateHint('');
    } else {
      if (!socket || !roomCode) return;
      socket.emit('restart_game', { code: roomCode });
    }
  };

  const handleLeave = () => {
    handleLeaveRoom();
  };

  const isWaiting = gameState?.status === 'waiting';
  const isPlaying = gameState?.status === 'playing';
  const isEnded = gameState?.status === 'ended';

  const activeSocketId = isLocalMode ? gameState?.turnSocketId : socket?.id;
  const isWinner = gameState?.winner === activeSocketId;
  const winnerPlayer = gameState?.players?.find(p => p.socketId === gameState.winner);

  return (
    <div className={`crt-overlay ${isShake ? 'shake-screen' : ''}`}>
      {!gameState || isWaiting ? (
        <Lobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartLocalGame={handleStartLocalGame}
          roomCode={roomCode}
          isWaitingForPlayer={isWaiting}
        />
      ) : (
        <GameTable
          gameState={gameState}
          socketId={activeSocketId}
          onShoot={handleShoot}
          onUseItem={handleUseItem}
          onLeaveRoom={handleLeaveRoom}
          privateHint={privateHint}
          clearPrivateHint={() => setPrivateHint('')}
        />
      )}

      {isEnded && (
        <GameOverModal
          isWinner={isWinner}
          winnerName={winnerPlayer?.nickname}
          onRematch={handleRematch}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}
