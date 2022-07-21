const axios = require('axios')

export async function getSignaturesForAddress(publicKey, txHash) {
    let response

    if(txHash == null) {
        response = await axios.post("https://api.devnet.solana.com", {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": [publicKey.toBase58()]
    })
    } else {
        response = await axios.post("https://api.devnet.solana.com", {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": [publicKey.toBase58(), {"before": txHash}]
    })
    }
    return response
}

export async function getTransaction(txHash) {
    let response = await axios.post("https://api.devnet.solana.com", {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTransaction",
        "params": [txHash]
    })
    return response
}
