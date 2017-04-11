# steam-mobile-confirmer
Node script to automatically confirm trades on an account.

# Installation

Requires async/await support.

Edit the following lines in `index.js`:

    const loginDetails = {
        username: '',
        password: '',
        shared_secret: '',
        identity_secret: '',
        proxy: '' // optional, ip:port format
    };
    
Run with `node --harmony index.js` (node < 7.8.0) or  `node index.js`.