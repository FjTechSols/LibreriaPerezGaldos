import { useEffect, useState } from 'react';
import '../styles/components/NewYearFireworks.css';

interface FireworksProps {
  onClose?: () => void;
}

export function NewYearFireworks({ onClose }: FireworksProps) {
  const [showMessage, setShowMessage] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; angle: number; velocity: number; delay: number }>>([]);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Function to generate a single explosion
    const generateExplosion = (baseId: number) => {
      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#E6E6FA'];
      const particlesPerExplosion = 30;
      const newExplosion: any[] = [];
      
      const startX = Math.random() * 80 + 10; // 10-90% width
      const startY = Math.random() * 60 + 10; // 10-70% height
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      for (let j = 0; j < particlesPerExplosion; j++) {
        const angle = (Math.PI * 2 * j) / particlesPerExplosion;
        const velocity = 50 + Math.random() * 100;
        
        newExplosion.push({
          id: baseId + j,
          x: startX,
          y: startY,
          color: color,
          angle: angle,
          velocity: velocity,
          delay: 0 // Immediate start for new intervals
        });
      }
      return newExplosion;
    };

    // Initial explosions
    let currentId = 0;
    let currentParticles: any[] = [];
    
    // Loop to add explosions periodically
    const explosionInterval = setInterval(() => {
      if (currentParticles.length > 500) {
        // Reset/Cleanup to prevent memory issues if open too long, though we close quickly.
        // For short duration, just keeping a rolling buffer or clearing old ones is fine.
        // Or simpler: just replace older ones. 
        // Let's just keep adding, React will handle diffing, but cleaner to slice.
        currentParticles = currentParticles.slice(-200); 
      }
      
      const newExplosion = generateExplosion(currentId);
      currentId += 30;
      currentParticles = [...currentParticles, ...newExplosion];
      setParticles(currentParticles);
    }, 800); // Add new explosion every 800ms

    // Initial launch
    setParticles(generateExplosion(currentId));
    currentId += 30;

    // Show message after 1.5 seconds (earlier appearance)
    const messageTimer = setTimeout(() => setShowMessage(true), 1500);

    // Start global fade out after 8 seconds (extended duration)
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 8000);

    // Fully close after fade completes (8s + 2.5s fade = 10.5s)
    const closeTimer = setTimeout(() => {
      if (onClose) onClose();
    }, 10500);

    return () => {
      clearInterval(explosionInterval);
      clearTimeout(messageTimer);
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  return (
    <div className={`fireworks-overlay ${isFading ? 'fade-out' : ''}`}>
      <div className="fireworks-container">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="firework"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              backgroundColor: particle.color,
              animationDelay: '0s', // Controlled by React appearance
              '--angle': `${particle.angle}rad`,
              '--velocity': `${particle.velocity}px`
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className={`new-year-message-container ${showMessage ? 'visible' : ''}`}>
         <div className="new-year-message">
            <h1 className="message-title">¡Feliz Año Nuevo 2026!</h1>
            <p className="message-subtitle">Te desea la Familia de la</p>
            <p className="message-brand">Librería Pérez Galdós</p>
            <button className="close-button" onClick={onClose}>
              ✕
            </button>
         </div>
      </div>
    </div>
  );
}
