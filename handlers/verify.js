import { recoverPersonalSignature,recoverTypedSignature } from 'eth-sig-util'
import { ethers } from 'ethers'
import { gatherResponse } from '../utils'
import { Octokit } from '@octokit/rest'

// github api info
const USER_AGENT = 'Cloudflare Worker'

// format request for twitter api

const TWITTER_BEARER = "";
var requestHeaders = new Headers()
requestHeaders.append('Authorization', 'Bearer ' + TWITTER_BEARER)
var requestOptions = {
    method: 'GET',
    headers: requestHeaders,
    redirect: 'follow',
}
const init = {
    headers: { 'content-type': 'application/json' },
}

// regex for parsing tweet
const regsig = new RegExp('(?<=sig:).*')
// const regadd = new RegExp('(?<=addr:)([0x[:xdigit:]])*')

export async function handleVerify(request) {
    try {
        
        let response;
        const { searchParams } = new URL(request.url)
        let tweetID = searchParams.get('id')
        let account = searchParams.get('account')
        
        const twitterURL = `https://api.twitter.com/2/tweets?ids=${tweetID}&expansions=author_id&user.fields=username`
        requestOptions.headers.set('Origin', new URL(twitterURL).origin) // format for cors
        const twitterRes = await fetch(twitterURL, requestOptions)
        const twitterResponse = await gatherResponse(twitterRes)
        const tweetContent = twitterResponse.data[0].text

        var matchedSig = tweetContent.match(regsig);
        // var matchedAdd = tweetContent.match(regadd);
        if (!twitterResponse.data || !twitterResponse.includes) {
            return new Response(null, {
                status: 400,
                statusText: 'Invalid tweet id',
            })
        }
        if( !matchedSig){
            return new Response(null, {
                status:400,
                statusText: 'Tweet is not proper'
            })
        }
        const handle = twitterResponse.includes.users[0].username
        const sig = matchedSig[0];
        console.log(sig);
        const msgParams = {
            types: {
              EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
              ],
              Person: [
                { name: 'name', type: 'string' },
                { name: 'wallet', type: 'address' },
              ],
              Mail: [
                { name: 'from', type: 'Person' },
                { name: 'to', type: 'Person' },
                { name: 'contents', type: 'string' },
              ],
            },
            primaryType: 'Mail',
            domain: {
              name: 'Ether Mail',
              version: '1',
              chainId: '1',
              verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
            },
            message: {
              sender: {
                name: handle,
                wallet: account,
              },
              recipient: {
                name: 'Sublime',
                wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
              },
              contents: 'Hello, sublime!',
            },
        }
        let recovered
        try{
        recovered = await recoverTypedSignature({
            'data': msgParams,
            'sig': sig,
        })
        }   
        catch(e){
            return new Response(null, {
                status: 400,
                statusText: 'Invalid account',
            })
        }
    
        if (account === recovered) {
            response = new Response(handle, init, {
                status: 200,
                statusText: 'Succesful verification',
            })
            response.headers.set('Access-Control-Allow-Origin', '*')
            response.headers.append('Vary', 'Origin')
            return response
        }
        else{
            return new Response(null, init, {
                status: 400,
                statusText: 'Invalid account',
            })
        }
    
    } catch (e) {
        response = new Response(null, init, {
            status: 400,
            statusText: 'Error:' + e,
        })
    }
}
