"use strict";

const CARD_TYPES = [
  { symbol: "♠", name: "SPADE", label: "スペード" },
  { symbol: "♥", name: "HEART", label: "ハート" },
  { symbol: "♣", name: "CLUB", label: "クラブ" },
  { symbol: "♦", name: "DIAMOND", label: "ダイヤ" },
  { symbol: "☾", name: "MOON", label: "月" },
  { symbol: "★", name: "STAR", label: "星" },
  { symbol: "☀", name: "SUN", label: "太陽" },
  { symbol: "⚜", name: "LILY", label: "百合" }
];

const LINES = {
  start: "さあ、幕を上げよう。カードの顔を覚えておいで。",
  first: "その一枚を選ぶのだね。さて、相方はどこかな？",
  miss: [
    "おや、仮面が違ったようだ。よく目に焼きつけて。",
    "残念。けれど記憶は、失敗するほど鮮やかになる。",
    "違う顔だね。次の一手を楽しみにしているよ。"
  ],
  match: [
    "お見事。同じ仮面を見つけたね。",
    "正解だ。君の記憶、なかなか侮れない。",
    "また一組。舞台の秘密がほどけていくよ。"
  ],
  clear: "完敗だ！ すべての仮面を見破るとはね。"
};

const grid = document.querySelector("#card-grid");
const moveCount = document.querySelector("#move-count");
const pairCount = document.querySelector("#pair-count");
const insightCount = document.querySelector("#insight-count");
const jokerLine = document.querySelector("#joker-line");
const speech = document.querySelector(".speech");
const completion = document.querySelector("#completion");
const finalMoves = document.querySelector("#final-moves");
const finalInsight = document.querySelector("#final-insight");
const restartButton = document.querySelector("#restart-button");
const playAgainButton = document.querySelector("#play-again-button");
const hintAnswer = document.querySelector("#hint-answer");
const hintAnswerButtons = [...hintAnswer.querySelectorAll("button")];
const startScreen = document.querySelector("#start-screen");
const startButton = document.querySelector("#start-button");
const soundButton = document.querySelector("#sound-button");
const celebrationVideo = document.querySelector("#celebration-video");
const celebrationEffects = document.querySelector("#celebration-effects");

let cards = [];
let selected = [];
let moves = 0;
let pairs = 0;
let insight = 0;
let isChecking = false;
let activeHint = null;
let nextHintTruth = true;
let canFlipCard = false;
let pendingFlip = null;
let pendingCompletion = null;
let pendingMatch = null;
let pendingHintReveal = null;
let pendingLieCue = null;
let pendingAutoHint = null;
let pendingFinalReveal = null;
let audioContext = null;
let bgmMaster = null;
let sfxMaster = null;
let bgmEnabled = true;
let bgmLoopTimer = null;

function scheduleCircusNote(frequency, startTime, duration, timbre, volume) {
  const oscillator = audioContext.createOscillator();
  const overtone = audioContext.createOscillator();
  const vibrato = audioContext.createOscillator();
  const vibratoDepth = audioContext.createGain();
  const noteGain = audioContext.createGain();
  const overtoneGain = audioContext.createGain();
  const humanDetune = (Math.random() - 0.5) * 5;
  oscillator.type = timbre === "bass" || timbre === "bell" ? "sine" : "triangle";
  overtone.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  overtone.frequency.setValueAtTime(frequency * 2, startTime);
  oscillator.detune.setValueAtTime(humanDetune, startTime);
  overtone.detune.setValueAtTime(humanDetune - 2, startTime);
  vibrato.frequency.setValueAtTime(timbre === "bass" ? 3.2 : 4.7, startTime);
  vibratoDepth.gain.setValueAtTime(timbre === "bass" ? 0.22 : timbre === "bell" ? 0.32 : 0.75, startTime);
  noteGain.gain.setValueAtTime(0.0001, startTime);
  noteGain.gain.exponentialRampToValueAtTime(volume, startTime + 0.065);
  noteGain.gain.setValueAtTime(volume * 0.86, startTime + duration * 0.62);
  noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  overtoneGain.gain.value = timbre === "bass" ? 0.08 : timbre === "bell" ? 0.32 : 0.2;
  vibrato.connect(vibratoDepth).connect(oscillator.frequency);
  vibratoDepth.connect(overtone.frequency);
  oscillator.connect(noteGain).connect(bgmMaster);
  overtone.connect(overtoneGain).connect(noteGain);
  oscillator.start(startTime);
  overtone.start(startTime);
  vibrato.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
  overtone.stop(startTime + duration + 0.03);
  vibrato.stop(startTime + duration + 0.03);
}

function scheduleCircusPhrase() {
  if (!audioContext || !bgmMaster) return;
  const eighth = 0.2;
  const start = audioContext.currentTime + 0.06;
  const melody = [
    293.66, 349.23, 440, 466.16, 440, 392,
    349.23, 329.63, 293.66, 277.18, 293.66, 220
  ];
  const bass = [146.83, 220, 220, 146.83, 233.08, 220];
  const chords = [
    [146.83, 174.61, 220],
    [196, 233.08, 293.66],
    [220, 277.18, 329.63],
    [146.83, 174.61, 220]
  ];
  const counterMelody = [587.33, 523.25, 466.16, 440];

  melody.forEach((frequency, index) => {
    const humanTiming = (Math.random() - 0.5) * 0.018;
    const expression = 0.045 + (index % 3 === 0 ? 0.012 : 0) + Math.random() * 0.006;
    scheduleCircusNote(frequency, start + index * eighth + humanTiming, eighth * 1.06, "organ", expression);
    if (index % 3 === 0) {
      scheduleCircusNote(frequency * 2, start + index * eighth + 0.015, eighth * 1.45, "bell", 0.019);
    }
  });
  bass.forEach((frequency, index) => {
    const expression = index % 3 === 0 ? 0.12 : 0.07;
    scheduleCircusNote(frequency, start + index * eighth * 2, eighth * 1.72, "bass", expression);
  });
  chords.forEach((chord, chordIndex) => {
    chord.forEach((frequency, noteIndex) => {
      scheduleCircusNote(frequency, start + chordIndex * eighth * 3 + noteIndex * 0.008, eighth * 2.72, "organ", 0.018);
    });
    scheduleCircusNote(counterMelody[chordIndex], start + chordIndex * eighth * 3 + eighth, eighth * 1.8, "bell", 0.014);
  });
}

function initBgm() {
  soundButton.textContent = bgmEnabled ? "BGM ON" : "BGM OFF";
  soundButton.setAttribute("aria-pressed", String(bgmEnabled));
  if (audioContext) {
    audioContext.resume();
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    soundButton.disabled = true;
    soundButton.textContent = "BGM非対応";
    return;
  }

  audioContext = new AudioContextClass();
  bgmMaster = audioContext.createGain();
  sfxMaster = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const compressor = audioContext.createDynamicsCompressor();
  const roomDelay = audioContext.createDelay();
  const roomFeedback = audioContext.createGain();
  const roomWet = audioContext.createGain();
  filter.type = "lowpass";
  filter.frequency.value = 1350;
  filter.Q.value = 1.1;
  roomDelay.delayTime.value = 0.19;
  roomFeedback.gain.value = 0.16;
  roomWet.gain.value = 0.17;
  compressor.threshold.value = -24;
  compressor.knee.value = 18;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.025;
  compressor.release.value = 0.28;
  bgmMaster.gain.value = 0.0001;
  sfxMaster.gain.value = 0.1;
  bgmMaster.connect(filter);
  sfxMaster.connect(compressor);
  filter.connect(compressor).connect(audioContext.destination);
  filter.connect(roomDelay);
  roomDelay.connect(roomFeedback).connect(roomDelay);
  roomDelay.connect(roomWet).connect(compressor);
  scheduleCircusPhrase();
  bgmLoopTimer = window.setInterval(scheduleCircusPhrase, 2400);
}

function scheduleSfxTone(frequency, start, duration, endFrequency = frequency, waveform = "square", peak = 0.12) {
  if (!audioContext || !sfxMaster) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(sfxMaster);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playSfx(type) {
  if (!audioContext || !sfxMaster) return;
  const now = audioContext.currentTime;
  if (type === "flip") {
    scheduleSfxTone(1450, now, 0.055, 520, "square", 0.09);
    scheduleSfxTone(920, now + 0.008, 0.045, 360, "triangle", 0.07);
  } else if (type === "match") {
    [659.25, 880, 1108.73].forEach((note, index) =>
      scheduleSfxTone(note, now + index * 0.055, 0.13, note * 1.025, "triangle", 0.11)
    );
  } else if (type === "miss") {
    scheduleSfxTone(430, now, 0.16, 145, "sawtooth", 0.085);
    scheduleSfxTone(405, now + 0.018, 0.14, 132, "square", 0.055);
  }
}

function setBgmAudible(audible) {
  if (!audioContext || !bgmMaster) return;
  if (audioContext.state === "suspended") audioContext.resume();
  const now = audioContext.currentTime;
  bgmMaster.gain.cancelScheduledValues(now);
  bgmMaster.gain.setTargetAtTime(bgmEnabled && audible ? 0.075 : 0.0001, now, 0.25);
}

function toggleBgm() {
  bgmEnabled = !bgmEnabled;
  soundButton.textContent = bgmEnabled ? "BGM ON" : "BGM OFF";
  soundButton.setAttribute("aria-pressed", String(bgmEnabled));
  setBgmAudible(!document.body.classList.contains("is-celebrating"));
}

function buildCelebrationEffects() {
  const effects = [];
  const colors = [2, 35, 48, 275, 320, 190];

  for (let index = 0; index < 18; index += 1) {
    const balloon = document.createElement("span");
    balloon.className = "balloon";
    balloon.style.setProperty("--left", `${3 + Math.random() * 94}%`);
    balloon.style.setProperty("--hue", String(colors[index % colors.length]));
    balloon.style.setProperty("--duration", `${5.5 + Math.random() * 4}s`);
    balloon.style.setProperty("--delay", `${Math.random() * -8}s`);
    balloon.style.setProperty("--tilt", `${-12 + Math.random() * 24}deg`);
    effects.push(balloon);
  }

  for (let index = 0; index < 12; index += 1) {
    const firework = document.createElement("span");
    firework.className = "firework";
    firework.style.setProperty("--left", `${5 + Math.random() * 78}%`);
    firework.style.setProperty("--top", `${4 + Math.random() * 58}%`);
    firework.style.setProperty("--hue", String(colors[(index + 2) % colors.length]));
    const burstDelay = index * 0.22;
    firework.style.setProperty("--delay", `${burstDelay}s`);
    for (let sparkIndex = 0; sparkIndex < 28; sparkIndex += 1) {
      const spark = document.createElement("i");
      const distance = 55 + Math.random() * 105;
      spark.className = "firework-spark";
      spark.style.setProperty("--angle", `${sparkIndex * (360 / 28) + Math.random() * 5}deg`);
      spark.style.setProperty("--distance", `${-distance}px`);
      spark.style.setProperty("--distance-end", `${-distance * 1.2}px`);
      spark.style.setProperty("--spark-hue", String(colors[(index + sparkIndex) % colors.length]));
      spark.style.setProperty("--delay", `${burstDelay + Math.random() * 0.08}s`);
      firework.append(spark);
    }
    effects.push(firework);
  }

  for (let index = 0; index < 90; index += 1) {
    const confetti = document.createElement("span");
    const drift = -55 + Math.random() * 110;
    confetti.className = "confetti";
    confetti.style.setProperty("--left", `${Math.random() * 100}%`);
    confetti.style.setProperty("--hue", String(colors[index % colors.length]));
    confetti.style.setProperty("--size", `${5 + Math.random() * 7}px`);
    confetti.style.setProperty("--duration", `${3.3 + Math.random() * 3.5}s`);
    confetti.style.setProperty("--delay", `${Math.random() * -6}s`);
    confetti.style.setProperty("--drift", `${drift}px`);
    confetti.style.setProperty("--drift-back", `${drift * -0.45}px`);
    effects.push(confetti);
  }

  const suits = ["♠", "♥", "♣", "♦"];
  for (let index = 0; index < 28; index += 1) {
    const flyingCard = document.createElement("span");
    const cardFront = document.createElement("span");
    const cardBack = document.createElement("span");
    flyingCard.className = "flying-card";
    cardFront.className = "flying-card-face flying-card-front";
    cardFront.textContent = suits[index % suits.length];
    cardBack.className = "flying-card-face flying-card-back";
    flyingCard.append(cardFront, cardBack);
    flyingCard.style.setProperty("--card-color", index % 2 === 0 ? "#292425" : "#7d292e");
    flyingCard.style.setProperty("--duration", `${6 + Math.random() * 4}s`);
    flyingCard.style.setProperty("--delay", `${Math.random() * -10}s`);
    const baseX = -45 + Math.random() * 90;
    for (let point = 0; point < 5; point += 1) {
      flyingCard.style.setProperty(`--x${point}`, `${baseX - 10 + Math.random() * 20}vw`);
      flyingCard.style.setProperty(`--r${point}`, `${-28 + Math.random() * 56}deg`);
    }
    effects.push(flyingCard);
  }

  for (let index = 0; index < 56; index += 1) {
    const star = document.createElement("span");
    const drift = -45 + Math.random() * 90;
    star.className = "falling-star";
    star.textContent = index % 3 === 0 ? "✦" : "★";
    star.style.setProperty("--left", `${Math.random() * 100}%`);
    star.style.setProperty("--size", `${8 + Math.random() * 16}px`);
    star.style.setProperty("--duration", `${3.5 + Math.random() * 4}s`);
    star.style.setProperty("--delay", `${Math.random() * -7}s`);
    star.style.setProperty("--drift", `${drift}px`);
    star.style.setProperty("--drift-back", `${drift * -0.5}px`);
    effects.push(star);
  }

  const props = ["🎩", "🎪", "🎺", "🥁", "🎠", "🤡"];
  for (let index = 0; index < 18; index += 1) {
    const prop = document.createElement("span");
    const drift = -70 + Math.random() * 140;
    prop.className = "circus-prop";
    prop.textContent = props[index % props.length];
    prop.style.setProperty("--left", `${Math.random() * 94}%`);
    prop.style.setProperty("--size", `${22 + Math.random() * 24}px`);
    prop.style.setProperty("--duration", `${6 + Math.random() * 5}s`);
    prop.style.setProperty("--delay", `${Math.random() * -9}s`);
    prop.style.setProperty("--drift", `${drift}px`);
    prop.style.setProperty("--drift-back", `${drift * -0.45}px`);
    effects.push(prop);
  }

  celebrationEffects.replaceChildren(...effects);
}

function showCelebration() {
  buildCelebrationEffects();
  completion.hidden = false;
  document.body.classList.add("is-celebrating");
  setBgmAudible(false);
  celebrationVideo.currentTime = 0;
  celebrationVideo.controls = false;
  const playRequest = celebrationVideo.play();
  if (playRequest) playRequest.catch(() => {
    celebrationVideo.controls = true;
  });
  playAgainButton.focus();
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function makeDeck() {
  return shuffle(CARD_TYPES.flatMap((type, pairId) => [
    { ...type, pairId, uniqueId: `${pairId}-a`, matched: false },
    { ...type, pairId, uniqueId: `${pairId}-b`, matched: false }
  ]));
}

function createCard(card, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "card";
  button.dataset.index = String(index);
  button.dataset.pair = String(card.pairId);
  button.setAttribute("aria-label", `カード ${index + 1}、裏向き`);
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `
    <span class="card-face card-back" aria-hidden="true"></span>
    <span class="card-face card-front" aria-hidden="true">
      <span class="card-symbol">${card.symbol}</span>
      <span class="card-name">${card.name}</span>
    </span>`;
  button.addEventListener("click", handleCardSelect);
  return button;
}

function updateCardA11y(button, card, state) {
  const labelState = state === "matched" ? "揃いました" : `${card.name}、表向き`;
  button.setAttribute("aria-label", `カード ${Number(button.dataset.index) + 1}、${labelState}`);
  button.setAttribute("aria-pressed", "true");
}

function say(group) {
  const value = LINES[group];
  jokerLine.textContent = Array.isArray(value)
    ? value[Math.floor(Math.random() * value.length)]
    : value;
}

function cardPosition(index) {
  const rows = ["上段", "中央上段", "中央下段", "下段"];
  const columns = ["左端", "中央左", "中央右", "右端"];
  return `${rows[Math.floor(index / 4)]}${columns[index % 4]}`;
}

function syncCardLocks() {
  const remainingCards = cards.filter((card) => !card.matched).length;
  if (remainingCards > 0 && remainingCards <= 2) {
    if (!isChecking && pendingFinalReveal === null && selected.length === 0) {
      autoRevealFinalPair();
    }
  }
  cards.forEach((card, index) => {
    const button = grid.children[index];
    if (!button || card.matched) return;
    const shouldLock = !canFlipCard && !button.classList.contains("is-flipped");
    button.classList.toggle("is-locked", shouldLock);
    button.setAttribute("aria-disabled", String(shouldLock));
  });
}

function autoRevealFinalPair() {
  const finalIndexes = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !card.matched)
    .map(({ index }) => index);
  if (finalIndexes.length !== 2) return;

  isChecking = true;
  canFlipCard = false;
  selected = [...finalIndexes];
  grid.setAttribute("aria-busy", "true");
  finalIndexes.forEach((index) => {
    const button = grid.children[index];
    button.classList.remove("is-locked");
    button.classList.add("is-flipped");
    button.setAttribute("aria-disabled", "false");
    updateCardA11y(button, cards[index], "flipped");
  });
  playSfx("flip");
  moves += 1;
  moveCount.textContent = String(moves);

  pendingFinalReveal = window.setTimeout(() => {
    pendingFinalReveal = null;
    finishMatch(finalIndexes[0], finalIndexes[1]);
  }, 1200);
}

function flashLieCue() {
  speech.classList.remove("is-lie-cue");
  void speech.offsetWidth;
  speech.classList.add("is-lie-cue");
  if (pendingLieCue !== null) window.clearTimeout(pendingLieCue);
  pendingLieCue = window.setTimeout(() => {
    speech.classList.remove("is-lie-cue");
    pendingLieCue = null;
  }, 900);
}

function requestHint() {
  if (isChecking || canFlipCard || pairs === CARD_TYPES.length) return;

  const candidates = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card, index }) => !card.matched && !grid.children[index].classList.contains("is-flipped"));
  if (candidates.length === 0) return;

  const target = candidates[Math.floor(Math.random() * candidates.length)];
  const isTruth = nextHintTruth;
  nextHintTruth = !nextHintTruth;
  const unmatchedPairIds = new Set(
    cards.filter((card) => !card.matched).map((card) => card.pairId)
  );
  const lieCandidates = CARD_TYPES.filter((type, pairId) =>
    unmatchedPairIds.has(pairId) && type.name !== target.card.name
  );
  const claimedType = isTruth
    ? target.card
    : lieCandidates[Math.floor(Math.random() * lieCandidates.length)];

  activeHint = { index: target.index, isTruth };
  isChecking = true;
  grid.setAttribute("aria-busy", "true");
  grid.children[target.index].classList.add("is-hint-target");
  jokerLine.textContent = `${cardPosition(target.index)}のカードは${claimedType.label}だよ。`;
  hintAnswer.hidden = false;
  hintAnswerButtons[0].focus();
  syncCardLocks();

  if (!isTruth) flashLieCue();
}

function answerHint(event) {
  if (!activeHint || pendingHintReveal !== null) return;

  const guessedTruth = event.currentTarget.dataset.answer === "truth";
  const isCorrect = guessedTruth === activeHint.isTruth;
  const targetIndex = activeHint.index;
  const targetCard = cards[targetIndex];
  const targetButton = grid.children[targetIndex];
  const firstSelectedIndex = selected.length === 1 ? selected[0] : null;
  const completesPair = isCorrect
    && guessedTruth
    && firstSelectedIndex !== null
    && cards[firstSelectedIndex].pairId === targetCard.pairId;

  if (isCorrect) {
    insight += 1;
    insightCount.textContent = String(insight);
  }

  hintAnswer.hidden = true;
  targetButton.classList.remove("is-hint-target");
  targetButton.classList.add("is-flipped", "is-hint-reveal");
  playSfx("flip");
  updateCardA11y(targetButton, targetCard, "flipped");
  jokerLine.textContent = `${isCorrect ? "見破ったね！" : "残念。"} 本当は${targetCard.label}だったよ。`;

  pendingHintReveal = window.setTimeout(() => {
    targetButton.classList.remove("is-hint-reveal");
    if (completesPair) {
      activeHint = null;
      pendingHintReveal = null;
      canFlipCard = false;
      selected.push(targetIndex);
      moves += 1;
      moveCount.textContent = String(moves);
      finishMatch(firstSelectedIndex, targetIndex);
      return;
    }

    targetButton.classList.remove("is-flipped");
    playSfx("flip");
    targetButton.setAttribute("aria-label", `カード ${targetIndex + 1}、裏向き`);
    targetButton.setAttribute("aria-pressed", "false");
    activeHint = null;
    isChecking = false;
    canFlipCard = true;
    pendingHintReveal = null;
    grid.removeAttribute("aria-busy");
    jokerLine.textContent = "さあ、好きなカードを1枚めくってごらん。";
    syncCardLocks();
  }, 1500);
}

function handleCardSelect(event) {
  const button = event.currentTarget;
  const index = Number(button.dataset.index);
  const card = cards[index];

  if (isChecking || card.matched || selected.includes(index)) return;
  if (!canFlipCard) {
    jokerLine.textContent = "カードをめくる前に、私のヒントへ答えておくれ。";
    return;
  }

  canFlipCard = false;
  selected.push(index);
  button.classList.add("is-flipped");
  playSfx("flip");
  updateCardA11y(button, card, "flipped");

  if (selected.length === 1) {
    say("first");
    syncCardLocks();
    requestHint();
    return;
  }

  moves += 1;
  moveCount.textContent = String(moves);
  isChecking = true;
  grid.setAttribute("aria-busy", "true");

  const [firstIndex, secondIndex] = selected;
  if (cards[firstIndex].pairId === cards[secondIndex].pairId) {
    finishMatch(firstIndex, secondIndex);
  } else {
    finishMiss(firstIndex, secondIndex);
  }
}

function finishMatch(firstIndex, secondIndex) {
  playSfx("match");
  cards[firstIndex].matched = true;
  cards[secondIndex].matched = true;
  pairs += 1;
  pairCount.textContent = String(pairs);

  [firstIndex, secondIndex].forEach((index) => {
    const button = grid.children[index];
    button.classList.add("is-matched");
    button.disabled = true;
    updateCardA11y(button, cards[index], "matched");
  });

  selected = [];

  if (pairs === CARD_TYPES.length) {
    say("clear");
    finalMoves.textContent = String(moves);
    finalInsight.textContent = String(insight);
    pendingCompletion = window.setTimeout(() => {
      showCelebration();
      pendingCompletion = null;
    }, 1900);
  } else {
    say("match");
    pendingMatch = window.setTimeout(() => {
      isChecking = false;
      pendingMatch = null;
      grid.removeAttribute("aria-busy");
      syncCardLocks();
      requestHint();
    }, 1800);
  }
}

function finishMiss(firstIndex, secondIndex) {
  playSfx("miss");
  say("miss");
  pendingFlip = window.setTimeout(() => {
    [firstIndex, secondIndex].forEach((index) => {
      const button = grid.children[index];
      if (!button) return;
      button.classList.remove("is-flipped");
      button.setAttribute("aria-label", `カード ${index + 1}、裏向き`);
      button.setAttribute("aria-pressed", "false");
    });
    selected = [];
    pendingFlip = null;
    pendingAutoHint = window.setTimeout(() => {
      isChecking = false;
      pendingAutoHint = null;
      grid.removeAttribute("aria-busy");
      syncCardLocks();
      requestHint();
    }, 550);
  }, 800);
}

function startGame() {
  if (pendingFlip !== null) {
    window.clearTimeout(pendingFlip);
    pendingFlip = null;
  }
  if (pendingCompletion !== null) {
    window.clearTimeout(pendingCompletion);
    pendingCompletion = null;
  }
  if (pendingMatch !== null) {
    window.clearTimeout(pendingMatch);
    pendingMatch = null;
  }
  if (pendingHintReveal !== null) {
    window.clearTimeout(pendingHintReveal);
    pendingHintReveal = null;
  }
  if (pendingLieCue !== null) {
    window.clearTimeout(pendingLieCue);
    pendingLieCue = null;
  }
  if (pendingAutoHint !== null) {
    window.clearTimeout(pendingAutoHint);
    pendingAutoHint = null;
  }
  if (pendingFinalReveal !== null) {
    window.clearTimeout(pendingFinalReveal);
    pendingFinalReveal = null;
  }

  cards = makeDeck();
  selected = [];
  moves = 0;
  pairs = 0;
  insight = 0;
  isChecking = false;
  activeHint = null;
  nextHintTruth = Math.random() < 0.5;
  canFlipCard = false;

  moveCount.textContent = "0";
  pairCount.textContent = "0";
  insightCount.textContent = "0";
  completion.hidden = true;
  document.body.classList.remove("is-celebrating");
  celebrationVideo.pause();
  celebrationVideo.currentTime = 0;
  celebrationVideo.controls = false;
  celebrationEffects.replaceChildren();
  setBgmAudible(true);
  hintAnswer.hidden = true;
  speech.classList.remove("is-lie-cue");
  grid.removeAttribute("aria-busy");
  grid.replaceChildren(...cards.map(createCard));
  say("start");
  syncCardLocks();
  requestHint();
}

function beginGame() {
  startScreen.hidden = true;
  initBgm();
  setBgmAudible(true);
  startGame();
}

restartButton.addEventListener("click", startGame);
playAgainButton.addEventListener("click", startGame);
hintAnswerButtons.forEach((button) => button.addEventListener("click", answerHint));
startButton.addEventListener("click", beginGame);
soundButton.addEventListener("click", toggleBgm);
celebrationVideo.addEventListener("ended", () => {
  if (!completion.hidden) setBgmAudible(true);
});

// 演出動画は将来ここから呼び出せるよう、ゲームロジックと表示を分離している。
// assets/joker_movie.mp4 は初版では意図的に読み込まない。
startButton.focus();
