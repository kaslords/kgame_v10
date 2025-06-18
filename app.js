let web3;
let contract;
let selectedTokenId = null;
let selectedDefenderId = null;
let selectedNFTId = null;

const contractAddress = "0x7aFcF33E1E15F18e8C98f0494485b23B30C1F2A8"
const ipfsHash = "bafybeibqi2q5csjq5qftukvcwv4s7oqlben7ahcm5avuuaty2ul2qakkne";

function updateFightButtonState() {
  const fightButton = document.getElementById("fightButton");
  if (selectedDefenderId) {
    fightButton.disabled = false;
    fightButton.classList.remove("opacity-50", "cursor-not-allowed");
    fightButton.classList.add("hover:bg-[#468C85]");
  } else {
    fightButton.disabled = true;
    fightButton.classList.add("opacity-50", "cursor-not-allowed");
    fightButton.classList.remove("hover:bg-[#468C85]");
  }
}

async function connectWallet() {
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const walletAddress = accounts[0];
      document.getElementById("walletAddress").textContent = walletAddress;
      document.getElementById("walletInfo").classList.remove("hidden");
      document.getElementById("connectButton").textContent = "Disconnect";
      document.getElementById("connectButton").classList.add("bg-[#468C85]");
      document.getElementById("connectButton").classList.remove("bg-[#346F68]");
      document.getElementById("connectButton").disabled = false;
      web3 = new Web3(window.ethereum);
      const response = await fetch("abi.json");
      const abi = await response.json();
      contract = new web3.eth.Contract(abi, contractAddress);
      await loadWalletNFTs();
      await getGemBalance();
      await checkPendingRewards();
      await getGameCosts();
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  } else {
    alert("Please install MetaMask to use this feature!");
  }
}

document.getElementById("connectButton").addEventListener("click", function() {
  if (document.getElementById("connectButton").textContent === "Disconnect") {
    location.reload();
  } else {
    connectWallet();
  }
});

async function loadWalletNFTs() {
  const accounts = await web3.eth.getAccounts();
  const owner = accounts[0];
  const balance = await contract.methods.balanceOf(owner).call();
  const container = document.getElementById("walletNFTs");
  container.innerHTML = "";

  for (let i = 0; i < balance; i++) {
    const tokenId = await contract.methods.tokenOfOwnerByIndex(owner, i).call();
    const metadataUrl = `https://ipfs.io/ipfs/${ipfsHash}/${tokenId}`;
    const metadata = await (await fetch(metadataUrl)).json();
    const imgUrl = metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/");
    const rank = await contract.methods.tokenRank(tokenId).call();

    const card = document.createElement("div");
    card.className = "nft-card fancy-border-sm relative rounded-sm p-2 bg-gray-800 dark:bg-gray-800 border-[6px] border-gray-800 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-[#346F68] hover:shadow-[0_0_10px_#346F68]";
    if (selectedTokenId === tokenId) {
      card.className = "nft-card fancy-border-sm relative rounded-sm p-2 bg-gray-800 dark:bg-gray-800 border-[6px] border-[#346F68] shadow-[0_0_15px_#346F68] cursor-pointer scale-105 hover:shadow-[0_0_20px_#346F68]";
    }

    card.onclick = () => selectNFT(tokenId);
    
    card.innerHTML = `      <div
        class="absolute w-4 h-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-sm opacity-70 -top-[8px] -left-[8px] rotate-45"
      ></div>
      <div
        class="absolute w-4 h-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-sm opacity-70 -top-[8px] -right-[8px] rotate-45"
      ></div>
      <div
        class="absolute w-4 h-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-sm opacity-70 -bottom-[8px] -left-[8px] rotate-45"
      ></div>
      <div
        class="absolute w-4 h-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-sm opacity-70 -bottom-[8px] -right-[8px] rotate-45"
      ></div>
      <div class="relative z-10">
        <img
          src="${imgUrl}"
          alt="NFT ${tokenId}"
          class="w-full h-auto rounded-sm"
        />
        <p class="mt-2 text-sm text-gray-300">
          KasLords #${tokenId}
        </p>
        <p class="text-xs text-gray-400">
          (Rank ${rank})</p>
      </div>
    `;

    const button = document.createElement("button");
    button.textContent = "Select";
    button.className = "bg-[#346F68] hover:bg-[#468C85] text-white px-4 py-0 rounded transition-colors duration-200 mt-2";
    button.onclick = (e) => {
      e.stopPropagation(); // Prevent card click when clicking button
      selectNFT(tokenId);
    };
    card.appendChild(button);

    container.appendChild(card);
  }
}

async function selectNFT(tokenId) {
  selectedTokenId = tokenId;
  document.getElementById("selectedNFTDisplay").textContent = `Selected NFT ID: ${tokenId}`;
  document.getElementById("selectedActionToken").textContent = `🎯 Selected NFT ID for Health/Heal/Shield: ${tokenId}`;
  
  // Update the visual selection
  const cards = document.querySelectorAll('.nft-card');
  cards.forEach(card => {
    if (card.querySelector('p').textContent.includes(tokenId)) {
      card.className = "nft-card fancy-border-sm relative rounded-sm p-2 bg-gray-800 dark:bg-gray-800 border-[6px] border-[#346F68] shadow-[0_0_15px_#346F68] cursor-pointer scale-105 hover:shadow-[0_0_20px_#346F68]";
    } else {
      card.className = "nft-card fancy-border-sm relative rounded-sm p-2 bg-gray-800 dark:bg-gray-800 border-[6px] border-gray-800 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-[#346F68] hover:shadow-[0_0_10px_#346F68]";
    }
  });
  getCooldownStatus();

  // Show attacker preview
  try {
    const attackerMetaUrl = `https://ipfs.io/ipfs/${ipfsHash}/${tokenId}`;
    const attackerMeta = await (await fetch(attackerMetaUrl)).json();
    const attackerRank = await contract.methods.tokenRank(tokenId).call();

    document.getElementById("attackerNFTImage").src = attackerMeta.image.replace("ipfs://", "https://ipfs.io/ipfs/");
    document.getElementById("attackerNFTInfo").innerText = `#${tokenId} (Rank ${attackerRank})`;
  } catch (err) {
    console.error("❌ Failed to load attacker preview:", err);
  }
}


async function fight() {
  const defenderId = selectedDefenderId;
  const status = document.getElementById("fightStatus");

  if (!selectedTokenId || !defenderId) {
    alert("Select a fighter and enter a defender ID.");
    return;
  }

try {
  // Check if defender is shielded
  const shieldUntil = await contract.methods.shieldUntil(defenderId).call();
  const now = Math.floor(Date.now() / 1000);
  if (Number(shieldUntil) > now) {
    alert("🛡️ This defender is currently shielded. Please choose another target.");
    return;
  }

  // Check if defender is too weak (below 7.5% base health)
  const base = await contract.methods.baseHealth(defenderId).call();
  const defenderHP = await contract.methods.currentHealth(defenderId).call();
  const minRequired = Math.floor(Number(base) * 0.075);
  if (Number(defenderHP) < minRequired) {
    alert(`⚠️ Defender's health is too low (${defenderHP}/${base}). You must choose a stronger target.`);
    return;
  }

  // 🛡️ Check attacker has at least 500 HP
  const attackerHP = await contract.methods.currentHealth(selectedTokenId).call();
  if (Number(attackerHP) < 500) {
    alert("⚠️ Your NFT must have at least 500 health to attack.");
    return;
  }
  } catch (err) {
  console.error("❌ Pre-fight checks failed:", err);
  alert("❌ Error occurred during pre-fight checks.");
}

  try {
    const accounts = await web3.eth.getAccounts();
    const user = accounts[0];

    // 🕒 Check cooldowns BEFORE sending transaction
    const walletLast = await contract.methods.lastWalletFightTime(user).call();
    const tokenLast = await contract.methods.lastTokenFightTime(selectedTokenId).call();
    const walletCooldown = await contract.methods.walletCooldownDuration().call();
    const tokenCooldown = await contract.methods.nftCooldownDuration().call();
    const now = Math.floor(Date.now() / 1000);

    if (now < Number(walletLast) + Number(walletCooldown)) {
      alert("⏳ Your wallet is still on cooldown. Please wait for your cooldown to end before attacking again.");
      return;
    }

    if (now < Number(tokenLast) + Number(tokenCooldown)) {
      alert("⏳ This NFT is still cooling down from a previous fight. Please wait for your cooldown to end before attacking again.");
      return;
    }

    // Proceed with fight
    const receipt = await contract.methods.fight(selectedTokenId, defenderId).send({ from: user });

    const fightEvent = receipt.events.Fight;
    const damageDealt = fightEvent.returnValues.damageDealt;
    const counterDamage = fightEvent.returnValues.counterDamage;

    const attackerHealth = await contract.methods.currentHealth(selectedTokenId).call();
    const defenderHealth = await contract.methods.currentHealth(defenderId).call();

    status.innerHTML = `
      ✅ Fight complete between #${selectedTokenId} and #${defenderId}<br>
      🩸 Damage Dealt: ${damageDealt}<br>
      🩻 Damage Taken: ${counterDamage}<br>
      ❤️ Attacker Health: ${attackerHealth}<br>
      🛡️ Defender Health: ${defenderHealth}
    `;

    await showFightingNFTs(selectedTokenId, defenderId);
    await checkPendingRewards();
    await getCooldownStatus();
  } catch (err) {
    console.error("❌ Fight failed:", err);
    status.innerText = "❌ Fight failed: " + (err.message || "Unknown error");
  }
}




async function getHealth() {
  const id = selectedTokenId;
  const status = document.getElementById("healthStatus");

  if (!id) {
    status.innerText = "❗ Please select an NFT first.";
    return;
  }

  try {
    const current = await contract.methods.currentHealth(id).call();
    const base = await contract.methods.baseHealth(id).call();
    status.innerText = `❤️ Health: ${current} of ${base}`;
  } catch (err) {
    console.error("Error getting health:", err);
    status.innerText = "❌ Error getting health";
  }
}


async function healCharacter() {
  const tokenId = selectedTokenId;
  const amountInput = document.getElementById("healAmount").value;
  const status = document.getElementById("healStatus");

  if (!tokenId) {
    status.textContent = "❗ Please select an NFT first.";
    return;
  }
  if (!amountInput) {
    status.textContent = "❗ Please enter a heal amount.";
    return;
  }

  let amountRequested = Number(amountInput);
  if (isNaN(amountRequested) || amountRequested <= 0) {
    status.textContent = "❗ Invalid heal amount.";
    return;
  }

  try {
    const accounts = await web3.eth.getAccounts();
    const user = accounts[0];

    // 🔍 Fetch health-related data
    const [baseHealth, currentHealth, lastHealTime] = await Promise.all([
      contract.methods.baseHealth(tokenId).call(),
      contract.methods.currentHealth(tokenId).call(),
      contract.methods.lastHealTime(tokenId).call()
    ]);

    // 🕒 Estimate passive healing
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - Number(lastHealTime);
    let passiveHeal = 0;
    if (elapsed >= 3600) {
      const hoursPassed = Math.floor(elapsed / 3600);
      passiveHeal = Math.floor(Number(baseHealth) * hoursPassed / 100);
    }

    const effectiveHealth = Math.min(Number(currentHealth) + passiveHeal, Number(baseHealth));
    const missingHealth = Number(baseHealth) - effectiveHealth;

    // 🛑 Adjust request if too much
    const actualHeal = Math.min(amountRequested, missingHealth);
    if (actualHeal < amountRequested) {
      const confirm = window.confirm(`⚠️ You can only heal ${actualHeal} HP (considering passive recovery). Adjust and continue?`);
      if (!confirm) {
        status.textContent = "🛑 Heal cancelled by user.";
        return;
      }
      amountRequested = actualHeal;
    }

    const costPerHP = await contract.methods.healCostPerHP().call();
    const totalCost = BigInt(costPerHP) * BigInt(amountRequested);

    // 💎 Setup GEM contract
    const gemTokenAddress = await contract.methods.gemsToken().call();
    const gemAbi = [
      {
        constant: true,
        inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
      },
      {
        constant: false,
        inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        type: "function",
      },
    ];
    const gem = new web3.eth.Contract(gemAbi, gemTokenAddress);

    const allowance = await gem.methods.allowance(user, contract.options.address).call();
    if (BigInt(allowance) < totalCost) {
      status.textContent = "🔓 Approving GEMs for healing...";
      await gem.methods.approve(contract.options.address, web3.utils.toWei("1000000", "ether")).send({ from: user });
    }

    status.textContent = "💉 Sending heal transaction...";
    await contract.methods.heal(tokenId, amountRequested).send({ from: user });

    // Calculate and show passive healing
const finalHealth = await contract.methods.currentHealth(tokenId).call();
const actualPassiveApplied = finalHealth - currentHealth - amountRequested;

if (actualPassiveApplied > 0) {
  status.textContent = `✅ Token #${tokenId} healed by ${amountRequested} HP and ${actualPassiveApplied} passive HP`;
} else {
  status.textContent = `✅ Token #${tokenId} healed by ${amountRequested} HP`;
}
  } catch (err) {
    console.error("Healing failed:", err);
    status.textContent = "❌ Healing failed: " + err.message;
  }
}



// Apply shield to a token
document.getElementById("shieldDuration").addEventListener("input", () => {
  const hours = Number(document.getElementById("shieldDuration").value);
  if (isNaN(hours) || hours < 24 || hours > 72) {
    document.getElementById("shieldCostPreview").textContent = "🛡️ Shield Cost: Invalid duration";
    return;
  }

  const cost = 100 + ((hours - 24) * (200 / 48));
  document.getElementById("shieldCostPreview").textContent = `🛡️ Current Cost (Duration: ${hours} hrs): ${cost.toFixed(2)} GEM`;
});



async function applyShield() {
  const tokenId = selectedTokenId;
  const duration = document.getElementById("shieldDuration").value;
  const status = document.getElementById("shieldStatus");

    if (!selectedTokenId) {
  status.textContent = "❗ Please select an NFT first.";
  return;
}
  if (!tokenId || !duration) {
    status.textContent = "❗ Please enter token ID and duration";
    return;
  }

  try {
    const hours = Number(duration);
    if (hours < 24 || hours > 72) throw new Error("Duration must be 24–72 hours");

    // ✅ Check if shield is already active
    const shieldEnd = await contract.methods.shieldUntil(tokenId).call();
    if (Number(shieldEnd) > Date.now() / 1000) {
      const expires = new Date(Number(shieldEnd) * 1000).toLocaleString();
      status.textContent = `⚠️ Shield already active until ${expires}`;
      return;
    }

    const accounts = await web3.eth.getAccounts();
    const cost = BigInt(100 + ((hours - 24) * (200 / 48))) * 1_000_000_000_000_000_000n;

    const gemTokenAddress = await contract.methods.gemsToken().call();
    const gemAbi = [
      { name: "allowance", type: "function", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], constant: true },
      { name: "approve", type: "function", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], constant: false }
    ];
    const gem = new web3.eth.Contract(gemAbi, gemTokenAddress);

    const allowance = await gem.methods.allowance(accounts[0], contract.options.address).call();
    if (BigInt(allowance) < cost) {
      await gem.methods.approve(contract.options.address, web3.utils.toWei("1000000", "ether")).send({ from: accounts[0] });
    }

    await contract.methods.applyShield(tokenId, hours).send({ from: accounts[0] });

    status.textContent = `✅ Shield applied for ${hours} hours to Token #${tokenId}`;
  } catch (err) {
    console.error("Shield error:", err);
    status.textContent = "❌ Failed to apply shield: " + err.message;
  }
}



// Hook up button
document.getElementById("applyShieldButton").addEventListener("click", applyShield);


async function showFightingNFTs(attackerId, defenderId) {
  try {
    // Attacker
    const attackerMetaUrl = `https://ipfs.io/ipfs/${ipfsHash}/${attackerId}`;
    const attackerMeta = await (await fetch(attackerMetaUrl)).json();
    const attackerRank = await contract.methods.tokenRank(attackerId).call();
    document.getElementById("attackerNFTImage").src = attackerMeta.image.replace("ipfs://", "https://ipfs.io/ipfs/");
    document.getElementById("attackerNFTInfo").innerText = `#${attackerId} (Rank ${attackerRank})`;

    // Defender
    const defenderMetaUrl = `https://ipfs.io/ipfs/${ipfsHash}/${defenderId}`;
    const defenderMeta = await (await fetch(defenderMetaUrl)).json();
    const defenderRank = await contract.methods.tokenRank(defenderId).call();
    document.getElementById("defenderImage").src = defenderMeta.image.replace("ipfs://", "https://ipfs.io/ipfs/");
    document.getElementById("defenderInfo").innerText = `#${defenderId} (Rank ${defenderRank})`;
  } catch (error) {
    console.error("Failed to fetch attacker/defender metadata", error);
  }
}



async function getGameGemBalance() {
  try {
    const gemTokenAddress = await contract.methods.gemsToken().call();
    const gemAbi = [
      {
        "constant": true,
        "inputs": [{ "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "", "type": "uint256" }],
        "type": "function"
      }
    ];

    const gemContract = new web3.eth.Contract(gemAbi, gemTokenAddress);
    const balance = await gemContract.methods.balanceOf(contract.options.address).call();

    const formatted = Number(balance) / 1e18;
    document.getElementById("gameGemBalance").textContent = `💎 Gems in Pool: ${formatted}`;
  } catch (error) {
    console.error("❌ Error fetching GEM pool balance:", error);
    document.getElementById("gameGemBalance").textContent = "❌ Error fetching balance";
  }
}
// Utility to format BigInt GEM values to readable float
function formatGems(value) {
  return Number(web3.utils.fromWei(value, 'ether')).toFixed(2);
}

// Fetch GEM balance for the connected wallet
async function getGemBalance() {
  try {
    const accounts = await web3.eth.getAccounts();
    const user = accounts[0];
    if (!user) throw new Error("No connected account");

    // Get GEM token address from game contract
    const gemTokenAddress = await contract.methods.gemsToken().call();
    if (!gemTokenAddress) throw new Error("GEM token address not found");

    // Load minimal GEM ABI
    const gemAbi = [{
      constant: true,
      inputs: [{ name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ name: "", type: "uint256" }],
      type: "function"
    }];
    const gemContract = new web3.eth.Contract(gemAbi, gemTokenAddress);

    const balance = await gemContract.methods.balanceOf(user).call();
    const formatted = Number(web3.utils.fromWei(balance, 'ether')).toFixed(2);
    document.getElementById("gemBalance").textContent = `${formatted} GEMS`;
  } catch (err) {
    console.error("❌ Error fetching GEM balance:", err);
    document.getElementById("gemBalance").textContent = "❌ Error fetching balance";
  }
}


// Claim pending Gems
async function claimGems() {
  const status = document.getElementById("claimStatus");

  try {
    const accounts = await web3.eth.getAccounts();
    const user = accounts[0];

    const pending = await contract.methods.pendingRewards(user).call();
    if (pending == 0) {
      status.textContent = "⚠️ No Gems to claim.";
      return;
    }

    status.textContent = "⏳ Claiming Gems...";
    await contract.methods.claimGems().send({ from: user });

    status.textContent = "✅ Gems claimed!";
    await getGemBalance();
    await checkPendingRewards();
  } catch (err) {
    console.error("❌ Failed to claim Gems:", err);
    status.textContent = "❌ Error claiming Gems: " + err.message;
  }
}
document.getElementById("claimGemsButton").addEventListener("click", claimGems);


async function checkPendingRewards() {
  try {
    const accounts = await web3.eth.getAccounts();
    const user = accounts[0];
    if (!user) throw new Error("Wallet not connected");

    const pending = await contract.methods.pendingRewards(user).call();
    const formatted = Number(web3.utils.fromWei(pending, 'ether')).toFixed(2);
    document.getElementById("pendingRewardDisplay").textContent = `${formatted} GEMS`;
  } catch (err) {
    console.error("❌ Error fetching pending rewards:", err);
    document.getElementById("pendingRewardDisplay").textContent = "❌ Error";
  }
}



// Attach to button
document.getElementById("checkPendingButton").addEventListener("click", checkPendingRewards);

async function getCooldownStatus() {
  try {
    const accounts = await web3.eth.getAccounts();
    const user = accounts[0];
    const walletTs = await contract.methods.lastWalletFightTime(user).call();
    const tokenTs = await contract.methods.lastTokenFightTime(selectedTokenId).call();
    const walletCooldown = await contract.methods.walletCooldownDuration().call();
    const tokenCooldown = await contract.methods.nftCooldownDuration().call();

    const walletExpires = walletTs == 0 ? "Not used yet" : new Date((Number(walletTs) + Number(walletCooldown)) * 1000).toLocaleString();
    const tokenExpires = tokenTs == 0 ? "Not used yet" : new Date((Number(tokenTs) + Number(tokenCooldown)) * 1000).toLocaleString();

    document.getElementById("cooldownStatus").innerText =
      `⏳ Wallet cooldown ends: ${walletExpires}\n⏳ Token cooldown ends: ${tokenExpires}`;
  } catch (err) {
    console.error("❌ Error fetching cooldown status:", err);
    document.getElementById("cooldownStatus").innerText = "❌ Error fetching cooldowns";
  }
}

async function findRandomDefender() {
  const loader = document.getElementById("defenderLoading");
  loader.style.display = "block";

  const maxSupply = 1500;
  const start = Math.floor(Math.random() * maxSupply) + 1;
  const accounts = await web3.eth.getAccounts();
  const user = accounts[0];

  for (let i = 0; i < 1500; i++) {
    const tokenId = ((start + i - 1) % maxSupply) + 1;

    try {
      const exists = await contract.methods.tokenExists(tokenId).call();
      if (!exists) continue;

      const health = await contract.methods.currentHealth(tokenId).call();
      if (health == 0) continue;

      const shieldUntil = await contract.methods.shieldUntil(tokenId).call();
      if (shieldUntil > Math.floor(Date.now() / 1000)) continue;

      const owner = await contract.methods.ownerOf(tokenId).call();
      if (owner.toLowerCase() === user.toLowerCase()) continue;

// ✅ Found a valid defender

     const metadataUrl = `https://ipfs.io/ipfs/${ipfsHash}/${tokenId}`;
     const metadata = await (await fetch(metadataUrl)).json();
     const imageUrl = metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/");
     const defenderRank = await contract.methods.tokenRank(tokenId).call();

     const imgEl = document.getElementById("defenderImage");
     const infoEl = document.getElementById("defenderInfo");

if (!imgEl || !infoEl) {
  console.warn("Defender DOM elements missing");
  loader.style.display = "none";
  return;
}

imgEl.src = imageUrl;
infoEl.innerText = `#${tokenId} (Rank ${defenderRank})`;

selectedDefenderId = tokenId;

alert(`🎯 Defender found: Token #${tokenId}`);
loader.style.display = "none";
updateFightButtonState();
return;


    } catch (err) {
      console.warn(`Skipping token ${tokenId}:`, err.message);
    }
  }

  loader.style.display = "none";
  alert("❌ No valid defender found after scanning 1500 tokens.");
}

async function getGameCosts() {
  try {
    const [healCost, shieldCost, healUpdated, shieldUpdated] = await Promise.all([
      contract.methods.healCostPerHP().call(),
      contract.methods.shieldCost().call(),
      contract.methods.lastHealCostUpdate().call(),
      contract.methods.lastShieldCostUpdate().call()
    ]);

    const formatGEM = (val) => Number(web3.utils.fromWei(val, 'ether')).toFixed(2);
    const formatTime = (ts) => ts == 0 ? "No adjustment has been made" : new Date(Number(ts) * 1000).toLocaleString();

    document.getElementById("healCostDisplay").textContent = `🧪 Heal Cost: ${formatGEM(healCost)} GEM / HP`;
    document.getElementById("shieldCostDisplay").textContent = `🛡️ Base Cost (24 hrs): ${formatGEM(shieldCost)} GEM`;
    document.getElementById("healCostUpdatedDisplay").textContent = `🧪 Heal Cost Last Updated: ${formatTime(healUpdated)}`;
    document.getElementById("shieldCostUpdatedDisplay").textContent = `🛡️ Shield Cost Last Updated: ${formatTime(shieldUpdated)}`;
  } catch (err) {
    console.error("❌ Failed to fetch game costs:", err);
  }
}

async function checkShieldStatus() {
  const tokenId = selectedTokenId;
  const display = document.getElementById("shieldCheckResult");

  if (!tokenId) {
    display.textContent = "❗ Please select an NFT first.";
    return;
  }

  try {
    const shieldUntil = await contract.methods.shieldUntil(tokenId).call();
    const now = Math.floor(Date.now() / 1000);

    if (Number(shieldUntil) > now) {
      const expiresAt = new Date(Number(shieldUntil) * 1000).toLocaleString();
      display.textContent = `🛡️ Shield is active and will expire at: ${expiresAt}`;
    } else {
      display.textContent = "⚠️ No active shield on this token.";
    }
  } catch (err) {
    console.error("Error checking shield status:", err);
    display.textContent = "❌ Error checking shield status.";
  }
}

document.getElementById("checkShieldButton").addEventListener("click", checkShieldStatus);