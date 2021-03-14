import { recoverPersonalSignature,recoverTypedSignature } from 'eth-sig-util'
import { ethers } from 'ethers'
import { gatherResponse } from '../utils'
import { Octokit } from '@octokit/rest'

// github api info
const USER_AGENT = 'Cloudflare Worker'

// format request for twitter api

const TWITTER_BEARER = "AAAAAAAAAAAAAAAAAAAAACNTLAEAAAAAerwwVRSbIdpeHLBzGJsEOomFiWo%3DvldHFkYQToX1rgurKBp486DzVJ0octmf5RXdfSOrcn1VxNtpOa";
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
const reg = new RegExp('(?<=sig:).*')

/**
 * @param {*} request
 * Accpets id=<tweet id>
 * Accepts account=<eth address> // just used to aler client of incorrect signer found
 *
 * 1. fetch tweet data using tweet id
 * 2. construct signature data using handle from tweet
 * 3. recover signer of signature from tweet
 * 4. if signer is the expected address, update gist with address -> handle mapping
 */
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
        
        if (!twitterResponse.data || !twitterResponse.includes) {
            return new Response(null, {
                status: 400,
                statusText: 'Invalid tweet id',
            })
        }
        const tweetContent = twitterResponse.data[0].text
        var new_tweet  = tweetContent.split(' signature ');
        var sig = new_tweet[1];
        const handle = twitterResponse.includes.users[0].username
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
                wallet: new_tweet[0],
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
    
        // if signer found is not the expected signer, alert client and dont update gist
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
