import { handleVerify } from '.verify'
import Router from './router'

addEventListener('fetch', event => {
  // const url = new URL(request.url)
  // if (request.method === 'OPTIONS') {
  //   // Handle CORS preflight requests
  //   event.respondWith(handleOptions(request))
  // } else if (
  //     request.method === 'GET' ||
  //     request.method === 'HEAD' ||
  //     request.method === 'POST'
  // ) {
  //     // Handle requests to the API server
  //     event.respondWith(handleRequest(request))
  // } else {
  //     event.respondWith(
  //         new Response(null, {
  //             status: 405,
  //             statusText: 'Method Not Allowed',
  //         })
  //     )
  // }
  event.respondWith(handleRequest(event.request))
})
/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  const r = new Router()
  r.get('.*/verify', request => handleVerify(request))
  return new Response('Hello worker!', {
    headers: { 'content-type': 'text/plain' },
  })


}
