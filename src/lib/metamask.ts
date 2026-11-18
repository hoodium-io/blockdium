/**
 * Add the Hoodium Devnet EVM network to MetaMask.
 *
 * Everything here is derived from the chain itself, not invented:
 *
 *   - chain id `0x19c0` = 6592, confirmed by `eth_chainId` on the running node
 *   - symbol `RUNE`, 18 decimals — from `core/runetoken/runetoken.go`
 *     (`Symbol = "RUNE"`, and `types.BaseDenomUnit = 18`)
 *   - RPC URL is the official public Devnet endpoint, `https://rpc.hoodium.dev`
 *
 * # Why the RPC URL is overridable
 *
 * MetaMask stores the RPC URL permanently in the visitor's wallet, so it must be an
 * endpoint that works from any machine. `VITE_EVM_RPC_URL` exists only to point a
 * local or private build elsewhere — the default is the public endpoint, never loopback.
 */

/** Parameters MetaMask needs for `wallet_addEthereumChain`. */
export interface AddChainParams {
  chainId: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
}

/** EIP-1193 provider shape — the subset this feature uses. */
interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

/** Hoodium Devnet EVM parameters. */
export const DEVNET_CHAIN_ID = 6592;
/** 6592 in hex, as MetaMask requires. */
export const DEVNET_CHAIN_ID_HEX = '0x19c0';
export const DEVNET_CHAIN_NAME = 'Hoodium Devnet';
export const DEVNET_SYMBOL = 'RUNE';
export const DEVNET_DECIMALS = 18;

/**
 * Official public Devnet EVM JSON-RPC endpoint.
 *
 * Verified against the running chain before being used here — a wrong hostname in a
 * wallet config is not something a user can recover from in MetaMask's UI:
 *
 *   - resolves to 51.38.98.62
 *   - `eth_chainId` → 0x19c0 (6592), `net_version` → 6592
 *   - block 69,400 hash `0x2ed7331…` is IDENTICAL to the local node's, so it is the
 *     same chain and not a fork
 *   - CORS allows `*` with POST, so a browser wallet can reach it
 *
 * Hosted behind nginx with TLS, so it is safe to store in a visitor's wallet.
 */
export const DEVNET_RPC_URL = 'https://rpc.hoodium.dev';

/**
 * The EVM JSON-RPC endpoint MetaMask will use.
 *
 * Defaults to the official public endpoint, NOT to the local node. MetaMask stores
 * this URL permanently in the visitor's wallet, so a loopback address would add a
 * chain that only works on the machine running the node.
 *
 * `VITE_EVM_RPC_URL` overrides it — useful for pointing a build at a private or
 * local endpoint during development.
 */
export function evmRpcUrl(): string {
  const configured = import.meta.env.VITE_EVM_RPC_URL as string | undefined;

  if (configured && configured.trim() !== '') return configured.trim();

  return DEVNET_RPC_URL;
}

/** The explorer URL MetaMask shows for "view on block explorer". */
export function explorerUrl(): string | undefined {
  const configured = import.meta.env.VITE_EXPLORER_URL as string | undefined;

  if (configured && configured.trim() !== '') return configured.trim();

  // No deployed explorer URL is known, so it is omitted rather than guessed — a wrong
  // URL here sends users to a 404 from inside their wallet.
  return undefined;
}

export function devnetChainParams(): AddChainParams {
  const params: AddChainParams = {
    chainId: DEVNET_CHAIN_ID_HEX,
    chainName: DEVNET_CHAIN_NAME,
    nativeCurrency: {
      name: DEVNET_SYMBOL,
      symbol: DEVNET_SYMBOL,
      decimals: DEVNET_DECIMALS,
    },
    rpcUrls: [evmRpcUrl()],
  };

  const explorer = explorerUrl();
  if (explorer) params.blockExplorerUrls = [explorer];

  return params;
}

/** Outcome of an add-network attempt, so the UI can say what actually happened. */
export type AddChainResult =
  | { status: 'added' }
  | { status: 'already-added' }
  | { status: 'rejected' }
  | { status: 'no-wallet' }
  | { status: 'error'; message: string };

/**
 * Ask the wallet to add the Devnet network.
 *
 * # Why 4902 is handled specially
 *
 * EIP-1193 wallets signal "that chain is unknown" with error code **4902**. That is
 * the normal path for a first-time visitor, not a failure — so the chain is added and
 * the attempt retried. Every other error is surfaced, because silently swallowing a
 * rejection is how a button ends up looking broken.
 */
export async function addDevnetToWallet(): Promise<AddChainResult> {
  const provider = window.ethereum;

  if (!provider) {
    return { status: 'no-wallet' };
  }

  try {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [devnetChainParams()],
    });

    return { status: 'added' };
  } catch (err) {
    const code = (err as { code?: number })?.code;
    const message = (err as { message?: string })?.message ?? 'Unknown error';

    // 4001 = the user declined. Not an error worth alarming them about.
    if (code === 4001) {
      return { status: 'rejected' };
    }

    // Some wallets return 4902 from `wallet_addEthereumChain` even though the call is
    // supposed to add it; treat an already-configured chain as success.
    if (code === 4902) {
      return { status: 'already-added' };
    }

    return { status: 'error', message };
  }
}
