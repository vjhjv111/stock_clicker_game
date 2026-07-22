(() => {
  "use strict";

  const GAME_DURATION = 180;
  const TARGET_WORTH = 300000;
  const NEWS_INTERVAL = 12;
  const TICK_MS = 650;

  const tickers = [
    { id: "ramen", name: "우주라면", icon: "🍜", price: 6200, volatility: 0.035, drift: 0.0007, unlock: 0 },
    { id: "cat", name: "냥냥로봇", icon: "🤖", price: 11500, volatility: 0.052, drift: 0.0002, unlock: 0 },
    { id: "battery", name: "번개배터리", icon: "🔋", price: 18800, volatility: 0.068, drift: -0.0001, unlock: 100000 },
    { id: "moon", name: "달나라코인", icon: "🌙", price: 34500, volatility: 0.095, drift: 0.0004, unlock: 220000 }
  ];

  const upgrades = [
    { id: "parttime", icon: "🧹", name: "주말 부업", desc: "초당 150원 자동 수익", baseCost: 3500, growth: 1.62, auto: 150, click: 0 },
    { id: "office", icon: "🏢", name: "1인 사무실", desc: "초당 650원 자동 수익", baseCost: 15500, growth: 1.72, auto: 650, click: 0 },
    { id: "franchise", icon: "🏪", name: "무인 프랜차이즈", desc: "초당 2,600원 자동 수익", baseCost: 62000, growth: 1.82, auto: 2600, click: 0 },
    { id: "espresso", icon: "☕", name: "고농축 에스프레소", desc: "클릭 수익 +120원", baseCost: 4500, growth: 1.55, auto: 0, click: 120 }
  ];

  const newsTemplates = [
    { tone: "good", title: "우주라면, 화성 맛집 1위 선정", body: "외계인 관광객 주문 폭주 소식에 매수세가 몰립니다.", target: "ramen", impact: 0.16 },
    { tone: "bad", title: "우주라면 스프에서 운석 조각 발견", body: "회수 조치로 단기 실적 우려가 커집니다.", target: "ramen", impact: -0.15 },
    { tone: "good", title: "냥냥로봇, 집사 자격증 취득 성공", body: "반려묘 만족도 99% 발표에 기대감이 상승합니다.", target: "cat", impact: 0.18 },
    { tone: "bad", title: "냥냥로봇이 새벽 3시 전원 집합 명령", body: "이상 행동 영상이 퍼지며 투자 심리가 얼어붙습니다.", target: "cat", impact: -0.17 },
    { tone: "good", title: "번개배터리, 1초 완충 기술 발표", body: "충전소 업계가 술렁이며 주가가 급등합니다.", target: "battery", impact: 0.22 },
    { tone: "bad", title: "번개배터리 충전 중 머리카락 곤두서", body: "안전성 논란이 번지며 매도세가 강해집니다.", target: "battery", impact: -0.21 },
    { tone: "good", title: "달나라코인, 달 토끼 결제 수단 채택", body: "우주 경제권 진입 기대감으로 변동성이 폭발합니다.", target: "moon", impact: 0.28 },
    { tone: "bad", title: "달나라코인 창업자, 지구 귀환선 놓쳐", body: "경영 공백 우려로 투매가 발생합니다.", target: "moon", impact: -0.26 },
    { tone: "good", title: "개미 연합, 오늘은 무조건 상승 선언", body: "전 종목에 근거 없는 자신감이 퍼집니다.", target: "all", impact: 0.075 },
    { tone: "bad", title: "경제 유튜버 300명 동시에 하락 예측", body: "전 종목이 공포에 흔들립니다.", target: "all", impact: -0.07 },
    { tone: "good", title: "중앙은행, 점심값 지원금 발표", body: "소비 심리 개선으로 시장 전체가 반등합니다.", target: "all", impact: 0.06 },
    { tone: "bad", title: "서버실 에어컨 고장", body: "거래소가 뜨거워지며 시장 전체가 불안정해집니다.", target: "all", impact: -0.055 }
  ];

  const state = {
    cash: 5000,
    selected: "ramen",
    elapsed: 0,
    timeLeft: GAME_DURATION,
    running: true,
    clickBase: 100,
    clickCount: 0,
    combo: 0,
    comboExpires: 0,
    autoIncome: 0,
    upgrades: Object.fromEntries(upgrades.map(u => [u.id, 0])),
    holdings: Object.fromEntries(tickers.map(t => [t.id, { qty: 0, avg: 0 }])),
    market: Object.fromEntries(tickers.map(t => [t.id, {
      price: t.price,
      open: t.price,
      history: Array.from({length: 30}, () => t.price),
      eventBias: 0,
      eventTicks: 0
    }])),
    realizedPnl: 0,
    newsCount: 0,
    newsTimer: NEWS_INTERVAL,
    bestWorth: 5000,
    sound: true
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    cash: $("cashText"), stockValue: $("stockValueText"), netWorth: $("netWorthText"), timer: $("timerText"),
    incomeRate: $("incomeRateText"), clickIncome: $("clickIncomeText"), work: $("workBtn"), floatLayer: $("floatingTextLayer"),
    comboBar: $("comboBar"), comboText: $("comboText"), upgradeList: $("upgradeList"),
    tickerTabs: $("tickerTabs"), tickerName: $("selectedTickerName"), tickerPrice: $("selectedTickerPrice"),
    tickerChange: $("selectedTickerChange"), canvas: $("priceChart"), holdingQty: $("holdingQtyText"),
    avgPrice: $("avgPriceText"), unrealized: $("unrealizedText"), qty: $("tradeQtyInput"),
    buy: $("buyBtn"), sell: $("sellBtn"), maxQty: $("maxQtyBtn"), autoToggle: $("autoTradeToggle"),
    stopLoss: $("stopLossInput"), takeProfit: $("takeProfitInput"), newsFeed: $("newsFeed"),
    newsCountdown: $("newsCountdown"), marketMood: $("marketMoodText"), mission: $("missionText"),
    missionBar: $("missionBar"), realized: $("realizedPnlText"), clickCount: $("clickCountText"),
    newsCount: $("newsCountText"), bestWorth: $("bestWorthText"), toast: $("toastContainer"),
    backdrop: $("modalBackdrop"), helpModal: $("helpModal"), resultModal: $("resultModal"),
    helpBtn: $("helpBtn"), restart: $("restartBtn"), resultTitle: $("resultTitle"),
    resultWorth: $("resultWorthText"), resultBreakdown: $("resultBreakdown"), soundBtn: $("soundBtn")
  };
  const ctx = els.canvas.getContext("2d");

  function money(n) {
    const abs = Math.round(Math.abs(n)).toLocaleString("ko-KR");
    return `${n < 0 ? "-" : ""}${abs}원`;
  }

  function totalStockValue() {
    return tickers.reduce((sum, t) => sum + state.holdings[t.id].qty * state.market[t.id].price, 0);
  }

  function netWorth() { return state.cash + totalStockValue(); }

  function selectedTicker() { return tickers.find(t => t.id === state.selected); }

  function clickMultiplier() { return 1 + Math.min(state.combo, 30) * 0.025; }

  function clickIncome() {
    return Math.round((state.clickBase + upgrades.reduce((s, u) => s + state.upgrades[u.id] * u.click, 0)) * clickMultiplier());
  }

  function upgradeCost(u) {
    return Math.floor(u.baseCost * Math.pow(u.growth, state.upgrades[u.id]));
  }

  function beep(freq = 440, duration = .045) {
    if (!state.sound) return;
    try {
      const audio = beep.audio || (beep.audio = new (window.AudioContext || window.webkitAudioContext)());
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      gain.gain.value = .025;
      osc.connect(gain).connect(audio.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
      osc.stop(audio.currentTime + duration);
    } catch {}
  }

  function toast(message) {
    const div = document.createElement("div");
    div.className = "toast";
    div.textContent = message;
    els.toast.appendChild(div);
    setTimeout(() => div.remove(), 2200);
  }

  function renderUpgrades() {
    els.upgradeList.innerHTML = "";
    upgrades.forEach(u => {
      const level = state.upgrades[u.id];
      const cost = upgradeCost(u);
      const card = document.createElement("article");
      card.className = "upgrade-card";
      card.innerHTML = `
        <div class="upgrade-icon">${u.icon}</div>
        <div class="upgrade-info">
          <strong>${u.name} Lv.${level}</strong>
          <small>${u.desc}</small>
        </div>
        <button class="upgrade-buy" ${state.cash < cost || !state.running ? "disabled" : ""}>
          구매<small>${money(cost)}</small>
        </button>`;
      card.querySelector("button").addEventListener("click", () => buyUpgrade(u));
      els.upgradeList.appendChild(card);
    });
  }

  function renderTickers() {
    els.tickerTabs.innerHTML = "";
    const worth = netWorth();
    tickers.forEach(t => {
      const locked = worth < t.unlock;
      const market = state.market[t.id];
      const change = (market.price / market.open - 1) * 100;
      const btn = document.createElement("button");
      btn.className = `ticker-tab ${state.selected === t.id ? "active" : ""}`;
      btn.disabled = locked;
      btn.innerHTML = `<span>${t.icon} ${locked ? "잠김" : t.name}</span>
        <small>${locked ? `${money(t.unlock)} 필요` : `${money(market.price)} · ${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}</small>`;
      btn.addEventListener("click", () => {
        state.selected = t.id;
        renderAll();
      });
      els.tickerTabs.appendChild(btn);
    });
  }

  function drawChart() {
    const dpr = window.devicePixelRatio || 1;
    const rect = els.canvas.getBoundingClientRect();
    els.canvas.width = Math.max(300, rect.width * dpr);
    els.canvas.height = Math.max(200, rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width, height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const history = state.market[state.selected].history;
    const min = Math.min(...history) * .985;
    const max = Math.max(...history) * 1.015;
    const range = Math.max(1, max - min);

    ctx.strokeStyle = "rgba(255,255,255,.07)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = height * i / 5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    const pts = history.map((p, i) => ({
      x: i / (history.length - 1) * width,
      y: height - ((p - min) / range) * (height - 18) - 9
    }));
    const up = history[history.length - 1] >= history[0];
    const lineColor = up ? "#22d49b" : "#ff6680";
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, up ? "rgba(34,212,155,.30)" : "rgba(255,102,128,.26)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath();
    ctx.fillStyle = gradient; ctx.fill();

    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.strokeStyle = lineColor; ctx.lineWidth = 3; ctx.stroke();
  }

  function renderAll() {
    const stockValue = totalStockValue();
    const worth = state.cash + stockValue;
    state.bestWorth = Math.max(state.bestWorth, worth);
    const ticker = selectedTicker();
    const market = state.market[ticker.id];
    const holding = state.holdings[ticker.id];
    const change = (market.price / market.open - 1) * 100;
    const unrealized = holding.qty * (market.price - holding.avg);

    els.cash.textContent = money(state.cash);
    els.stockValue.textContent = money(stockValue);
    els.netWorth.textContent = money(worth);
    els.timer.textContent = `${String(Math.floor(state.timeLeft / 60)).padStart(2, "0")}:${String(state.timeLeft % 60).padStart(2, "0")}`;
    els.incomeRate.textContent = `초당 ${money(state.autoIncome)}`;
    els.clickIncome.textContent = `클릭당 +${money(clickIncome())}`;
    els.comboText.textContent = `x${clickMultiplier().toFixed(2)}`;
    els.comboBar.style.width = `${Math.min(100, state.combo / 30 * 100)}%`;

    els.tickerName.textContent = `${ticker.icon} ${ticker.name}`;
    els.tickerPrice.textContent = money(market.price);
    els.tickerChange.textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
    els.tickerChange.className = `price-change ${change >= 0 ? "positive" : "negative"}`;
    els.holdingQty.textContent = `${holding.qty}주`;
    els.avgPrice.textContent = holding.qty ? money(holding.avg) : "0원";
    els.unrealized.textContent = money(unrealized);
    els.unrealized.className = unrealized >= 0 ? "positive" : "negative";

    els.newsCountdown.textContent = `다음 뉴스 ${Math.max(0, Math.ceil(state.newsTimer))}초`;
    const activeBias = Object.values(state.market).reduce((s, m) => s + Math.abs(m.eventBias), 0);
    els.marketMood.textContent = activeBias > .18 ? "극심한 변동" : activeBias > .06 ? "뉴스 장세" : "평온";
    els.mission.textContent = `총 자산 ${money(TARGET_WORTH)}을 달성하세요.`;
    els.missionBar.style.width = `${Math.min(100, worth / TARGET_WORTH * 100)}%`;
    els.realized.textContent = money(state.realizedPnl);
    els.realized.className = state.realizedPnl >= 0 ? "positive" : "negative";
    els.clickCount.textContent = `${state.clickCount.toLocaleString()}회`;
    els.newsCount.textContent = `${state.newsCount}건`;
    els.bestWorth.textContent = money(state.bestWorth);

    els.buy.disabled = !state.running;
    els.sell.disabled = !state.running || holding.qty <= 0;
    renderUpgrades();
    renderTickers();
    drawChart();
  }

  function workClick(event) {
    if (!state.running) return;
    const now = performance.now();
    state.combo = now < state.comboExpires ? Math.min(30, state.combo + 1) : 1;
    state.comboExpires = now + 900;
    const gain = clickIncome();
    state.cash += gain;
    state.clickCount++;
    beep(520 + state.combo * 8);

    const rect = els.floatLayer.getBoundingClientRect();
    const span = document.createElement("span");
    span.className = "float-money";
    span.textContent = `+${money(gain)}`;
    span.style.left = `${(event.clientX || rect.left + rect.width / 2) - rect.left}px`;
    span.style.top = `${(event.clientY || rect.top + rect.height / 2) - rect.top}px`;
    els.floatLayer.appendChild(span);
    setTimeout(() => span.remove(), 850);
    renderAll();
  }

  function buyUpgrade(u) {
    const cost = upgradeCost(u);
    if (state.cash < cost || !state.running) return;
    state.cash -= cost;
    state.upgrades[u.id]++;
    state.autoIncome += u.auto;
    beep(760, .08);
    toast(`${u.name} Lv.${state.upgrades[u.id]} 구매 완료`);
    renderAll();
  }

  function getTradeQty() {
    return Math.max(1, Math.floor(Number(els.qty.value) || 1));
  }

  function buyStock() {
    const t = selectedTicker();
    const price = state.market[t.id].price;
    const qty = getTradeQty();
    const cost = price * qty;
    if (cost > state.cash) return toast("현금이 부족합니다.");
    const h = state.holdings[t.id];
    h.avg = (h.avg * h.qty + cost) / (h.qty + qty);
    h.qty += qty;
    state.cash -= cost;
    beep(680, .06);
    toast(`${t.name} ${qty}주 매수`);
    renderAll();
  }

  function sellStock(autoReason = "") {
    const t = selectedTicker();
    const qtyRequested = getTradeQty();
    sellTicker(t.id, Math.min(qtyRequested, state.holdings[t.id].qty), autoReason);
  }

  function sellTicker(id, qty, autoReason = "") {
    const h = state.holdings[id];
    if (qty <= 0 || h.qty <= 0) return toast("보유 주식이 없습니다.");
    const price = state.market[id].price;
    const proceeds = price * qty;
    const pnl = (price - h.avg) * qty;
    state.cash += proceeds;
    state.realizedPnl += pnl;
    h.qty -= qty;
    if (h.qty === 0) h.avg = 0;
    beep(pnl >= 0 ? 880 : 210, .09);
    toast(`${tickers.find(t => t.id === id).name} ${qty}주 매도 · ${money(pnl)}${autoReason ? ` (${autoReason})` : ""}`);
    renderAll();
  }

  function updateMarket() {
    tickers.forEach(t => {
      const m = state.market[t.id];
      const random = (Math.random() - .5) * 2 * t.volatility;
      const meanRevert = (m.open - m.price) / m.open * .012;
      const event = m.eventTicks > 0 ? m.eventBias : 0;
      const move = t.drift + random + meanRevert + event;
      m.price = Math.max(300, Math.round(m.price * (1 + move)));
      if (m.eventTicks > 0) {
        m.eventTicks--;
        m.eventBias *= .72;
      }
      m.history.push(m.price);
      if (m.history.length > 70) m.history.shift();
    });
    runAutoTrade();
  }

  function runAutoTrade() {
    if (!els.autoToggle.checked) return;
    const sl = Number(els.stopLoss.value) || -8;
    const tp = Number(els.takeProfit.value) || 12;
    tickers.forEach(t => {
      const h = state.holdings[t.id];
      if (!h.qty) return;
      const rate = (state.market[t.id].price / h.avg - 1) * 100;
      if (rate <= sl) sellTicker(t.id, h.qty, "자동 손절");
      else if (rate >= tp) sellTicker(t.id, h.qty, "자동 익절");
    });
  }

  function triggerNews() {
    const news = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
    if (news.target === "all") {
      tickers.forEach(t => {
        state.market[t.id].eventBias += news.impact / 4;
        state.market[t.id].eventTicks = 6;
      });
    } else {
      const m = state.market[news.target];
      m.eventBias += news.impact / 3;
      m.eventTicks = 7;
    }
    state.newsCount++;
    const item = document.createElement("article");
    item.className = `news-item ${news.tone}`;
    item.innerHTML = `<time>T-${state.timeLeft}초</time><strong>${news.title}</strong><p>${news.body}</p>`;
    els.newsFeed.prepend(item);
    while (els.newsFeed.children.length > 8) els.newsFeed.lastElementChild.remove();
    toast(`속보: ${news.title}`);
    beep(news.tone === "good" ? 960 : 170, .12);
  }

  function gameSecond() {
    if (!state.running) return;
    state.timeLeft--;
    state.newsTimer--;

    if (state.autoIncome > 0) state.cash += state.autoIncome;
    if (performance.now() > state.comboExpires) state.combo = Math.max(0, state.combo - 3);
    if (state.newsTimer <= 0) {
      triggerNews();
      state.newsTimer = NEWS_INTERVAL + Math.floor(Math.random() * 5) - 2;
    }
    if (state.timeLeft <= 0) endGame();
    renderAll();
  }

  function endGame() {
    state.running = false;
    tickers.forEach(t => {
      const h = state.holdings[t.id];
      if (h.qty) {
        const price = state.market[t.id].price;
        state.cash += price * h.qty;
        state.realizedPnl += (price - h.avg) * h.qty;
        h.qty = 0; h.avg = 0;
      }
    });
    const worth = netWorth();
    const rank = worth >= 1000000 ? ["전설의 단타왕", "당신의 클릭에 시장이 떨고 있습니다."]
      : worth >= TARGET_WORTH ? ["미니게임 투자 고수", "목표 자산을 달성했습니다!"]
      : worth >= 120000 ? ["생존한 개미", "욕심만 조금 줄이면 다음 판은 대박입니다."]
      : ["시드머니 수련생", "노동과 투자의 균형을 다시 잡아보세요."];
    els.resultTitle.textContent = rank[0];
    els.resultWorth.textContent = money(worth);
    els.resultBreakdown.innerHTML = `
      <div><span>평가</span><strong>${rank[1]}</strong></div>
      <div><span>실현 손익</span><strong class="${state.realizedPnl >= 0 ? "positive" : "negative"}">${money(state.realizedPnl)}</strong></div>
      <div><span>총 클릭 수</span><strong>${state.clickCount.toLocaleString()}회</strong></div>
      <div><span>처리한 뉴스</span><strong>${state.newsCount}건</strong></div>`;
    showModal(els.resultModal);
    renderAll();
  }

  function showModal(modal) {
    els.backdrop.classList.remove("hidden");
    els.helpModal.classList.add("hidden");
    els.resultModal.classList.add("hidden");
    modal.classList.remove("hidden");
  }

  function closeModal() {
    if (!els.resultModal.classList.contains("hidden")) return;
    els.backdrop.classList.add("hidden");
    els.helpModal.classList.add("hidden");
  }

  function seedNews() {
    els.newsFeed.innerHTML = `
      <article class="news-item"><time>시장 개장</time><strong>가상 증권 시장이 문을 열었습니다.</strong><p>3분 안에 노동 소득과 단타 매매를 조합해 최대 자산을 달성하세요.</p></article>
      <article class="news-item good"><time>안내</time><strong>모든 기업과 재화는 가상입니다.</strong><p>실제 투자와 무관한 유머 기반 미니게임입니다.</p></article>`;
  }

  els.work.addEventListener("click", workClick);
  els.buy.addEventListener("click", buyStock);
  els.sell.addEventListener("click", () => sellStock());
  els.maxQty.addEventListener("click", () => {
    const price = state.market[state.selected].price;
    els.qty.value = Math.max(1, Math.floor(state.cash / price));
  });
  document.querySelectorAll("[data-qty]").forEach(btn => btn.addEventListener("click", () => els.qty.value = btn.dataset.qty));
  els.helpBtn.addEventListener("click", () => showModal(els.helpModal));
  document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", closeModal));
  els.restart.addEventListener("click", () => location.reload());
  els.soundBtn.addEventListener("click", () => {
    state.sound = !state.sound;
    els.soundBtn.textContent = state.sound ? "🔊 소리 켬" : "🔇 소리 끔";
  });
  window.addEventListener("resize", drawChart);
  document.addEventListener("keydown", e => {
    if (e.code === "Space") {
      e.preventDefault();
      els.work.click();
    }
  });

  seedNews();
  renderAll();
  showModal(els.helpModal);
  setInterval(gameSecond, 1000);
  setInterval(() => {
    if (!state.running) return;
    updateMarket();
    renderAll();
  }, TICK_MS);
})();
