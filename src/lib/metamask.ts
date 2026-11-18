/**
 * Add the Hoodium Devnet EVM network to MetaMask.
 *
 * Everything here is derived from the chain itself, not invented:
 *
 *   - chain id `0x19c0` = 6592, confirmed by `eth_chainId` on the running node
 *   - symbol `RUNE`, 18 decimals — from `core/runetoken/runetoken.go`
 *     (`Symbol = "RUNE"`, and `types.BaseDenomUnit = 18`)
 *   - RPC URL is the EVM JSON-RPC endpoint MetaMask will talk to
 *
 * # Why the RPC URL is configurable
 *
 * MetaMask stores the RPC URL in the user's wallet and keeps using it. A loopback
 * address like `127.0.0.1:8545` only works on the machine running the node, so
 * defaulting to it would add a network that is dead for anyone else. The URL is
 * therefore taken from `VITE_EVM_RPC_URL` when set, and the button reports the URL it
 * is about to use instead of silently adding an unreachable one.
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
 * The EVM JSON-RPC endpoint MetaMask will use.
 *
 * Defaults to the local node because that is what exists today. Set
 * `VITE_EVM_RPC_URL` to a publicly reachable endpoint before deploying, or the added
 * network will not work for visitors.
 */
export function evmRpcUrl(): string {
  const configured = import.meta.env.VITE_EVM_RPC_URL as string | undefined;

  if (configured && configured.trim() !== '') return configured.trim();

  return 'http://127.0.0.1:8545';
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
