const express = require('express')
const app = express()
const Base58 = require("base-58")
import { 
    Connection, 
    PublicKey,
    SystemProgram,
    Transaction
} from "@solana/web3.js";
import { programs } from "@metaplex/js";
import { 
    AccountLayout, 
    TOKEN_PROGRAM_ID,
    createTransferInstruction,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
    createAssociatedTokenAccount,
    createAccount,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
import { TokenListProvider } from "@solana/spl-token-registry";
const axios = require('axios')
const { metadata: { Metadata } } = programs;

const connection = new Connection("https://api.devnet.solana.com")
const connectionMain = new Connection("https://api.mainnet-beta.solana.com")


app.get("/getNFTMetadata", async function (req, res) {
    console.log("getNFTMetadata")
    let pubkey = new PublicKey(req.query.publicKey)
    let tokenAccounts = await connection.getTokenAccountsByOwner(pubkey, {
        programId: TOKEN_PROGRAM_ID
    })
    let userTokenList = []
    let userTokenPubkeyList = []
    tokenAccounts.value.forEach(accounts => {
        userTokenList.push(AccountLayout.decode(accounts.account.data).mint.toString())
        userTokenPubkeyList.push(accounts.pubkey.toString())
    });

    let userNFTURI = []
    for(let i = 0; i < userTokenList.length; i++) {
        try {
            let tokenAmount = await (await connection.getTokenAccountBalance(new PublicKey(userTokenPubkeyList[i]))).value.amount
            if(tokenAmount == 0) {
                continue
            } else {
                let mintPubkey = new PublicKey(userTokenList[i])
                let nft = await Metadata.getPDA(mintPubkey)
                const tokenMeta = await Metadata.load(connection, nft)
                userNFTURI.push({"mintAddress": mintPubkey.toBase58(), "uri": tokenMeta.data.data.uri})
            }
        }  
        catch{

        }
    }
    console.log(userNFTURI)

    res.send({"NFTuri": userNFTURI})

})

app.get("/getFTdata", async function (req, res) {
    console.log("getFTdata")
    let pubkey = new PublicKey(req.query.publicKey)
    let tokenAccounts = await connectionMain.getTokenAccountsByOwner(pubkey, {
        programId: TOKEN_PROGRAM_ID
    })
    let userTokenList = []
    tokenAccounts.value.forEach(accounts => {
        console.log(AccountLayout.decode(accounts.account.data))
        userTokenList.push(AccountLayout.decode(accounts.account.data).mint.toString())
    });
    console.log(userTokenList)
    
    let tokenListProvider = new TokenListProvider()
    let tokenList = await tokenListProvider.resolve()
    let tokens = tokenList.filterByClusterSlug('mainnet-beta').getList()
    let userTokenMetadata = []
    tokens.forEach(token => {
        userTokenList.forEach(userTokenAddress => {
            if(token.address == userTokenAddress) {
                console.log("token", token)
                userTokenMetadata.push(token)
            }
        })
    });

    res.send({"TokenMetadata": userTokenMetadata})
})

app.get("/getBalance", async function (req, res) {
    console.log("getBalance")
    let pubkey = new PublicKey(req.query.publicKey)
    let balance = await connection.getBalance(pubkey)
    console.log(balance)
    res.send({"Balance": balance})
})

app.get("/makeTransaction", async function (req, res) {
    console.log("makeTransaction")
    var fromPublicKeyString = req.query.fromPublicKey
    var toPublicKeyString = req.query.toPublicKey
    var amount = req.query.amount
    var mintAddressString = req.query.mintAddress
    console.log(fromPublicKeyString, "fromPub")
    console.log(toPublicKeyString, "toPub")
    console.log(amount, "amount")
    console.log(mintAddressString, "mintAddr")
    var fromPublicKey = new PublicKey(fromPublicKeyString)
    var toPublicKey = new PublicKey(toPublicKeyString)
    var latestBlockHash = await (await connection.getLatestBlockhash()).blockhash

    var message = new Transaction({
        recentBlockhash: latestBlockHash,
        feePayer: fromPublicKey
    })
    

    if(mintAddressString == null) {
        message.add(
            SystemProgram.transfer({
                fromPubkey: fromPublicKey,
                toPubkey: toPublicKey,
                lamports: amount
            })
        )
        res.send(Base58.encode(message.serializeMessage()))
    } else {
        var mintAddress = new PublicKey(mintAddressString)
        var fromTokenInfo = await connection.getTokenAccountsByOwner(fromPublicKey, {mint: mintAddress})
        var fromTokenPublicKey = new PublicKey(fromTokenInfo.value[0].pubkey)
        console.log(fromTokenPublicKey.toBase58(), "fromTokenPublicKey")
        
        try {
            var toTokenInfo = await connection.getTokenAccountsByOwner(toPublicKey, {mint: mintAddress})
            var toTokenPublicKey = new PublicKey(toTokenInfo.value[0].pubkey)
            
        }
        catch(e) {
            console.log(fromPublicKey.toBase58(), "fromPub")
            console.log(toPublicKey.toBase58(), "toPub")
            console.log(mintAddress.toBase58(), "mintAddr")
            var toTokenPublicKey = await getAssociatedTokenAddress(mintAddress, toPublicKey)
            message.add(
                createAssociatedTokenAccountInstruction(
                    fromPublicKey,
                    toTokenPublicKey,
                    toPublicKey,
                    mintAddress
                )
            )
        }
        console.log(toTokenPublicKey.toBase58(), "toTokenPub")
        console.log(fromTokenPublicKey.toBase58(), "fromTokenPub")
        
        message.add(
            createTransferInstruction(
                fromTokenPublicKey,
                toTokenPublicKey,
                fromPublicKey,
                amount,
                [],
                TOKEN_PROGRAM_ID
            )
        )
        res.send(Base58.encode(message.serializeMessage()))
    }
})

app.get("/sendTransaction", async function (req, res) {
    console.log("sendTransaction")
    var serializedTransaction = req.query.serializedTransaction
    console.log(serializedTransaction)

    const response = await axios.post("https://api.devnet.solana.com", {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "sendTransaction",
        "params": [serializedTransaction]
    })
    console.log(response.data, "txHash")
    if(response.data.result == null) {
        res.send(response.data.error)
    }
    else {
        res.send({transactionHash: response.data.result})
    }
})

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Server is working : PORT - ',port);
});
