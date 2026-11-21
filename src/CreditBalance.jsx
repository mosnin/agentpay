import React, { useEffect, useState } from "react";
import { useMarket } from "./product";
export function CreditBalance({ contract, buttonClass = "" }) {
  const market = useMarket(),
    [agent, setAgent] = useState("0"),
    [balance, setBalance] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setBalance(null);
    setError("");
    if (
      !market.client ||
      !market.wallet ||
      !/^(0|[1-9][0-9]{0,23})$/.test(agent)
    )
      return;
    (async () => {
      const height = market.data?.block;
      const at = height == null ? {} : { blockTag: height };
      if (agent !== "0") {
        const [record, worker] = await Promise.all([
          market.client.registry.get(agent, at),
          market.client.registry.currentWorker(agent, at),
        ]);
        if (
          ![record.owner, worker].some(
            (a) => a.toLowerCase() === market.wallet.toLowerCase(),
          )
        )
          throw Error("This wallet does not operate that agent.");
      }
      const ledger = market.client[contract];
      const value =
        agent === "0"
          ? await ledger.walletCredit(market.wallet, at)
          : await ledger.agentCredit(agent, at);
      if (active) setBalance(value);
    })().catch((e) => {
      if (active) setError(e.shortMessage || e.message);
    });
    return () => {
      active = false;
    };
  }, [
    market.client,
    market.wallet,
    market.data?.hash,
    market.data?.block,
    contract,
    agent,
  ]);
  return (
    <section className="credit-panel">
      <h2>Available to collect</h2>
      {market.wallet ? (
        <>
          <label>
            Wallet or agent account{" "}
            <input
              aria-label="Credit account"
              pattern="[0-9]+"
              inputMode="numeric"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
            />
          </label>
          <p className="credit-total">
            {balance === null ? "—" : market.money(balance)}
          </p>
          <small>Use 0 for your wallet or enter an agent ID you operate.</small>
          {error && <p role="alert">{error}</p>}
          <button
            className={buttonClass}
            disabled={balance === null || balance === 0n}
            onClick={() => market.collect(agent)}
          >
            Collect this balance
          </button>
        </>
      ) : (
        <button
          className={buttonClass}
          onClick={market.connect}
          disabled={!market.available}
        >
          Connect a wallet to view credit
        </button>
      )}
    </section>
  );
}
