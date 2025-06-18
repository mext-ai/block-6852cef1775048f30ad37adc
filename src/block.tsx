import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Text } from '@react-three/drei';
import * as THREE from 'three';

interface BlockProps {
  title?: string;
}

interface GameState {
  score: number;
  ammo: number;
  bullets: Array<{ id: number, position: THREE.Vector3, direction: THREE.Vector3 }>;
}

// Enemy component
function Enemy({ position, onHit, id }: { position: [number, number, number], onHit: (id: number) => void, id: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hit, setHit] = useState(false);

  useFrame((state) => {
    if (meshRef.current && !hit) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  const handleClick = () => {
    if (!hit) {
      setHit(true);
      onHit(id);
      setTimeout(() => {
        setHit(false);
      }, 1000);
    }
  };

  return (
    <mesh ref={meshRef} position={position} onClick={handleClick}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hit ? '#ff4444' : '#ff6666'} />
      <Text
        position={[0, 0, 0.6]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {hit ? 'HIT!' : 'TARGET'}
      </Text>
    </mesh>
  );
}

// Bullet component
function Bullet({ position, direction, onRemove }: { 
  position: THREE.Vector3, 
  direction: THREE.Vector3, 
  onRemove: () => void 
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const speed = 50;
  const maxDistance = 100;
  const startPosition = position.clone();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.add(direction.clone().multiplyScalar(speed * delta));
      
      if (meshRef.current.position.distanceTo(startPosition) > maxDistance) {
        onRemove();
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.05]} />
      <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
    </mesh>
  );
}

// Game scene component
function GameScene({ gameState, setGameState }: { 
  gameState: GameState, 
  setGameState: React.Dispatch<React.SetStateAction<GameState>> 
}) {
  const { camera, gl } = useThree();
  const bulletIdCounter = useRef(0);
  
  const enemies = [
    { id: 1, position: [5, 1, -10] as [number, number, number] },
    { id: 2, position: [-5, 1, -15] as [number, number, number] },
    { id: 3, position: [0, 2, -20] as [number, number, number] },
    { id: 4, position: [8, 1, -12] as [number, number, number] },
    { id: 5, position: [-8, 1, -18] as [number, number, number] },
  ];

  const shoot = useCallback(() => {
    if (gameState.ammo <= 0) return;
    
    setGameState(prev => ({ ...prev, ammo: prev.ammo - 1 }));
    
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    
    const newBullet = {
      id: bulletIdCounter.current++,
      position: camera.position.clone(),
      direction: direction.normalize()
    };
    
    setGameState(prev => ({ 
      ...prev, 
      bullets: [...prev.bullets, newBullet] 
    }));
  }, [camera, gameState.ammo, setGameState]);

  const removeBullet = useCallback((bulletId: number) => {
    setGameState(prev => ({
      ...prev,
      bullets: prev.bullets.filter(bullet => bullet.id !== bulletId)
    }));
  }, [setGameState]);

  const handleEnemyHit = useCallback((enemyId: number) => {
    setGameState(prev => ({ ...prev, score: prev.score + 10 }));
  }, [setGameState]);

  const reload = useCallback(() => {
    setGameState(prev => ({ ...prev, ammo: 30 }));
  }, [setGameState]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (document.pointerLockElement === gl.domElement) {
        shoot();
      }
    };

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'KeyR') {
        reload();
      }
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [shoot, reload, gl.domElement]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      
      {/* Sky */}
      <mesh>
        <sphereGeometry args={[50]} />
        <meshBasicMaterial color="#87CEEB" side={THREE.BackSide} />
      </mesh>
      
      {/* Enemies */}
      {enemies.map(enemy => (
        <Enemy
          key={enemy.id}
          id={enemy.id}
          position={enemy.position}
          onHit={handleEnemyHit}
        />
      ))}
      
      {/* Bullets */}
      {gameState.bullets.map(bullet => (
        <Bullet
          key={bullet.id}
          position={bullet.position}
          direction={bullet.direction}
          onRemove={() => removeBullet(bullet.id)}
        />
      ))}
      
      {/* Controls */}
      <PointerLockControls makeDefault />
    </>
  );
}

// Crosshair component
function Crosshair() {
  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1000,
      pointerEvents: 'none'
    }}>
      <div style={{
        width: '20px',
        height: '2px',
        backgroundColor: '#ffffff',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }} />
      <div style={{
        width: '2px',
        height: '20px',
        backgroundColor: '#ffffff',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }} />
    </div>
  );
}

// HUD component
function HUD({ score, ammo }: { score: number, ammo: number }) {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      color: 'white',
      fontSize: '18px',
      fontFamily: 'monospace',
      zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: '10px',
      borderRadius: '5px'
    }}>
      <div>Score: {score}</div>
      <div>Ammo: {ammo}/30</div>
      <div style={{ fontSize: '12px', marginTop: '5px' }}>
        Click to shoot | R to reload
      </div>
    </div>
  );
}

const Block: React.FC<BlockProps> = ({ title = "Mini FPS Game" }) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    ammo: 30,
    bullets: []
  });

  // Send completion event when score reaches 50
  useEffect(() => {
    if (gameState.score >= 50) {
      window.postMessage({ type: 'BLOCK_COMPLETION', blockId: 'mini-fps-game', completed: true, score: gameState.score, maxScore: 50 }, '*');
      window.parent.postMessage({ type: 'BLOCK_COMPLETION', blockId: 'mini-fps-game', completed: true, score: gameState.score, maxScore: 50 }, '*');
    }
  }, [gameState.score]);

  if (!gameStarted) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Arial, sans-serif',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          🎯 Mini FPS Game
        </h1>
        <div style={{ marginBottom: '30px', fontSize: '18px', maxWidth: '600px' }}>
          <p>Welcome to the Mini FPS Game! Your mission:</p>
          <ul style={{ textAlign: 'left', display: 'inline-block' }}>
            <li>Click to lock mouse cursor and enter the game</li>
            <li>Move with WASD keys</li>
            <li>Look around with mouse</li>
            <li>Click to shoot at red targets</li>
            <li>Press R to reload (30 bullets)</li>
            <li>Score 50 points to complete the mission!</li>
          </ul>
        </div>
        <button
          onClick={() => setGameStarted(true)}
          style={{
            padding: '15px 30px',
            fontSize: '20px',
            backgroundColor: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#ff5252';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ff6b6b';
            e.currentTarget.style.transform = 'translateY(0px)';
          }}
        >
          🚀 Start Game
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [0, 1, 0], fov: 75 }}>
        <GameScene gameState={gameState} setGameState={setGameState} />
      </Canvas>
      <Crosshair />
      <HUD score={gameState.score} ammo={gameState.ammo} />
    </div>
  );
};

export default Block;