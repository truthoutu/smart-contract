const connectButton = document.getElementById('connectButton');
const statusText = document.getElementById('statusText');
const walletAddressText = document.getElementById('walletAddress');

connectButton.addEventListener('click', async () => {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            statusText.innerText = 'Status: Connected';
            statusText.style.color = 'green';
            walletAddressText.innerText = `Address: ${account}`;

            console.log('Connected Account:', account);
        } catch (error) {
            console.error('User denied account access:', error);
            statusText.innerText = 'Status: Connection Denied';
            statusText.style.color = 'red';
        }
    } else {
        statusText.innerText = 'Status: Metamask not found!';
        statusText.style.color = 'red';
        alert('Please install Metamask to continue.');
    }
});
