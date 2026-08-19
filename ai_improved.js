
// ai_improved.js
// Injected improved AI for Korridor. This script overrides maybeAiMove and
// provides an improved decision pipeline while reusing the game's existing
// rules (bfsPathLen, canPlaceWallFor, legalPawnMoves, applyAction, etc.).

(function(){
  // AI configuration (tunable)
  const AI_CONFIG = {
    difficulty: 'medium', // 'easy'|'medium'|'hard'|'expert'
    weights: {
      defensive: 10.0,
      selfPenalty: 12.0,
      bottleneck: 3.0,
      resource: 0.15,
      unnecessarySmallGainPenalty: 6.0
    },
    lookaheadK: { easy: 2, medium: 3, hard: 6, expert: 8 },
    tieEpsilon: 1e-6
  };

  function evaluatePosition(st, player){
    const opp = 1-player;
    const myPath = bfsPathLen(st.pos[player][0], st.pos[player][1], goalRowFor(player), st.hWalls, st.vWalls);
    const oppPath = bfsPathLen(st.pos[opp][0], st.pos[opp][1], goalRowFor(opp), st.hWalls, st.vWalls);
    return {myPath, oppPath, baseScore: (oppPath - myPath) + AI_CONFIG.weights.resource * (st.wallsLeft[player]-st.wallsLeft[opp]) };
  }

  function findAllLegalWalls(st, player){
    const out = [];
    if(st.wallsLeft[player] <= 0) return out;
    for(let i=0;i<=7;i++){
      for(let j=0;j<=7;j++){
        ['h','v'].forEach(type=>{
          if(canPlaceWallFor(type,i,j,player,st)) out.push({wtype:type,i,j});
        });
      }
    }
    return out;
  }

  function computeBottleneckScore(st, player, affectedOppPathAfter){
    const opp = 1-player;
    const [or, oc] = st.pos[opp];
    const rowDist = Math.abs(or - goalRowFor(opp));
    return Math.max(0, 4 - rowDist) + Math.max(0, Math.floor((affectedOppPathAfter||0)/3));
  }

  function evaluateWall(st, player, wall){
    const opp = 1-player;
    const before = evaluatePosition(st, player);
    const hSet = new Set(st.hWalls), vSet = new Set(st.vWalls);
    if(wall.wtype==='h') hSet.add(key(wall.i,wall.j)); else vSet.add(key(wall.i,wall.j));
    const myAfter = bfsPathLen(st.pos[player][0], st.pos[player][1], goalRowFor(player), hSet, vSet);
    const oppAfter = bfsPathLen(st.pos[opp][0], st.pos[opp][1], goalRowFor(opp), hSet, vSet);
    if(!isFinite(myAfter) || !isFinite(oppAfter)) return {score:-Infinity, reason:'blocks route'};
    const oppInc = oppAfter - before.oppPath;
    const myInc = myAfter - before.myPath;
    const weights = AI_CONFIG.weights;
    let score = (oppInc * weights.defensive) - (myInc * weights.selfPenalty) + (st.wallsLeft[player] - st.wallsLeft[opp]) * weights.resource;
    const bottleneck = computeBottleneckScore(st, player, oppAfter);
    score += bottleneck * weights.bottleneck;
    const delta = before.oppPath - before.myPath;
    if(delta >= 2 && oppInc <= 1) score -= weights.unnecessarySmallGainPenalty;
    if(myInc >= 3 && !(delta <= -3)) score -= 9999;
    const reason = `opp ${before.oppPath}->${oppAfter} (+${oppInc}), me ${before.myPath}->${myAfter} (+${myInc}), bottleneck ${bottleneck}`;
    return {score, reason, oppInc, myInc, bottleneck};
  }

  function evaluateMove(st, player, move){
    const before = evaluatePosition(st, player);
    const ns = applyAction(st, player, move);
    const afterPos = evaluatePosition(ns, player);
    const ownGain = before.myPath - afterPos.myPath;
    const oppGain = afterPos.oppPath - before.oppPath;
    let score = ownGain * 8 + oppGain * 5 + (ns.wallsLeft[player]-ns.wallsLeft[1-player]) * AI_CONFIG.weights.resource;
    const reason = `move: my ${before.myPath}->${afterPos.myPath} (-${ownGain}) opp ${before.oppPath}->${afterPos.oppPath} (+${oppGain})`;
    return {score, reason, ownGain, oppGain};
  }

  function chooseBestAction(st, player){
    for(const [r,c] of legalPawnMoves(player, st)){
      if(r === goalRowFor(player)) return {type:'move', r, c, reason:'win-immediately'};
    }
    const opp = 1-player;
    const oppMoves = legalPawnMoves(opp, st);
    for(const [r,c] of oppMoves){ if(r === goalRowFor(opp)){
      const walls = findAllLegalWalls(st, player);
      for(const w of walls){
        const hSet = new Set(st.hWalls), vSet = new Set(st.vWalls);
        if(w.wtype==='h') hSet.add(key(w.i,w.j)); else vSet.add(key(w.i,w.j));
        const oppPathAfter = bfsPathLen(st.pos[opp][0], st.pos[opp][1], goalRowFor(opp), hSet, vSet);
        if(oppPathAfter > 1){
          const myPathAfter = bfsPathLen(st.pos[player][0], st.pos[player][1], goalRowFor(player), hSet, vSet);
          if(myPathAfter - bfsPathLen(st.pos[player][0], st.pos[player][1], goalRowFor(player), st.hWalls, st.vWalls) <= 2){
            return {type:'wall', wtype:w.wtype, i:w.i, j:w.j, reason:'block-imminent-win'};
          }
        }
      }
      for(const [mr,mc] of legalPawnMoves(player, st)){
        const ns = applyAction(st, player, {type:'move', r:mr, c:mc});
        const oppPath = bfsPathLen(ns.pos[opp][0], ns.pos[opp][1], goalRowFor(opp), ns.hWalls, ns.vWalls);
        if(oppPath > 1) return {type:'move', r:mr, c:mc, reason:'move-blocks-imminent-win'};
      }
      break;
    }}
    const candidates = [];
    for(const [r,c] of legalPawnMoves(player, st)) candidates.push({type:'move', r, c});
    let walls = [];
    if(st.wallsLeft[player] > 0){
      if(AI_CONFIG.difficulty==='hard' || AI_CONFIG.difficulty==='expert'){
        walls = findAllLegalWalls(st, player);
      } else {
        for(const {i,j} of (typeof wallCandidateZones === 'function' ? wallCandidateZones(st) : [])){
          for(const wtype of ['h','v']){
            if(canPlaceWallFor(wtype,i,j,player,st)) walls.push({wtype,i,j});
          }
        }
      }
      for(const w of walls) candidates.push(Object.assign({type:'wall'}, w));
    }
    const evaluated = candidates.map(c=>{
      if(c.type==='move') return Object.assign({}, c, evaluateMove(st, player, c));
      return Object.assign({}, c, evaluateWall(st, player, c));
    });
    const filtered = evaluated.filter(e=>isFinite(e.score) && e.score>-1000);
    if(filtered.length===0){
      return bestGreedyAction(player, st).action || filtered[0];
    }
    filtered.sort((a,b)=>b.score - a.score);
    const k = AI_CONFIG.lookaheadK[AI_CONFIG.difficulty] || AI_CONFIG.lookaheadK.medium;
    const topK = filtered.slice(0, Math.max(1, k));
    let best = topK[0];
    let bestMinimax = -Infinity;
    for(const cand of topK){
      const ns = applyAction(st, player, cand);
      const oppReply = bestGreedyAction(opp, ns).action;
      const afterOpp = oppReply ? applyAction(ns, opp, oppReply) : ns;
      const pos = evaluatePosition(afterOpp, player);
      const minimaxScore = pos.oppPath - pos.myPath + AI_CONFIG.weights.resource * (afterOpp.wallsLeft[player]-afterOpp.wallsLeft[opp]);
      if(minimaxScore > bestMinimax + AI_CONFIG.tieEpsilon){ bestMinimax = minimaxScore; best = cand; }
    }
    const close = filtered.filter(f=>Math.abs((f.score||0) - (best.score||0)) < Math.max(1e-3, Math.abs(best.score||0)*0.03));
    if(close.length>1){
      best = close[Math.floor(Math.random()*close.length)];
    }
    return best;
  }

  function improvedAiTakeTurn(){
    const st = state;
    const me = 1;
    if(st.mode!=='ai' || st.turn!==1 || st.winner!==null) return;
    const act = chooseBestAction(st, me);
    if(!act){
      const g = bestGreedyAction(me, st).action;
      if(g){
        if(g.type==='move'){ pushHistory(); state.pos[me]=[g.r,g.c]; }
        else { pushHistory(); (g.wtype==='h'?state.hWalls:state.vWalls).add(key(g.i,g.j)); state.wallsLeft[me]--; state.interactionMode='move'; }
        if(checkWin()){ render(); return; }
        state.turn = 1 - state.turn; render(); maybeAiMove(); return;
      }
      return;
    }
    if(state.aiDebug) console.log('AI chooseBestAction', act);
    pushHistory();
    if(act.type==='move'){
      state.pos[me] = [act.r, act.c];
    } else if(act.type==='wall'){
      (act.wtype==='h'?state.hWalls:state.vWalls).add(key(act.i,act.j));
      state.wallsLeft[me]--;
      state.interactionMode = 'move';
    }
    if(checkWin()){ render(); return; }
    state.turn = 1 - state.turn;
    render();
    maybeAiMove();
  }

  window.maybeAiMove = function(){
    if(state.mode!=='ai' || state.turn!==1 || state.winner!==null) return;
    state.aiThinking = true;
    updateHUD();
    setTimeout(improvedAiTakeTurn, 550);
  };

  window.improvedAiTakeTurn = improvedAiTakeTurn;
  window.AI_CONFIG = AI_CONFIG;

  window.runSelfPlay = function(games=100, options={}){
    const results = {games:0, ai1Wins:0, ai0Wins:0, avgWallsUsed:0, uselessWalls:0, avgLength:0};
    const maxMoves = 200;
    for(let g=0; g<games; g++){
      let st = freshState();
      st.mode = 'ai';
      let moves = 0;
      let wallsUsed = 0;
      let useless = 0;
      while(true){
        const player = st.turn;
        const action = chooseBestAction(st, player);
        if(!action){
          const greedy = bestGreedyAction(player, st).action;
          if(!greedy) break;
          Object.assign(action, greedy);
        }
        const beforeOppPath = bfsPathLen(st.pos[1-player][0], st.pos[1-player][1], goalRowFor(1-player), st.hWalls, st.vWalls);
        if(action.type==='move'){
          st = applyAction(st, player, action);
        } else if(action.type==='wall'){
          st = applyAction(st, player, action);
          wallsUsed++;
          const afterOppPath = bfsPathLen(st.pos[1-player][0], st.pos[1-player][1], goalRowFor(1-player), st.hWalls, st.vWalls);
          if(afterOppPath <= beforeOppPath) useless++;
        }
        moves++;
        if(st.pos[0][0] === goalRowFor(0)){ results.ai0Wins++; break; }
        if(st.pos[1][0] === goalRowFor(1)){ results.ai1Wins++; break; }
        if(moves > maxMoves) break;
        st.turn = 1 - st.turn;
      }
      results.games++;
      results.avgWallsUsed += wallsUsed;
      results.uselessWalls += useless;
      results.avgLength += moves;
    }
    results.avgWallsUsed = results.avgWallsUsed / results.games;
    results.uselessWalls = results.uselessWalls / results.games;
    results.avgLength = results.avgLength / results.games;
    console.log('SelfPlay results', results);
    return results;
  };

})();
