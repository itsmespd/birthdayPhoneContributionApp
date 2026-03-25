// Goal in rupees
const GOAL = 120000;

// TODO: Replace this with your deployed Apps Script Web App URL
// e.g. const API_URL = "https://script.google.com/macros/s/XXXXXXX/exec";
const API_URL = "https://script.google.com/macros/s/AKfycbwMwClbjIQI7PpKmuWdyHLKfHFeSABIR0HiWSZ_1iJ4auwZFQwCb2gP-9dicqC6YQ0G/exec";

const flaskLiquid = document.getElementById("flaskLiquid");
const messageEl = document.getElementById("message");
const topItemsEl = document.getElementById("topItems");

const contributeBtn = document.getElementById("contributeBtn");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const form = document.getElementById("contributionForm");
const nameInput = document.getElementById("nameInput");
const amountInput = document.getElementById("amountInput");
const formError = document.getElementById("formError");

// ✅ ADD this wave engine
let waveOffset = 0;
let currentFillPct = 0;
let targetFillPct = 0;

function buildWavePath(fillPct, offset) {
  if (fillPct <= 0) return "M0 300 H140 V300 Z";
  if (fillPct >= 100) return "M0 0 H140 V300 H0 Z";
  const svgHeight = 300;
  
  const liquidTop = svgHeight - (fillPct / 100) * svgHeight;
  const amp = 4;       // wave amplitude in px
  const waveLen = 70;  // wavelength

  // Build sine wave across top surface using many points
  let d = `M0 ${svgHeight}`;
  for (let x = 0; x <= 140; x += 2) {
    const y = liquidTop + amp * Math.sin((x + offset) * (2 * Math.PI / waveLen));
    d += ` L${x} ${y.toFixed(2)}`;
  }
  d += ` L140 ${svgHeight} Z`;
  return d;
}

function animateFlask() {
  // Ease toward target
  currentFillPct += (targetFillPct - currentFillPct) * 0.03;
  waveOffset += 1.5;

  const path = document.getElementById("flaskLiquid");
  if (path) path.setAttribute("d", buildWavePath(currentFillPct, waveOffset));

  requestAnimationFrame(animateFlask);
}
animateFlask();

function openModal() {
  modalBackdrop.style.display = "flex";
  formError.textContent = "";
  setTimeout(() => nameInput.focus(), 50);
}

function closeModal() {
  modalBackdrop.style.display = "none";
  form.reset();
}

contributeBtn.addEventListener("click", openModal);
modalCloseBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});
const upiCopyBtn = document.getElementById("upiCopyBtn");
const upiCopiedMsg = document.getElementById("upiCopiedMsg");
const UPI_ID = "itsmespd-1@okhdfcbank";

upiCopyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(UPI_ID).then(() => {
    upiCopiedMsg.textContent = "✅ UPI ID copied! Open any UPI app to pay.";
    upiCopyBtn.textContent = "✅ Copied!";
    setTimeout(() => {
      upiCopiedMsg.textContent = "";
      upiCopyBtn.textContent = "📋 Copy UPI ID";
    }, 3000);
  }).catch(() => {
    // Fallback for older mobile browsers
    upiCopiedMsg.textContent = `UPI ID: ${UPI_ID}`;
  });
});

async function fetchDataAndRender(retry = false) {
  if (!API_URL || API_URL.includes("PASTE_YOUR_APPS_SCRIPT")) {
    messageEl.textContent = "0% Raised. Hurry Up! Click on Contribute Now!";
    topItemsEl.innerHTML = "<div style='opacity:0.7'>Connect your Google Sheet to enable live data.</div>";
    return;
  }

  messageEl.textContent = "Loading contributions...";
  topItemsEl.innerHTML = "<div style='opacity:0.7'>Loading contributions...</div>";

  try {
    const res = await fetch(API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    if (!data.ok) throw new Error("Backend error");

    const total = data.total || 0;
    const percentage = Math.min(100, data.percentage || 0);

    // ✅ SVG wave fill — only this line, no style.height
    targetFillPct = percentage;

    if (percentage >= 100) {
      messageEl.textContent = "100% Raised ! Well Done everyone !";
      contributeBtn.disabled = true;
      contributeBtn.textContent = "🎯 Goal Reached ! Thank you for your contribution !";
      contributeBtn.style.opacity = "0.6";
      contributeBtn.style.cursor = "not-allowed";
    } else {
      messageEl.textContent = `${percentage.toFixed(1)}% Raised. Hurry Up! Click on Contribute Now!`;
      contributeBtn.disabled = false;
      contributeBtn.textContent = "Contribute Now!";
      contributeBtn.style.opacity = "";
      contributeBtn.style.cursor = "";
    }

    const top = data.top3 || [];
    topItemsEl.innerHTML = "";
    if (top.length === 0) {
      topItemsEl.innerHTML = "<div style='opacity:0.7'>Be the first to contribute! 🎉</div>";
    } else {
      top.forEach((c, idx) => {
        const pct = c.percentageOfGoal || 0;
        const row = document.createElement("div");
        row.className = "top-item";
        row.innerHTML = `
          <span>${idx + 1}. ${c.name}</span>
          <span>${pct.toFixed(1)}%</span>
        `;
        topItemsEl.appendChild(row);
      });
    }
  } catch (err) {
    console.error(err);
    if (!retry) {
      setTimeout(() => fetchDataAndRender(true), 1000);
      return;
    }
    messageEl.textContent = "Could not load right now. Try refreshing.";
    topItemsEl.innerHTML = "<div style='opacity:0.7'>Could not load contributions right now. Try refreshing.</div>";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  const name = nameInput.value.trim();
  const amount = Number(amountInput.value);

  if (!name || !amount || amount <= 0) {
    formError.textContent = "Please enter a valid name and amount 🙂";
    return;
  }

  if (!API_URL || API_URL.includes("PASTE_YOUR_APPS_SCRIPT")) {
    formError.textContent = "Connect the Google Sheet backend first.";
    return;
  }

  // Show loading
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Contributing...";

  // ✅ REPLACE with:
  try {
    // Step 1: Fetch existing contributions to validate
    submitBtn.textContent = "Checking...";
    const checkRes = await fetch(API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const checkData = await checkRes.json();

    if (!checkData.ok) throw new Error("Could not verify contributions");

    // Validation 1: Check if name already exists
    const allContributions = checkData.contributions || [];
    const allNames = checkData.allNames || [];
    const alreadyContributed = allNames.includes(name.toLowerCase());
    if (alreadyContributed) {
      formError.textContent = "You have already contributed. Thank you for your contribution and enthusiasm! 🙏";
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    // Validation 2: Check if amount >= GOAL
    if (amount >= GOAL) {
      formError.textContent = `Contribution cannot be greater than the full goal amount. Please enter a smaller amount. 😊`;
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    // All validations passed — submit
    submitBtn.textContent = "Contributing...";
    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ name, amount }),
    });

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#ff4b91", "#ffb86c", "#ffffff", "#a78bfa"],
    });

    setTimeout(() => {
      closeModal();
      fetchDataAndRender();
    }, 2500);

  closeModal();
  fetchDataAndRender();
} catch (err) {
  console.error(err);
  formError.textContent = "Could not save right now. Please try again.";
} finally {
    // Reset button
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Initial load
fetchDataAndRender();