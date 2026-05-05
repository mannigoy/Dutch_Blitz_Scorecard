import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import * as htmlToImage from 'html-to-image';
import './index.css'; 

export default function DutchBlitzScorecard() {
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [phase, setPhase] = useState('setup'); 
  const [rounds, setRounds] = useState([]);
  const [roundInputs, setRoundInputs] = useState({});
  const [winningScore, setWinningScore] = useState(75); // State for dropdown
  const cardRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (newPlayerName.trim() && !players.find(p => p.name === newPlayerName.trim())) {
      setPlayers([...players, { id: Date.now(), name: newPlayerName.trim(), totalScore: 0 }]);
      setNewPlayerName('');
    }
  };


const exportAsImage = async () => {
  if (cardRef.current === null) return;

  setIsExporting(true); // 1. Activate "Export Layout"

  // 2. Wait a tiny bit (100ms) for React to apply the CSS class before snapping
  await new Promise((resolve) => setTimeout(resolve, 100));

  const filter = (node) => {
    return !node.classList?.contains('no-export');
  };

  htmlToImage.toPng(cardRef.current, { 
    filter: filter,
    backgroundColor: '#f4f1eb',
    pixelRatio: 3 
  })
    .then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `dutch-blitz-results-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setIsExporting(false); // 3. Revert back to normal view
    })
    .catch((err) => {
      console.error('Export failed', err);
      setIsExporting(false);
    });
};

  const removePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const startGame = () => {
    if (players.length >= 2) {
      const initialInputs = {};
      players.forEach(p => {
        initialInputs[p.id] = { dutch: '', blitz: '' };
      });
      setRoundInputs(initialInputs);
      setPhase('playing');
    }
  };

  const handleInputChange = (playerId, field, value) => {
    setRoundInputs(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value
      }
    }));
  };

  const submitRound = () => {
    const roundResults = [];
    let updatedPlayers = [...players];

    for (let i = 0; i < updatedPlayers.length; i++) {
      const p = updatedPlayers[i];
      const inputs = roundInputs[p.id];
      
      const dutchPoints = parseInt(inputs.dutch) || 0;
      const blitzCards = parseInt(inputs.blitz) || 0;
      
      const roundScore = dutchPoints - (blitzCards * 2);
      p.totalScore += roundScore;
      
      roundResults.push({
        playerId: p.id,
        name: p.name,
        dutch: dutchPoints,
        blitz: blitzCards,
        roundScore: roundScore,
        totalScore: p.totalScore
      });
    }

    setRounds([...rounds, roundResults]);
    setPlayers(updatedPlayers);
    
    const sortedPlayers = [...updatedPlayers].sort((a, b) => b.totalScore - a.totalScore);
    
    if (sortedPlayers[0].totalScore >= winningScore) {
      setPhase('finished');
    } else {
      const nextInputs = {};
      players.forEach(p => {
        nextInputs[p.id] = { dutch: '', blitz: '' };
      });
      setRoundInputs(nextInputs);
    }
  };

  const undoLastRound = () => {
    if (rounds.length === 0) return;

    // Grab the last round data
    const lastRound = rounds[rounds.length - 1];
    
    // Reverse the math for each player
    const updatedPlayers = players.map(p => {
      const playerRoundData = lastRound.find(r => r.playerId === p.id);
      if (playerRoundData) {
        return { ...p, totalScore: p.totalScore - playerRoundData.roundScore };
      }
      return p;
    });

    // Update state, popping the last round off the array
    setPlayers(updatedPlayers);
    setRounds(rounds.slice(0, -1)); 
    setPhase('playing'); // Kicks you back to playing if you accidentally triggered 'finished'
  };

  const resetGame = () => {
    setPlayers(players.map(p => ({ ...p, totalScore: 0 })));
    setRounds([]);
    setPhase('setup');
  };

  const maxScore = Math.max(...players.map(p => p.totalScore), 0);

  return (
    <div className="sc-root">
  <div className={`sc-card ${isExporting ? 'is-exporting' : ''}`} ref={cardRef}>
        
        {/* Header */}
        <header className="sc-header">
          <div className="sc-header-bg"></div>
          <h1 className="sc-title">Dutch Blitz</h1>
          <p className="sc-subtitle">Official Scorecard</p>
        </header>

        <div className="sc-body">
          
          {/* --- SETUP PHASE --- */}
          {phase === 'setup' && (
            <div className="sc-setup">
              
              <div className="sc-settings-row">
                <label className="sc-settings-label">Target Score:</label>
                <select 
                  value={winningScore} 
                  onChange={(e) => setWinningScore(Number(e.target.value))}
                  className="sc-select"
                >
                  <option value={50}>50 Points (Quick Game)</option>
                  <option value={75}>75 Points (Standard)</option>
                  <option value={100}>100 Points (Long Game)</option>
                  <option value={150}>150 Points (Marathon)</option>
                  <option value={200}>200 Points (Marathon)</option>
                </select>
              </div>

              <form onSubmit={handleAddPlayer} className="sc-add-form mt-2">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Enter player name..."
                  className="sc-input"
                />
                <button type="submit" className="sc-btn-add">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                  Add
                </button>
              </form>

              {players.length > 0 && (
                <ul className="sc-player-list">
                  {players.map((player, index) => {
                    // Assign deck colors based on index to make setup look colorful
                    const colorClasses = ['sc-avatar-blue', 'sc-avatar-red', 'sc-avatar-green', 'sc-avatar-yellow'];
                    const avatarClass = colorClasses[index % colorClasses.length];
                    
                    return (
                      <li key={player.id} className="sc-player-item">
                        <div className={`sc-avatar ${avatarClass}`}>{player.name.charAt(0).toUpperCase()}</div>
                        <span className="sc-player-name">{player.name}</span>
                        <button onClick={() => removePlayer(player.id)} className="sc-btn-remove" title="Remove player">✕</button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {players.length === 0 && <p className="sc-hint">Add at least two players to begin.</p>}

              <button onClick={startGame} disabled={players.length < 2} className="sc-btn-start">
                Start Game {players.length >= 2 && <span className="sc-pill">{players.length} Players</span>}
              </button>
            </div>
          )}

          {/* --- PLAYING PHASE --- */}
          {phase === 'playing' && (
            <div className="sc-playing">
                
              <div className="sc-scoreboard">
                {[...players]
                  .sort((a, b) => {
                    if (b.totalScore !== a.totalScore) {
                      return b.totalScore - a.totalScore;
                    }
                    return a.id - b.id; 
                  })
                  .map(p => {
                  
                  const isLead = p.totalScore > 0 && p.totalScore === maxScore;
                  const progress = Math.max(0, Math.min(100, (p.totalScore / winningScore) * 100));
                  
                  return (
                   
                    <motion.div 
                      layout 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 350, 
                        damping: 25 
                      }}
                      key={p.id} 
                      className={`sc-score-chip ${isLead ? 'sc-score-chip--lead' : ''}`}
                    >
                      <span className="sc-chip-rank">{isLead ? 'Leader' : 'Player'}</span>
                      <span className="sc-chip-name">{p.name}</span>
                      <span className="sc-chip-pts">{p.totalScore}</span>
                      <div className="sc-chip-bar-track">
                        <div className="sc-chip-bar-fill" style={{ width: `${progress}%` }}></div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
           

              <div className="sc-round-panel">
                <div className="sc-round-header">
                  <span className="sc-round-title">Log Round {rounds.length + 1}</span>
                </div>
                
                <div className="sc-round-rows">
                  {players.map(p => (
                    <div key={p.id} className="sc-round-row">
                      <div className="sc-round-player" title={p.name}>{p.name}</div>
                      <div className="sc-round-fields">
                        <div className="sc-field sc-field--pos">
                          <label className="sc-field-label">Dutch Piles</label>
                          <span className="sc-field-hint">+1 pt each</span>
                          <input
                            type="number"
                            min="0"
                            value={roundInputs[p.id]?.dutch}
                            onChange={(e) => handleInputChange(p.id, 'dutch', e.target.value)}
                            className="sc-field-input"
                            placeholder="0"
                          />
                        </div>
                        <div className="sc-field sc-field--neg">
                          <label className="sc-field-label">Blitz Left</label>
                          <span className="sc-field-hint">-2 pts each</span>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={roundInputs[p.id]?.blitz}
                            onChange={(e) => handleInputChange(p.id, 'blitz', e.target.value)}
                            className="sc-field-input"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={submitRound} className="sc-btn-log">Log Scores</button>
              </div>
            </div>
          )}

          {/* --- FINISHED PHASE --- */}
{phase === 'finished' && (() => {
    const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);
    const winner = sortedPlayers[0];

    return (
      <div className="sc-finished">
        <div className="sc-trophy-wrap">
          <svg className="sc-trophy" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M7 4h10M17 4v8a5 5 0 0 1-10 0V4M4 4h3v5a2 2 0 0 0 2 2M20 4h-3v5a2 2 0 0 1-2 2"/>
          </svg>
        </div>
        <h2 className="sc-winner-name">{winner.name}</h2>
        <p className="sc-winner-pts">Wins with {winner.totalScore} points</p>
        
        <div className="sc-standings">
          {sortedPlayers.map((p, idx) => (
            <div key={p.id} className={`sc-standing ${idx === 0 ? 'sc-standing--first' : ''}`}>
              <span className="sc-standing-rank">{idx + 1}</span>
              <span className="sc-standing-name">{p.name}</span>
              <span className="sc-standing-pts">{p.totalScore}</span>
            </div>
          ))}
        </div>
      </div>
    );
  })()}
          {/* --- HISTORY SECTION --- */}
{rounds.length > 0 && (
  <div className="sc-history">
    <h3 className="sc-history-title">Match History</h3>
    
    <div className="sc-table-wrap">
      <table className="sc-table">
        <thead>
          <tr>
            <th>Round</th>
            {players.map(p => (
              <th key={p.id}>{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rounds.map((roundData, idx) => (
            <tr key={idx}>
              <td className="sc-td-round">#{idx + 1}</td>
              {players.map(p => {
                const playerRound = roundData.find(r => r.playerId === p.id);
                const isPos = playerRound.roundScore > 0;
                const isNeg = playerRound.roundScore < 0;
                return (
                  <td key={p.id}>
                    <span className={isPos ? 'sc-pos' : isNeg ? 'sc-neg' : ''}>
                      {isPos ? '+' : ''}{playerRound.roundScore}
                    </span>
                    <span className="sc-running">({playerRound.totalScore})</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {phase !== 'finished' && (
        <div className="sc-undo-container no-export">
          <button onClick={undoLastRound} className="sc-btn-undo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
            Undo Last Round
          </button>
        </div>
      )}
    </div>
  )}
{phase === 'finished' && (
    <div className="sc-final-actions no-export">
      <button onClick={exportAsImage} className="sc-btn-export-final">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export Match Results
      </button>

      <button onClick={resetGame} className="sc-btn-reset-wide">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
        </svg>
        Play Again
      </button>
    </div>
  )}
    


        </div>
      </div>
    </div>
  );
}