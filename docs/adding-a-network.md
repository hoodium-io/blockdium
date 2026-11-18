# Adding Hoodium Devnet to a wallet

The header button **Add Mainchain Devnet** calls `wallet_addEthereumChain` (EIP-3085) so a
visitor can add the network without typing parameters by hand.

## Parameters

These are what the button sends, and every one was verified against the running chain
rather than copied from a document:

| Field | Value | How it was verified |
|---|---|---|
| `chainId` | `0x19c0` (6592) | `eth_chainId` **and** `net_version` return it |
| `chainName` | `Hoodium Devnet` | product name |
| `nativeCurrency.symbol` | `RUNE` | `core/runetoken/runetoken.go` → `Symbol = "RUNE"` |
| `nativeCurrency.decimals` | `18` | `types/coin.go` → `BaseDenomUnit = 18` |
| `rpcUrls` | `https://rpc.hoodium.dev` | official public Devnet RPC |
| `blockExplorerUrls` | unset | omitted when `VITE_EXPLORER_URL` is unset |

```json
{
  "chainId": "0x19c0",
  "chainName": "Hoodium Devnet",
  "nativeCurrency": { "name": "RUNE", "symbol": "RUNE", "decimals": 18 },
  "rpcUrls": ["https://rpc.hoodium.dev"]
}
```

### The public RPC was verified before being used

A wrong hostname in a wallet config is not something a user can fix from MetaMask's UI, so
the endpoint was checked first:

- DNS → `51.38.98.62`, served by nginx with TLS
- `eth_chainId` → `0x19c0`, `net_version` → `6592`
- **block 69,400 hash `0x2ed733180f9f017d3cccda6d1a8353792a747e24d309b14cbb531e6b1c7a4260`
  is identical to a locally-run node's** — same chain, not a fork. Two endpoints can report
  the same chain id while being different networks; matching block hashes cannot.
- CORS: `Access-Control-Allow-Origin: *` with `POST`, so a browser wallet can reach it

That last point matters: MetaMask talks to the RPC from the browser. An endpoint without
CORS permissions would add a network that appears connected and then fails every call.

## ⚠️ The RPC URL is permanent

MetaMask **stores the RPC URL in the user's wallet** and keeps using it. It is not read
fresh from this site on each visit.

Consequences:

- The default must be publicly reachable. It is (`https://rpc.hoodium.dev`).
- `VITE_EVM_RPC_URL` exists only to point a local or private build somewhere else.
  Setting it to `http://127.0.0.1:8545` gives every visitor a chain they cannot reach.
- Changing the URL later does **not** update wallets that already added the network.
  Users must remove and re-add it.

The button's tooltip shows the URL it is about to hand over, so this is inspectable before
clicking.

## Every outcome is reported

A wallet button that silently does nothing is indistinguishable from a broken one, so each
branch has a message:

| Outcome | Message | Tone |
|---|---|---|
| added | "Devnet added to your wallet." | ok |
| wallet already knows it (4902) | "Devnet is already in your wallet." | ok |
| user cancelled (4001) | "Request cancelled in your wallet." | warn |
| no `window.ethereum` | "No browser wallet detected. Install MetaMask to add Devnet." | warn |
| anything else | "Could not add the network: <message>" | error |

Error codes follow EIP-1193. `4001` is a deliberate user action, not a failure, and is
reported as such rather than as an error.

## Implementation

- `src/lib/metamask.ts` — chain constants, `evmRpcUrl()`, `addDevnetToWallet()`
- `src/components/AddNetworkButton.tsx` — the button and its messages
- `src/components/MetaMaskLogo.tsx` — the fox mark, **inlined as SVG**

The logo is inlined rather than loaded from a CDN because this repository is public: a
third-party asset that 404s next to a wallet button reads as a broken button.

No `@metamask/*` package is used. `window.ethereum` is declared as a minimal EIP-1193
interface, since one method call does not justify the dependency.

## Not verified

The **click path itself** — `wallet_addEthereumChain` requires a real MetaMask in a
browser. The request payload, the endpoint, and the error branches are verified; the
wallet's actual response is not. If it misbehaves, the message under the button names
which branch fired.
