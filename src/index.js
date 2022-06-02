const express = require('express')
const app = express()
const Base58 = require("base-58")
import { Connection, PublicKey } from "@solana/web3.js";
import { programs } from "@metaplex/js";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TokenListProvider } from "@solana/spl-token-registry";
const { metadata: { Metadata } } = programs;



app.get("/nft", async function (req, res) {
    const connection = new Connection("https://api.devnet.solana.com")
    let pubkey = new PublicKey("4e7FbY1fKFNhUWBeRtr6Q9CGhsVFuF2EYtWCLkZ6CKJ5")
    let tokenAccounts = await connection.getTokenAccountsByOwner(pubkey, {
        programId: TOKEN_PROGRAM_ID
    })
    let userTokenList = []
    tokenAccounts.value.forEach(accounts => {
        userTokenList.push(AccountLayout.decode(accounts.account.data).mint.toString())
    });
    let userNFTURI = []
    for(let i = 0; i < userTokenList.length; i++) {
        try {
            let mintPubkey = new PublicKey(userTokenList[i])
            let nft = await Metadata.getPDA(mintPubkey)
            const tokenMeta = await Metadata.load(connection, nft)
            userNFTURI.push(tokenMeta.data.data.uri)
        }  
        catch{

        }
    }
    console.log(userNFTURI)

    res.send({"NFTuri": userNFTURI})

})

app.get("/ft", async function (req, res) {
    const connection = new Connection("https://api.mainnet-beta.solana.com")
    let pubkey = new PublicKey("6egyjfXSPjRL5tDtHdjpzsMkhuKAwJriLuQg6aNviseK")
    let tokenAccounts = await connection.getTokenAccountsByOwner(pubkey, {
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
                userTokenMetadata.push(token)
            }
        })
    });

    res.send({"TokenMetadata":userTokenMetadata})
})

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Server is working : PORT - ',port);
});
