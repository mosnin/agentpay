import React, { useEffect, useRef, useState } from "react";
import {
  JsonRpcProvider,
  BrowserProvider,
  ZeroAddress,
  ZeroHash as ZeroHashValue,
  formatUnits,
  parseUnits,
} from "ethers";
import { watchChainView } from "./chain-view.js";
import { deviceKey } from "./device.js";
import { requireWalletOrigin } from "./release-origin.js";
import {
  connectRegistry,
  connectMarkets,
  browse,
  transact,
  inspect,
  newIntent,
  kinds,
  phases,
} from "../protocol/commerce.mjs";
import { actions, spec } from "../protocol/market-spec.mjs";
const errorText = (error) =>
  error.shortMessage ?? error.message ?? String(error);
const money = (units, network) =>
  formatUnits(units, network.markets.decimals) + " " + network.markets.symbol;
const privateLabels = {
  post: "Private brief",
  bid: "Private proposal",
  award: "Additional instructions",
  deliver: "Private deliverable",
  publish: "Private package contents",
  revise: "Private package contents",
};
function Form({
  market,
  op,
  record,
  n,
  run,
  busy,
  wallet,
  agentChoice,
  quote,
  approved,
}) {
  const schema = spec.actions[market][op];
  const [fields, setFields] = useState(() => ({
    ...Object.fromEntries(schema.inputs.map((f) => [f.key, f.default ?? ""])),
    ...Object.fromEntries(
      schema.inputs
        .filter((f) => ["intent", "salt"].includes(f.key))
        .map((f) => [f.key, newIntent()]),
    ),
    order: record?.id,
    listing: record?.id,
    revision: record?.revision,
    quote: quote ?? "1",
    expectedContentHash: approved,
    digest: record?.digest,
    target: ZeroAddress,
    kind: "0",
    agent:
      op === "collect"
        ? String(record?.creditAgent ?? 0)
        : (agentChoice?.id ?? ""),
    receiver: wallet || "",
    deadline: "24",
    deliverySeconds: record
      ? String(Number(record.deliverySeconds ?? 86400) / 3600)
      : "24",
    maximum: op === "buy" ? formatUnits(record.price, n.markets.decimals) : "",
    price: op === "revise" ? formatUnits(record.price, n.markets.decimals) : "",
    descriptor: op === "revise" ? record.descriptor : "",
    enabled: String(!record?.listed),
  }));
  const [error, setError] = useState("");
  const deadlineQuote = useRef(null);
  const locked = [
    "order",
    "listing",
    "revision",
    "expectedContentHash",
    "digest",
    "intent",
    "salt",
  ];
  if (market === "directory") locked.length = 0;
  if (op === "buy") locked.push("maximum");
  if (op === "award") locked.push("quote");
  if (op === "visibility") locked.push("enabled");
  const labels = {
    buyer: "Pay from agent ID (0 to pay from your wallet)",
    agent:
      op === "collect" ? "Agent ID (0 for wallet credit)" : "Your agent ID",
    title: "Job title",
    name: "Resource name",
    descriptor: "Public description",
    content: privateLabels[op],
    maximum: "Maximum budget (" + n.markets?.symbol + ")",
    price: "Price (" + n.markets?.symbol + ")",
    deadline: "Bidding window (hours)",
    deliverySeconds: "Delivery window (hours)",
    receiver: "Payout address",
  };
  const set = (key, value) =>
    setFields((previous) => ({ ...previous, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    try {
      setError("");
      const selected = Object.fromEntries(
        schema.inputs.map((f) => [f.key, fields[f.key]]),
      );
      for (const key of ["maximum", "price"])
        if (key in selected)
          selected[key] = String(parseUnits(selected[key], n.markets.decimals));
      if ("enabled" in selected) selected.enabled = selected.enabled === "true";
      if ("deliverySeconds" in selected)
        selected.deliverySeconds = String(
          Number(selected.deliverySeconds) * 3600,
        );
      if ("deadline" in selected) {
        const hours = selected.deadline;
        if (deadlineQuote.current?.hours !== hours) {
          const head = await n.provider.getBlock("latest");
          deadlineQuote.current = {
            hours,
            value: String(head.timestamp + Number(hours) * 3600),
          };
        }
        selected.deadline = deadlineQuote.current.value;
      }
      if (op === "collect" && !selected.receiver) delete selected.receiver;
      await run(selected);
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <form className="market-form" onSubmit={submit}>
      {op === "buy" && (
        <p>
          License edition {record.revision} of <b>{record.name}</b> for{" "}
          <b>{money(record.price, n)}</b>. Access uses this browser’s enrolled
          reader.
        </p>
      )}
      {op === "award" && (
        <p>
          Award this job to the agent behind quote #{quote}. Any unused budget
          becomes available to collect.
        </p>
      )}
      {op === "accept" && (
        <p>Release the escrowed payment for the private delivery you opened.</p>
      )}
      {op === "visibility" && (
        <p>
          {record.listed
            ? "Hide this listing from the catalog. Existing buyers keep access."
            : "Make this listing visible again."}
        </p>
      )}
      {schema.inputs
        .filter((f) => !locked.includes(f.key))
        .map((f) => (
          <label key={f.key}>
            {labels[f.key] ?? f.label}
            {f.key === "kind" ? (
              <select
                value={fields.kind}
                onChange={(e) => set("kind", e.target.value)}
              >
                {(market === "clusters"
                  ? kinds
                  : ["Protocol", "Ecosystem", "Infrastructure"]
                ).map((k, i) => (
                  <option key={k} value={i}>
                    {k}
                  </option>
                ))}
              </select>
            ) : f.type === "private" ? (
              <textarea
                autoComplete="off"
                spellCheck={false}
                value={fields[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                required={op !== "award"}
              />
            ) : (
              <input
                required={f.key !== "receiver" || op !== "collect"}
                autoComplete="off"
                inputMode={
                  ["price", "maximum"].includes(f.key)
                    ? "decimal"
                    : f.type === "uint"
                      ? "numeric"
                      : undefined
                }
                pattern={
                  ["price", "maximum"].includes(f.key)
                    ? undefined
                    : f.type === "uint"
                      ? "[0-9]+"
                      : f.type === "bytes32"
                        ? "0x[0-9a-fA-F]{64}"
                        : undefined
                }
                value={fields[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </label>
        ))}
      {op === "appoint" && (
        <p>
          The reviewer can approve payment for this order. The appointment
          grants no decryption key.
        </p>
      )}
      {["post", "buy"].includes(op) && (
        <p>
          Your wallet may request a token approval before escrowing{" "}
          {n.markets.symbol}.
        </p>
      )}
      {market === "clusters" && ["publish", "revise"].includes(op) && (
        <p>
          Keep this device’s reader key available to deliver the encrypted
          edition to buyers.
        </p>
      )}
      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy}>
        {busy
          ? "Waiting for confirmation…"
          : op === "visibility"
            ? record.listed
              ? "Delist"
              : "Relist"
            : schema.label}
      </button>
    </form>
  );
}

export function MarketSession({ market, section, changeSection, children }) {
  const readVersion = useRef(0);
  const [approved, setApproved] = useState(""),
    [actionError, setActionError] = useState("");
  const [permissions, setPermissions] = useState(null),
    [draftRecord, setDraftRecord] = useState(null);
  const inFlight = useRef(false);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(
    location.hostname,
  );
  const [net, N] = useState(null),
    [api, A] = useState(null),
    [page, P] = useState(1),
    [snapshot, D] = useState(null),
    [error, E] = useState(""),
    [revision, R] = useState(0),
    [selection, Q] = useState(null),
    [op, O] = useState(""),
    [wallet, W] = useState(""),
    [busy, B] = useState(false),
    [notice, M] = useState(""),
    [privateData, V] = useState(null),
    [quoteNumber, T] = useState("1"),
    [quotes, G] = useState([]);
  const row = selection?.section === section ? selection.record : null;
  const data =
    snapshot?.section === section && snapshot.page === page
      ? snapshot.records
      : null;
  useEffect(() => {
    let active = true,
      provider;
    const controller = new AbortController();
    (async () => {
      const response = await fetch("./market-network.json", {
        signal: controller.signal,
        cache: "no-cache",
      });
      if (!response.ok)
        throw Error("The deployment manifest could not be loaded.");
      const network = await response.json();
      if (!active) return;
      N(network);
      provider = new JsonRpcProvider(network.rpc);
      const client = network.markets
        ? await connectMarkets(network, provider)
        : await connectRegistry(network, provider);
      if (active) A(client);
    })().catch((error) => active && E(errorText(error)));
    return () => {
      active = false;
      controller.abort();
      provider?.destroy();
    };
  }, []);
  useEffect(() => {
    P(1);
    select(null);
  }, [section]);
  useEffect(() => {
    if (!api || !section) return;
    D(null);
    E("");
    if (!api.network.markets && !["agents", "enterprises"].includes(section)) {
      E("The market is awaiting deployment on " + api.network.label + ".");
      return;
    }
    return watchChainView({
      provider: api.provider,
      read: async (head, valid) => {
        const next = await browse(api, section, page, head.number);
        if (valid()) {
          D({ section, page, records: next });
          E("");
          Q((previous) =>
            previous?.section === section
              ? {
                  section,
                  record:
                    next.rows.find((item) => item.id === previous.record.id) ??
                    previous.record,
                }
              : null,
          );
        }
      },
      onError: (e) => E(errorText(e)),
    });
  }, [api, section, page, revision]);
  useEffect(() => {
    if (section !== "bids" || !row || !api?.bids) return;
    let active = true;
    if (!/^[0-9]{1,24}$/.test(quoteNumber)) {
      G([]);
      return;
    }
    const start = BigInt(quoteNumber);
    if (start < 1n || start > BigInt(row.bids)) {
      G([]);
      return;
    }
    const size = Number(
      BigInt(row.bids) - start + 1n > 8n ? 8n : BigInt(row.bids) - start + 1n,
    );
    Promise.all(
      Array.from({ length: size }, async (_, i) => {
        const id = start + BigInt(i),
          q = await api.bids.quotes(row.id, id);
        return {
          id: String(id),
          seller: String(q.seller),
          price: String(q.price),
        };
      }),
    )
      .then((v) => active && G(v))
      .catch((e) => active && E(errorText(e)));
    return () => {
      active = false;
    };
  }, [api, row?.id, row?.bids, quoteNumber, section]);
  const viewer = wallet;
  const relevantBuyer = row?.buyer ?? "0",
    relevantSeller = (section === "clusters" ? row?.agent : row?.seller) ?? "0";
  useEffect(() => {
    setPermissions(null);
    if (!api || !viewer || !row) return;
    let active = true;
    const own = async (agent) => {
      if (agent === "0") return false;
      const [record, worker] = await Promise.all([
        api.registry.get(agent),
        api.registry.currentWorker(agent),
      ]);
      return [record.owner, worker].some(
        (address) => address.toLowerCase() === viewer.toLowerCase(),
      );
    };
    Promise.all([
      relevantBuyer === "0"
        ? row.payer?.toLowerCase() === viewer.toLowerCase()
        : own(relevantBuyer),
      own(relevantSeller),
    ])
      .then(([buyer, seller]) => {
        if (active) setPermissions({ buyer, seller });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [
    api,
    viewer,
    row?.id,
    row?.payer,
    relevantBuyer,
    relevantSeller,
    section,
  ]);
  useEffect(() => {
    function reset() {
      readVersion.current++;
      W("");
      V(null);
      O("");
      M("");
    }
    window.ethereum?.on?.("accountsChanged", reset);
    window.ethereum?.on?.("chainChanged", reset);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", reset);
      window.ethereum?.removeListener?.("chainChanged", reset);
    };
  }, []);
  const testWallet =
    loopback &&
    net?.chainId === 31337 &&
    net.demo &&
    new URL(net.rpc).hostname === "127.0.0.1";
  async function signer() {
    requireWalletOrigin();
    if (!net?.markets || !api)
      throw Error("Market contracts are unavailable on this network.");
    if (testWallet && !window.ethereum) {
      const s = await api.provider.getSigner(net.demo);
      W(await s.getAddress());
      return s;
    }
    if (!window.ethereum)
      throw Error("Open this site in a browser with an EVM wallet.");
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const p = new BrowserProvider(window.ethereum);
    if (Number((await p.getNetwork()).chainId) !== net.chainId)
      throw Error("Switch your wallet to " + net.label + ".");
    const s = await p.getSigner();
    W(await s.getAddress());
    return s;
  }
  async function doAction(fn) {
    if (inFlight.current) return;
    inFlight.current = true;
    B(true);
    setActionError("");
    try {
      await fn();
    } catch (e) {
      setActionError(errorText(e));
    } finally {
      inFlight.current = false;
      B(false);
    }
  }
  async function send(p) {
    return doAction(async () => {
      const s = await signer(),
        a = await connectMarkets(net, s);
      const key = await deviceKey(await s.getAddress());
      const result = await transact(a, market, op, p, key);
      const subject = actions[market][op][0];
      M(
        result.transaction
          ? subject + " confirmed · " + result.transaction
          : "Order #" + result.order + " already exists.",
      );
      Q(null);
      O("");
      V(null);

      if (op === "post" || op === "publish" || op === "buy") {
        changeSection(
          op === "post" ? "bids" : op === "buy" ? "orders" : "clusters",
        );
        P(1);
      }
      R((previous) => previous + 1);
    });
  }
  function select(r) {
    readVersion.current++;
    Q(r ? { section, record: r } : null);
    V(null);
    O("");

    setDraftRecord(null);
    setActionError("");
    setApproved("");
    T("1");
    G([]);
  }
  function action(name) {
    readVersion.current++;
    setDraftRecord(row);
    setApproved(
      name === "accept" && privateData?.kind === "result"
        ? (privateData.contentHash ?? "")
        : "",
    );
    O(name);
    setActionError("");
    V(null);
  }
  async function unlock(stage) {
    const version = ++readVersion.current;
    return doAction(async () => {
      const s = await signer(),
        reader = await deviceKey(await s.getAddress());
      const fields =
        stage === "source"
          ? { listing: row.id, revision: row.revision }
          : { order: row.id, quote: quoteNumber };
      const result = await inspect(api, market, stage, fields, reader);
      if (readVersion.current === version) V({ ...result, kind: stage });
    });
  }
  const available = net?.markets && api;
  const timestamp = data?.timestamp;
  const expired =
    row?.deadline && timestamp != null && Number(row.deadline) <= timestamp;
  const buyerAccess = !viewer || permissions?.buyer;
  const sellerAccess = !viewer || permissions?.seller;
  const quoteSelected = quotes.some((q) => q.id === quoteNumber);
  const reviewed = privateData?.kind === "result" && privateData?.contentHash;
  const canReview = row?.reviewer !== ZeroAddress;
  const orderActions = !row
    ? []
    : section === "clusters"
      ? [
          ...(row.listed && !permissions?.seller ? ["buy"] : []),
          ...(sellerAccess ? ["revise", "visibility"] : []),
        ]
      : expired && ["1", "2", "3"].includes(row.status)
        ? ["refund"]
        : ({
            1: [
              ...(permissions?.buyer ? [] : ["bid"]),
              ...(buyerAccess && !canReview ? ["appoint"] : []),
              ...(buyerAccess && quoteSelected ? ["award"] : []),
            ],
            2: [
              ...(sellerAccess ? ["deliver"] : []),
              ...(buyerAccess && !canReview ? ["appoint"] : []),
            ],
            3: [
              ...(buyerAccess && reviewed ? ["accept"] : []),
              ...(canReview ? ["settleReviewed"] : []),
            ],
          }[row.status] ?? []);
  const displayDetail = (
    <>
      {row && !op && (
        <section className="detail">
          <div className="detail-head">
            <h2>{row.title ?? row.name ?? "Purchase " + row.id}</h2>
            <button onClick={() => select(null)}>Close</button>
          </div>
          {row.descriptor && (
            <p className="resource-description">{row.descriptor}</p>
          )}
          <dl>
            {(section === "clusters"
              ? [
                  ["Kind", kinds[Number(row.kind)]],
                  ["Edition", row.revision],
                  ["Price", money(row.price, net)],
                  ["Publisher", "Agent " + row.agent],
                ]
              : section === "bids" || section === "orders"
                ? [
                    ["Status", phases[Number(row.status)]],
                    ["Escrow", money(row.amount, net)],
                    [
                      "Deadline",
                      new Date(Number(row.deadline) * 1000).toLocaleString(),
                    ],
                    [
                      "Seller",
                      row.seller === "0" ? "Unassigned" : "Agent " + row.seller,
                    ],
                  ]
                : Object.entries(row).filter(
                    ([k]) =>
                      ![
                        "title",
                        "name",
                        "briefPacket",
                        "instructions",
                        "packet",
                        "approvedHash",
                      ].includes(k),
                  )
            ).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          </dl>
          {section === "bids" && Number(row.bids) > 0 && (
            <>
              <h3>Quotes</h3>
              <label>
                Quote number
                <input
                  value={quoteNumber}
                  type="number"
                  min="1"
                  max={row.bids}
                  onChange={(e) => {
                    T(e.target.value);
                    V(null);
                  }}
                />
              </label>
              <div className="choices">
                {quotes.map((q) => (
                  <button
                    aria-pressed={q.id === quoteNumber}
                    key={q.id}
                    onClick={() => {
                      readVersion.current++;
                      T(q.id);
                      V(null);
                    }}
                  >
                    #{q.id} · Agent {q.seller} · {money(q.price, net)}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="action-row">
            {section !== "agents" &&
              orderActions.map((k) => (
                <button
                  type="button"
                  className={
                    ["buy", "award", "accept", "deliver", "bid"].includes(k)
                      ? "primary"
                      : undefined
                  }
                  key={k}
                  disabled={busy}
                  onClick={() => action(k)}
                >
                  {k === "visibility"
                    ? row.listed
                      ? "Delist"
                      : "Relist"
                    : actions[market][k][0]}
                </button>
              ))}
            {(section === "bids"
              ? [
                  "brief",
                  ...(BigInt(row.bids) > 0n ? ["proposal"] : []),
                  ...(BigInt(row.winner) > 0n ? ["instructions"] : []),
                  ...(row.digest !== ZeroHashValue ? ["result"] : []),
                ]
              : section === "orders" && row.digest !== ZeroHashValue
                ? ["result"]
                : section === "clusters"
                  ? ["source"]
                  : []
            ).map((k) => (
              <button disabled={busy} key={k} onClick={() => unlock(k)}>
                Open {k}
              </button>
            ))}
          </div>
          {privateData && (
            <section aria-label="Decrypted packet">
              <h3>Private contents</h3>
              <pre>
                {typeof privateData.content === "string"
                  ? [privateData.content, privateData.instructions]
                      .filter(Boolean)
                      .join("\n\n")
                  : JSON.stringify(privateData, null, 2)}
              </pre>
              <button onClick={() => V(null)}>Lock</button>
            </section>
          )}
        </section>
      )}
      {op && available && (
        <div className="form-panel">
          {row && (
            <button
              type="button"
              className="commerce-back"
              onClick={() => O("")}
              disabled={busy}
            >
              Back to details
            </button>
          )}
          <Form
            key={[market, op, row?.id].join("/")}
            market={market}
            op={op}
            record={draftRecord}
            n={{ ...net, provider: api.provider }}
            busy={busy}
            run={send}
            wallet={wallet}
            agentChoice={null}
            quote={quoteNumber}
            approved={approved}
          />
        </div>
      )}
    </>
  );

  return children({
    client: api,
    data,
    net,
    error,
    actionError,
    notice,
    section,
    busy,
    available: Boolean(available),
    wallet,
    testWallet: !!testWallet && !window.ethereum,
    connect: () => doAction(signer),
    page,
    setPage: (next) => {
      select(null);
      P(next);
    },
    money: (units) => money(units, net),
    select,
    start: (name) => {
      select(null);
      action(name);
    },
    collect: (agent) => {
      select(null);
      action("collect");
      setDraftRecord({ creditAgent: agent });
    },
    panel: row || op ? displayDetail : null,
    panelTitle: op
      ? actions[market][op][0]
      : (row?.name ?? row?.title ?? "Order " + row?.id),
    close: () => {
      if (!busy) select(null);
    },
  });
}
